import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// 1. Obter todos os dados da agenda (Profissionais, Serviços e Agendamentos)
router.get('/', async (req, res) => {
  try {
    const [profissionais, servicos, agendamentos] = await Promise.all([
      prisma.profissional.findMany({ orderBy: { nome: 'asc' } }).catch(() => []),
      prisma.servico.findMany({ orderBy: { nome: 'asc' } }).catch(() => []),
      prisma.agendaItem.findMany().catch(() => [])
    ]);

    return res.status(200).json({ profissionais, servicos, agendamentos });
  } catch (error) {
    console.error('Erro ao buscar dados da minha agenda:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados do banco.' });
  }
});

// 2. Criar Agendamento no Grid
router.post('/agendamentos', async (req, res) => {
  try {
    const { data, hora, prof, servico, obs } = req.body;

    if (!data || !hora || !prof || !servico) {
      return res.status(400).json({ error: 'Data, hora, profissional e serviço são obrigatórios.' });
    }

    const novoAgendamento = await prisma.agendaItem.create({
      data: { data, hora, prof, servico, obs: obs || '' }
    });

    return res.status(201).json(novoAgendamento);
  } catch (error) {
    console.error('Erro ao salvar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao registrar agendamento.' });
  }
});

// 3. Excluir Agendamento
router.delete('/agendamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.agendaItem.delete({ where: { id: Number(id) } });
    return res.status(200).json({ message: 'Agendamento removido.' });
  } catch (error) {
    console.error('Erro ao remover agendamento:', error);
    return res.status(500).json({ error: 'Erro ao excluir agendamento.' });
  }
});

// 4. Cadastrar Profissional
router.post('/profissionais', async (req, res) => {
  try {
    const { nome, especialidade } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

    const novoProfissional = await prisma.profissional.create({
      data: { nome, especialidade: especialidade || 'Geral' }
    });

    return res.status(201).json(novoProfissional);
  } catch (error) {
    console.error('Erro ao cadastrar profissional:', error);
    return res.status(500).json({ error: 'Erro ao salvar profissional.' });
  }
});

// 5. Remover Profissional
router.delete('/profissionais/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.profissional.delete({ where: { id: Number(id) } });
    return res.status(200).json({ message: 'Profissional removido.' });
  } catch (error) {
    console.error('Erro ao excluir profissional:', error);
    return res.status(500).json({ error: 'Erro ao remover profissional.' });
  }
});

// 6. Cadastrar Serviço
router.post('/servicos', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome do serviço é obrigatório.' });

    const novoServico = await prisma.servico.create({
      data: { nome }
    });

    return res.status(201).json(novoServico);
  } catch (error) {
    console.error('Erro ao cadastrar serviço:', error);
    return res.status(500).json({ error: 'Erro ao salvar serviço.' });
  }
});

// 7. Remover Serviço
router.delete('/servicos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.servico.delete({ where: { id: Number(id) } });
    return res.status(200).json({ message: 'Serviço removido.' });
  } catch (error) {
    console.error('Erro ao excluir serviço:', error);
    return res.status(500).json({ error: 'Erro ao remover serviço.' });
  }
});

export default router;