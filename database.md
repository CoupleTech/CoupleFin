# Banco de Dados â€” Estrutura e Queries

Este arquivo centraliza todas as definiÃ§Ãµes do banco de dados (Supabase / Postgres), incluindo a estrutura completa, queries, policies de RLS e funÃ§Ãµes/triggers, conforme o modelo de negÃ³cio definido na documentaÃ§Ã£o do sistema.

## 1. Estrutura do Banco e Tabelas

```sql
-- Estrutura do grupo e empresas
CREATE TABLE grupos_economicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid REFERENCES grupos_economicos(id) ON DELETE CASCADE,
  cnpj text UNIQUE NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  logo_url text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ConfiguraÃ§Ã£o visual e fechamento de perÃ­odo
CREATE TABLE configuracoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid REFERENCES grupos_economicos(id) ON DELETE CASCADE,
  cor_primaria text,
  cor_secundaria text,
  cor_terciaria text,
  updated_at timestamptz DEFAULT now()
);

-- Note: A política de RLS foi simplificada para permitir acesso total a usuários logados
-- CREATE POLICY "Liberar tudo para config" ON configuracoes_sistema FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE periodos_fechamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  competencia date NOT NULL,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  fechado_por uuid,
  fechado_em timestamptz
);

-- UsuÃ¡rios e perfis
CREATE TABLE perfis_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  permissoes jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  perfil_id uuid REFERENCES perfis_usuario(id),
  cor_tema varchar(7) DEFAULT '#f97316',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE usuarios_grupos (
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  grupo_id uuid REFERENCES grupos_economicos(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, grupo_id)
);

-- Cadastros base (por empresa)
CREATE TABLE centro_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  codigo text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tipo_despesa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  codigo text,
  grupo_dre text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  banco text,
  agencia text,
  numero_conta text,
  tipo text NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'caixa')),
  saldo_inicial numeric DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE destinos_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('fornecedor', 'funcionario', 'socio', 'outro')),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Fornecedores
CREATE TABLE fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid REFERENCES grupos_economicos(id) ON DELETE CASCADE,
  razao_social text NOT NULL,
  cnpj_cpf text NOT NULL,
  email text,
  telefone text,
  endereco text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- LanÃ§amentos, anexos e histÃ³rico
CREATE TABLE lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('nota_fiscal', 'manual')),
  subtipo text NOT NULL,
  fornecedor_id uuid REFERENCES fornecedores(id),
  centro_custo_id uuid REFERENCES centro_custo(id),
  tipo_despesa_id uuid REFERENCES tipo_despesa(id),
  conta_id uuid REFERENCES contas(id),
  destino_pagamento_id uuid REFERENCES destinos_pagamento(id),
  chave_acesso text,
  numero_documento text,
  valor numeric NOT NULL,
  data_competencia date NOT NULL,
  data_vencimento date,
  data_pagamento date,
  status_pagamento text DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'atrasado', 'pago parcialmente')),
  descricao text,
  empresa_origem_id uuid REFERENCES empresas(id),
  empresa_destino_id uuid REFERENCES empresas(id),
  conta_origem_id uuid REFERENCES contas(id),
  conta_destino_id uuid REFERENCES contas(id),
  status text DEFAULT 'lancado' CHECK (status IN ('lancado', 'estornado', 'pendente_aprovacao')),
  motivo_estorno text,
  created_by uuid REFERENCES usuarios(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE lancamento_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid REFERENCES lancamentos(id) ON DELETE CASCADE,
  arquivo_url text NOT NULL,
  tipo_arquivo text NOT NULL CHECK (tipo_arquivo IN ('pdf', 'xml', 'imagem')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE historico_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid NOT NULL,
  usuario_id uuid REFERENCES usuarios(id),
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  acao text NOT NULL CHECK (acao IN ('criacao', 'edicao', 'estorno', 'reabertura_periodo')),
  created_at timestamptz DEFAULT now()
);

-- Notificações in-app e Web Push
CREATE TABLE notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text DEFAULT 'sistema',
  lida boolean DEFAULT false,
  link_acao text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Convites de Equipe
CREATE TABLE convites_equipe (
  id uuid default uuid_generate_v4() primary key,
  empresa_id uuid references empresas(id) not null,
  email text not null,
  perfil_id uuid references perfis_usuario(id) not null,
  token uuid default uuid_generate_v4() not null unique,
  status text default 'pendente' check (status in ('pendente', 'aceito', 'expirado')),
  criado_por uuid references auth.users(id),
  criado_em timestamp with time zone default now()
);
```

## 2. Row Level Security (RLS) - Fase 1 (FundaÃ§Ã£o)

Como exigido pelo **BaaS Security Constitution**, todas as tabelas devem ter o RLS habilitado e polÃ­ticas `Default Deny` por padrÃ£o. Abaixo estÃ£o as polÃ­ticas iniciais da arquitetura Multi-Tenant para isolamento do ambiente.

```sql
-- 2.1 Habilitar RLS nas Tabelas Base
ALTER TABLE grupos_economicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE convites_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;

-- 2.2 PolÃ­ticas: grupos_economicos
-- Sendo um sistema de grupo Ãºnico (uso interno), qualquer usuÃ¡rio logado pode ver o grupo raiz
DROP POLICY IF EXISTS "Ver grupos das prÃ³prias empresas" ON grupos_economicos;
CREATE POLICY "Ler grupo logado" ON grupos_economicos
  FOR SELECT USING (auth.role() = 'authenticated');

-- ==========================================
-- 2.3 PolÃ­ticas: empresas
-- UsuÃ¡rios podem ver apenas as empresas onde possuem vÃ­nculo explÃ­cito.
CREATE POLICY "Ver empresas vinculadas" ON empresas
  FOR SELECT USING (
    id IN (
      SELECT empresa_id FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
    )
  );

-- 2.4 PolÃ­ticas: usuarios_empresas
-- UsuÃ¡rio pode consultar seus prÃ³prios vÃ­nculos de empresa.
CREATE POLICY "Ver prÃ³prios vÃ­nculos" ON usuarios_empresas
  FOR SELECT USING (usuario_id = auth.uid());

-- 2.5 PolÃ­ticas: usuarios
-- UsuÃ¡rio pode ler o prÃ³prio registro. (Acesso para administradores serÃ¡ expandido futuramente).
CREATE POLICY "Ler prÃ³prio perfil" ON usuarios
  FOR SELECT USING (id = auth.uid());

-- 2.6 PolÃ­ticas: perfis_usuario
-- Todos os usuÃ¡rios logados podem ler a lista de perfis disponÃ­veis.
CREATE POLICY "Ler perfis de usuÃ¡rio" ON perfis_usuario
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Criar perfis de usuÃ¡rio" ON perfis_usuario
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Editar perfis de usuÃ¡rio" ON perfis_usuario
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Excluir perfis de usuÃ¡rio" ON perfis_usuario
  FOR DELETE USING (auth.role() = 'authenticated');

-- 2.7 PolÃ­ticas: convites_equipe
-- Admin pode ver e gerenciar convites da sua empresa
CREATE POLICY "Gerenciar convites da prÃ³pria empresa" ON convites_equipe
  FOR ALL USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas WHERE usuario_id = auth.uid()
    )
  );
```

## 3. FunÃ§Ãµes e Procedures (RPC) - Fase 1

O processo de **Onboarding** requer a inserÃ§Ã£o atÃ´mica de Grupo, Empresa, UsuÃ¡rio e VÃ­nculo. Como a polÃ­tica de seguranÃ§a veta inserts desvinculados, utilizamos uma funÃ§Ã£o `SECURITY DEFINER` (que roda com privilÃ©gios do criador, bypassando o RLS) de forma estritamente controlada para esse fluxo de entrada.

```sql
CREATE OR REPLACE FUNCTION criar_conta_onboarding(
  p_nome_grupo text,
  p_nome_usuario text
) RETURNS json AS $$
DECLARE
  v_grupo_id uuid;
  v_empresa_id uuid;
  v_usuario_id uuid;
  v_email text;
BEGIN
  v_usuario_id := auth.uid();
  
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'UsuÃ¡rio nÃ£o autenticado no Supabase Auth';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_usuario_id;

  -- 1. Cria o Grupo EconÃ´mico
  INSERT INTO grupos_economicos (nome) VALUES (p_nome_grupo) RETURNING id INTO v_grupo_id;

  -- 2. Cria a Empresa
  INSERT INTO empresas (grupo_id, cnpj, razao_social) VALUES (v_grupo_id, p_cnpj_empresa, p_razao_social) RETURNING id INTO v_empresa_id;

  -- 3. Registra o UsuÃ¡rio na tabela pÃºblica
  INSERT INTO usuarios (id, nome, email) 
  VALUES (v_usuario_id, p_nome_usuario, v_email);

  -- 4. Cria o VÃ­nculo UsuÃ¡rio <-> Empresa
  INSERT INTO usuarios_empresas (usuario_id, empresa_id) VALUES (v_usuario_id, v_empresa_id);

  RETURN json_build_object('grupo_id', v_grupo_id, 'empresa_id', v_empresa_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

  -- Atualiza o perfil_id no usuário
  UPDATE public.usuarios SET perfil_id = v_convite.perfil_id WHERE id = v_user_id;

  -- Vincula à empresa
  INSERT INTO public.usuarios_empresas (usuario_id, empresa_id)
  VALUES (v_user_id, v_convite.empresa_id)
  ON CONFLICT DO NOTHING;

  -- Atualiza o status do convite
  UPDATE public.convites_equipe SET status = 'aceito' WHERE id = v_convite.id;

  RETURN jsonb_build_object('sucesso', true, 'empresa_id', v_convite.empresa_id);
END;
$$;
```


 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 - -   4 .   T r i g g e r   d e   C r i a ç ã o   d e   U s u á r i o 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 - -   C o m o   é   u m   s i s t e m a   i n t e r n o ,   t o d o   u s u á r i o   q u e   s e   c a d a s t r a r   v i a   A u t h   d e v e   t e r   s e u   r e g i s t r o 
 - -   c r i a d o   a u t o m a t i c a m e n t e   n a   t a b e l a   p u b l i c a   ' u s u a r i o s ' ,   p a r a   q u e   o   A d m i n   p o s s a   v i n c u l á - l o   d e p o i s . 
 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   o n _ a u t h _ u s e r _ c r e a t e d ( ) 
 R E T U R N S   t r i g g e r   A S   \ $ \ $ 
 B E G I N 
     I N S E R T   I N T O   p u b l i c . u s u a r i o s   ( i d ,   n o m e ,   e m a i l ) 
     V A L U E S   ( N E W . i d ,   ' U s u á r i o ' ,   N E W . e m a i l ) ; 
     R E T U R N   N E W ; 
 E N D ; 
 \ $ \ $   L A N G U A G E   p l p g s q l   S E C U R I T Y   D E F I N E R ; 
 
 D R O P   T R I G G E R   I F   E X I S T S   o n _ a u t h _ u s e r _ c r e a t e d   O N   a u t h . u s e r s ; 
 C R E A T E   T R I G G E R   o n _ a u t h _ u s e r _ c r e a t e d 
     A F T E R   I N S E R T   O N   a u t h . u s e r s 
     F O R   E A C H   R O W   E X E C U T E   P R O C E D U R E   o n _ a u t h _ u s e r _ c r e a t e d ( ) ; 
  
 
