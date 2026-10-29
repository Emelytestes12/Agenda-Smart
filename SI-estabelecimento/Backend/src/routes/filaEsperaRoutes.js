import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// 1. Listar todas as posições da fila
router.get('/', async (req, res) => {
  try {
    const fila = await prisma.filaEspera.findMany({
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
    const { clienteNome, clienteTelefone, servico, profissional, status } = req.body;

    if (!clienteNome || !clienteTelefone || !servico) {
      return res.status(400).json({ error: 'Nome, telefone e serviço são obrigatórios.' });
    }

    const novoItem = await prisma.filaEspera.create({
      data: {
        clienteNome,
        clienteTelefone,
        servico,
        profissional: profissional || 'Qualquer disponível',
        status: status || 'aguardando'
      }
    });

    return res.status(201).json(novoItem);
  } catch (error) {
    console.error('Erro ao inserir na fila de espera:', error);
    return res.status(500).json({ error: 'Erro ao adicionar cliente à fila.' });
  }
});

// 3. Atualizar status de notificação (Disparar Zap)
router.patch('/:id/notificar', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const itemAtualizado = await prisma.filaEspera.update({
      where: { id: Number(id) },
      data: { status: status || 'disparado' }
    });

    return res.status(200).json(itemAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar status do disparo:', error);
    return res.status(500).json({ error: 'Erro ao atualizar notificação.' });
  }
});

// 4. Remover cliente da fila (Encaixado ou Excluído)
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