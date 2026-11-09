import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// 1. Listar todos os agendamentos
router.get('/', async (req, res) => {
  try {
    const agendamentos = await prisma.agendamento.findMany({
      orderBy: [
        { data: 'asc' },
        { hora: 'asc' }
      ]
    });
    return res.status(200).json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return res.status(500).json({ error: 'Erro ao buscar agendamentos do banco de dados.' });
  }
});

// 2. Criar um novo agendamento
router.post('/', async (req, res) => {
  try {
    const { clienteNome, clienteTelefone, data, hora, servico, status } = req.body;

    if (!clienteNome || !clienteTelefone || !data || !hora || !servico) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    const novoAgendamento = await prisma.agendamento.create({
      data: {
        clienteNome,
        clienteTelefone,
        data,
        hora,
        servico,
        status: status || 'aguardando'
      }
    });

    return res.status(201).json(novoAgendamento);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao registrar agendamento.' });
  }
});

// 3. Atualizar apenas o status de um agendamento
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'O novo status é obrigatório.' });
    }

    const agendamentoAtualizado = await prisma.agendamento.update({
      where: { id: Number(id) },
      data: { status }
    });

    return res.status(200).json(agendamentoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status no banco de dados.' });
  }
});

// 4. Deletar agendamento (opcional)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.agendamento.delete({
      where: { id: Number(id) }
    });
    return res.status(200).json({ message: 'Agendamento removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    return res.status(500).json({ error: 'Erro ao deletar agendamento.' });
  }
});

export default router;