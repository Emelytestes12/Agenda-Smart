import express from 'express';
import { prisma } from '../lib/prisma.js';
import { sendTelegramNotification, isTelegramConfigured, telegramConfig, buildInlineKeyboard } from '../lib/telegram.js';
import { processarRespostaAgendamento } from '../lib/respostas.js';

const router = express.Router();

// 1. Status da integração de notificações
router.get('/status', (req, res) => {
  const { chatId } = telegramConfig();
  return res.status(200).json({
    configured: isTelegramConfigured(),
    provider: 'Telegram Bot API',
    chatId: chatId || null
  });
});

// 2. Envio de comunicado avulso
router.post('/send-text', async (req, res) => {
  try {
    const { message, chatId } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'O texto da mensagem é obrigatório.' });
    }

    const resultado = await sendTelegramNotification(message, chatId);

    if (!resultado.ok) {
      return res.status(400).json({ success: false, error: resultado.error });
    }

    return res.status(200).json({
      success: true,
      message: 'Comunicado enviado pelo Telegram.',
      messageId: resultado.messageId
    });
  } catch (error) {
    console.error('Erro no envio do comunicado:', error);
    return res.status(500).json({ success: false, error: 'Erro interno no servidor.' });
  }
});

// 3. Disparar confirmação de um agendamento específico (Tela de Agendamentos)
router.post('/confirmacao/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agendamento = await prisma.agendamento.findUnique({ where: { id: Number(id) } });
    if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado.' });

    const dataBR = agendamento.data.split('-').reverse().join('/');
    const mensagem = `Olá ${agendamento.clienteNome}! Confirme seu horário em ${dataBR} às ${agendamento.hora} com ${agendamento.profissional || 'o profissional'}. Você confirma a presença?`;

    const teclado = buildInlineKeyboard(
      '✅ Confirmar', `confirmar_agendamento:${agendamento.id}`,
      '❌ Cancelar / Reagendar', `recusar_agendamento:${agendamento.id}`
    );

    const resultado = await sendTelegramNotification(mensagem, undefined, teclado);
    if (!resultado.ok) return res.status(400).json({ error: resultado.error });

    await prisma.logAtividade.create({
      data: {
        tipo: 'info',
        titulo: 'CONFIRMAÇÃO ENVIADA',
        descricao: `Mensagem de confirmação enviada para ${agendamento.clienteNome} (${dataBR} às ${agendamento.hora}).`,
        tempo: 'Agora'
      }
    });

    return res.status(200).json({
      success: true,
      agendamentoId: agendamento.id,
      clienteNome: agendamento.clienteNome
    });
  } catch (error) {
    console.error('Erro ao disparar confirmação:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 4. Responder Agendamento (mesma regra usada pelo botão do Telegram)
router.post('/responder-agendamento/:id', async (req, res) => {
  try {
    const { resposta } = req.body;
    const resultado = await processarRespostaAgendamento(req.params.id, resposta === 'sim');

    if (resultado.erro) return res.status(404).json({ error: resultado.erro });

    return res.status(200).json(resultado.item);
  } catch (err) {
    console.error('Erro ao responder:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
