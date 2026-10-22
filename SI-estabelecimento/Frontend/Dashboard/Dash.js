document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const btns = document.querySelectorAll('.btn-period');
  const metricsData = {
    today: { slots: '4', noshow: '0.0%', occupancy: '98.0%', avgTime: '2.1 min' },
    week: { slots: '12', noshow: '1.8%', occupancy: '96.5%', avgTime: '3.5 min' },
    month: { slots: '28', noshow: '2.4%', occupancy: '95.8%', avgTime: '4.2 min' }
  };

  btns.forEach(btn => {
    btn.onclick = () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const m = metricsData[btn.dataset.period];
      if (m) {
        $('kpi-recovered-slots').textContent = m.slots;
        $('kpi-noshow-rate').textContent = m.noshow;
        $('kpi-occupancy').textContent = m.occupancy;
        $('kpi-avg-time').textContent = m.avgTime;
      }
    };
  });
});