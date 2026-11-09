import express from 'express';
import { prisma } from '../lib/prisma.js';
import { sendTelegramNotification, buildInlineKeyboard } from '../lib/telegram.js';
import { processarRespostaFila } from '../lib/respostas.js';

const router = express.Router();

// 1. Listar todas as posições da fila (FIFO: quem entrou primeiro fica na frente)
router.get('/', async (req, res) => {
  try {
    const { data } = req.query;

    const fila = await prisma.filaEspera.findMany({
      where: data ? { dataDesejada: data } : undefined,
      orderBy: { createdAt: 'asc' }
    });
    return res.status(200).json(fila);
  } catch (error) {
    console.error('Erro ao buscar fila de espera:', error);
    return res.status(500).json({ error: 'Erro ao buscar fila no banco de dados.' });
  }
});

// 2. Adicionar novo cliente à fila
router.post('/', async (req, res) => {
  try {
    const { clienteNome, clienteTelefone, servico, profissional, dataDesejada, status } = req.body;

    if (!clienteNome || !clienteTelefone || !servico || !dataDesejada) {
      return res.status(400).json({ error: 'Nome, telefone, serviço e data desejada são obrigatórios.' });
    }

    const novoItem = await prisma.filaEspera.create({
      data: {
        clienteNome,
        clienteTelefone,
        servico,
        profissional: profissional || 'Qualquer disponível',
        dataDesejada,
        status: status || 'aguardando'
      }
    });

    return res.status(201).json(novoItem);
  } catch (error) {
    console.error('Erro ao inserir na fila de espera:', error);
    return res.status(500).json({ error: 'Erro ao adicionar cliente à fila.' });
  }
});

// 3. Notificar Vaga via Telegram
router.post('/:id/notificar', async (req, res) => {
  try {
    const { id } = req.params;
    const { horario } = req.body;

    if (!horario) return res.status(400).json({ error: 'Horário da vaga é obrigatório.' });

    const item = await prisma.filaEspera.findUnique({ where: { id: Number(id) } });
    if (!item) return res.status(404).json({ error: 'Registro da fila não encontrado.' });

    // Normaliza a data para exibição (DD/MM/YYYY)
    const dataBR = item.dataDesejada.split('-').reverse().join('/');

    // Modelo dinâmico da mensagem de vaga
    const mensagem = `Olá ${item.clienteNome}! Temos uma vaga disponível para o serviço de ${item.servico} com o(a) profissional ${item.profissional} no dia ${dataBR} às ${horario}. Deseja preencher essa vaga e garantir esse horário?`;

    // Botões inline: o cliente responde direto no Telegram
    const teclado = buildInlineKeyboard(
      '✅ Sim, quero a vaga', `aceitar_vaga:${item.id}`,
      '❌ Não tenho interesse', `recusar_vaga:${item.id}`
    );

    const resultado = await sendTelegramNotification(mensagem, undefined, teclado);

    if (!resultado.ok) {
      return res.status(400).json({ error: resultado.error || 'Erro ao disparar a notificação.' });
    }

    const atualizado = await prisma.filaEspera.update({
      where: { id: Number(id) },
      data: {
        status: 'notificado',
        vagaOfertada: `${horario}`
      }
    });

    await prisma.logAtividade.create({
      data: {
        tipo: 'info',
        titulo: 'VAGA NOTIFICADA',
        descricao: `Notificação de vaga enviada via Telegram para ${item.clienteNome} às ${horario}.`,
        tempo: 'Agora'
      }
    });

    return res.status(200).json(atualizado);
  } catch (error) {
    console.error('Erro no disparo da fila:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 4. Resposta simulada pelo painel (fallback) — mesma regra usada pelo botão do Telegram
router.post('/:id/responder', async (req, res) => {
  try {
    const { resposta } = req.body; // 'sim' ou 'nao'
    const resultado = await processarRespostaFila(req.params.id, resposta === 'sim');

    if (resultado.erro) return res.status(404).json({ error: resultado.erro });

    return res.status(200).json(resultado.item);
  } catch (error) {
    console.error('Erro ao processar resposta da fila:', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// 5. Remover cliente da fila
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.filaEspera.delete({
      where: { id: Number(id) }
    });
    return res.status(200).json({ message: 'Removido da fila com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover da fila:', error);
    return res.status(500).json({ error: 'Erro ao deletar registro da fila.' });
  }
});

export default router;
