---
name: Lançamentos Financeiros (Fase 3)
description: Regras de negócio, UI e arquitetura para o módulo de lançamentos manuais e notas fiscais.
---

# Lançamentos Financeiros

Este documento define as diretrizes para a implementação do módulo "Financeiro" (Fase 3), o coração do sistema coupleFin.

## 1. Visão Geral
O módulo de lançamentos deve permitir o registro de saídas e entradas financeiras da empresa, suportando dois tipos principais:
1. **Nota Fiscal:** Exige chave de acesso (NFe/NFS-e), número do documento e anexos (PDF/XML).
2. **Manual:** Para despesas diversas (salários, taxas, saques) e transferências (entre contas ou entre empresas).

## 2. Componentes de UI
- **Página de Listagem (`/financeiro`)**: 
  - Tabela responsiva exibindo os lançamentos do mês atual por padrão.
  - Filtros rápidos: Período, Status de Pagamento (Pendente, Pago, Atrasado), Tipo, e Busca por Fornecedor/Descrição.
  - Indicadores (Cards) no topo: Total a Pagar no mês, Total Pago, Total Atrasado.
  - O design deve seguir os tokens do Impeccable Design (`07-impeccable.md`).

- **Formulário de Lançamento (Página `/financeiro/novo` ou Slide-over Drawer)**:
  - Devido ao grande número de campos (Data de emissão, vencimento, pagamento, fornecedor, centro de custo, conta, tipo de despesa, anexos), recomenda-se um Slide-over (Drawer) largo ou uma página dedicada.
  - Divisão em seções ou abas (Dados Básicos, Classificação, Pagamento, Anexos).
  - Componente de *Drag and Drop* para upload de arquivos.

## 3. Regras de Banco de Dados e Storage
- **Storage:** É necessário criar um bucket no Supabase chamado `anexos`. Todos os arquivos devem ser salvos no path: `{empresa_id}/{lancamento_id}/{nome_do_arquivo}`.
- **Trilha de Auditoria:** 
  - Idealmente, usar uma Trigger no Postgres para alimentar a tabela `historico_alteracoes` em qualquer `UPDATE` na tabela `lancamentos`.
  - Se for feito via aplicação, toda função de edição ou estorno no frontend DEVE registrar o log chamando um insert em `historico_alteracoes`.
- **Status:** Lançamentos nunca devem ser deletados. Devem ser atualizados para `status = 'estornado'` e o campo `motivo_estorno` deve ser preenchido.

## 4. Pipeline de Implementação
O agente encarregado deve seguir esta ordem:

1. **Setup de Banco (DB):** 
   - Revisar se a tabela `lancamentos`, `lancamento_anexos` e `historico_alteracoes` existem.
   - Criar as policies de RLS para estas tabelas (`empresa_id` em `lancamentos`, acesso restrito na auditoria).
2. **Página de Listagem (`src/pages/Financeiro.tsx`):**
   - Implementar a tabela (usar mock data inicialmente ou fetch simples).
   - Aplicar os Cards de resumo (UI).
3. **Página/Modal de Criação (`src/pages/NovoLancamento.tsx` ou componente):**
   - Implementar o formulário complexo com selects populados pelas tabelas base (fornecedores, centros_custo, etc).
   - Regra condicional: Se `tipo == 'nota_fiscal'`, mostrar campo "Chave de Acesso".
   - Regra condicional: Se `subtipo == 'transferencia_conta'`, esconder Fornecedor e mostrar `conta_destino_id`.
4. **Integração de Upload (Storage):**
   - Conectar o input de arquivo à API do Supabase Storage.
5. **Ações e Histórico:**
   - Implementar a função de "Baixa" (Mudar de Pendente para Pago).
   - Implementar a função de "Estorno" (Abrir modal pedindo o motivo).

## 5. Validação de Gate
Nenhum código de lançamento deve ir para a branch principal (ou ser considerado concluído) sem que:
- O RLS impeça que uma empresa veja o lançamento da outra.
- O fechamento de mês/período esteja respeitado (não previsto para bloquear agora, mas o campo `data_competencia` deve ser obrigatório).
- Estorno exija justificativa.
