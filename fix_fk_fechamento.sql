-- Corrige a tabela periodos_fechamento que foi criada sem a Foreign Key de 'fechado_por' para 'usuarios'
ALTER TABLE periodos_fechamento
ADD CONSTRAINT periodos_fechamento_fechado_por_fkey
FOREIGN KEY (fechado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
