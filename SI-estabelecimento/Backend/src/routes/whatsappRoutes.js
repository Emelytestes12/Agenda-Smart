import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// 1. Status da integração de WhatsApp (Desativado)
router.get('/status', (req, res) => {
  return res.status(200).json({
    configured: false,
    sender: 'Nenhum',
    provider: 'Desativado'
  });
});

// 2. Envio de mensagens (Desativado)
router.post('/send-text', async (req, res) => {
  return res.status(200).json({
    success: false,
    message: 'Envio de WhatsApp desativado.'
  });
});

// 3. Testar Lembrete (Simulação local no Dashboard)
router.post('/send-reminder-test', async (req, res) => {
  try {
    const { phone } = req.body;
    let agendamento = await prisma.agendamento.findFirst({
      where: phone ? { clienteTelefone: phone } : undefined,
      orderBy: { id: 'desc' }
    });

    if (!agendamento && phone) {
      agendamento = await prisma.agendamento.findFirst({
        orderBy: { id: 'desc' }
      });
    }

    if (!agendamento) return res.status(404).json({ error: 'Nenhum agendamento encontrado.' });

    // Apenas gera o log no sistema sem enviar WhatsApp real
    await prisma.logAtividade.create({
      data: {
        tipo: 'info',
        titulo: 'SIMULAÇÃO DE LEMBRETE',
        descricao: `Simulação de lembrete para ${agendamento.clienteNome} (${agendamento.clienteTelefone}). WhatsApp real desativado.`,
        tempo: 'Agora'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Simulação de lembrete registrada com sucesso!',
      agendamentoId: agendamento.id,
      phone: agendamento.clienteTelefone
    });
  } catch (err) {
    console.error('Erro na simulação:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Responder Agendamento (Mantido para lógica interna de status)
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
