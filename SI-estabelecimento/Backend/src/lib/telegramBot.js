/**
 * Cérebro do bot: interpreta os cliques nos botões inline e mantém um
 * loop de long polling (getUpdates) para funcionar em ambiente local,
 * onde o Telegram não consegue alcançar um webhook público.
 */
import {
  telegramConfig,
  getTelegramUpdates,
  getTelegramWebhookInfo,
  deleteTelegramWebhook,
  editTelegramMessage,
  answerCallbackQuery
} from './telegram.js';
import { processarRespostaFila, processarRespostaAgendamento } from './respostas.js';

let pollingAtivo = false;

/** Encerra o loop de polling (usado ao migrar para o modo webhook). */
export function stopTelegramPolling() {
  pollingAtivo = false;
}

/** Traduz o clique do botão em ação no banco e edita a mensagem no Telegram. */
export async function handleTelegramUpdate(update) {
  const cq = update?.callback_query;
  if (!cq) return;

  const [acao, idStr] = (cq.data || '').split(':');
  const id = Number(idStr);
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;

  if (!Number.isFinite(id)) {
    return answerCallbackQuery(cq.id, 'Ação inválida.');
  }

  try {
    if (acao === 'aceitar_vaga' || acao === 'recusar_vaga') {
      const aceito = acao === 'aceitar_vaga';
      const r = await processarRespostaFila(id, aceito);

      if (r.erro) return answerCallbackQuery(cq.id, r.erro);
      if (r.jaRespondido) return answerCallbackQuery(cq.id, 'Você já respondeu a esta vaga.');

      await answerCallbackQuery(cq.id, aceito ? 'Vaga garantida!' : 'Resposta registrada.');
      await editTelegramMessage(chatId, messageId, aceito
        ? '✅ Vaga garantida com sucesso! Seu horário está confirmado na agenda.'
        : 'Entendido! Manteremos você na fila para próximas vagas.');
    } else if (acao === 'confirmar_agendamento' || acao === 'recusar_agendamento') {
      const confirmado = acao === 'confirmar_agendamento';
      const r = await processarRespostaAgendamento(id, confirmado);

      if (r.erro) return answerCallbackQuery(cq.id, r.erro);

      await answerCallbackQuery(cq.id, confirmado ? 'Presença confirmada!' : 'Agendamento cancelado.');
      await editTelegramMessage(chatId, messageId, confirmado
        ? '✅ Presença confirmada! Esperamos você no horário marcado.'
        : '❌ Agendamento cancelado. Obrigado por avisar.');
    } else {
      await answerCallbackQuery(cq.id, 'Ação não reconhecida.');
    }
  } catch (error) {
    console.error('[Telegram] Erro ao processar callback:', error);
  }
}

/**
 * Inicia o long polling quando as credenciais existem e nenhum webhook
 * está registrado. Desative com TELEGRAM_USE_POLLING=false.
 */
export async function startTelegramPolling() {
  const { token } = telegramConfig();
  if (!token || process.env.TELEGRAM_USE_POLLING === 'false') return;

  const info = await getTelegramWebhookInfo();
  if (info.ok && info.result?.url) {
    console.log('[Telegram] Webhook registrado — polling desativado.');
    return;
  }

  await deleteTelegramWebhook();
  pollingAtivo = true;
  let offset = 0;
  console.log('[Telegram] Bot em modo polling (getUpdates).');

  (async () => {
    while (pollingAtivo) {
      const r = await getTelegramUpdates(offset);
      if (!r.ok || !Array.isArray(r.result)) {
        await new Promise(s => setTimeout(s, 3000));
        continue;
      }
      for (const update of r.result) {
        offset = update.update_id + 1;
        await handleTelegramUpdate(update).catch(e => console.error('[Telegram] Erro no update:', e));
      }
    }
  })();
}
