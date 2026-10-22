document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const HOJE = '2026-08-26';
  const STATUS = { confirmado: 'Confirmado', aguardando: 'Aguardando', finalizado: 'Finalizado', cancelado: 'Cancelado' };
  const opcoes = Object.entries(STATUS).map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  const esc = s => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  const body = $('schedule-body'), grid = $('calendar-grid'), search = $('search-input'), form = $('agendamento-form');

  $('status-filters').innerHTML = Object.entries(STATUS).map(([v, t]) =>
    `<label class="checkbox-item"><input type="checkbox" class="filter-status" value="${v}" checked> ${t}s</label>`).join('');
  const filtros = [...document.querySelectorAll('.filter-status')];

  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  let dataAtual = new Date(2026, 9, 22); // 22 de Outubro (mês 9 em JS, index 0)
  let mesCal = dataAtual.getMonth(), anoCal = dataAtual.getFullYear();
  const HOJE_STR = '2026-10-22';

  const renderizarCalendario = () => {
    $('cal-month-year').textContent = `${nomesMeses[mesCal]} ${anoCal}`;
    const dias = [...'DSTQQSS'].map(d => `<div class="cal-day-name">${d}</div>`).join('');
    const inicio = new Date(anoCal, mesCal, 1).getDay();
    const total = new Date(anoCal, mesCal + 1, 0).getDate();
    const brancos = '<span class="cal-day"></span>'.repeat(inicio);
    const numDias = Array.from({ length: total }, (_, i) => {
      const d = i + 1;
      const isSelected = d === dataAtual.getDate() && mesCal === dataAtual.getMonth() && anoCal === dataAtual.getFullYear();
      return `<span class="cal-day${isSelected ? ' active' : ''}">${d}</span>`;
    }).join('');
    grid.innerHTML = dias + brancos + numDias;
  };

  const formatarBR = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const formatarIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const selecionarDia = (dia, mes, ano) => {
    dataAtual = new Date(ano, mes, dia);
    mesCal = mes; anoCal = ano;
    renderizarCalendario();
    
    const ehHoje = formatarIso(dataAtual) === HOJE_STR;
    $('selected-date-display').textContent = ehHoje ? `Hoje, ${formatarBR(dataAtual)}` : formatarBR(dataAtual);
    aplicarFiltros();
  };

  grid.onclick = e => {
    if (e.target.matches('.cal-day:not(:empty)')) {
      selecionarDia(parseInt(e.target.textContent), mesCal, anoCal);
    }
  };

  $('btn-prev-month').onclick = () => { mesCal--; if (mesCal < 0) { mesCal = 11; anoCal--; } renderizarCalendario(); };
  $('btn-next-month').onclick = () => { mesCal++; if (mesCal > 11) { mesCal = 0; anoCal++; } renderizarCalendario(); };
  $('btn-today').onclick = () => selecionarDia(22, 9, 2026);

  renderizarCalendario();

  const toggleDrawer = aberto => {
    ['drawer', 'drawer-overlay'].forEach(id => $(id).classList.toggle('open', aberto));
    if (!aberto) form.reset();
  };
  $('btn-open-drawer').onclick = () => toggleDrawer(true);
  $('btn-close-drawer').onclick = $('drawer-overlay').onclick = () => toggleDrawer(false);

  const aplicarFiltros = () => {
    const q = search.value.toLowerCase().trim(), ativos = filtros.filter(f => f.checked).map(f => f.value);
    const linhas = [...body.querySelectorAll('tr[data-status]')];
    linhas.forEach(r => r.hidden = !(ativos.includes(r.dataset.status) && r.querySelector('td:nth-child(2)').textContent.toLowerCase().includes(q)));
    const visiveis = linhas.filter(r => !r.hidden);
    $('empty-row').hidden = visiveis.length > 0;
    $('divider-row').hidden = !visiveis.some(r => r.dataset.date !== HOJE);
  };
  search.oninput = aplicarFiltros;
  filtros.forEach(f => f.onchange = aplicarFiltros);

  body.onchange = e => {
    const valor = e.target.value, linha = e.target.closest('tr'), badge = linha.querySelector('.status-badge');
    if (!e.target.matches('.status-select') || !valor) return;
    linha.dataset.status = valor;
    badge.className = `status-badge status-${valor}`;
    badge.textContent = STATUS[valor];
    e.target.value = '';
    aplicarFiltros();
  };

  form.onsubmit = e => {
    e.preventDefault();
    const data = $('input-data').value, ehHoje = data === HOJE, tr = document.createElement('tr');
    tr.dataset.status = 'aguardando';
    tr.dataset.date = data;
    tr.innerHTML = `
      <td class="time-col">${$('input-hora').value}${ehHoje ? '' : ` <small class="date-subtext">(${data.split('-').slice(1).reverse().join('/')})</small>`}</td>
      <td><strong class="client-name">${esc($('input-cliente').value)}</strong><span class="client-phone">${esc($('input-telefone').value)}</span></td>
      <td><span class="badge-profile badge-frequente">Novo Cliente</span><span class="metrics-text">0 Presenças / 0 Faltas</span></td>
      <td>${esc($('input-servico').value)}</td>
      <td><span class="status-badge status-aguardando">Aguardando</span></td>
      <td><select class="status-select"><option value="">Mudar Status...</option>${opcoes}</select></td>`;
    ehHoje ? body.insertBefore(tr, $('divider-row')) : body.appendChild(tr);
    aplicarFiltros();
    toggleDrawer(false);
  };
  aplicarFiltros();
});