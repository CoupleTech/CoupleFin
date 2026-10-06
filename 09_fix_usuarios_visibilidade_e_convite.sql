-- ============================================================
-- Fix 09: Visibilidade de Usuarios do Grupo + Atualizacao de Nome no Convite
-- ============================================================
-- Problemas que este script resolve:
-- 1. Usuarios convidados NAO aparecem na tela de Equipe
--    Causa: politica RLS de "usuarios" so permite ler o proprio registro.
--    Precisamos permitir que qualquer membro do grupo leia todos os usuarios do mesmo grupo.
-- 2. Nome do usuario convidado fica como "Usuario" (nome padrao do trigger)
--    A RPC aceitar_convite_usuario agora tambem salva o nome vindo dos metadados do Auth.
-- 3. Usuarios convidados podem nao estar em usuarios_grupos
--    A Parte 3 reconstroi vinculos baseados em convites aceitos.
-- ============================================================


-- ============================================================
-- PARTE 1: Corrigir visibilidade de usuarios do grupo na tela de Equipe
-- ============================================================

DROP POLICY IF EXISTS "Ler proprio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Ler usuarios do grupo" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios do grupo" ON public.usuarios;

CREATE POLICY "Ler usuarios do grupo" ON public.usuarios
FOR SELECT USING (
  id = auth.uid()
  OR
  id IN (
    SELECT ug2.usuario_id
    FROM public.usuarios_grupos ug1
    JOIN public.usuarios_grupos ug2 ON ug1.grupo_id = ug2.grupo_id
    WHERE ug1.usuario_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Atualizar usuarios do grupo" ON public.usuarios;
CREATE POLICY "Atualizar usuarios do grupo" ON public.usuarios
FOR UPDATE USING (
  id = auth.uid()
  OR
  id IN (
    SELECT ug2.usuario_id
    FROM public.usuarios_grupos ug1
    JOIN public.usuarios_grupos ug2 ON ug1.grupo_id = ug2.grupo_id
    WHERE ug1.usuario_id = auth.uid()
  )
);


-- ============================================================
-- PARTE 2: Atualizar RPC de aceitacao de convite para salvar nome corretamente
-- ============================================================

CREATE OR REPLACE FUNCTION public.aceitar_convite_usuario(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_convite record;
  v_user_id uuid;
  v_nome_usuario text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  SELECT COALESCE(
    raw_user_meta_data->>'nome',
    raw_user_meta_data->>'full_name',
    'Usuario'
  )
  INTO v_nome_usuario
  FROM auth.users
  WHERE id = v_user_id;

  SELECT * INTO v_convite
  FROM public.convites_equipe
  WHERE token = p_token AND status = 'pendente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite invalido ou ja utilizado.';
  END IF;

  UPDATE public.usuarios
  SET
    nome = v_nome_usuario,
    perfil_id = v_convite.perfil_id
  WHERE id = v_user_id;

  INSERT INTO public.usuarios_grupos (usuario_id, grupo_id)
  VALUES (v_user_id, v_convite.grupo_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.convites_equipe
  SET status = 'aceito'
  WHERE id = v_convite.id;

  RETURN jsonb_build_object('sucesso', true, 'grupo_id', v_convite.grupo_id);
END;
$func$;


-- ============================================================
-- PARTE 3: Corrigir usuarios ja convidados sem vinculo de grupo
-- ============================================================

-- DIAGNOSTICO: rode esta query antes para confirmar quem esta sem vinculo:
-- SELECT u.id, u.nome, u.email
-- FROM public.usuarios u
-- LEFT JOIN public.usuarios_grupos ug ON ug.usuario_id = u.id
-- WHERE ug.usuario_id IS NULL;

-- CORRECAO: reconstroi vinculos dos convites ja aceitos
INSERT INTO public.usuarios_grupos (usuario_id, grupo_id)
SELECT DISTINCT
  u.id AS usuario_id,
  c.grupo_id
FROM public.convites_equipe c
JOIN public.usuarios u ON u.email = c.email
WHERE c.status = 'aceito'
ON CONFLICT DO NOTHING;
