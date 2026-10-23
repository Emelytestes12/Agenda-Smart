document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const btns = document.querySelectorAll('.btn-period');

  // Base de dados simulada para atualizar os dados de cada período
  const metricsData = {
    today: {
      slots: '4',
      noshow: '0.0%',
      occupancy: '98.0%',
      avgTime: '2.1 min',
      conversion: '100%',
      subRecovered: 'Horários recuperados hoje',
      subNoshow: 'Sem faltas registradas hoje',
      subOccupancy: 'Apenas 2.0% de ociosidade',
      subConversion: '100% de aceite no WhatsApp',
      badge: 'Hoje',
      savedCount: '4',
      lostCount: '0',
      efficiencyPct: '100%',
      conicGradient: 'conic-gradient(var(--brand-blue) 0% 100%, #dc2626 100% 100%)'
    },
    week: {
      slots: '12',
      noshow: '1.8%',
      occupancy: '96.5%',
      avgTime: '3.5 min',
      conversion: '88%',
      subRecovered: 'Recuperados na semana',
      subNoshow: 'Queda de 5% em relação à anterior',
      subOccupancy: 'Apenas 3.5% de ociosidade',
      subConversion: '88% de aceite no WhatsApp',
      badge: 'Esta Semana',
      savedCount: '12',
      lostCount: '1',
      efficiencyPct: '92%',
      conicGradient: 'conic-gradient(var(--brand-blue) 0% 92%, #dc2626 92% 100%)'
    },
    month: {
      slots: '28',
      noshow: '2.4%',
      occupancy: '95.8%',
      avgTime: '4.2 min',
      conversion: '85%',
      subRecovered: 'Recuperados este mês',
      subNoshow: 'Redução de 12% este mês',
      subOccupancy: 'Apenas 4.2% de ociosidade',
      subConversion: '85% de aceite no WhatsApp',
      badge: 'Consolidado Mensal',
      savedCount: '28',
      lostCount: '2',
      efficiencyPct: '93%',
      conicGradient: 'conic-gradient(var(--brand-blue) 0% 93%, #dc2626 93% 100%)'
    }
  };

  function aplicarFiltro(periodo) {
    const data = metricsData[periodo];
    if (!data) return;

    // 1. Atualiza os KPIs do topo
    if ($('kpi-recovered-slots')) $('kpi-recovered-slots').textContent = data.slots;
    if ($('kpi-noshow-rate')) $('kpi-noshow-rate').textContent = data.noshow;
    if ($('kpi-occupancy')) $('kpi-occupancy').textContent = data.occupancy;
    if ($('kpi-avg-time')) $('kpi-avg-time').textContent = data.avgTime;
    if ($('kpi-conversion')) $('kpi-conversion').textContent = data.conversion;

    // Subtextos dos KPIs
    if ($('subtext-recovered')) $('subtext-recovered').textContent = data.subRecovered;
    if ($('subtext-noshow')) $('subtext-noshow').textContent = data.subNoshow;
    if ($('subtext-occupancy')) $('subtext-occupancy').textContent = data.subOccupancy;
    if ($('subtext-conversion')) $('subtext-conversion').textContent = data.subConversion;

    // 2. Atualiza o Gráfico de Pizza/Rosca
    if ($('chart-period-badge')) $('chart-period-badge').textContent = data.badge;
    if ($('donut-percentage')) $('donut-percentage').textContent = data.efficiencyPct;
    if ($('legend-saved-count')) $('legend-saved-count').textContent = data.savedCount;
    if ($('legend-lost-count')) $('legend-lost-count').textContent = data.lostCount;

    const donutChart = $('donut-chart-element');
    if (donutChart) {
      donutChart.style.background = data.conicGradient;
    }

    // 3. Atualiza a Badge do Histórico de Reencaixes
    if ($('feed-period-badge')) $('feed-period-badge').textContent = data.badge;
  }

  // Event listener dos botões do filtro
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aplicarFiltro(btn.dataset.period);
    });
  });

  // Inicializa o painel com o filtro "Hoje"
  aplicarFiltro('today');
});