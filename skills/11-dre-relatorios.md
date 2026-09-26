---
name: DRE e Relatórios (Fase 6)
description: Diretrizes para o módulo de DRE (Demonstração do Resultado do Exercício) e Relatórios gerenciais com exportação em PDF e Excel.
---

# DRE e Relatórios (Fase 6)

Esta fase implementa a inteligência de negócios do sistema, transformando os lançamentos operacionais em demonstrativos estruturados para análise financeira e contábil.

## 1. DRE (Demonstração do Resultado do Exercício)
Caminho: `/dre`

**Visões:**
- **Contábil:** Filtra lançamentos pela `data_competencia`.
- **Financeiro (Fluxo de Caixa):** Filtra lançamentos pela `data_pagamento` e considera apenas os que têm `status_pagamento = 'pago'`.

**Filtros:**
- Mês/Ano de referência ou Período Livre (Data Inicial e Data Final).
- Nível de Visão: Empresa Selecionada ou Grupo Consolidado (todas as empresas).

**Estrutura de Exibição (Hierarquia do DRE):**
O agrupamento será baseado no campo `grupo_dre` da tabela `tipo_despesa` atrelado aos lançamentos.
1. (+) Receita Bruta
2. (-) Deduções da Receita
3. (=) Receita Líquida
4. (-) Custos (CPV/CSV)
5. (=) Lucro Bruto
6. (-) Despesas Operacionais / Administrativas
7. (-) Despesas Financeiras
8. (=) Resultado antes de Impostos
9. (-) Impostos sobre o Lucro
10. (=) Resultado Líquido

*Cada linha de grupo deve poder ser expandida para mostrar os "Tipos de Despesa" correspondentes e os valores somados.*

## 2. Relatórios Analíticos
Caminho: `/relatorios`

Uma central com diferentes abas ou seletores de tipo de relatório:
- **Analítico por Centro de Custo:** Soma de valores agrupada por cada centro de custo.
- **Analítico por Fornecedor:** Ranking de gastos por fornecedor.
- **Extrato Financeiro por Conta:** Fluxo de entradas e saídas agrupadas por conta bancária.

**Filtros comuns:** Período de competência/pagamento, Empresa vs Consolidado.

## 3. Exportações
Aplica-se tanto ao DRE quanto aos Relatórios:
- **Imprimir/PDF:** Utilizar CSS `@media print` para formatar a tabela ou biblioteca específica se necessário. A impressão deve injetar um cabeçalho com a logo da empresa ativa (se houver) e o título do relatório.
- **Excel:** Utilizar biblioteca como `xlsx` (SheetJS) ou gerar um CSV com os dados da tabela exibida na tela.

## 4. Pipeline de Execução (Próximos Passos)
1. Instalar bibliotecas de exportação (ex: `npm install xlsx`).
2. Criar os componentes e rotas para `DRE.tsx` e `Relatorios.tsx`.
3. Construir as lógicas de agrupamento e soma (utilizar hooks ou funções utilitárias que puxam de `lancamentos` com join em `tipo_despesa` e `centro_custo`).
4. Implementar a tabela visual da DRE e dos Relatórios.
5. Adicionar os botões de "Exportar Excel" e "Imprimir".
6. Inserir a checagem no Layout (sidebar) para acessar os novos menus.
