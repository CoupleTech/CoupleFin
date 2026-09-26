---
name: Configurações e Fechamento (Fase 5)
description: Diretrizes para o módulo de configurações globais, branding (logo/cores) e gestão de períodos contábeis (fechamento de mês).
---

# Configuração Visual e Fechamento de Período (Fase 5)

Esta fase implementa as configurações sistêmicas do Grupo/Empresas e a lógica restritiva de segurança contábil (Fechamento de Mês).

## 1. Módulo de Configurações (`/configuracoes`)
Uma tela centralizada para gerenciar parâmetros do grupo e da empresa ativa.

**Requisitos da UI:**
- **Branding (Logo):** Permitir o upload de uma imagem (PNG/JPG) que será atualizada no campo `logo_url` da tabela `empresas`. O arquivo deve ir para o Supabase Storage (bucket `assets` ou `anexos`).
- **Cores do Sistema:** Formulário editando a tabela `configuracoes_sistema` (vinculada ao `grupo_id`).
  - Inputs de cor para `cor_primaria`, `cor_secundaria` e `cor_terciaria`.
  - Essa cor pode ser usada em relatórios e PDF (Fase 6). O frontend atual já usa `cor_tema` do usuário para a UI, mas pode oferecer a opção de sincronizar com a cor do grupo.

## 2. Fechamento de Período Contábil (`/fechamento`)
O sistema precisa proteger meses já consolidados contra alterações acidentais de retroativo.

**Regras de Negócio e Tabela (`periodos_fechamento`):**
- **Listagem:** Tela listando os meses do ano (Jan a Dez).
- **Ação Fechar:** Ao "Fechar o Mês" (ex: 09/2026), o sistema insere/atualiza um registro na tabela `periodos_fechamento` com status `'fechado'` e salva `fechado_por` (usuario_id) e `fechado_em`.
- **Ação Reabrir:** Apenas administradores podem reabrir. Ao reabrir, deve registrar a ação `reabertura_periodo` na tabela `historico_alteracoes` (Audit).
- **Bloqueio Ativo (Gatekeeper):** 
  - Toda operação de *Criar, Editar, Baixar ou Estornar* no módulo **Financeiro (Fase 3/4)** precisará validar se a data_competencia pertence a um mês cujo status está 'fechado'. 
  - Se estiver fechado, o botão "Salvar/Confirmar" deve bloquear a requisição na UI (e idealmente no backend também).

## 3. Pipeline de Execução
O agente encarregado deve seguir a ordem:
1. **Tela de Configurações (`src/pages/Configuracoes.tsx`):**
   - Criar formulário de Logo (com compressão de imagem) e Cores do Grupo.
   - Atualizar a tabela `empresas` e fazer upsert em `configuracoes_sistema`.
2. **Tela de Fechamento (`src/pages/Fechamento.tsx`):**
   - Criar a matriz visual de meses.
   - Lógica de Fechar / Reabrir período (com envio de log para Auditoria).
3. **Refatoração Protetiva no Financeiro:**
   - Adicionar uma checagem (contexto global ou hook local) nas telas `Financeiro.tsx`, `ContasPagar.tsx` e `NovoLancamento.tsx` para desativar a edição/criação caso a data selecionada caia num período fechado.
4. **Validação:** QA para garantir que não é possível burlar o mês fechado pelo frontend.

## 4. Validação de Gate
Para esta fase ser considerada concluída:
- A logomarca da empresa deve aparecer no cabeçalho ou sidebar do sistema.
- Um lançamento não pode ser salvo com data de competência caindo dentro de um período com status 'fechado'.
