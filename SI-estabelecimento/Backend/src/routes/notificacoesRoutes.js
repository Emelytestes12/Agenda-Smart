import express from 'express';
import { prisma } from '../lib/prisma.js';
import { sendTelegramNotification, isTelegramConfigured, telegramConfig } from '../lib/telegram.js';

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

// 3. Testar Lembrete de Confirmação
router.post('/send-reminder-test', async (req, res) => {
  try {
    const { phone } = req.body;

    let agendamento = await prisma.agendamento.findFirst({
      where: phone ? { clienteTelefone: phone } : undefined,
      orderBy: { id: 'desc' }
    });

    // Fallback: usa o último agendamento cadastrado para permitir o teste
    if (!agendamento && phone) {
      agendamento = await prisma.agendamento.findFirst({ orderBy: { id: 'desc' } });
    }

    if (!agendamento) {
      return res.status(404).json({ error: 'Nenhum agendamento encontrado no banco de dados.' });
    }

    const dataBR = agendamento.data.split('-').reverse().join('/');
    const mensagem = `Olá ${agendamento.clienteNome}! Confirmamos seu horário para amanhã (${dataBR}) às ${agendamento.hora} com ${agendamento.profissional || 'o profissional'}?`;

    const resultado = await sendTelegramNotification(mensagem);

    if (!resultado.ok) {
      return res.status(400).json({ error: resultado.error });
    }

    await prisma.logAtividade.create({
      data: {
        tipo: 'info',
        titulo: 'LEMBRETE ENVIADO',
        descricao: `Lembrete de confirmação enviado via Telegram para ${agendamento.clienteNome} (${agendamento.clienteTelefone}).`,
        tempo: 'Agora'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Lembrete disparado com sucesso!',
      agendamentoId: agendamento.id,
      phone: agendamento.clienteTelefone
    });
  } catch (err) {
    console.error('Erro ao disparar lembrete:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Agendar disparo de lembrete para um agendamento (usado no teste de 2 minutos)
const disparosPendentes = new Map();

router.post('/agendar-disparo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const delayMinutes = Number(req.body?.delayMinutes ?? 2);

    const agendamento = await prisma.agendamento.findUnique({ where: { id: Number(id) } });
    if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado.' });

    // Cancela um disparo anterior para o mesmo agendamento
    if (disparosPendentes.has(Number(id))) {
      clearTimeout(disparosPendentes.get(Number(id)));
    }

    const timer = setTimeout(async () => {
      disparosPendentes.delete(Number(id));

      const dataBR = agendamento.data.split('-').reverse().join('/');
      const mensagem = `Olá ${agendamento.clienteNome}! Confirmamos seu horário (${dataBR}) às ${agendamento.hora} com ${agendamento.profissional || 'o profissional'}?`;

      const resultado = await sendTelegramNotification(mensagem);

      await prisma.logAtividade.create({
        data: {
          tipo: resultado.ok ? 'success' : 'warning',
          titulo: resultado.ok ? 'LEMBRETE AUTOMÁTICO ENVIADO' : 'FALHA NO LEMBRETE AUTOMÁTICO',
          descricao: `Disparo programado para ${agendamento.clienteNome} às ${agendamento.hora}${resultado.ok ? '' : ` — ${resultado.error}`}.`,
          tempo: 'Agora'
        }
      });
    }, delayMinutes * 60000);

    disparosPendentes.set(Number(id), timer);

    return res.status(200).json({
      success: true,
      agendamentoId: Number(id),
      delayMinutes,
      disparaEm: new Date(Date.now() + delayMinutes * 60000).toISOString()
    });
  } catch (error) {
    console.error('Erro ao agendar disparo:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 5. Responder Agendamento (mantém a lógica interna de status)
router.post('/responder-agendamento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { resposta } = req.body;

    const agendamento = await prisma.agendamento.findUnique({ where: { id: Number(id) } });
    if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado.' });

    const novoStatus = resposta === 'sim' ? 'confirmado' : 'cancelado';

    const atualizado = await prisma.agendamento.update({
      where: { id: Number(id) },
      data: { status: novoStatus }
    });

    await prisma.logAtividade.create({
      data: {
        tipo: resposta === 'sim' ? 'success' : 'danger',
        titulo: resposta === 'sim' ? 'AGENDAMENTO CONFIRMADO' : 'AGENDAMENTO CANCELADO',
        descricao: `${agendamento.clienteNome} ${resposta === 'sim' ? 'confirmou' : 'cancelou'} o agendamento via sistema.`,
        tempo: 'Agora'
      }
    });

    return res.status(200).json(atualizado);
  } catch (err) {
    console.error('Erro ao responder:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
