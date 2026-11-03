/**
 * Cliente isolado para a API do Telegram Bot.
 * Responsabilidade única: entregar mensagens de texto para um chat.
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

/**
 * Envia uma notificação de texto via Telegram.
 * @param {string} message Texto da mensagem
 * @param {string|number} [chatId] Destino (opcional; usa TELEGRAM_CHAT_ID por padrão)
 * @returns {Promise<{ok: boolean, messageId?: number, chatId?: string|number, error?: string}>}
 */
export async function sendTelegramNotification(message, chatId) {
  const { token, chatId: defaultChatId } = telegramConfig();
  const destino = chatId || defaultChatId;

  if (!token || !destino) {
    const motivo = 'Telegram não configurado: defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no .env';
    console.error(`[Telegram] ${motivo}`);
    return { ok: false, error: motivo };
  }

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: destino, text: message }),
      signal: AbortSignal.timeout(15000)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      const motivo = data.description || `HTTP ${res.status}`;
      console.error(`[Telegram] Falha no disparo: ${motivo}`);
      return { ok: false, error: motivo };
    }

    console.log(`[Telegram] Mensagem entregue ao chat ${destino} (message_id: ${data.result?.message_id})`);
    return { ok: true, messageId: data.result?.message_id, chatId: destino };
  } catch (error) {
    console.error(`[Telegram] Erro ao conectar com a API: ${error.message}`);
    return { ok: false, error: error.message };
  }
}
