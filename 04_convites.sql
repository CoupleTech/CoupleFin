-- Cria a tabela de convites
CREATE TABLE IF NOT EXISTS public.convites_equipe (
  id uuid default uuid_generate_v4() primary key,
  empresa_id uuid references public.empresas(id) not null,
  email text not null,
  perfil_id uuid references public.perfis_usuario(id) not null,
  token uuid default uuid_generate_v4() not null unique,
  status text default 'pendente' check (status in ('pendente', 'aceito', 'expirado')),
  criado_por uuid references auth.users(id),
  criado_em timestamp with time zone default now()
);

-- RLS: Habilitar RLS
ALTER TABLE public.convites_equipe ENABLE ROW LEVEL SECURITY;

-- Admin pode ver e gerenciar convites da sua empresa
CREATE POLICY "Gerenciar convites da própria empresa" ON public.convites_equipe
  FOR ALL USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid()
    )
  );

-- O convidado, mesmo sem login (ou logo após login) não precisa ler a tabela, 
-- pois a RPC 'aceitar_convite_usuario' faz isso via SECURITY DEFINER.

-- Função para aceitar o convite
CREATE OR REPLACE FUNCTION public.aceitar_convite_usuario(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_convite record;
  v_user_id uuid;
  v_grupo_id uuid;
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

  -- Obtém grupo_id da empresa
  SELECT grupo_id INTO v_grupo_id FROM public.empresas WHERE id = v_convite.empresa_id;

  -- 1. Cria ou atualiza perfil_usuario (dependendo de como tá o esquema real, em usuarios_empresas que vincula, perfil_usuario hoje não tem grupo_id nas constraints, pera...)
  -- Atualiza o perfil na tabela usuarios (na documentação, perfil_id fica na tabela usuarios ou na nova vinculação?)
  -- Na modelagem inicial, 'usuarios' tem um 'perfil_id' (global) e também tem 'usuarios_empresas'.
  -- Wait, vamos olhar database.md: usuarios tem 'perfil_id'.
  UPDATE public.usuarios SET perfil_id = v_convite.perfil_id WHERE id = v_user_id;

  -- 2. Vincula à empresa
  INSERT INTO public.usuarios_empresas (usuario_id, empresa_id)
  VALUES (v_user_id, v_convite.empresa_id)
  ON CONFLICT DO NOTHING;

  -- 3. Atualiza o status do convite
  UPDATE public.convites_equipe SET status = 'aceito' WHERE id = v_convite.id;

  RETURN jsonb_build_object('sucesso', true, 'empresa_id', v_convite.empresa_id);
END;
$$;
