-- Script para limpar dados de teste do banco de dados (Reset para Produção)
-- CUIDADO: Este script exclui definitivamente as empresas, grupos e todos os lançamentos atrelados a eles.
-- As tabelas "usuarios", "perfis_usuario" e "auth.users" serão mantidas.
-- Porém, os vínculos (usuarios_empresas) serão perdidos devido ao CASCADE, então você precisará recriar ou o onboarding será acionado.

TRUNCATE TABLE public.grupos_economicos CASCADE;

-- O comando acima (graças ao CASCADE) limpará automaticamente:
-- - empresas
-- - configuracoes_sistema
-- - centro_custo
-- - tipo_despesa
-- - contas
-- - destinos_pagamento
-- - fornecedores
-- - periodos_fechamento
-- - lancamentos (e anexos)
-- - convites_equipe
-- - usuarios_empresas

-- Para garantir que logs de histórico que não estejam atrelados via FK forte também sumam:
TRUNCATE TABLE public.historico_alteracoes;
