import express from 'express';
import { setTelegramWebhook, deleteTelegramWebhook } from '../lib/telegram.js';
import { handleTelegramUpdate, stopTelegramPolling, startTelegramPolling } from '../lib/telegramBot.js';

const router = express.Router();

// Endpoint público que recebe os updates do Telegram (usado em produção).
router.post('/webhook', async (req, res) => {
  const segredo = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (segredo && req.get('X-Telegram-Bot-Api-Secret-Token') !== segredo) {
    return res.sendStatus(401);
  }

  try {
    await handleTelegramUpdate(req.body);
  } catch (error) {
    console.error('[Telegram] Erro no webhook:', error);
  }

  return res.sendStatus(200);
});

// Registra o webhook apontando para uma URL pública (deploy / túnel).
router.post('/set-webhook', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Informe a URL pública do webhook.' });

  stopTelegramPolling();
  const r = await setTelegramWebhook(url, process.env.TELEGRAM_WEBHOOK_SECRET);
  if (!r.ok) return res.status(400).json(r);
  return res.status(200).json({ success: true, url });
});

// Remove o webhook e devolve o bot para o modo polling.
router.post('/delete-webhook', async (req, res) => {
  const r = await deleteTelegramWebhook();
  if (r.ok) startTelegramPolling().catch(() => {});
  return res.status(r.ok ? 200 : 400).json(r);
});

export default router;
