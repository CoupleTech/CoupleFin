# 🎨 Plano de Melhorias Globais de UI/UX — CoupleFin

> **Objetivo:** Aprimorar o layout e design system existente de forma **global**, para que todas as futuras funcionalidades já nasçam com o padrão correto. Não é uma reescrita — é um refinamento consistente.
>
> **Fase do Projeto:** Fase 2 — Cadastros (em andamento). O sistema é pequeno (4 páginas), momento ideal para estabelecer a fundação visual definitiva.

---

## 1. Estado Atual do Projeto

### 1.1 Arquivos e Estrutura

| Arquivo | O que faz | Tamanho |
|---|---|---|
| [`src/index.css`](file:///d:/Repositorios/coupleFin/src/index.css) | CSS global (14 linhas, só `@tailwind` + 1 variável) | Mínimo |
| [`tailwind.config.js`](file:///d:/Repositorios/coupleFin/tailwind.config.js) | Config Tailwind com cor primary dinâmica via CSS var | 25 linhas |
| [`src/components/layout/Layout.tsx`](file:///d:/Repositorios/coupleFin/src/components/layout/Layout.tsx) | Shell do app: sidebar + header + content area | 160 linhas |
| [`src/pages/Login.tsx`](file:///d:/Repositorios/coupleFin/src/pages/Login.tsx) | Tela de login/signup | 103 linhas |
| [`src/pages/Dashboard.tsx`](file:///d:/Repositorios/coupleFin/src/pages/Dashboard.tsx) | Placeholder do dashboard | 49 linhas |
| [`src/pages/Grupos.tsx`](file:///d:/Repositorios/coupleFin/src/pages/Grupos.tsx) | CRUD de Grupos Econômicos (tabela + modal) | 212 linhas |
| [`src/pages/Empresas.tsx`](file:///d:/Repositorios/coupleFin/src/pages/Empresas.tsx) | CRUD de Empresas (tabela + modal) | 356 linhas |
| [`src/store/useAppStore.ts`](file:///d:/Repositorios/coupleFin/src/store/useAppStore.ts) | Zustand store (user, empresas, empresaAtiva) | 34 linhas |
| [`src/App.tsx`](file:///d:/Repositorios/coupleFin/src/App.tsx) | Router + auth check + cor dinâmica | 89 linhas |

### 1.2 Stack Visual Atual

- **Tailwind CSS** com `Inter` como font-family
- Cor primary dinâmica via `--color-primary` (CSS variable), default `#f97316` (laranja)
- Variantes geradas por `color-mix()` no tailwind.config
- **Lucide React** para ícones
- Sem componentes reutilizáveis — tudo inline nas páginas
- Sem design tokens formais
- Sem responsividade mobile (sidebar fixa 264px, sem drawer)
- Sem dark mode funcional (toggle existe mas não faz nada)

---

## 2. Diagnóstico: O Que Precisa Melhorar

### 2.1 Problemas Estruturais (Prioridade Alta)

| # | Problema | Onde | Impacto |
|---|---|---|---|
| 1 | **Sem responsividade** — sidebar é `fixed w-64`, main tem `ml-64`, quebra em mobile/tablet | `Layout.tsx` | Todo o sistema é inacessível em mobile |
| 2 | **Sem design tokens** — cores, espaçamentos, bordas e sombras são ad-hoc por componente | `index.css` + todos os arquivos | Inconsistência visual conforme cresce |
| 3 | **Sem componentes reutilizáveis** — botões, inputs, cards, tabelas, modais, badges, empty states duplicados | Todas as páginas | Cada nova tela reinventa a roda |
| 4 | **Header estático** — sempre mostra "Aqui está o resumo financeiro de hoje" mesmo em tela de Empresas | `Layout.tsx:129` | Confuso, parece placeholder |
| 5 | **Loading screen genérica** — `Carregando...` em texto puro na tela de boot | `App.tsx:74` | Primeira impressão fraca |

### 2.2 Problemas Visuais (Prioridade Média)

| # | Problema | Onde |
|---|---|---|
| 6 | **Login básico demais** — caixa branca centralizada sem identidade visual | `Login.tsx` |
| 7 | **Logo improvisada** — duas barras `/` sobrepostas como logo | `Layout.tsx:49-50` |
| 8 | **Tipografia sem hierarquia clara** — h1/h2/h3 não seguem escala definida | Global |
| 9 | **Tabelas sem polish** — sem hover highlight na row inteira, sem responsividade mobile | `Grupos.tsx`, `Empresas.tsx` |
| 10 | **Modais sem animação de entrada/saída** — classes `animate-in` não funcionam sem plugin | `Grupos.tsx`, `Empresas.tsx` |
| 11 | **Seletor de empresa no Dashboard** — select nativo, deveria estar no header/sidebar | `Dashboard.tsx` |
| 12 | **Dark mode toggle não funcional** — botão existe na sidebar, não faz nada | `Layout.tsx:84-92` |

### 2.3 Problemas de Padrão (Skills Violadas)

| Skill | Regra Violada | Detalhes |
|---|---|---|
| `_5ui-design-system` | §2.4 "3 core colors only" | Só existe `primary`, falta secondary e accent |
| `_5ui-design-system` | §6 "Loading/Empty/Error states" | Componentes ad-hoc, não padronizados |
| `_5ui-design-system` | §5 "Transitions 150-200ms" | Sem sistema de transições consistente |
| `_3dashboard-layout` | §1.1 "Sidebar collapsed state" | Sidebar não colapsa |
| `_3dashboard-layout` | §7 "Mobile: sidebar becomes drawer" | Não implementado |
| `_3dashboard-layout` | §8 "All screens support loading/empty/error/partial" | Parcial |
| `_4responsive-design` | §3 "Breakpoint strategy" | Nenhum breakpoint implementado |
| `_4responsive-design` | §4.2 "Sidebar collapses into drawer on mobile" | Não implementado |
| `06-frontend-design` | "Typography carries personality" | Font Inter genérica, sem escala |
| `07-impeccable` | "Operate mode: scanability, consistency" | Padrões inconsistentes entre páginas |

---

## 3. Plano de Ação (Ordem de Execução)

### ETAPA 1: Design Tokens e CSS Global (`index.css` + `tailwind.config.js`)

**Objetivo:** Criar a fundação visual que todas as telas herdam automaticamente.

#### 1A. Expandir CSS Variables em `index.css`

```css
:root {
  /* Cores do sistema (3 cores obrigatórias por ui-design-system §2.4) */
  --color-primary: #f97316;       /* Laranja — ações, brand */
  --color-secondary: #1e293b;     /* Slate 800 — estrutura, sidebar, textos fortes */
  --color-accent: #10b981;        /* Emerald — sucesso, highlights, confirmações */
  
  /* Superfícies */
  --color-surface: #ffffff;
  --color-surface-hover: #f8fafc;
  --color-bg: #f8f9fb;
  --color-border: #e2e8f0;
  --color-border-subtle: #f1f5f9;
  
  /* Texto */
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  
  /* Sombras padronizadas (ui-design-system §2.3 — apenas neutras) */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04);
  
  /* Bordas (ui-design-system §2.2) */
  --radius-sm: 0.375rem;   /* rounded-md — default */
  --radius-md: 0.5rem;     /* rounded-lg — cards/modais */
  --radius-lg: 0.75rem;    /* rounded-xl — destaque */
  --radius-full: 9999px;   /* rounded-full — avatares/badges */
  
  /* Espaçamento base (ritmo visual) */
  --space-page: 2rem;      /* padding do content area */
  --space-section: 1.5rem; /* gap entre seções */
  --space-card: 1.5rem;    /* padding interno de cards */
  
  /* Transições (ui-design-system §5 — 150-200ms) */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  
  /* Sidebar */
  --sidebar-width: 16rem;          /* 256px */
  --sidebar-width-collapsed: 4.5rem; /* 72px — apenas ícones */
  
  /* Tipografia — escala proporcional */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
}
```

#### 1B. Expandir `tailwind.config.js`

Adicionar `secondary` e `accent` ao color system, expandir escala de shadows com tokens:

```js
colors: {
  primary: {
    DEFAULT: 'var(--color-primary)',
    50: 'color-mix(in srgb, var(--color-primary) 8%, white)',
    100: 'color-mix(in srgb, var(--color-primary) 15%, white)',
    200: 'color-mix(in srgb, var(--color-primary) 30%, white)',
    500: 'var(--color-primary)',
    800: 'color-mix(in srgb, var(--color-primary) 80%, black)',
  },
  secondary: {
    DEFAULT: 'var(--color-secondary)',
  },
  accent: {
    DEFAULT: 'var(--color-accent)',
  },
  surface: 'var(--color-surface)',
},
```

---

### ETAPA 2: Componentes Reutilizáveis (`src/components/ui/`)

**Objetivo:** Criar componentes base que todas as telas usam. Cada novo CRUD deve usar estes componentes.

#### Componentes obrigatórios a criar:

| Componente | Arquivo | Função |
|---|---|---|
| **Button** | `ui/Button.tsx` | Variantes: `primary`, `secondary`, `ghost`, `danger`. Tamanhos: `sm`, `md`, `lg`. Suporte a ícone + loading state |
| **Input** | `ui/Input.tsx` | Label integrada, error state, icon prefix, disabled state |
| **Select** | `ui/Select.tsx` | Mesmo padrão visual do Input |
| **Badge** | `ui/Badge.tsx` | Status badges: `success`, `warning`, `danger`, `neutral` |
| **Card** | `ui/Card.tsx` | Container padrão com header opcional, padding consistente |
| **Modal** | `ui/Modal.tsx` | Overlay + backdrop + animação de entrada/saída + focus trap |
| **Table** | `ui/Table.tsx` | Header, rows, hover, empty state, loading skeleton |
| **EmptyState** | `ui/EmptyState.tsx` | Ícone + título + descrição + CTA |
| **LoadingSpinner** | `ui/LoadingSpinner.tsx` | Spinner padronizado |
| **PageHeader** | `ui/PageHeader.tsx` | Título + descrição + ação primária (padrão de todas as telas CRUD) |
| **Toggle** | `ui/Toggle.tsx` | Switch reutilizável (usado em Empresas) |

#### Padrão de cada componente (exemplo Button):

```tsx
// src/components/ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  loading?: boolean
}
```

> **IMPORTANTE:** Todos os componentes devem usar os design tokens CSS variables, NÃO valores hardcoded.

---

### ETAPA 3: Layout Responsivo (`Layout.tsx`)

**Objetivo:** Implementar sidebar colapsável + drawer mobile conforme `_3dashboard-layout` e `_4responsive-design`.

#### 3A. Sidebar Responsiva

- **Desktop (≥1024px):** Sidebar fixa `w-64`, com botão de colapsar para `w-[72px]` (só ícones)
- **Tablet (768px–1023px):** Sidebar começa colapsada por padrão
- **Mobile (<768px):** Sidebar vira drawer (overlay) com botão hamburger no header

#### 3B. Gerenciar estado no store

Adicionar ao `useAppStore.ts`:

```ts
sidebarCollapsed: boolean
sidebarMobileOpen: boolean
toggleSidebar: () => void
toggleMobileSidebar: () => void
```

#### 3C. Header Dinâmico

O header deve:
- Mostrar título contextual da página atual (não "resumo financeiro" em todas)
- Em mobile, mostrar botão hamburger à esquerda
- Mover o seletor de empresa do Dashboard para o header (é contexto global)

#### 3D. Breakpoints (conforme `_4responsive-design` §3):

```
mobile: < 640px (base)
sm: 640px+
md: 768px+
lg: 1024px+
xl: 1280px+
```

---

### ETAPA 4: Melhorias na Tela de Login (`Login.tsx`)

- Adicionar identidade visual (logo + nome do sistema)
- Adicionar um painel lateral decorativo ou gradient (estilo split-screen)
- Melhorar inputs usando componente `Input` reutilizável
- Melhorar botão usando componente `Button` reutilizável
- Adicionar transição suave entre login/signup
- Loading state global mais premium (spinner + fade)

---

### ETAPA 5: Refatorar Páginas Existentes

#### 5A. Refatorar `Grupos.tsx`
- Substituir botões inline → `Button`
- Substituir inputs inline → `Input`
- Substituir tabela inline → `Table`
- Substituir modal inline → `Modal`
- Substituir empty state inline → `EmptyState`
- Usar `PageHeader` para o topo

#### 5B. Refatorar `Empresas.tsx`
- Mesma refatoração que Grupos
- Toggle → componente `Toggle`
- Badge de status → componente `Badge`

#### 5C. Refatorar `Dashboard.tsx`
- Mover seletor de empresa para o header global
- Melhorar o empty state com `EmptyState`
- Melhorar o card de "Visão Geral" com `Card`

#### 5D. Refatorar `App.tsx`
- Loading screen premium com logo + spinner ao invés de "Carregando..."

---

### ETAPA 6: Micro-Interações e Polish

- **Animação de modal:** entrada com scale + fade (CSS `@keyframes`)
- **Hover nas table rows:** highlight suave
- **Transições de rota:** fade simples entre páginas
- **Skeleton loading:** nos cards e tabelas enquanto carrega dados
- **Toast/Feedback:** Após ações (salvar, excluir) — considerar criar componente `Toast`
- **Focus states:** ring visível em todos inputs/botões para acessibilidade

---

## 4. Regras Obrigatórias (NÃO VIOLAR)

> Extraídas das skills `_5ui-design-system`, `_3dashboard-layout`, `_4responsive-design`, `06-frontend-design`, `07-impeccable`

1. **Tailwind CSS é obrigatório** — sem CSS customizado a não ser design tokens no `:root`
2. **Lucide React para ícones** — nenhuma outra biblioteca de ícones
3. **Máximo 3 cores core** — primary (dinâmica), secondary, accent
4. **Sombras apenas neutras** — sem colored shadows, glow, ou neon
5. **Border radius padrão:** `rounded-md` default, `rounded-lg` para cards/modais
6. **Transições: 150-200ms** — nada lento, nada abrupto
7. **Todo componente deve ter:** loading state, empty state, error state
8. **Mobile-first** — tudo funciona em mobile, desktop é enhancement
9. **Sidebar é persistente** em desktop, drawer em mobile
10. **Header NÃO contém lógica de negócio** — apenas contexto (título, ações globais)
11. **Hierarquia visual:** KPIs → Insights → Dados → Ações (nessa ordem nos dashboards)
12. **Grid: 12 colunas** para layouts complexos, **4 colunas** para métricas
13. **Sem animações pesadas** em componentes data-heavy
14. **Cor primária é dinâmica** (CSS variable setada em runtime) — não usar hardcoded

---

## 5. Checklist de Entrega

- [ ] **Design tokens** expandidos no `index.css` (variáveis CSS completas)
- [ ] **tailwind.config.js** atualizado com secondary, accent, shadows
- [ ] **Button** — componente com 4 variantes + loading
- [ ] **Input** — componente com label, error, icon
- [ ] **Select** — componente padronizado
- [ ] **Badge** — componente de status
- [ ] **Card** — container padronizado
- [ ] **Modal** — componente com animação + overlay
- [ ] **Table** — componente com header, hover, empty, loading
- [ ] **EmptyState** — componente padronizado
- [ ] **LoadingSpinner** — componente padronizado
- [ ] **PageHeader** — título + descrição + CTA
- [ ] **Toggle** — switch reutilizável
- [ ] **Layout responsivo** — sidebar colapsável
- [ ] **Mobile drawer** — sidebar vira drawer em mobile
- [ ] **Header dinâmico** — título contextual + seletor de empresa
- [ ] **Store atualizado** — sidebar state
- [ ] **Login refatorado** — identidade visual + componentes reutilizáveis
- [ ] **Dashboard refatorado** — usa componentes UI
- [ ] **Grupos refatorado** — usa componentes UI
- [ ] **Empresas refatorado** — usa componentes UI
- [ ] **App.tsx loading** — splash premium
- [ ] **Animação de modais** — CSS keyframes
- [ ] **Focus states** — acessibilidade em todos interativos
- [ ] **Teste mobile** — verificar em viewport 375px
- [ ] **Teste tablet** — verificar em viewport 768px
- [ ] **Teste desktop** — verificar em viewport 1440px

---

## 6. Arquivos a NÃO Modificar

- `src/lib/supabase.ts` — configuração do Supabase, fora de escopo
- `src/store/useAppStore.ts` — **modificar apenas para adicionar** `sidebarCollapsed` e `sidebarMobileOpen`
- `src/App.tsx` — **modificar apenas** a loading screen, não alterar lógica de auth/routing

---

## 7. Prioridades se Não Conseguir Terminar Tudo

Se o agente não conseguir completar todas as etapas, priorizar na seguinte ordem:

1. **ETAPA 1** (tokens) — sem isso, nada mais funciona de forma consistente
2. **ETAPA 2** (componentes UI) — base para todas as telas
3. **ETAPA 3** (layout responsivo) — o sistema precisa funcionar em mobile
4. **ETAPA 5** (refatorar páginas) — aplicar os componentes criados
5. **ETAPA 4** (login) — melhoria visual importante mas não bloqueia
6. **ETAPA 6** (polish) — cereja do bolo, pode ficar para depois

---

## 8. Bug Conhecido: Erro EBUSY no Vite

O arquivo `skills/SKILL (1).md` (com espaço e parênteses no nome) causa crash do Vite watcher no Windows:

```
Error: EBUSY: resource busy or locked, watch 'D:\Repositorios\coupleFin\skills\SKILL (1).md'
```

**Solução:** Excluir o arquivo `skills/SKILL (1).md` (é uma cópia duplicada) OU adicionar `skills/` ao `server.watch.ignored` no `vite.config.ts`.

---

> **Documento criado em:** 2026-09-25T23:27:00-03:00
> **Contexto:** Conversa `c69540b1-4db7-4587-98d6-7a6ecf31c5e9`
> **Autor:** Agente de análise e planejamento
