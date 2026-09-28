-- Script para limpar dados de teste do banco de dados (Reset para Produção)
-- Este script APAGA OS DADOS DOS MÓDULOS DE LANÇAMENTOS E CADASTROS, 
-- mas MANTÉM OS CONVITES, EMPRESAS, GRUPOS ECONÔMICOS, USUÁRIOS E PERFIS.

TRUNCATE TABLE 
  public.historico_alteracoes,
  public.lancamento_anexos,
  public.lancamentos,
  public.centro_custo,
  public.tipo_despesa,
  public.contas,
  public.destinos_pagamento,
  public.fornecedores,
  public.periodos_fechamento
CASCADE;

-- Com o comando acima:
-- A estrutura base da conta (Grupos, Empresas, Configurações de Cor) é preservada.
-- Todos os usuários, perfis e seus vínculos de empresa são preservados.
-- Os Convites pendentes ou aceitos (convites_equipe) continuam funcionando normalmente.
-- Apenas os dados financeiros, movimentações e cadastros secundários (contas bancárias, fornecedores, categorias, etc) são apagados, entregando um sistema "em branco" para os donos operarem.
