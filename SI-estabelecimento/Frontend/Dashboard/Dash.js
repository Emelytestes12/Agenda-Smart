document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const btns = document.querySelectorAll('.btn-period');
  const API_URL = 'http://localhost:3000/api/dashboard';

  let periodoAtual = 'today';

  const labelsPeriodo = {
    today: 'Hoje',
    week: 'Esta Semana',
    month: 'Consolidado Mensal'
  };

  // --- CARREGAMENTO DINÂMICO DAS MÉTRICAS VIA API ---
  const carregarDashboard = async (periodo) => {
    periodoAtual = periodo;
    try {
      const res = await fetch(`${API_URL}/stats?period=${periodo}`);
      if (res.ok) {
        const data = await res.json();
        atualizarInterface(data, periodo);
      } else {
        console.error('Erro na resposta do servidor ao carregar dashboard.');
      }
    } catch (err) {
      console.error('Erro ao conectar com a API do dashboard:', err);
    }
  };

  // Renderiza as métricas recebidas do banco de dados na interface
  const atualizarInterface = (data, periodo) => {
    const badgeLabel = labelsPeriodo[periodo] || 'Hoje';

    // 1. Atualiza os KPIs do topo
    if ($('kpi-recovered-slots')) $('kpi-recovered-slots').textContent = data.slots ?? 0;
    if ($('kpi-noshow-rate')) $('kpi-noshow-rate').textContent = `${data.noshowRate ?? '0.0'}%`;
    if ($('kpi-occupancy')) $('kpi-occupancy').textContent = `${data.occupancyRate ?? '0.0'}%`;
    if ($('kpi-avg-time')) $('kpi-avg-time').textContent = data.avgTime ?? '2.1 min';
    if ($('kpi-conversion')) $('kpi-conversion').textContent = `${data.conversionRate ?? 100}%`;

    // Subtextos dos KPIs
    if ($('subtext-recovered')) $('subtext-recovered').textContent = `Horários recuperados (${badgeLabel.toLowerCase()})`;
    if ($('subtext-noshow')) $('subtext-noshow').textContent = data.noshowRate === 0 ? 'Sem faltas registradas' : 'Taxa de desmarcação no período';
    if ($('subtext-occupancy')) $('subtext-occupancy').textContent = `Taxa de ocupação em ${badgeLabel.toLowerCase()}`;
    if ($('subtext-conversion')) $('subtext-conversion').textContent = 'Aceitaram a vaga ofertada via Zap';

    // 2. Atualiza o Gráfico de Rosca / Donut
    if ($('chart-period-badge')) $('chart-period-badge').textContent = badgeLabel;
    if ($('donut-percentage')) $('donut-percentage').textContent = `${data.efficiencyPct ?? 100}%`;
    if ($('legend-saved-count')) $('legend-saved-count').textContent = data.savedCount ?? 0;
    if ($('legend-lost-count')) $('legend-lost-count').textContent = data.lostCount ?? 0;

    const eff = data.efficiencyPct ?? 100;
    const donutChart = $('donut-chart-element');
    if (donutChart) {
      donutChart.style.background = `conic-gradient(var(--brand-blue) 0% ${eff}%, #dc2626 ${eff}% 100%)`;
    }

    // 3. Atualiza a Badge e o Histórico de Reencaixes
    if ($('feed-period-badge')) $('feed-period-badge').textContent = badgeLabel;

    const feedList = $('activity-feed-list');
    if (feedList && Array.isArray(data.activities)) {
      if (data.activities.length === 0) {
        feedList.innerHTML = '<li class="feed-item"><div class="feed-content"><p>Nenhuma atividade recente no período.</p></div></li>';
      } else {
        feedList.innerHTML = data.activities.map(act => `
          <li class="feed-item ${act.tipo || 'success'}">
            <div class="feed-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <div class="feed-content">
              <strong>${act.titulo}</strong>
              <p>${act.descricao}</p>
              <span class="feed-time">${act.tempo}</span>
            </div>
          </li>
        `).join('');
      }
    }
  };

  // Event listener dos botões de filtro de período
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      carregarDashboard(btn.dataset.period);
    });
  });

  // Inicializa com o período "Hoje"
  carregarDashboard('today');
});