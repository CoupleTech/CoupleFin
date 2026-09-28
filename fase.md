# Controle de Fases e Pipeline de Desenvolvimento

Este arquivo controla as fases de desenvolvimento do projeto **coupleFin**, integrando o pipeline obrigatório definido em `/skills/00-lean-orchestrator.md` com as entregas definidas na documentação mestra (`documentacao.md`).

## Status Atual do Projeto
**Fase Atual:** 🎉 MVP Concluído
**Skill Atual:** -
**Status de Liberação:** Produção / Deploy

---

## Macro Fases do Projeto

### Fase 1: Fundação (CONCLUÍDA)
**Objetivo:** Setup do projeto (React + Supabase), autenticação/onboarding, estrutura multi-tenant (grupo/empresas), RLS básica, seletor de empresa.

**Referências na `documentacao.md`:**
- `3. Arquitetura Multi-Tenant`
- `4.1 Autenticação e Onboarding`
- `7. Segurança e Multi-tenancy (RLS)`
- `10. Setup de Ambiente e Estrutura do Projeto`

*Pipeline de Execução:*
- [x] 1. Security Rules (`01-baas-security-constitution`)
- [x] 2. Product Validation (`02-lean-product-prp`)
- [x] 3. Architecture Validation (`03-supabase-architecture-review`)
- [x] 4. Code Generation (Implementação)
- [x] 5. QA Validation (`04-qa-production-review`)
- [x] 6. Release Decision

---

### Fase 2: Cadastros (CONCLUÍDA)
**Objetivo:** CRUD de cadastros base.
- [x] Grupos Econômicos
- [x] Empresas
- [x] Centros de Custo
- [x] Tipos de Despesa
- [x] Contas
- [x] Destinos de Pagamento
- [x] Usuários/Perfis
- [x] Fornecedores
- `4.2 Cadastros Base`
- `4.6 Cadastro de Usuários`
- `4.7 Cadastro de Fornecedores`
- `5.3 Usuários e perfis`
- `5.4 Cadastros base (por empresa)`
- `5.5 Fornecedores`

*Pipeline de Execução:*
- [x] 1. Security Rules (`01-baas-security-constitution`)
- [x] 2. Product Validation (`02-lean-product-prp`)
- [x] 3. Architecture Validation (`03-supabase-architecture-review`)
- [x] 4. Code Generation (Implementação)
- [x] 5. QA Validation (`04-qa-production-review`)
- [x] 6. Release Decision

---

### Fase 3: Lançamentos (CONCLUÍDA)
**Objetivo:** Módulo de nota fiscal e módulo manual (incluindo transferências), com upload de anexos.

**Referências na `documentacao.md`:**
- `4.3 Lançamento de Notas Fiscais`
- `4.4 Lançamento Manual`
- `5.6 Lançamentos, anexos e histórico`

*Pipeline de Execução:*
- [x] 1. Security Rules (`01-baas-security-constitution`)
- [x] 2. Product Validation (`02-lean-product-prp`)
- [x] 3. Architecture Validation (`03-supabase-architecture-review`)
- [x] 4. Code Generation (Implementação)
- [x] 5. QA Validation (`04-qa-production-review`)
- [x] 6. Release Decision

---

### Fase 4: Contas a Pagar e Auditoria (CONCLUÍDA)
**Objetivo:** Controle de vencimento/status de pagamento e trilha de histórico de alterações.

**Referências na `documentacao.md`:**
- `4.5 Contas a Pagar / Fluxo de Vencimentos`
- `4.13 Auditoria e Histórico de Alterações`

*Pipeline de Execução:*
- [x] 1. Security Rules (`01-baas-security-constitution`)
- [x] 2. Product Validation (`02-lean-product-prp`)
- [x] 3. Architecture Validation (`03-supabase-architecture-review`)
- [x] 4. Code Generation (Implementação)
- [x] 5. QA Validation (`04-qa-production-review`)
- [x] 6. Release Decision

---

### Fase 5: Configuração visual e fechamento de período (CONCLUÍDA)
**Objetivo:** Cores do sistema e logo por empresa, aplicadas em tela e em exportações; regra de fechamento contábil mensal.

**Referências na `documentacao.md`:**
- `4.8 Módulo de Configuração`
- `5.2 Configuração visual e fechamento de período`

*Pipeline de Execução:*
- [x] 1. Security Rules (`01-baas-security-constitution`)
- [x] 2. Product Validation (`02-lean-product-prp`)
- [x] 3. Architecture Validation (`03-supabase-architecture-review`)
- [x] 4. Code Generation (Implementação)
- [x] 5. QA Validation (`04-qa-production-review`)
- [x] 6. Release Decision

---

### Fase 6: DRE e Relatórios (CONCLUÍDA)
**Objetivo:** Geração de DRE contábil/financeiro, relatórios analíticos, exportação PDF/Excel/impressão.

**Referências na `documentacao.md`:**
- `4.9 DRE (Demonstração do Resultado do Exercício)`
- `4.10 Relatórios`
- `5.7 Classificação contábil`

*Pipeline de Execução:*
- [x] 1. Security Rules (`01-baas-security-constitution`)
- [x] 2. Product Validation (`02-lean-product-prp`)
- [x] 3. Architecture Validation (`03-supabase-architecture-review`)
- [x] 4. Code Generation (Implementação)
- [x] 5. QA Validation (`04-qa-production-review`)
- [x] 6. Release Decision

---

### Fase 7: Dashboard (CONCLUÍDA)
**Objetivo:** Indicadores e gráficos, incluindo alertas de vencimento.

**Referências na `documentacao.md`:**
- `4.11 Dashboard Financeiro`

*Pipeline de Execução:*
- [x] 1. Security Rules (`01-baas-security-constitution`)
- [x] 2. Product Validation (`02-lean-product-prp`)
- [x] 3. Architecture Validation (`03-supabase-architecture-review`)
- [x] 4. Code Generation (Implementação)
- [x] 5. QA Validation (`04-qa-production-review`)
- [x] 6. Release Decision

---

### Fase 8: PWA (CONCLUÍDA)
**Objetivo:** Manifest, service worker, leitura de chave via câmera.

**Referências na `documentacao.md`:**
- `4.12 Versão PWA`

*Pipeline de Execução:*
- [x] 1. Security Rules (`01-baas-security-constitution`)
- [x] 2. Product Validation (`02-lean-product-prp`)
- [x] 3. Architecture Validation (`03-supabase-architecture-review`)
- [x] 4. Code Generation (Implementação)
- [x] 5. QA Validation (`04-qa-production-review`)
- [x] 6. Release Decision

---

## 🎉 PROJETO MVP CONCLUÍDO
Todas as fases planejadas para o Minimum Viable Product (MVP) do CoupleFin foram finalizadas com sucesso.

---

### Fase 9: Melhorias de UX e Escalabilidade de Interface (CONCLUÍDA)
**Objetivo:** Ajustes de layout, usabilidade, paginação e correções de fuso horário em datas.

**Tarefas Planejadas:**
- [x] 1. **Header e Layout:** 
   - Remover o campo "Buscar" do header superior (pois não está funcional na posição atual).
   - Mover a identificação do usuário logado (círculo com inicial do nome) do menu lateral para o canto superior direito do header.
   - Manter o botão "Sair" no menu inferior, mas adicionar uma borda a ele utilizando a cor principal (var(--color-primary)) do sistema, de forma que acompanhe as mudanças de cor feitas pelo usuário.
   - Aumentar a largura máxima das telas. O layout atual centralizado está muito bom, mas deixa uma área branca "perdida" nas laterais. Expandir a "max-width" para otimizar o espaço.
- [x] 2. **Paginação:**
   - Implementar sistema de paginação em todas as telas que possuam listas (para evitar lentidão/listas gigantes no futuro).
   - O padrão será exibir os 15 primeiros itens, com seletor para o usuário alterar a visualização para 15, 30, 50, 100 ou "Todos".
- [x] 3. **Busca Local:**
   - Incluir um campo de busca/filtro local nas telas que exibem listas, compensando a remoção do buscar global do header.
- [x] 4. **Correção de Fuso Horário (Timezone/UTC):**
   - Revisar todos os inputs de data e suas exibições no sistema para que desconsiderem conversão de UTC automática. Exemplo crítico: se o usuário inserir `26/09/2026`, o sistema deve garantir que exiba e salve exatamente `26/09/2026`, prevenindo que caia pro dia 25 ou 27 dependendo do fuso horário local da máquina.

*Pipeline de Execução:*
- [x] 1. Planejamento (Atual)
- [x] 2. Implementação do Layout e Busca
- [x] 3. Implementação da Paginação (Backend + Frontend)
- [x] 4. Correção Global de Componentes de Data
- [x] 5. Release Decision

---

### Fase 10: Notificações e Web Push (PENDENTE)
**Objetivo:** Fazer o ícone do "Sino" funcionar com um painel de notificações in-app e implementar Web Push para avisos no celular via PWA.

**Tarefas Planejadas:**
- [x] 1. **Revisão do PWA:**
   - Diagnosticar e corrigir por que a atualização via Modal PWA não funcionou corretamente no mobile/desktop.
- [x] 2. **Modelagem de Dados (Notificações):**
   - Criar tabela `notificacoes` para histórico in-app (lidas/não lidas).
   - Criar tabela `push_subscriptions` para guardar inscrições de notificação push dos navegadores.
- [x] 3. **Interface do Sino:**
   - Criar um Dropdown no ícone do sino (`Bell`) no `Layout.tsx` para listar as últimas notificações, marcar como lida e redirecionar para links.
- [~] 4. **Motor de Web Push (Parcialmente Concluído):**
   - [x] Implementar assinatura de Push API no Service Worker.
   - [ ] Criar gatilhos e enviar notificações (Backend / Supabase Edge Functions pendentes).

*Pipeline de Execução:*
- [x] 1. Planejamento na documentação e banco de dados.
- [x] 2. Criação das tabelas no Supabase.
- [x] 3. Criação da UI (Dropdown de Notificações).
- [~] 4. Integração do Web Push (Frontend OK + Backend Pendente).
- [ ] 5. Testes e Release.

---

### Fase 11: Convite de Usuários e Refinamentos de UI (CONCLUÍDA)
**Objetivo:** Implementar o fluxo real de convite de usuários na equipe via Supabase Admin Auth e corrigir refinamentos estéticos remanescentes.

**Tarefas Planejadas:**
- [x] 1. **Correção UI - Botão do Menu:** Corrigir o botão de recolher/expandir o menu lateral (Desktop) que ficou com a borda direita cortada devido ao overflow do scroll.
- [x] 2. **Correção UI - Centralização de Telas:** Centralizar as páginas de "Configurações" e "Fechamento" (que estão alinhadas esticadas à esquerda na tela grande), aplicando classes para mantê-las em largura máxima focada (`max-w-5xl mx-auto`).
- [x] 3. **Correção UI - Input de Data (Dashboard):** Fixar uma largura mínima no `<input type="month">` do Dashboard/DRE/Relatórios no Desktop, que ficou "espremido" (`setembro de...`) com as mudanças anteriores.
- [x] 4. **Integração Backend - Convite de Usuário:**
   - Remover o aviso temporário ("Para adicionar novos usuários...") e criar o fluxo real.
   - Utilizar a arquitetura de Convite (Token via Link Mágico) sem dependência de Edge Functions com a RPC Segura e Signup via tela `AceitarConvite`.
   - Vincular os novos usuários às empresas correspondentes automaticamente através da função RPC Security Definer.

*Pipeline de Execução:*
- [x] 1. Registro e Planejamento.
- [x] 2. Ajustes Visuais (Menu, Centralização e Data).
- [x] 3. Criação da tabela, RPC e tela de Aceitação.
- [x] 4. Testes do Fluxo de Novos Usuários.
- [x] 5. Release Decision.

---

### Fase 12: Refatoração Arquitetural (Acesso por Grupo Econômico) (EM ANDAMENTO)
**Objetivo:** Alterar a arquitetura multi-tenant para que o usuário seja vinculado ao Grupo Econômico, em vez de Empresas individuais.

**Tarefas Planejadas:**
- [ ] 1. **Banco de Dados (Tabelas):** Excluir a tabela `usuarios_empresas` e criar a tabela `usuarios_grupos`.
- [ ] 2. **Banco de Dados (Convites e RPC):** Alterar a tabela `convites_equipe` (`empresa_id` -> `grupo_id`) e atualizar a RPC `aceitar_convite_usuario`.
- [ ] 3. **Banco de Dados (RLS):** Reescrever as regras de segurança de todas as tabelas transacionais para validar acesso via `usuarios_grupos`.
- [ ] 4. **Frontend:** Ajustar `Equipe.tsx` (geração de convites) e `useAppStore.ts` para trabalhar nativamente em nível de Grupo.

*Pipeline de Execução:*
- [x] 1. Planejamento (Atualização Fase.md)
- [x] 2. Execução Passo 1: Tabelas Base
- [ ] 3. Execução Passo 2: Convites e RPC
- [ ] 4. Execução Passo 3: Políticas RLS
- [ ] 5. Execução Passo 4: Frontend
- [ ] 6. Testes Finais e Release
