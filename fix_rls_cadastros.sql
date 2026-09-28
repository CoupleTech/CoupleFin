-- 1. Habilitar RLS nas tabelas faltantes
ALTER TABLE centro_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinos_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamento_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_alteracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos_fechamento ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas caso existam para evitar conflitos (opcional, mas recomendado)
DROP POLICY IF EXISTS "Acesso centro_custo" ON centro_custo;
DROP POLICY IF EXISTS "Acesso tipo_despesa" ON tipo_despesa;
DROP POLICY IF EXISTS "Acesso contas" ON contas;
DROP POLICY IF EXISTS "Acesso destinos_pagamento" ON destinos_pagamento;
DROP POLICY IF EXISTS "Acesso lancamentos" ON lancamentos;
DROP POLICY IF EXISTS "Acesso lancamento_anexos" ON lancamento_anexos;
DROP POLICY IF EXISTS "Acesso periodos_fechamento" ON periodos_fechamento;
DROP POLICY IF EXISTS "Acesso fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Acesso notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Acesso push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Acesso leitura historico" ON historico_alteracoes;
DROP POLICY IF EXISTS "Acesso insercao historico" ON historico_alteracoes;

-- 3. Criar políticas unificadas de Acesso (SELECT, INSERT, UPDATE, DELETE)

-- Tabelas vinculadas diretamente à empresa (empresa_id)
CREATE POLICY "Acesso centro_custo" ON centro_custo FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios_empresas WHERE usuario_id = auth.uid())
);

CREATE POLICY "Acesso tipo_despesa" ON tipo_despesa FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios_empresas WHERE usuario_id = auth.uid())
);

CREATE POLICY "Acesso contas" ON contas FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios_empresas WHERE usuario_id = auth.uid())
);

CREATE POLICY "Acesso destinos_pagamento" ON destinos_pagamento FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios_empresas WHERE usuario_id = auth.uid())
);

CREATE POLICY "Acesso lancamentos" ON lancamentos FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios_empresas WHERE usuario_id = auth.uid())
);

CREATE POLICY "Acesso lancamento_anexos" ON lancamento_anexos FOR ALL USING (
  lancamento_id IN (
    SELECT id FROM lancamentos WHERE empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas WHERE usuario_id = auth.uid()
    )
  )
);

CREATE POLICY "Acesso periodos_fechamento" ON periodos_fechamento FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios_empresas WHERE usuario_id = auth.uid())
);

-- Tabela vinculada ao grupo (grupo_id)
CREATE POLICY "Acesso fornecedores" ON fornecedores FOR ALL USING (
  grupo_id IN (
    SELECT grupo_id FROM empresas WHERE id IN (
      SELECT empresa_id FROM usuarios_empresas WHERE usuario_id = auth.uid()
    )
  )
);

-- Tabelas vinculadas ao usuário (usuario_id)
CREATE POLICY "Acesso notificacoes" ON notificacoes FOR ALL USING (
  usuario_id = auth.uid()
);

CREATE POLICY "Acesso push_subscriptions" ON push_subscriptions FOR ALL USING (
  usuario_id = auth.uid()
);

-- Tabelas de Histórico
CREATE POLICY "Acesso leitura historico" ON historico_alteracoes FOR SELECT USING (
  usuario_id = auth.uid()
);
CREATE POLICY "Acesso insercao historico" ON historico_alteracoes FOR INSERT WITH CHECK (
  usuario_id = auth.uid()
);
