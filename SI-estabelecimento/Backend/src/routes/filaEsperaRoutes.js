import express from 'express';
import { prisma } from '../lib/prisma.js';

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

// 3. Notificar Vaga via WhatsApp (Disparo Dinâmico)
router.post('/:id/notificar', async (req, res) => {
  try {
    const { id } = req.params;
    const { horario } = req.body;

    if (!horario) return res.status(400).json({ error: 'Horário da vaga é obrigatório.' });

    const item = await prisma.filaEspera.findUnique({ where: { id: Number(id) } });
    if (!item) return res.status(404).json({ error: 'Registro da fila não encontrado.' });

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      return res.status(500).json({ error: 'WhatsApp não configurado.' });
    }

    // Normaliza a data para exibição (DD/MM/YYYY)
    const dataBR = item.dataDesejada.split('-').reverse().join('/');
    
    // Modelo da Mensagem Dinâmica exigido
    const mensagem = `Olá ${item.clienteNome}! Temos uma vaga disponível para o serviço de ${item.servico} com o(a) profissional ${item.profissional} no dia ${dataBR} às ${horario}. Deseja preencher essa vaga e garantir esse horário?`;

    // Função auxiliar para normalizar telefone (reutilizando lógica do whatsappRoutes)
    const cleanPhone = (phone) => {
      let c = String(phone).replace(/\D/g, '');
      if (c.length <= 11 && !c.startsWith('55')) c = '55' + c;
      if (c.startsWith('55') && c.length === 13) c = c.substring(0, 4) + c.substring(5);
      return c;
    };

    const url = `https://graph.facebook.com/v25.0/${phoneId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone(item.clienteTelefone),
        type: 'text',
        text: { body: mensagem }
      })
    });

    if (response.ok) {
      const atualizado = await prisma.filaEspera.update({
        where: { id: Number(id) },
        data: { 
          status: 'notificado',
          vagaOfertada: `${horario}`
        }
      });
      return res.status(200).json(atualizado);
    }

    const erroData = await response.json();
    return res.status(400).json({ error: erroData.error?.message || 'Erro ao disparar WhatsApp' });
  } catch (error) {
    console.error('Erro no disparo da fila:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 4. Webhook Simulado / Processamento de Resposta
router.post('/:id/responder', async (req, res) => {
  try {
    const { id } = req.params;
    const { resposta } = req.body; // 'sim' ou 'nao'

    const item = await prisma.filaEspera.findUnique({ where: { id: Number(id) } });
    if (!item) return res.status(404).json({ error: 'Registro não encontrado.' });

    const novoStatus = resposta === 'sim' ? 'aceito' : 'recusado';
    
    const atualizado = await prisma.filaEspera.update({
      where: { id: Number(id) },
      data: { status: novoStatus }
    });

    // Registrar no Dashboard (LogAtividade)
    await prisma.logAtividade.create({
      data: {
        tipo: resposta === 'sim' ? 'success' : 'warning',
        titulo: resposta === 'sim' ? 'VAGA ACEITA' : 'VAGA RECUSADA',
        descricao: `${item.clienteNome} (${item.clienteTelefone}) ${resposta === 'sim' ? 'aceitou' : 'recusou'} a vaga para ${item.servico} em ${item.dataDesejada} às ${item.vagaOfertada || 'horário não definido'}.`,
        tempo: 'Agora'
      }
    });

    // Se aceitou, cria o agendamento real (opcional, conforme regra 3)
    if (resposta === 'sim') {
      await prisma.agendamento.create({
        data: {
          clienteNome: item.clienteNome,
          clienteTelefone: item.clienteTelefone,
          data: item.dataDesejada,
          hora: item.vagaOfertada || '00:00',
          servico: item.servico,
          profissional: item.profissional,
          status: 'confirmado'
        }
      });
    }

    return res.status(200).json(atualizado);
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