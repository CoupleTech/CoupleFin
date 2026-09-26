# Sistema de Lançamento Contábil Multi-Tenant — Documentação Técnica

> **Como usar este documento:** este arquivo é a diretriz mestra do projeto e deve ser
> usado como referência por qualquer agente (humano ou IA) que for desenvolver, revisar
> ou dar manutenção no sistema. Ele descreve funcionalidades, arquitetura, modelo de
> dados sugerido e regras de negócio com base no briefing fornecido pelo dono do produto,
> complementado com itens padrão de sistemas contábeis/financeiros que normalmente são
> esquecidos no briefing inicial, mas são necessários para o sistema funcionar de forma
> completa e segura. Pontos que ainda não foram definidos com precisão estão marcados
> como **[DECISÃO PENDENTE]** e listados também na seção 13 — devem ser resolvidos ou
> confirmados antes ou durante a implementação do módulo correspondente. Itens
> **acrescentados nesta revisão** (não citados literalmente no briefing original, mas
> recomendados) estão marcados com **[COMPLEMENTO]**.

---

## 1. Visão Geral

Sistema web (com versão PWA) para **lançamento e controle contábil/financeiro de um
grupo econômico**, onde cada empresa do grupo é identificada por um **CNPJ** e possui
suas próprias despesas, contas, centros de custo e relatórios — mas todas as empresas
são geridas dentro de uma única plataforma multi-tenant.

O sistema permite:
- Cadastrar a estrutura contábil de cada empresa (centros de custo, tipos de despesa,
  contas, destinos de pagamento).
- Lançar despesas via **nota fiscal** (serviço, talão ou consumo, com chave de acesso)
  ou via **lançamento manual** (salários, taxas, contratos, multas, saques,
  transferências).
- Controlar **vencimentos e pagamentos** das despesas lançadas. **[COMPLEMENTO]**
- Gerenciar usuários, perfis de acesso e fornecedores.
- Personalizar a identidade visual (cores e logo) por empresa, refletida nos relatórios.
- Gerar **DRE completo** (contábil e financeiro) e relatórios analíticos, por empresa ou
  consolidados (visão geral do grupo).
- Visualizar dados em um **dashboard financeiro** com gráficos.
- Manter **rastreabilidade** de todas as alterações feitas nos lançamentos. **[COMPLEMENTO]**
- Usar o sistema como **PWA**, incluindo leitura de chave de nota fiscal via câmera.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | **React** (Vite + TypeScript) | TypeScript recomendado para reduzir erros em um domínio contábil |
| Estilização | Tailwind CSS | Facilita aplicar as cores dinâmicas por empresa (via CSS variables/tokens) |
| Backend / DB | **Supabase** (Postgres + Auth + Storage + Realtime) | Plano gratuito — ver limites na seção 8 |
| Autenticação | Supabase Auth (email/senha) | Perfis e permissões controlados em tabela própria, não apenas nos metadados do Auth |
| Isolamento multi-tenant | Row Level Security (RLS) do Postgres/Supabase | Ver seção 7 |
| Armazenamento de arquivos | Supabase Storage | Logos das empresas, XML/anexos de notas fiscais |
| Gráficos | Recharts ou Chart.js | Barra, pizza e linha (dashboard e DRE) |
| Exportação PDF | `@react-pdf/renderer` ou `jsPDF` + `html2canvas` | DRE e relatórios em PDF |
| Exportação Excel | `SheetJS (xlsx)` | DRE e relatórios em Excel |
| Impressão | `react-to-print` (ou CSS `@media print`) | Impressão direta do DRE/relatórios |
| PWA | `vite-plugin-pwa` | Manifest, service worker, instalável |
| Leitura de câmera (chave da nota) | `html5-qrcode` ou `zxing-js` | Ver observação na seção 4.3 **[DECISÃO PENDENTE]** |
| Validação de campos | `zod` ou `yup` **[COMPLEMENTO]** | Validação de CNPJ/CPF, chave de acesso, valores monetários |
| Datas | `date-fns` ou `dayjs` **[COMPLEMENTO]** | Manipulação de competência/vencimento/pagamento |

---

## 3. Arquitetura Multi-Tenant

- **Tenant = Empresa (CNPJ)**. O sistema é de **uso interno exclusivo** para um único **Grupo Econômico**.
- Todas as empresas pertencem a esse único Grupo, mas os dados financeiros (despesas, contas, centros de custo, lançamentos) são segregados por empresa.
- Um **usuário pode ter acesso a uma ou mais empresas** do grupo, dependendo do que o Administrador configurar. A troca de empresa é feita por um **seletor de empresa/CNPJ** no topo do sistema.
- Tabelas de cadastros e lançamentos são **sempre vinculadas a uma empresa** (`empresa_id`).
- Relatórios e Dashboard devem suportar dois modos: **por empresa selecionada** e **consolidado (todas as empresas que o usuário tem acesso)**.

---

## 4. Módulos do Sistema

### 4.1 Autenticação e Onboarding **[COMPLEMENTO]**
Não estava detalhado no briefing, mas é pré-requisito de todos os outros módulos:
- Login (e-mail e senha via Supabase Auth)
- Recuperação de senha ("esqueci minha senha", envio de e-mail)
- Primeiro acesso / definição de senha para usuário recém-cadastrado (o cadastro de
  usuário é feito por um Administrador — ver 4.6 — não há autocadastro público)
- Fluxo de **onboarding inicial**: criação do Grupo Econômico, da primeira Empresa e do
  primeiro usuário Administrador (necessário para "startar" um ambiente novo do zero)
- Tela de sessão expirada / logout automático por inatividade **[DECISÃO PENDENTE]**
  (definir tempo de expiração)

### 4.2 Cadastros Base
CRUD simples, todos vinculados a `empresa_id`:
- **Centro de Custo** (nome, código, ativo/inativo)
- **Tipo de Despesa** (nome, código, classificação contábil/DRE — ver seção 5.7, ativo/inativo)
- **Contas** (nome, banco, agência, conta, tipo — corrente/poupança/caixa, saldo inicial)
- **Destino de Pagamento** (nome, tipo — fornecedor, funcionário, sócio, outros)

Todos os cadastros devem ter **inativação lógica** (soft delete via campo `ativo`), nunca
exclusão física, para preservar o histórico dos lançamentos já feitos.

### 4.3 Lançamento de Notas Fiscais
Tipos suportados:
- **Nota Fiscal de Serviço (NFS-e)**
- **Nota Talão**
- **Nota de Consumo** (com chave de acesso)

Campos principais: empresa, fornecedor, centro de custo, tipo de despesa, conta,
destino do pagamento, valor, data de emissão, data de competência, **data de
vencimento**, data de pagamento, chave de acesso (quando aplicável), número do
documento, anexo(s) (PDF/XML/imagem), observações.

**[DECISÃO PENDENTE]**: confirmar o formato da chave a ser lido pela câmera — chave de
acesso de NFe/NFS-e tem 44 dígitos e normalmente é impressa como código de barras
(Code128) no DANFE, enquanto NFC-e usa QR Code. A biblioteca de leitura deve suportar o
formato real usado pelos municípios/estados onde o grupo opera.

**[COMPLEMENTO]** Validar a chave de acesso (44 dígitos numéricos, com dígito
verificador — módulo 11) antes de salvar, para evitar erro de digitação/leitura.

### 4.4 Lançamento Manual
Para despesas sem nota fiscal associada. Subtipos:
- Salários
- Taxas
- Contratos
- Multas
- Saques
- Transferências entre empresas (do grupo)
- Transferências entre contas (da mesma empresa)

Campos principais: empresa, subtipo, centro de custo, tipo de despesa, conta, destino
do pagamento, valor, data, **data de vencimento**, descrição, anexo (opcional).

Para **transferências entre empresas**: exigir `empresa_origem` e `empresa_destino`
(gera um lançamento de saída em uma e entrada/estorno na outra, ou apenas um registro
de controle — **[DECISÃO PENDENTE]**, definir se transferência entre empresas gera
lançamento espelhado nas duas empresas).

Para **transferências entre contas**: exigir `conta_origem` e `conta_destino` dentro da
mesma empresa.

### 4.5 Contas a Pagar / Fluxo de Vencimentos **[COMPLEMENTO]**
O briefing menciona "Destino dos pagamentos" e datas de lançamento, mas não descreve
explicitamente o controle de vencimento — essencial em qualquer sistema financeiro:
- Toda despesa (nota fiscal ou manual) tem um **status de pagamento**: `pendente`,
  `pago`, `atrasado`, `pago parcialmente` (parcial fica como decisão de escopo).
- Tela de **"Contas a Pagar"**: lista de lançamentos pendentes/atrasados, agrupável por
  empresa, vencimento, centro de custo ou fornecedor.
- **Baixa de pagamento** (marcar como pago, com data de pagamento efetiva — pode ser
  diferente da data de vencimento).
- **[DECISÃO PENDENTE]** Notificações/alertas de vencimento próximo ou atrasado (na
  tela/dashboard e, opcionalmente, por e-mail).

### 4.6 Cadastro de Usuários
- Nome, e-mail, senha (gerenciada via Supabase Auth)
- **Perfil de usuário** (ex.: Administrador, Financeiro, Operacional, Visualizador —
  **[DECISÃO PENDENTE]**: lista final de perfis e permissões de cada um)
- Vínculo do usuário com uma ou mais empresas do grupo
- **Inativação de usuário** (soft delete — usuário inativo não consegue logar, mas seu
  histórico de lançamentos criados é preservado)

### 4.7 Cadastro de Fornecedores
- Dados cadastrais (razão social, CNPJ/CPF, contato, e-mail, telefone, endereço)
- **Relatório de fornecedores** (lista, status, dados cadastrais)
- **Relatório de custo por fornecedor** (total gasto, por período, por empresa, por
  centro de custo)

**[DECISÃO PENDENTE]**: fornecedor é cadastrado por empresa ou compartilhado entre
todas as empresas do grupo (já que um mesmo fornecedor pode atender mais de um CNPJ)?
Recomenda-se cadastro **a nível de grupo**, com o vínculo de despesa sendo o que
diferencia por empresa.

**[COMPLEMENTO]** Validar CNPJ/CPF do fornecedor com o algoritmo de dígito verificador
oficial antes de salvar, para evitar cadastros duplicados/inválidos.

### 4.8 Módulo de Configuração
- Definição das **3 cores principais** do sistema (usadas em toda a UI e nos
  relatórios/DRE gerados)
- **Logo de cada empresa**: ao trocar a empresa selecionada no seletor, a logo exibida
  no sistema e nos relatórios/PDFs gerados deve trocar automaticamente
- Armazenamento de logos via Supabase Storage, vinculado a `empresa_id`
- **[COMPLEMENTO] Fechamento de período contábil**: possibilidade de "fechar" um mês
  (por empresa), travando novos lançamentos, edições ou exclusões com data de
  competência dentro do período fechado. Reabertura deve ser restrita a perfis
  Administrador e ficar registrada no histórico de alterações (seção 4.13).

**[DECISÃO PENDENTE]**: as 3 cores são configuráveis por empresa ou são globais para
todo o grupo (com apenas a logo variando por empresa)? O briefing sugere cores globais
do sistema e logo variável por empresa — confirmar.

### 4.9 DRE (Demonstração do Resultado do Exercício)
- DRE **contábil** e **financeiro** (dois modos/visões)
- Filtro por **período** (data de competência e/ou data de pagamento)
- Filtro por **empresa selecionada** ou **visão geral (grupo consolidado)**
- Estrutura padrão de DRE a ser seguida (ver seção 5.7 para o de/para de classificação):
  Receita Bruta → Deduções → Receita Líquida → Custos → Lucro Bruto → Despesas
  Operacionais/Administrativas → Despesas Financeiras → Resultado antes de
  Impostos → Resultado Líquido
- Exportação: **PDF**, **Excel** e **Impressão direta**
- O PDF/impressão deve exibir a logo e as cores da empresa selecionada (ou do grupo, no
  modo consolidado)

### 4.10 Relatórios
Para empresa selecionada e também em visão consolidada (todas as empresas):
- **Contábil**: lançamentos organizados por plano de contas/classificação
- **Analítico agrupado**: agrupado por Centro de Custo, por Fornecedor e por Valor
- **Financeiro**: fluxo de entradas/saídas por conta e período

Todos os relatórios devem suportar os mesmos filtros de período e as mesmas
exportações do DRE (PDF, Excel, impressão).

**[COMPLEMENTO]** Filtros avançados de busca na listagem de lançamentos (antes mesmo de
chegar a um relatório fechado): por período, centro de custo, tipo de despesa,
fornecedor, conta, status de pagamento (pendente/pago/atrasado) e faixa de valor —
importante para o dia a dia do usuário financeiro, não só para o fechamento mensal.

### 4.11 Dashboard Financeiro
Indicadores e gráficos:
- Total de gastos (período, empresa ou grupo)
- Locais/empresas que mais custam
- Distribuição por Centro de Custo
- Distribuição por Tipo de Despesa
- Gráficos de **barra**, **pizza** e **linha** (evolução temporal)
- Filtros de período e de empresa (individual ou consolidado)
- **[COMPLEMENTO]** Indicador de **contas a vencer nos próximos N dias** e **contas
  atrasadas**, já que o dashboard é o ponto de entrada do usuário financeiro no dia a dia.

### 4.12 Versão PWA
- Instalável (manifest + service worker via `vite-plugin-pwa`)
- Funcional em dispositivos móveis
- **Diferencial**: no lançamento de nota fiscal, habilitar a **câmera do dispositivo**
  para ler o código/QR da chave de acesso e **preencher automaticamente** o campo de
  chave (e, se possível, buscar dados da nota via API/consulta pública — **[DECISÃO
  PENDENTE]**: se haverá integração com webservice da SEFAZ/prefeitura para
  autopreenchimento completo dos dados da nota, ou apenas leitura da chave)

### 4.13 Auditoria e Histórico de Alterações **[COMPLEMENTO]**
Não citado no briefing, mas indispensável em sistema contábil (rastreabilidade é
exigência básica de compliance/auditoria):
- Toda alteração relevante em `lancamentos` (edição de valor, data, cancelamento,
  reabertura de período) deve gerar um registro em log: quem alterou, quando, o que
  mudou (valor antigo → novo).
- **Cancelamento/estorno de lançamento** deve exigir **motivo** (texto) e nunca apagar
  o registro original — apenas marcar como `estornado` e manter rastreabilidade
  completa (ver seção 5.6).
- Tela de consulta ao histórico (visível ao menos para perfis Administrador/Financeiro).

### 4.14 Notificações e Web Push **[COMPLEMENTO]**
Para manter os usuários engajados e avisados sobre ações urgentes:
- **Painel In-App**: um ícone de sino no header superior exibindo uma lista suspensa (dropdown) das notificações mais recentes.
- **Tipos de Notificações**:
  - Alertas de vencimento (contas vencendo hoje ou atrasadas).
  - Avisos do sistema (atualizações, novos recursos).
- **Web Push (PWA)**: usando a `Push API` e `Service Worker`, os usuários do PWA podem se inscrever para receber as mesmas notificações como alertas nativos no celular/desktop, mesmo quando o app está fechado.

---

## 5. Modelo de Dados (sugestão de schema — Postgres/Supabase)

> Nomes de tabelas e campos são sugestões; ajustar conforme convenção do time. Todas as
> tabelas de negócio possuem `created_at`, `updated_at` e, quando aplicável, `ativo`.

### 5.1 Estrutura do grupo e empresas
```sql
grupos_economicos (
  id uuid pk,
  nome text,
  created_at timestamptz
)

empresas (
  id uuid pk,
  grupo_id uuid fk -> grupos_economicos,
  cnpj text unique,
  razao_social text,
  nome_fantasia text,
  logo_url text,
  ativo boolean default true,
  created_at timestamptz
)
```

### 5.2 Configuração visual e fechamento de período
```sql
configuracoes_sistema (
  id uuid pk,
  grupo_id uuid fk -> grupos_economicos,
  cor_primaria text,
  cor_secundaria text,
  cor_terciaria text,
  updated_at timestamptz
)

-- [COMPLEMENTO] controle de fechamento contábil mensal por empresa
periodos_fechamento (
  id uuid pk,
  empresa_id uuid fk -> empresas,
  competencia date,        -- ex: primeiro dia do mês/ano de referência
  status text,              -- 'aberto' | 'fechado'
  fechado_por uuid fk -> usuarios null,
  fechado_em timestamptz null
)
```

### 5.3 Usuários e perfis
```sql
perfis_usuario (
  id uuid pk,
  nome text,           -- ex: Administrador, Financeiro, Operacional
  permissoes jsonb,     -- granularidade a definir
  created_at timestamptz
)

usuarios (
  id uuid pk references auth.users,
  nome text,
  email text,
  perfil_id uuid fk -> perfis_usuario,
  ativo boolean default true,
  created_at timestamptz
)

usuarios_empresas (
  usuario_id uuid fk -> usuarios,
  empresa_id uuid fk -> empresas,
  primary key (usuario_id, empresa_id)
)
```

### 5.4 Cadastros base (por empresa)
```sql
centro_custo (
  id uuid pk, empresa_id uuid fk, nome text, codigo text, ativo boolean, created_at timestamptz
)

tipo_despesa (
  id uuid pk, empresa_id uuid fk, nome text, codigo text,
  grupo_dre text,        -- ex: 'despesa_operacional', 'despesa_administrativa', 'despesa_financeira'
  ativo boolean, created_at timestamptz
)

contas (
  id uuid pk, empresa_id uuid fk, nome text, banco text, agencia text, numero_conta text,
  tipo text,             -- 'corrente' | 'poupanca' | 'caixa'
  saldo_inicial numeric,
  ativo boolean, created_at timestamptz
)

destinos_pagamento (
  id uuid pk, empresa_id uuid fk, nome text,
  tipo text,             -- 'fornecedor' | 'funcionario' | 'socio' | 'outro'
  ativo boolean, created_at timestamptz
)
```

### 5.5 Fornecedores
```sql
fornecedores (
  id uuid pk,
  grupo_id uuid fk,         -- cadastro a nível de grupo (ver seção 13)
  razao_social text,
  cnpj_cpf text,
  email text,
  telefone text,
  endereco text,
  ativo boolean, created_at timestamptz
)
```

### 5.6 Lançamentos, anexos e histórico
```sql
lancamentos (
  id uuid pk,
  empresa_id uuid fk,
  tipo text,                 -- 'nota_fiscal' | 'manual'
  subtipo text,               -- ex: 'nfse' | 'nota_talao' | 'nota_consumo' | 'salario' | 'taxa' |
                               --     'contrato' | 'multa' | 'saque' | 'transferencia_empresa' | 'transferencia_conta'
  fornecedor_id uuid fk null,
  centro_custo_id uuid fk,
  tipo_despesa_id uuid fk,
  conta_id uuid fk,
  destino_pagamento_id uuid fk null,
  chave_acesso text null,     -- para notas fiscais
  numero_documento text null,
  valor numeric not null,
  data_competencia date,
  data_vencimento date null,        -- [COMPLEMENTO]
  data_pagamento date null,
  status_pagamento text default 'pendente',  -- [COMPLEMENTO] 'pendente' | 'pago' | 'atrasado'
  descricao text,
  empresa_origem_id uuid fk null,   -- transferências entre empresas
  empresa_destino_id uuid fk null,
  conta_origem_id uuid fk null,     -- transferências entre contas
  conta_destino_id uuid fk null,
  status text default 'lancado',    -- 'lancado' | 'estornado' | 'pendente_aprovacao' (a definir workflow)
  motivo_estorno text null,          -- [COMPLEMENTO]
  created_by uuid fk -> usuarios,
  created_at timestamptz,
  updated_at timestamptz
)

-- [COMPLEMENTO] múltiplos anexos por lançamento (nota, comprovante, XML, etc.)
lancamento_anexos (
  id uuid pk,
  lancamento_id uuid fk -> lancamentos,
  arquivo_url text,
  tipo_arquivo text,     -- 'pdf' | 'xml' | 'imagem'
  created_at timestamptz
)

-- [COMPLEMENTO] trilha de auditoria
historico_alteracoes (
  id uuid pk,
  tabela text,            -- ex: 'lancamentos'
  registro_id uuid,
  usuario_id uuid fk -> usuarios,
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  acao text,               -- 'criacao' | 'edicao' | 'estorno' | 'reabertura_periodo'
  created_at timestamptz
)
```

### 5.7 Classificação contábil
> `grupo_dre` em `tipo_despesa` é o campo que conecta cada despesa à estrutura do DRE
> (seção 4.9), permitindo montar o demonstrativo automaticamente a partir dos
> lançamentos.

---

## 6. Regras de Negócio

1. Todo lançamento (nota fiscal ou manual) pertence a **exatamente uma empresa**,
   exceto transferências entre empresas, que referenciam origem e destino.
2. Nenhum cadastro (centro de custo, tipo de despesa, conta, destino de pagamento,
   fornecedor, usuário) pode ser **excluído fisicamente** se já possuir lançamentos
   vinculados — apenas **inativado**.
3. Um usuário inativo não pode logar, mas seus lançamentos e histórico permanecem
   visíveis nos relatórios (com o nome do responsável preservado).
4. A troca do seletor de empresa deve refletir imediatamente: (a) os dados exibidos em
   telas de cadastro/lançamento/relatório, e (b) a logo exibida no sistema e nos
   documentos exportados.
5. Relatórios e DRE em **modo consolidado** somam os dados de todas as empresas ativas
   do grupo às quais o usuário tem acesso.
6. Todo valor exportado (PDF/Excel) deve refletir exatamente os mesmos filtros
   aplicados na tela (período, empresa).
7. **[COMPLEMENTO]** Um lançamento **nunca é excluído fisicamente** após confirmado —
   correções são feitas por **estorno com motivo obrigatório**, preservando o registro
   original e gerando um novo lançamento de ajuste, se necessário.
8. **[COMPLEMENTO]** Lançamentos com data de competência dentro de um **período
   fechado** (seção 4.8) não podem ser criados, editados ou estornados, exceto por
   reabertura explícita feita por um Administrador (ação registrada em auditoria).
9. **[COMPLEMENTO]** Todo lançamento nasce com `status_pagamento = 'pendente'` e passa
   para `pago` somente na baixa manual (ou automática, se `data_pagamento` for
   preenchida no momento do lançamento).
10. **[DECISÃO PENDENTE]** Definir se lançamentos exigem algum fluxo de aprovação
    (ex.: operacional lança, financeiro aprova) ou se todo lançamento já entra
    confirmado.

---

## 7. Segurança e Multi-tenancy (RLS)

- Habilitar **Row Level Security** em todas as tabelas de negócio.
- Política geral: o usuário só acessa registros de `empresa_id` que constem em
  `usuarios_empresas` para o seu `usuario_id`.
- Perfis com permissão de "visão geral do grupo" podem consultar dados agregados de
  todas as empresas às quais têm acesso, mas a escrita (INSERT/UPDATE) continua restrita
  por empresa.
- Autenticação via Supabase Auth; a tabela `usuarios` complementa com perfil e vínculo
  de empresas (o Auth cuida apenas de identidade/senha).
- Uploads (logos, anexos de nota fiscal) devem ficar em buckets do Supabase Storage
  organizados por `empresa_id`, com políticas de acesso equivalentes às do banco.
- **[COMPLEMENTO]** Tabela `historico_alteracoes` deve ser **somente leitura** para
  todos os perfis exceto o backend/triggers que a alimentam — nenhum usuário deve poder
  editar ou apagar registros de auditoria pela aplicação.

---

## 8. Requisitos Não Funcionais

- **Gratuidade**: manter a solução dentro dos limites do plano free do Supabase e de
  hospedagem do frontend (ex.: Vercel/Netlify free tier).
- **[COMPLEMENTO] Limites do plano gratuito do Supabase a considerar no design**
  (valores aproximados, sempre conferir em supabase.com/pricing antes de decisões de
  arquitetura, pois mudam com frequência): cerca de **500 MB de banco de dados** e
  **1 GB de armazenamento de arquivos** por projeto, **5 GB de egress/mês**, até
  **50.000 usuários ativos mensais** de Auth, e **projetos gratuitos que pausam após
  ~7 dias de inatividade** (é preciso acessar o projeto periodicamente ou reativar
  manualmente). Isso impacta diretamente:
  - Uso moderado de anexos (XML, PDFs, imagens) no Storage — considerar compressão ou
    limpeza de anexos antigos.
  - Cuidado com egress ao carregar imagens/logos grandes com frequência.
  - Necessidade de um "ping" periódico ou uso recorrente para evitar a pausa automática
    do projeto em ambiente de baixa atividade (ex.: homologação).
- **Responsividade**: interface utilizável em desktop e mobile (essencial para a versão
  PWA).
- **Performance em relatórios**: consultas de DRE/relatórios consolidados devem ser
  otimizadas (índices em `empresa_id`, `data_competencia`, `centro_custo_id`,
  `tipo_despesa_id`, `fornecedor_id`); considerar views materializadas se o volume de
  lançamentos crescer.
- **Auditoria mínima**: manter `created_by`, `created_at`, `updated_at` em todos os
  lançamentos, complementado pela trilha de auditoria da seção 4.13.
- **Idioma/moeda**: pt-BR e R$ (Real) como padrão.

---

## 9. Convenções de Desenvolvimento

- Nomes de tabelas e colunas em `snake_case`, em português, para manter consistência
  com o domínio contábil do negócio.
- Componentes React em `PascalCase`; hooks customizados prefixados com `use`.
- Organizar o frontend por módulo (ex.: `/modules/lancamentos`,
  `/modules/contas-a-pagar`, `/modules/dre`, `/modules/dashboard`,
  `/modules/cadastros`, `/modules/fornecedores`, `/modules/usuarios`,
  `/modules/configuracoes`, `/modules/auditoria`).
- Toda chamada ao Supabase deve passar por uma camada de serviço (`/services`), nunca
  direto nos componentes, para facilitar troca/mocking e centralizar tratamento de
  erros.
- Cores e logo dinâmicas devem ser aplicadas via **CSS variables** setadas em tempo de
  execução (tema), não via classes fixas do Tailwind.

---

## 10. Setup de Ambiente e Estrutura do Projeto **[COMPLEMENTO]**

Não estava no briefing original, mas é necessário para qualquer agente começar a
codificar:

- **Variáveis de ambiente** (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  (nunca commitar chaves reais — usar `.env.example` no repositório).
- **Estrutura sugerida de pastas**:
  ```
  /src
    /modules/<nome-do-modulo>/(components, hooks, pages)
    /services        -- chamadas ao Supabase, isoladas por entidade
    /shared          -- componentes e utilitários genéricos (inputs, formatação de moeda, etc.)
    /theme           -- lógica de cores/tema dinâmico por empresa
    /types           -- tipos TypeScript compartilhados (espelhando o schema do banco)
  ```
- **Migrations do banco**: versionar o schema do Supabase via SQL migrations
  (`supabase/migrations`), nunca alterar tabelas apenas pela UI do Supabase em produção.

---

## 11. Estratégia de Testes e Deploy **[COMPLEMENTO]**

- **Testes**: priorizar testes unitários nas regras de cálculo (DRE, totais de
  relatórios, status de vencimento) e testes de integração nas policies de RLS
  (garantir que um usuário de uma empresa não acessa dados de outra).
- **Deploy sugerido**: frontend na Vercel ou Netlify (free tier), backend no Supabase;
  pipeline simples de CI (lint + testes) antes de cada deploy.
- **Ambientes**: recomenda-se manter ao menos dois projetos Supabase (homologação e
  produção), respeitando o limite de projetos gratuitos por organização (seção 8).

---

## 12. Fases de Desenvolvimento Sugeridas

1. **Fundação**: setup do projeto (React + Supabase), autenticação/onboarding,
   estrutura multi-tenant (grupo/empresas), RLS básica, seletor de empresa.
2. **Cadastros**: centro de custo, tipo de despesa, contas, destinos de pagamento,
   usuários/perfis, fornecedores.
3. **Lançamentos**: módulo de nota fiscal e módulo manual (incluindo transferências),
   com upload de anexos.
4. **Contas a Pagar e Auditoria**: controle de vencimento/status de pagamento e
   trilha de histórico de alterações.
5. **Configuração visual e fechamento de período**: cores do sistema e logo por
   empresa, aplicadas em tela e em exportações; regra de fechamento contábil mensal.
6. **DRE e Relatórios**: geração de DRE contábil/financeiro, relatórios analíticos,
   exportação PDF/Excel/impressão.
7. **Dashboard**: indicadores e gráficos, incluindo alertas de vencimento.
8. **PWA**: manifest, service worker, leitura de chave via câmera.

---

## 13. Perguntas em Aberto / Pontos a Validar

- [ ] Fornecedor é cadastrado por empresa (CNPJ) ou a nível de grupo econômico?
- [ ] As 3 cores do sistema são globais para o grupo, ou configuráveis por empresa?
- [ ] Lista final de perfis de usuário e as permissões exatas de cada um.
- [ ] Transferência entre empresas gera lançamento espelhado nas duas empresas ou
      apenas um registro de controle?
- [ ] Existe fluxo de aprovação para lançamentos, ou tudo entra já confirmado?
- [ ] Formato real da chave a ser lida pela câmera (código de barras da NFe/NFS-e vs.
      QR Code de NFC-e) e se haverá integração com webservice para autopreenchimento
      dos dados da nota, além da chave.
- [ ] Estrutura contábil de DRE a seguir tem alguma exigência específica do contador do
      grupo, ou pode seguir o modelo padrão descrito na seção 4.9?
- [ ] Necessidade (ou não) de multi-moeda — assumido apenas R$ (Real) por ora.
- [ ] **[COMPLEMENTO]** O sistema deve suportar mais de um Grupo Econômico no futuro
      (uso multi-cliente), ou será sempre um único grupo (uso interno)?
- [ ] **[COMPLEMENTO]** Pagamento parcial de um lançamento (ex.: pagar metade de uma
      conta) é um caso real do negócio, ou todo lançamento é pago integralmente de uma vez?
- [ ] **[COMPLEMENTO]** Fechamento de período contábil: quem pode fechar/reabrir um mês,
      e isso é por empresa individualmente ou para o grupo todo de uma vez?
- [ ] **[COMPLEMENTO]** Alertas de vencimento: apenas visuais no dashboard, ou também
      por e-mail/notificação push (PWA)?
