/**
 * Cliente isolado para a API do Telegram Bot.
 * Responsabilidade única: falar com a Bot API (envio, edição, botões e updates).
 */
const TELEGRAM_API_BASE = 'https://api.telegram.org';

/** Lê as credenciais do .env em tempo de execução. */
export function telegramConfig() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
  };
}

/** Indica se as credenciais mínimas estão presentes. */
export function isTelegramConfigured() {
  const { token, chatId } = telegramConfig();
  return Boolean(token && chatId);
}

/** Chama um método da Bot API e normaliza a resposta. */
async function callTelegram(method, payload, timeoutMs = 15000) {
  const { token } = telegramConfig();
  if (!token) return { ok: false, error: 'Telegram não configurado: defina TELEGRAM_BOT_TOKEN no .env' };

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
      signal: AbortSignal.timeout(timeoutMs)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      return { ok: false, error: data.description || `HTTP ${res.status}` };
    }
    return { ok: true, result: data.result };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/** Monta o teclado inline de dois botões usado nas notificações. */
export function buildInlineKeyboard(confirmLabel, confirmData, denyLabel, denyData) {
  return {
    inline_keyboard: [[
      { text: confirmLabel, callback_data: confirmData },
      { text: denyLabel, callback_data: denyData }
    ]]
  };
}

/**
 * Envia uma notificação de texto via Telegram, com botões inline opcionais.
 * @param {string} message Texto da mensagem
 * @param {string|number} [chatId] Destino (opcional; usa TELEGRAM_CHAT_ID por padrão)
 * @param {object} [replyMarkup] Teclado inline (opcional)
 * @returns {Promise<{ok: boolean, messageId?: number, chatId?: string|number, error?: string}>}
 */
export async function sendTelegramNotification(message, chatId, replyMarkup) {
  const { chatId: defaultChatId } = telegramConfig();
  const destino = chatId || defaultChatId;

  if (!destino) {
    const motivo = 'Telegram não configurado: defina TELEGRAM_CHAT_ID no .env';
    console.error(`[Telegram] ${motivo}`);
    return { ok: false, error: motivo };
  }

  const payload = { chat_id: destino, text: message };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  const r = await callTelegram('sendMessage', payload);

  if (!r.ok) {
    console.error(`[Telegram] Falha no disparo: ${r.error}`);
    return { ok: false, error: r.error };
  }

  console.log(`[Telegram] Mensagem entregue ao chat ${destino} (message_id: ${r.result?.message_id})`);
  return { ok: true, messageId: r.result?.message_id, chatId: destino };
}

/** Edita o texto de uma mensagem já enviada (usado para confirmar a escolha do cliente). */
export async function editTelegramMessage(chatId, messageId, text, replyMarkup) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text,
    // Sem teclado: remove os botões após a resposta do cliente
    reply_markup: replyMarkup || { inline_keyboard: [] }
  };
  const r = await callTelegram('editMessageText', payload);
  if (!r.ok) console.error(`[Telegram] Falha ao editar mensagem: ${r.error}`);
  return r;
}

/** Envia um aviso (toast) em resposta ao clique do botão. */
export async function answerCallbackQuery(callbackQueryId, text) {
  return callTelegram('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

/** Registra o webhook apontando para o endpoint público do backend. */
export async function setTelegramWebhook(url, secretToken) {
  const payload = { url, allowed_updates: ['callback_query', 'message'] };
  if (secretToken) payload.secret_token = secretToken;
  return callTelegram('setWebhook', payload);
}

/** Remove o webhook (necessário para usar getUpdates/polling). */
export async function deleteTelegramWebhook() {
  return callTelegram('deleteWebhook', { drop_pending_updates: false });
}

/** Consulta o webhook registrado atualmente. */
export async function getTelegramWebhookInfo() {
  return callTelegram('getWebhookInfo', {});
}

/** Busca updates via long polling (alternativa ao webhook em ambiente local). */
export async function getTelegramUpdates(offset, timeout = 25) {
  return callTelegram('getUpdates', {
    offset,
    timeout,
    allowed_updates: ['callback_query', 'message']
  }, (timeout + 10) * 1000);
}
