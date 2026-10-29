import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// 1. Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { nome: 'asc' }
    });
    return res.status(200).json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return res.status(500).json({ error: 'Erro ao buscar clientes no banco de dados.' });
  }
});

// 2. Cadastrar novo cliente
router.post('/', async (req, res) => {
  try {
    const { nome, telefone, observacoes } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e Telefone são obrigatórios.' });
    }

    const novoCliente = await prisma.cliente.create({
      data: {
        nome,
        telefone,
        observacoes: observacoes || ''
      }
    });

    return res.status(201).json(novoCliente);
  } catch (error) {
    console.error('Erro ao cadastrar cliente:', error);
    return res.status(500).json({ error: 'Erro ao registrar cliente.' });
  }
});

// 3. Atualizar cliente existente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, observacoes } = req.body;

    const clienteAtualizado = await prisma.cliente.update({
      where: { id: Number(id) },
      data: {
        nome,
        telefone,
        observacoes
      }
    });

    return res.status(200).json(clienteAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return res.status(500).json({ error: 'Erro ao atualizar dados do cliente.' });
  }
});

// 4. Excluir cliente (opcional)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.cliente.delete({
      where: { id: Number(id) }
    });
    return res.status(200).json({ message: 'Cliente removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    return res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
});

export default router;