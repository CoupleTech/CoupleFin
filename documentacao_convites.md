# Arquitetura de Convites de Equipe (CoupleFin)

Este documento especifica a implementação técnica do módulo de **Convites de Usuário** para a Fase 11, substituindo o aviso provisório no painel da Equipe.

## 1. O Problema
Adicionar um usuário em uma arquitetura Multi-Tenant (onde os usuários pertencem a empresas) através de um Frontend sem servidor (Vite + React) apresenta riscos. O método `admin.createUser` do Supabase exige a `SERVICE_ROLE_KEY` (chave mestre), que **nunca** deve ser exposta no lado do cliente.

## 2. A Solução: Arquitetura "Magic Link Invite com Token e RPC"

Para realizar o convite de forma 100% segura, delegaremos a validação e vinculação do usuário para o próprio banco de dados (via Stored Procedure - RPC) atrelado a um Token de uso único. O fluxo ocorrerá sem necessidade de servidores externos.

### O Fluxo:
1. **Geração (Administrador):**
   - O Admin clica em "Convidar Usuário".
   - Insere o **E-mail** do convidado e escolhe o **Perfil** (Analista, etc).
   - O FrontEnd insere uma linha na tabela `convites_equipe` que gera um `token` único.
   - O sistema devolve um Link Copiável (`/aceitar-convite?token=UUID`) para o Admin enviar no WhatsApp ou e-mail.

2. **Aceitação (Convidado):**
   - O convidado acessa o Link. O sistema valida se o `token` existe e está `pendente`.
   - A tela de "Aceitar Convite" bloqueia o campo de E-mail (mostrando o e-mail convidado) e pede que ele defina uma **Senha**.
   - O FrontEnd chama o `supabase.auth.signUp()`. O Supabase cria o usuário nativamente.

3. **Vinculação Segura (Backend RPC):**
   - Imediatamente após a conta ser criada e o usuário entrar (logar), o FrontEnd dispara a função RPC `aceitar_convite_usuario(token)`.
   - Essa função roda no banco de dados com poder de **Security Definer** (Bypass RLS de forma controlada).
   - A função verifica o `token`, extrai o ID da Empresa e o ID do Perfil, e **insere automaticamente** os dados do novo `auth.uid()` nas tabelas `usuarios_empresas` e `perfis_usuario`.
   - O convite é marcado como `aceito` para não ser usado novamente.
   - O usuário é redirecionado ao Dashboard, 100% configurado.

---

## 3. Implementação Prática (To-Do List)

### Passo 3.1: Modelagem do Banco (SQL)
Criar a tabela `convites_equipe`:
```sql
CREATE TABLE public.convites_equipe (
  id uuid default uuid_generate_v4() primary key,
  empresa_id uuid references public.empresas(id) not null,
  email text not null,
  perfil_id uuid references public.perfis(id) not null,
  token uuid default uuid_generate_v4() not null unique,
  status text default 'pendente' check (status in ('pendente', 'aceito', 'expirado')),
  criado_por uuid references auth.users(id),
  criado_em timestamp with time zone default now()
);

-- RLS: Admin só pode ver/gerar convites para a própria empresa
```

Criar a função RPC de aceitação (`aceitar_convite_usuario`):
```sql
CREATE OR REPLACE FUNCTION aceitar_convite_usuario(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_convite record;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Busca convite
  SELECT * INTO v_convite FROM public.convites_equipe WHERE token = p_token AND status = 'pendente';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou já utilizado.';
  END IF;

  -- 1. Cria perfil_usuario
  INSERT INTO public.perfis_usuario (usuario_id, perfil_id, grupo_id)
  VALUES (
    v_user_id, 
    v_convite.perfil_id, 
    (SELECT grupo_id FROM public.empresas WHERE id = v_convite.empresa_id)
  ) ON CONFLICT DO NOTHING;

  -- 2. Vincula à empresa
  INSERT INTO public.usuarios_empresas (usuario_id, empresa_id)
  VALUES (v_user_id, v_convite.empresa_id)
  ON CONFLICT DO NOTHING;

  -- 3. Atualiza o status do convite
  UPDATE public.convites_equipe SET status = 'aceito' WHERE id = v_convite.id;

  RETURN jsonb_build_object('sucesso', true, 'empresa_id', v_convite.empresa_id);
END;
$$;
```

### Passo 3.2: Ajuste no Frontend (Tela de Equipe)
- Transformar o formulário atual de novo usuário em um gerador de link.
- Após salvar o e-mail, mostrar uma caixa de texto com `https://seudominio.com/aceitar-convite?token=xyz` com um botão "Copiar Link".

### Passo 3.3: Criação da Nova Tela (`/aceitar-convite`)
- Rota pública em `App.tsx`: `<Route path="/aceitar-convite" element={<AceitarConvite />} />`
- O componente busca o `token` na URL, decodifica via banco, mostra o formulário de senha e aciona o Signup + RPC Sequencial.

## Conclusão
Essa arquitetura atende todos os requisitos do projeto (Segurança Zero Trust, Multi-Tenant isolado, Sem dependência de backend pago externo, Excelente UX para o cliente que pode convidar rapidamente via mensageiro).
