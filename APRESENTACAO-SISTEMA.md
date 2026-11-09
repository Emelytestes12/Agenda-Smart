# Agenda Smart — Apresentação Técnica do Sistema

> Documento descritivo do funcionamento completo da aplicação: arquitetura, banco de dados, API, bot do Telegram, telas do frontend e fluxos de negócio.

---

## 1. Visão Geral

O **Agenda Smart** é um sistema web de gestão de agendamentos para estabelecimentos de serviços (salões, clínicas, barbearias, consultórios), com um diferencial central: uma **Fila de Espera Inteligente** que reaproveita horários vagos — causados por cancelamentos — e notifica automaticamente os clientes interessados por **Telegram**, com botões de resposta direta (Sim/Não).

O sistema resolve um problema recorrente do setor: quando um cliente desmarca, o horário fica ocioso e representa prejuízo. Em vez de o operador ligar manualmente para vários clientes, o Agenda Smart mantém uma fila ordenada de interessados e oferece a vaga ao primeiro da fila com **um clique**, registrando toda a movimentação no Dashboard.

### Objetivo

- Reduzir o **no-show** (faltas) e o **prejuízo por horário vago**.
- Automatizar a comunicação com o cliente via Telegram (confirmação e oferta de vaga).
- Centralizar clientes, agenda, profissionais, serviços e métricas em uma única interface.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express 5 (ES Modules, `"type": "module"`) |
| Banco de Dados | PostgreSQL (hospedado no Supabase) |
| ORM | Prisma 5.22 |
| Integração de Mensagens | Telegram Bot API (HTTPS) |
| Frontend | HTML5, CSS3 (Dark Mode) e JavaScript puro (Vanilla JS) |
| Comunicação | API REST (JSON) + `fetch` |
| Configuração | `dotenv` (variáveis de ambiente) |

Não há framework de frontend (React/Vue): as telas são páginas HTML independentes que consomem a API por `fetch`, mantendo o projeto leve e de fácil manutenção para o escopo do TCC.

---

## 3. Arquitetura

O sistema adota uma arquitetura **cliente-servidor em três camadas**, com separação clara de responsabilidades.

```
┌──────────────────────────────────────────────────────────┐
│                     NAVEGADOR (Cliente)                  │
│   6 telas HTML + CSS + JS  →  fetch()  →  API REST       │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTP / JSON
                            ▼
┌──────────────────────────────────────────────────────────┐
│                 BACKEND — Express (porta 3000)           │
│  Rotas /api/*   →   Regras de Negócio (lib)              │
│  ┌────────────┬──────────────┬────────────────────────┐  │
│  │ prisma.js  │ respostas.js │ telegram.js / Bot.js   │  │
│  └─────┬──────┴──────┬───────┴───────────┬────────────┘  │
└────────┼─────────────┼───────────────────┼───────────────┘
         ▼             ▼                   ▼
   ┌──────────┐  ┌────────────┐   ┌──────────────────┐
   │ Supabase │  │  Regras de │   │  Telegram Bot API │
   │ Postgres │  │  Negócio   │   │  (api.telegram.org)│
   └──────────┘  └────────────┘   └──────────────────┘
```

### Camadas

1. **Apresentação (Frontend):** as 6 telas HTML. Cada tela tem seu próprio arquivo `.html`, `.css` e `.js`, além de um `global.css` compartilhado que define o design system.
2. **Aplicação (Backend):** o Express expõe rotas REST agrupadas por domínio. A lógica sensível fica isolada em módulos da pasta `lib`, garantindo que as mesmas regras valham para qualquer origem (painel web ou botão do Telegram).
3. **Dados:** o Prisma traduz operações JavaScript em SQL para o PostgreSQL no Supabase.

### Princípio de projeto: lógica centralizada

O módulo `src/lib/respostas.js` concentra as regras de negócio de resposta do cliente (`processarRespostaFila` e `processarRespostaAgendamento`). Isso garante que **a resposta vinda do botão do Telegram e a resposta simulada pelo painel executem exatamente o mesmo comportamento** — sem duplicação de código.

---

## 4. Estrutura de Diretórios

```
Agenda-Smart/
├── .gitignore                        # Protege segredos e dependências
├── README.md
└── SI-estabelecimento/
    ├── Backend/
    │   ├── index.js                  # Ponto de entrada (Express + rotas + polling)
    │   ├── .env.example              # Modelo de variáveis (sem valores reais)
    │   ├── package.json
    │   ├── prisma/
    │   │   └── schema.prisma         # Definição das tabelas/ORM
    │   └── src/
    │       ├── lib/
    │       │   ├── prisma.js         # Cliente Prisma compartilhado
    │       │   ├── respostas.js      # Regras de negócio (respostas do cliente)
    │       │   ├── telegram.js       # Cliente da Bot API
    │       │   └── telegramBot.js    # Interpretador de cliques + long polling
    │       └── routes/
    │           ├── agendamentosRoutes.js
    │           ├── clientesRoutes.js
    │           ├── dashboardRoutes.js
    │           ├── filaEsperaRoutes.js
    │           ├── minhaAgendaRoutes.js
    │           ├── notificacoesRoutes.js
    │           └── telegramRoutes.js
    └── Frontend/
        ├── global.css                # Design System (dark mode + laranja)
        ├── Logo/
        ├── Agendamentos/             # Agendamento.html/.css/.js
        ├── Clientes/                 # Cliente.html/.css/.js
        ├── Dashboard/                # Dash.html/.css/.js
        ├── Fila-de-espera/           # Fila.html/.css/.js
        ├── Minha-Agenda/             # minhaAgenda.html/.css/.js
        └── envio-comunicados/        # comunicados.html/.css/.js
```

---

## 5. Modelo de Dados

O banco possui **7 tabelas**, definidas em `prisma/schema.prisma`.

| Modelo (tabela) | Descrição | Campos principais |
|---|---|---|
| **Cliente** | Cadastro de clientes | `id`, `nome`, `telefone` (único), `observacoes`, `createdAt`, `updatedAt` |
| **Agendamento** | Horários efetivamente agendados | `id`, `clienteNome`, `clienteTelefone`, `data` (YYYY-MM-DD), `hora` (HH:mm), `servico`, `profissional`, `status`, `motivoCancelamento`, `clienteId` (FK opcional) |
| **FilaEspera** | Fila de interessados em horários lotados | `id`, `clienteNome`, `clienteTelefone`, `servico`, `profissional`, `dataDesejada`, `vagaOfertada`, `status`, `createdAt` |
| **Profissional** | Profissionais do estabelecimento | `id`, `nome` (único), `especialidade` |
| **Servico** | Catálogo de serviços | `id`, `nome` (único) |
| **AgendaItem** | Grade de disponibilidade (blocos hora × profissional) | `id`, `data`, `hora`, `prof`, `servico`, `clienteNome`, `obs` |
| **LogAtividade** | Histórico/feed de atividades do Dashboard | `id`, `tipo`, `titulo`, `descricao`, `tempo`, `createdAt` |

### Status utilizados

- **Agendamento:** `pendente` / `aguardando`, `confirmado`, `cancelado`, `finalizado`.
- **FilaEspera:** `aguardando` → `notificado` → `aceito` ou `recusado`.

### Relacionamentos e índices

- `Agendamento.clienteId` referencia `Cliente.id` de forma **opcional** (`onDelete: SetNull`), permitindo agendamentos sem cliente cadastrado.
- Índices otimizam consultas frequentes: `Agendamento(data)`, `Agendamento(status)`, `FilaEspera(status)`, `FilaEspera(dataDesejada)`, `AgendaItem(data, prof)`, `Cliente(telefone)`, `Cliente(nome)`.

### Conexão com o Supabase

O sistema usa duas URLs:
- `DATABASE_URL`: via **pooler (porta 6543)** com `?pgbouncer=true` — usada pela aplicação em runtime. O parâmetro `pgbouncer` é obrigatório para evitar o erro `42P05` (prepared statements) do pooler.
- `DIRECT_URL`: conexão **direta (porta 5432)** — usada pelo Prisma CLI (migrações/`db push`).

---

## 6. Backend — API REST

O servidor sobe na porta **3000** (`http://localhost:3000`). Todas as rotas são prefixadas com `/api`.

### Módulos e endpoints

#### `/api/clientes` — Gestão de Clientes
| Método | Rota | Ação |
|---|---|---|
| GET | `/` | Lista todos os clientes (ordenados por nome) |
| POST | `/` | Cadastra um novo cliente |
| PUT | `/:id` | Atualiza um cliente existente |
| DELETE | `/:id` | Remove um cliente |

#### `/api/agendamentos` — Agendamentos
| Método | Rota | Ação |
|---|---|---|
| GET | `/` | Lista agendamentos (ordenados por data e hora) |
| POST | `/` | Cria um novo agendamento |
| PATCH | `/:id/status` | Atualiza apenas o status |
| DELETE | `/:id` | Remove um agendamento |

#### `/api/fila` — Fila de Espera
| Método | Rota | Ação |
|---|---|---|
| GET | `/` | Lista a fila em ordem **FIFO** (quem entrou primeiro, primeiro) |
| POST | `/` | Adiciona um cliente à fila |
| POST | `/:id/notificar` | Envia a oferta de vaga por Telegram, com botões Sim/Não |
| POST | `/:id/responder` | Simula/registra a resposta pelo painel (fallback) |
| DELETE | `/:id` | Remove um registro da fila |

#### `/api/minha-agenda` — Configuração da Agenda
| Método | Rota | Ação |
|---|---|---|
| GET | `/` | Retorna profissionais, serviços e blocos da agenda |
| GET | `/disponibilidade` | Combinações profissional+serviço disponíveis em uma data |
| POST/DELETE | `/agendamentos` `/agendamentos/:id` | Cria/remove blocos de horário |
| POST/DELETE | `/profissionais` `/profissionais/:id` | Cria/remove profissionais |
| POST/DELETE | `/servicos` `/servicos/:id` | Cria/remove serviços |

#### `/api/dashboard` — Métricas
| Método | Rota | Ação |
|---|---|---|
| GET | `/stats?period=today|week|month` | KPIs agregados e feed de atividades |

Retorna: horários recuperados, taxa de no-show, taxa de ocupação, taxa de conversão da fila, contagem de vagas salvas/perdidas, percentual de eficiência e as 10 últimas atividades.

#### `/api/notificacoes` — Comunicados e Confirmações
| Método | Rota | Ação |
|---|---|---|
| GET | `/status` | Status da integração com o Telegram |
| POST | `/send-text` | Envia um comunicado de texto avulso |
| POST | `/confirmacao/:id` | Dispara confirmação de presença (botões Confirmar/Cancelar) |
| POST | `/responder-agendamento/:id` | Registra resposta pelo painel (fallback) |

#### `/api/telegram` — Infraestrutura do Bot
| Método | Rota | Ação |
|---|---|---|
| POST | `/webhook` | Recebe os updates do Telegram (modo produção) |
| POST | `/set-webhook` | Registra uma URL pública de webhook |
| POST | `/delete-webhook` | Remove o webhook e volta ao modo polling |

---

## 7. Núcleo de Notificações e Bot do Telegram

Esta é a parte mais inovadora do sistema e está dividida em três módulos.

### 7.1 `lib/telegram.js` — Cliente da Bot API

Encapsula toda a comunicação HTTP com `api.telegram.org`. Funções principais:

- `sendTelegramNotification(mensagem, chatId?, teclado?)` — envia mensagem de texto, com teclado inline opcional.
- `editTelegramMessage(chatId, messageId, texto)` — edita a mensagem original (usado para remover os botões e confirmar a escolha).
- `answerCallbackQuery(id, texto)` — exibe um "toast" no app do cliente ao clicar no botão.
- `buildInlineKeyboard(...)` — monta o teclado de dois botões lado a lado.
- `setTelegramWebhook`, `deleteTelegramWebhook`, `getTelegramWebhookInfo`, `getTelegramUpdates` — gerenciamento de webhook e long polling.

### 7.2 `lib/telegramBot.js` — Inteligência do Bot

Interpreta o clique do cliente. Cada botão carrega um `callback_data` no formato `ação:id`:

| Botão exibido | callback_data |
|---|---|
| Sim, quero a vaga | `aceitar_vaga:{id}` |
| Não tenho interesse | `recusar_vaga:{id}` |
| Confirmar | `confirmar_agendamento:{id}` |
| Cancelar / Reagendar | `recusar_agendamento:{id}` |

Ao receber um clique, o bot:
1. Processa a ação no banco (via `respostas.js`).
2. Responde ao clique (`answerCallbackQuery`).
3. **Edita a mensagem original** removendo os botões e exibindo a confirmação (ex.: "Vaga garantida com sucesso!").

### 7.3 Modos de operação: Polling vs. Webhook

O Telegram precisa alcançar o servidor para entregar os cliques. Como `localhost` não é acessível pela internet, o sistema implementa dois modos:

- **Long Polling (padrão, para desenvolvimento local):** o backend chama repetidamente `getUpdates`, "puxando" os cliques. Funciona sem URL pública. É desativado automaticamente se já houver um webhook registrado, ou manualmente com `TELEGRAM_USE_POLLING=false`.
- **Webhook (produção):** o Telegram envia os cliques diretamente para uma URL pública (`POST /api/telegram/webhook`), validada por um cabeçalho secreto (`X-Telegram-Bot-Api-Secret-Token`).

### 7.4 `lib/respostas.js` — Regras de Negócio Compartilhadas

- **`processarRespostaFila(id, aceito)`**
  - Atualiza o status para `aceito` ou `recusado`.
  - Grava um `LogAtividade` (alimenta o Histórico do Dashboard).
  - Se **aceito**, cria automaticamente um **Agendamento confirmado** e remove a vaga da fila.
  - Possui **guarda contra duplo clique**: se o item já foi respondido, retorna `jaRespondido: true`.

- **`processarRespostaAgendamento(id, confirmado)`**
  - Muda o status para `confirmado` ou `cancelado`.
  - Registra a atividade correspondente no Dashboard. Se cancelado, o horário volta a ficar livre.

---

## 8. Frontend — Telas e Funcionalidades

O frontend é composto por **6 telas**, todas com identidade visual consistente (dark mode) e navegação inferior comum entre elas.

### 8.1 Agendamentos
- Mini-calendário lateral para navegar por datas.
- Tabela dinâmica com filtros por status e busca por nome/telefone.
- Alteração de status diretamente na linha (dropdown).
- **Botão "Disparar"** visível apenas para status `aguardando`/`pendente`: envia a mensagem de confirmação de presença por Telegram com botões.
- Recebe parâmetros via URL (`?nome=...&tel=...`) quando o usuário vem da tela de Clientes, abrindo o formulário pré-preenchido.
- **Sincronização em tempo real:** recarrega a cada 10 segundos e ao retomar o foco da aba.

### 8.2 Clientes
- Listagem com busca instantânea.
- Cadastro e edição via painel lateral (drawer).
- Atalhos por cliente: **+ Agendar Serviço** e **Fila de Espera**, que redirecionam já preenchendo os dados do cliente.

### 8.3 Fila de Espera
- Lista em ordem **FIFO**, com selo de posição (1º, 2º, ...).
- Busca por cliente e filtro por serviço.
- Ações conforme o status:
  - **Notificar (Telegram):** abre um campo para informar o horário da vaga e envia a oferta com botões.
  - **Simular Aceite / Simular Recusa:** registra a resposta pelo painel (útil para demonstração).
  - **Confirmar na Agenda / Remover.**

### 8.4 Dashboard
- Cartões de KPI: horários recuperados, taxa de no-show, ocupação, taxa de conversão.
- Gráfico de rosca (donut) de eficiência operacional.
- **Histórico de Reencaixes:** feed de atividades gerado pelos logs (vagas aceitas, recusadas, confirmadas, canceladas).
- Filtro por período: Hoje, Esta Semana, Consolidado Mensal.
- Auto-refresh a cada 30 segundos.

### 8.5 Minha Agenda
- Cadastro de **Profissionais** (com especialidade) e **Serviços**.
- Grade interativa **hora × profissional**, montada dinamicamente a partir dos dados cadastrados.
- Criação/remoção de blocos de horário, com filtros por serviço e visibilidade de colunas.
- Base para as telas de Agendamentos e Fila de Espera (que consomem a disponibilidade daqui).

### 8.6 Comunicados
- Indicador de status da conexão com o Telegram (conectado/desconectado).
- Campo de texto e botão para envio de **comunicado avulso** para o chat configurado.

---

## 9. Fluxos de Trabalho

### Fluxo A — Agendamento normal
1. O operador cadastra o cliente na tela **Clientes**.
2. Clica em **+ Agendar Serviço** → é levado a **Agendamentos** com os dados preenchidos.
3. Escolhe serviço/profissional/data/hora (opções vindas da disponibilidade de **Minha Agenda**) e salva.
4. O agendamento entra com status `aguardando`.
5. O operador clica em **Disparar** → o cliente recebe a confirmação no Telegram com botões **Confirmar** / **Cancelar**.
6. Ao clicar:
   - **Confirmar** → status vira `confirmado`.
   - **Cancelar / Reagendar** → status vira `cancelado` e o horário é liberado.

### Fluxo B — Fila de Espera (reaproveitamento de vaga)
1. Cliente desmarca um horário (vaga livre).
2. O operador notifica um interessado da **Fila de Espera** (botão Notificar + horário).
3. O cliente recebe: *"Olá [Nome]! Temos uma vaga disponível para [Serviço] com [Profissional] no dia [Data] às [Hora]. Deseja preencher essa vaga?"* com os botões **Sim/Não**.
4. Ao clicar:
   - **Sim, quero a vaga** → status `aceito`, **agendamento confirmado é criado automaticamente**, a mensagem é editada ("Vaga garantida!") e o evento entra no Dashboard.
   - **Não tenho interesse** → status `recusado`, mensagem editada e evento registrado.
5. As telas **Fila** e **Dashboard** refletem a mudança em segundos (polling de 10s / 30s).

---

## 10. Identidade Visual (Design System)

Definida em `Frontend/global.css` com variáveis CSS reutilizáveis.

| Token | Valor | Uso |
|---|---|---|
| `--bg-primary` | `#050505` | Fundo principal (dark absoluto) |
| `--bg-secondary` | `#0a0a0a` | Sidebar, cabeçalhos |
| `--brand-blue` | `#ff5e00` | Laranja vibrante — cor da marca |
| `--brand-blue-dark` | `#ff4500` | Hover |
| `--text-main` | `#e5e7eb` | Texto principal |
| `--border-color` | `#202020` | Bordas finas (1px) |

Características: modo escuro absoluto, tipografia Inter/SF Pro, brilho atmosférico (glow laranja sutil), bordas finas e scrollbars minimalistas (invisíveis até o hover), reforçando a estética SaaS premium. Ícones são lineares (SVG inline), sem emojis na interface.

---

## 11. Configuração e Execução

### Variáveis de ambiente (`.env`)
O backend lê as variáveis do arquivo `.env` (não versionado). O modelo está em `.env.example`:

```env
# Banco de dados (PostgreSQL / Supabase)
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USUARIO:SENHA@HOST:5432/postgres"

# Telegram Bot API
TELEGRAM_BOT_TOKEN="SEU_TOKEN_DO_BOTFATHER"
TELEGRAM_CHAT_ID="SEU_CHAT_ID"

# Modo de recebimento das respostas do cliente
TELEGRAM_USE_POLLING="true"

# Valida o cabeçalho X-Telegram-Bot-Api-Secret-Token no webhook
TELEGRAM_WEBHOOK_SECRET="UM_SEGREDO_QUALQUER"
```

### Passos para rodar

```bash
# 1. Entrar na pasta do backend
cd SI-estabelecimento/Backend

# 2. Instalar dependências
npm install

# 3. Sincronizar o schema com o banco
npm run db:push

# 4. Iniciar o servidor
npm start
```

Saída esperada:

```
◇ injected env (6) from .env
Servidor rodando em http://localhost:3000
[Telegram] Bot em modo polling (getUpdates).
```

Depois, basta abrir as telas HTML do frontend no navegador (ex.: `Frontend/Dashboard/Dash.html`). O frontend aponta para `http://localhost:3000`.

---

## 12. Limitação e Trabalhos Futuros

A integração de envio de mensagens e notificações foi implementada com o **Telegram**, que é uma plataforma **gratuita** e foi utilizada aqui para fins de **teste e prova de conceito**. O cenário ideal para um ambiente de produção real seria o uso da **API oficial da Meta (WhatsApp Business Platform)**, com um número de telefone dedicado exclusivamente ao estabelecimento. No entanto, essa API é **paga**, e por esse motivo não foi implementada neste projeto.


