---
name: Dashboard (Fase 7)
description: Diretrizes para a criação do Dashboard Financeiro com indicadores e gráficos analíticos.
---

# Dashboard (Fase 7)

Esta fase foca em trazer informações gerenciais rápidas para o usuário, permitindo o acompanhamento da saúde financeira do grupo ou de empresas individuais em um painel visual e dinâmico.

## 1. Localização e Escopo
O Dashboard será exibido na rota `/` (página inicial) sob o componente `Dashboard.tsx`.

## 2. Componentes e Indicadores (Cards)
Os seguintes cards de totais rápidos devem ser exibidos no topo da página:
- **Total de Gastos (Despesas):** Soma de todos os lançamentos de saída do período selecionado.
- **Receitas (Opcional):** Soma de todos os lançamentos de entrada do período (se houver).
- **Contas a Vencer (Próximos 7 dias):** Total financeiro e contagem de títulos.
- **Contas Atrasadas:** Total financeiro e contagem de títulos vencidos que não estão pagos.

## 3. Gráficos Necessários
Utilizar a biblioteca **Recharts** (`npm install recharts`) para montagem visual:
1. **Evolução Temporal (Gráfico de Linhas/Área):** Gastos ao longo dos dias do mês selecionado.
2. **Distribuição por Centro de Custo (Pizza/Rosca):** Percentual de gastos por cada centro de custo.
3. **Distribuição por Tipo de Despesa (Barra Horizontal):** Top categorias que mais geraram custos.
4. **Empresas que mais custam (Barra):** (Apenas se a visualização for Consolidada).

## 4. Filtros
- **Período (Mês/Ano):** Padrão = Mês atual.
- **Empresa / Grupo (Seletor Global):** A troca da empresa ativa no Layout já filtrará os dados, mas deve existir a opção no Dashboard de alternar entre a visão da "Empresa Atual" ou "Consolidado do Grupo".

## 5. Passos para Implementação
1. Instalar o pacote `recharts`.
2. Refatorar ou evoluir a página `Dashboard.tsx` atual (que provavelmente está vazia ou com placeholders) para conter os cards e o layout responsivo.
3. Construir as consultas (Supabase) agrupadas pelas dimensões requeridas e formatar os dados para a biblioteca gráfica.
4. Garantir que as cores dos gráficos conversem com a paleta do sistema ou do Tailwind.
