---
name: Contas a Pagar e Auditoria (Fase 4)
description: Regras e UI para o painel de vencimentos (Contas a Pagar) e a trilha de auditoria do sistema.
---

# Contas a Pagar e Auditoria (Fase 4)

Este documento define as diretrizes para a Fase 4 do projeto coupleFin, que foca na visibilidade dos compromissos futuros e na segurança do rastreio de alterações.

## 1. Contas a Pagar (Gestão de Vencimentos)
Apesar do módulo `Financeiro` já possuir uma tabela geral, o módulo de **Contas a Pagar** (`/contas-pagar`) deve ser uma tela focada exclusivamente na previsão de fluxo de caixa e compromissos.

**Requisitos da UI:**
- **Layout:** Pode ser implementado como uma lista focada (agrupada por dias/semanas) ou como um Kanban (Colunas: Atrasadas, Vencem Hoje, Vencem na Semana, Vencem no Mês). 
- **Filtro:** Somente exibirá lançamentos onde `status_pagamento IN ('pendente', 'atrasado')` e `status != 'estornado'`.
- **Ações:** Deve permitir dar baixa rápida nos lançamentos diretamente dessa tela.

## 2. Auditoria e Histórico de Alterações
A segurança e a rastreabilidade são essenciais. Na Fase 3 o sistema já foi configurado para inserir registros na tabela `historico_alteracoes`. Agora precisamos de uma interface para visualizar isso.

**Requisitos da UI (`/auditoria`):**
- **Acesso:** (Opcional) Visível apenas para o Perfil de Administrador (no futuro). Por enquanto, apenas criar a rota.
- **Layout:** Tabela cronológica mostrando:
  1. Data e Hora
  2. Usuário (Nome)
  3. Ação (Ex: `estorno`, `edicao`, `criacao`)
  4. Tabela afetada (Ex: `lancamentos`)
  5. Detalhes (Valor antigo -> Valor novo)
- **Filtros:** Busca por usuário ou período de datas.

## 3. Pipeline de Execução
O agente encarregado deve seguir a ordem:
1. **Página de Contas a Pagar (`src/pages/ContasPagar.tsx`):**
   - Criar a página, adicionar ao Router (`App.tsx`) e ao Menu Lateral (`Layout.tsx` com ícone de calendário ou alarme).
   - Fazer o fetch focado em vencimentos.
2. **Página de Auditoria (`src/pages/Auditoria.tsx`):**
   - Criar a página, adicionar ao Router e Menu Lateral (Ícone de Escudo ou Histórico).
   - Fazer o fetch na tabela `historico_alteracoes`, com join em `usuarios(nome)`.
3. **Teste de Fluxo:** 
   - Estornar/Baixar um item no Financeiro e verificar se ele aparece imediatamente na tela de Auditoria.

## 4. Validação de Gate
Para esta fase ser considerada concluída:
- A tela de contas a pagar não deve exibir lançamentos já pagos.
- O histórico de alterações não pode ser apagado (frontend não deve ter botão de excluir na auditoria).
