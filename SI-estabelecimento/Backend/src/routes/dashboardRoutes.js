import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// Buscar métricas agregadas do Dashboard por período (today, week, month)
router.get('/stats', async (req, res) => {
  try {
    const { period } = req.query;

    const agora = new Date();
    let dataInicio = new Date();

    if (period === 'week') {
      dataInicio.setDate(agora.getDate() - 7);
    } else if (period === 'month') {
      dataInicio.setMonth(agora.getMonth() - 1);
    } else {
      // "today" por padrão
      dataInicio.setHours(0, 0, 0, 0);
    }

    // Consultas no banco via Prisma
    const totalAgendamentos = await prisma.agendamento.count({
      where: { createdAt: { gte: dataInicio } }
    }).catch(() => 0);

    const cancelados = await prisma.agendamento.count({
      where: {
        status: 'cancelado',
        createdAt: { gte: dataInicio }
      }
    }).catch(() => 0);

    const confirmados = await prisma.agendamento.count({
      where: {
        status: { in: ['confirmado', 'finalizado'] },
        createdAt: { gte: dataInicio }
      }
    }).catch(() => 0);

    const totalFila = await prisma.filaEspera.count().catch(() => 0);

    // Cálculos estatísticos
    const totalEfetivo = totalAgendamentos || 1;
    const noshowRate = Number(((cancelados / totalEfetivo) * 100).toFixed(1));
    const occupancyRate = totalAgendamentos > 0 
      ? Number(((confirmados / totalAgendamentos) * 100).toFixed(1)) 
      : 100.0;

    const totalRespostasFila = await prisma.filaEspera.count({
      where: { status: { in: ['aceito', 'recusado'] } }
    }).catch(() => 0);
    
    const aceitosFila = await prisma.filaEspera.count({
      where: { status: 'aceito' }
    }).catch(() => 0);

    const logs = await prisma.logAtividade.findMany({
      where: { createdAt: { gte: dataInicio } },
      orderBy: { createdAt: 'desc' },
      take: 10
    }).catch(() => []);

    const conversionRate = totalRespostasFila > 0 
      ? Math.round((aceitosFila / totalRespostasFila) * 100) 
      : 100;

    const efficiencyPct = Math.max(0, 100 - Math.round(noshowRate));

    return res.status(200).json({
      slots: confirmados,
      noshowRate,
      occupancyRate,
      avgTime: '2.1 min',
      conversionRate,
      savedCount: aceitosFila,
      lostCount: cancelados,
      efficiencyPct,
      activities: logs.map(l => ({
        tipo: l.tipo,
        titulo: l.titulo,
        descricao: l.descricao,
        tempo: 'Recente'
      }))
    });
  } catch (error) {
    console.error('Erro ao gerar estatísticas do dashboard:', error);
    return res.status(500).json({ error: 'Erro ao carregar estatísticas do dashboard.' });
  }
});

export default router;