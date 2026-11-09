Markdown
<div align="center">

<img src="https://github.com/user-attachments/assets/06119190-2b0c-4281-86ae-6066fb5d3f1c" alt="logotipo" width="180"/>

**Sistema Inteligente de Agendamentos e Notificações Gratuitas via Telegram**

[![Node.js](https://img.shields.io/badge/Backend-Node.js-green.svg)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-emerald.svg)](https://supabase.com/)
[![Telegram API](https://img.shields.io/badge/Notifications-Telegram%20Bot-blue.svg)](https://core.telegram.org/bots/api)


</div>

---

## 📌 Sobre o Projeto

O **Agenda Smart** é uma solução desenvolvida para automatizar a gestão de horários, clientes e serviços em estabelecimentos comerciais (clínicas de estética, barbearias, salões de beleza). 

O diferencial do projeto é a **integração nativa com a Telegram Bot API**, permitindo o envio automático e gratuito de confirmações, alertas e comunicados gerais sem custos com APIs de SMS/WhatsApp.

---

## 🚀 Funcionalidades

- **Gestão de Agendamentos:** Controle em tempo real de horários, profissionais e serviços.
- **Notificações Automáticas:** Envio de alertas de agendamento e avisos gerais via Telegram.
- **Banco de Dados Relacional:** Estrutura PostgreSQL gerenciada pelo **Supabase**.
- **Deploy na Nuvem:** Backend estruturado para publicação contínua na plataforma **Render**.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript / React
- **Backend:** Node.js / Express
- **Banco de Dados:** PostgreSQL (Supabase)
- **Notificações:** Telegram Bot API
- **Hospedagem:** Render

---

## ⚙️ Configuração das Variáveis de Ambiente (`.env`)

Crie o arquivo `.env` dentro da pasta `SI-estabelecimento/Backend/.env` com a seguinte estrutura:

```env
DATABASE_URL="postgresql://postgres.wcferojpsfwolwtzvsqm:9818Ee%402026TCC@aws-0-us-east-2.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:9818Ee%402026TCC@db.wcferojpsfwolwtzvsqm.supabase.co:5432/postgres"

TELEGRAM_BOT_TOKEN="9056085748:AAExcf6d6TkosXIXrn8o3FvtUe4qA86C2pg"
TELEGRAM_CHAT_ID="7768296171"
TELEGRAM_USE_POLLING="true"
TELEGRAM_WEBHOOK_SECRET="segredotcc2026"

```

🤖 Passo a Passo: Configuração do Telegram Bot (@BotFather)
1. Criar o Bot
Abra o Telegram e procure por @BotFather.

Inicie a conversa e envie o comando /newbot.

Defina um nome (ex: Agenda Smart Bot) e um nome de usuário único terminado em bot (ex: agendasmart_bot).

Copie o HTTP API Token gerado e cole na variável TELEGRAM_BOT_TOKEN do seu arquivo .env.

2. Obter o ID do Chat/Usuário (TELEGRAM_CHAT_ID)
Para Teste Individual: Procure o bot @userinfobot no Telegram, dê um /start e copie o seu Id.

Para Teste em Grupo: Crie um grupo, adicione o seu bot e o bot @RawDataBot para capturar o ID do grupo (começa com -100...). Depois, insira esse ID na variável TELEGRAM_CHAT_ID.


## 📦 Como Rodar a Aplicação

```bash
# 1. Clonar o repositório
git clone [https://github.com/seu-usuario/SI-estabelecimento.git](https://github.com/seu-usuario/SI-estabelecimento.git)

# 2. Entrar no diretório do backend
cd SI-estabelecimento/Backend

# 3. Instalar as dependências
npm install

# 4. Iniciar o servidor em modo de desenvolvimento
npm run dev
