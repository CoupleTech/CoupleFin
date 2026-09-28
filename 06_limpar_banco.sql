-- Script para limpar dados de teste do banco de dados (Reset Total para Produção)
-- Este script APAGA TUDO referente às empresas e grupos de teste, incluindo convites, configurações e lançamentos.
-- Serão mantidos APENAS os registros de "usuarios", "perfis_usuario" e "auth.users".

-- O comando abaixo, devido ao CASCADE, apagará automaticamente os registros das tabelas:
-- - empresas
-- - configuracoes_sistema
-- - centro_custo
-- - tipo_despesa
-- - contas
-- - destinos_pagamento
-- - fornecedores
-- - periodos_fechamento
-- - lancamentos (e anexos)
-- - convites_equipe (Apaga os convites pois as empresas deixam de existir)
-- - usuarios_empresas (Apaga os vínculos dos usuários atuais com as antigas empresas teste)
TRUNCATE TABLE public.grupos_economicos CASCADE;

-- Esvaziamos também o histórico de alterações para não deixar lixo para trás
TRUNCATE TABLE public.historico_alteracoes CASCADE;

-- Obs: Após rodar este script, os usuários atuais que fizerem login precisarão
-- criar uma nova empresa (passar pelo onboarding) pois não estarão vinculados a nenhuma empresa ativa.
