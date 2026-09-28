-- Passo 3: Reescrever as Políticas RLS (Segurança)

-- 1. Remover políticas antigas de Grupos e Empresas
DROP POLICY IF EXISTS "Permitir leitura para usuarios do grupo" ON grupos_economicos;
DROP POLICY IF EXISTS "Leitura de empresas do usuario" ON empresas;
DROP POLICY IF EXISTS "Acesso configuracoes_sistema" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Gerenciar convites da própria empresa" ON convites_equipe;

-- Criar Novas Políticas de Acesso Total (Leitura e Escrita) para quem pertence ao Grupo
CREATE POLICY "Acesso grupos_economicos" ON grupos_economicos FOR ALL USING (
  id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid())
);

CREATE POLICY "Acesso empresas" ON empresas FOR ALL USING (
  grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid())
);

CREATE POLICY "Acesso configuracoes_sistema" ON configuracoes_sistema FOR ALL USING (
  grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid())
);

CREATE POLICY "Gerenciar convites do proprio grupo" ON convites_equipe FOR ALL USING (
  grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid())
);


-- 2. Remover políticas antigas dos cadastros operacionais
DROP POLICY IF EXISTS "Acesso centro_custo" ON centro_custo;
DROP POLICY IF EXISTS "Acesso tipo_despesa" ON tipo_despesa;
DROP POLICY IF EXISTS "Acesso contas" ON contas;
DROP POLICY IF EXISTS "Acesso destinos_pagamento" ON destinos_pagamento;
DROP POLICY IF EXISTS "Acesso fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Acesso lancamentos" ON lancamentos;
DROP POLICY IF EXISTS "Acesso lancamento_anexos" ON lancamento_anexos;
DROP POLICY IF EXISTS "Acesso periodos_fechamento" ON periodos_fechamento;

-- 3. Recriar políticas operacionais baseadas no usuarios_grupos

-- Tabelas vinculadas ao grupo_id (Simplificou bastante)
CREATE POLICY "Acesso fornecedores" ON fornecedores FOR ALL USING (
  grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid())
);

-- Tabelas vinculadas à empresa_id (Verificam se a empresa pertence ao grupo do usuário)
CREATE POLICY "Acesso centro_custo" ON centro_custo FOR ALL USING (
  empresa_id IN (SELECT id FROM empresas WHERE grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid()))
);

CREATE POLICY "Acesso tipo_despesa" ON tipo_despesa FOR ALL USING (
  empresa_id IN (SELECT id FROM empresas WHERE grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid()))
);

CREATE POLICY "Acesso contas" ON contas FOR ALL USING (
  empresa_id IN (SELECT id FROM empresas WHERE grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid()))
);

CREATE POLICY "Acesso destinos_pagamento" ON destinos_pagamento FOR ALL USING (
  empresa_id IN (SELECT id FROM empresas WHERE grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid()))
);

CREATE POLICY "Acesso periodos_fechamento" ON periodos_fechamento FOR ALL USING (
  empresa_id IN (SELECT id FROM empresas WHERE grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid()))
);

CREATE POLICY "Acesso lancamentos" ON lancamentos FOR ALL USING (
  empresa_id IN (SELECT id FROM empresas WHERE grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid()))
);

CREATE POLICY "Acesso lancamento_anexos" ON lancamento_anexos FOR ALL USING (
  lancamento_id IN (
    SELECT id FROM lancamentos WHERE empresa_id IN (
      SELECT id FROM empresas WHERE grupo_id IN (SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = auth.uid())
    )
  )
);
