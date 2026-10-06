CREATE OR REPLACE FUNCTION public.is_member_of_group(target_grupo_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_grupos 
    WHERE usuario_id = auth.uid() 
    AND grupo_id = target_grupo_id
  );
$$;

DROP POLICY IF EXISTS "Ver próprios vínculos de grupo" ON public.usuarios_grupos;
DROP POLICY IF EXISTS "Leitura de vínculos do grupo" ON public.usuarios_grupos;
DROP POLICY IF EXISTS "Gerenciamento de vínculos do grupo" ON public.usuarios_grupos;

-- Permitir que o usuário leia todos os vínculos dos grupos que ele participa
CREATE POLICY "Leitura de vínculos do grupo" ON public.usuarios_grupos
FOR SELECT USING (
  usuario_id = auth.uid() OR public.is_member_of_group(grupo_id)
);

-- Permitir inserir, atualizar e excluir vínculos de grupos que o usuário participa
CREATE POLICY "Gerenciamento de vínculos do grupo" ON public.usuarios_grupos
FOR ALL USING (
  public.is_member_of_group(grupo_id)
) WITH CHECK (
  public.is_member_of_group(grupo_id)
);
