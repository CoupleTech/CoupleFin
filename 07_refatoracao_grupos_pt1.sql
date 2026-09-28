-- Passo 1: Refatoração da Tabela Base de Vínculo de Usuários

-- 1. Excluir a tabela antiga de vínculos por empresa (já que o banco está limpo, podemos dar DROP sem medo de perder dados)
DROP TABLE IF EXISTS public.usuarios_empresas CASCADE;

-- 2. Criar a nova tabela de vínculos por grupo econômico
CREATE TABLE public.usuarios_grupos (
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  grupo_id uuid REFERENCES public.grupos_economicos(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, grupo_id)
);

-- 3. Habilitar RLS na nova tabela
ALTER TABLE public.usuarios_grupos ENABLE ROW LEVEL SECURITY;

-- 4. Criar política básica para o usuário ver os seus próprios vínculos
CREATE POLICY "Ver próprios vínculos de grupo" ON public.usuarios_grupos
  FOR SELECT USING (usuario_id = auth.uid());
