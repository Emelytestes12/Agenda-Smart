/**
 * Regras de negócio compartilhadas para processar a resposta do cliente
 * (vinda do Telegram via botão inline ou da simulação pelo painel).
 */
import { prisma } from './prisma.js';

const formatarBR = iso => (iso ? iso.split('-').reverse().join('/') : '—');

/**
 * Processa a resposta do cliente a uma vaga da fila de espera.
 * @param {number|string} id ID do registro na FilaEspera
 * @param {boolean} aceito true = aceitou a vaga, false = recusou
 * @returns {Promise<{item?: object, erro?: string, jaRespondido?: boolean}>}
 */
export async function processarRespostaFila(id, aceito) {
  const item = await prisma.filaEspera.findUnique({ where: { id: Number(id) } });
  if (!item) return { erro: 'Registro da fila não encontrado.' };

  // Evita processar o mesmo clique duas vezes (double tap no botão)
  if (item.status === 'aceito' || item.status === 'recusado') {
    return { jaRespondido: true, item };
  }

  const atualizado = await prisma.filaEspera.update({
    where: { id: Number(id) },
    data: { status: aceito ? 'aceito' : 'recusado' }
  });

  await prisma.logAtividade.create({
    data: {
      tipo: aceito ? 'success' : 'warning',
      titulo: aceito ? 'VAGA ACEITA' : 'VAGA RECUSADA',
      descricao: `${item.clienteNome} (${item.clienteTelefone}) ${aceito ? 'aceitou' : 'recusou'} a vaga para ${item.servico} em ${formatarBR(item.dataDesejada)} às ${item.vagaOfertada || 'horário não definido'}.`,
      tempo: 'Agora'
    }
  });

  // Se aceitou, cria o agendamento real já confirmado
  if (aceito) {
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

  return { item: atualizado };
}

/**
 * Processa a resposta do cliente a um lembrete de confirmação de agendamento.
 * @param {number|string} id ID do Agendamento
 * @param {boolean} confirmado true = confirmou presença, false = cancelou
 * @returns {Promise<{item?: object, erro?: string}>}
 */
export async function processarRespostaAgendamento(id, confirmado) {
  const agendamento = await prisma.agendamento.findUnique({ where: { id: Number(id) } });
  if (!agendamento) return { erro: 'Agendamento não encontrado.' };

  const atualizado = await prisma.agendamento.update({
    where: { id: Number(id) },
    data: { status: confirmado ? 'confirmado' : 'cancelado' }
  });

  await prisma.logAtividade.create({
    data: {
      tipo: confirmado ? 'success' : 'danger',
      titulo: confirmado ? 'AGENDAMENTO CONFIRMADO' : 'AGENDAMENTO CANCELADO',
      descricao: `${agendamento.clienteNome} ${confirmado ? 'confirmou' : 'cancelou'} o agendamento via Telegram.`,
      tempo: 'Agora'
    }
  });

  return { item: atualizado };
}
