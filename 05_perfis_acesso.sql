-- Políticas para permitir a criação, edição e exclusão de Perfis de Acesso

-- Permite inserção por usuários autenticados
CREATE POLICY "Criar perfis de usuário" ON public.perfis_usuario
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Permite atualização por usuários autenticados
CREATE POLICY "Editar perfis de usuário" ON public.perfis_usuario
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Permite exclusão por usuários autenticados
CREATE POLICY "Excluir perfis de usuário" ON public.perfis_usuario
  FOR DELETE USING (auth.role() = 'authenticated');
