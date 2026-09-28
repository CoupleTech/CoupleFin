-- Passo 2: Convites de Equipe e Função RPC

-- 1. Alterar a tabela convites_equipe para apontar para grupos_economicos
ALTER TABLE public.convites_equipe DROP COLUMN empresa_id CASCADE;
ALTER TABLE public.convites_equipe ADD COLUMN grupo_id uuid REFERENCES public.grupos_economicos(id) ON DELETE CASCADE NOT NULL;

-- 2. Atualizar a RPC de aceitação de convite para salvar o usuário no Grupo e não na Empresa
CREATE OR REPLACE FUNCTION public.aceitar_convite_usuario(p_token uuid)
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

  -- 1. Atualiza o perfil na tabela usuarios
  UPDATE public.usuarios SET perfil_id = v_convite.perfil_id WHERE id = v_user_id;

  -- 2. Vincula ao Grupo Econômico (Substitui usuarios_empresas por usuarios_grupos)
  INSERT INTO public.usuarios_grupos (usuario_id, grupo_id)
  VALUES (v_user_id, v_convite.grupo_id)
  ON CONFLICT DO NOTHING;

  -- 3. Atualiza o status do convite
  UPDATE public.convites_equipe SET status = 'aceito' WHERE id = v_convite.id;

  RETURN jsonb_build_object('sucesso', true, 'grupo_id', v_convite.grupo_id);
END;
$$;
