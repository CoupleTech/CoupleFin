-- Migration Fase 14: Acréscimos e Descontos em Pagamentos
-- Adiciona colunas para controle de juros/multas e abatimentos.

ALTER TABLE public.lancamentos 
ADD COLUMN IF NOT EXISTS valor_acrescimo numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_desconto numeric DEFAULT 0;

-- Atualizar histórico_alterações se necessário não é obrigatório agora, 
-- mas as colunas novas já passam a existir na tabela de lançamentos.
