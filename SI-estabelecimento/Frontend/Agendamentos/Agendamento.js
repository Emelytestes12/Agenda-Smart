document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  // Status e utilitários gerais
  const STATUS = { confirmado: 'Confirmado', aguardando: 'Aguardando', finalizado: 'Finalizado', cancelado: 'Cancelado' };
  const opcoes = Object.entries(STATUS).map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  const esc = s => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

  const body = $('schedule-body'), grid = $('calendar-grid'), search = $('search-input'), form = $('agendamento-form');

  // Popula os checkboxes de filtro por status
  $('status-filters').innerHTML = Object.entries(STATUS).map(([v, t]) =>
    `<label class="checkbox-item"><input type="checkbox" class="filter-status" value="${v}" checked> ${t}s</label>`).join('');
  const filtros = [...document.querySelectorAll('.filter-status')];

  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Funções de Formatação de Data
  const formatarBR = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const formatarIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Captura dinâmica da data de HOJE do navegador
  const HOJE_OBJ = new Date();
  const HOJE_STR = formatarIso(HOJE_OBJ);

  // Data Selecionada e Navegação do Calendário
  let dataAtual = new Date(HOJE_OBJ.getFullYear(), HOJE_OBJ.getMonth(), HOJE_OBJ.getDate());
  let mesCal = dataAtual.getMonth(), anoCal = dataAtual.getFullYear();

  // Renderizador do mini calendário
  const renderizarCalendario = () => {
    $('cal-month-year').textContent = `${nomesMeses[mesCal]} ${anoCal}`;
    const diasHeader = [...'DSTQQSS'].map(d => `<div class="cal-day-name">${d}</div>`).join('');
    const inicio = new Date(anoCal, mesCal, 1).getDay();
    const total = new Date(anoCal, mesCal + 1, 0).getDate();
    const brancos = '<span class="cal-day"></span>'.repeat(inicio);
    
    const numDias = Array.from({ length: total }, (_, i) => {
      const d = i + 1;
      const isSelected = d === dataAtual.getDate() && mesCal === dataAtual.getMonth() && anoCal === dataAtual.getFullYear();
      return `<span class="cal-day${isSelected ? ' active' : ''}">${d}</span>`;
    }).join('');

    grid.innerHTML = diasHeader + brancos + numDias;
  };

  // Atualiza campo de data no modal Drawer com a data selecionada
  const sincronizarInputDataModal = () => {
    $('input-data').value = formatarIso(dataAtual);
  };

  // Seleciona o dia no painel
  const selecionarDia = (dia, mes, ano) => {
    dataAtual = new Date(ano, mes, dia);
    mesCal = mes; anoCal = ano;
    renderizarCalendario();
    sincronizarInputDataModal();

    const dataSelIso = formatarIso(dataAtual);
    const ehHoje = dataSelIso === HOJE_STR;
    
    $('selected-date-display').textContent = ehHoje ? `Hoje, ${formatarBR(dataAtual)}` : formatarBR(dataAtual);
    
    organizarEFiltrarTabela();
  };

  grid.onclick = e => {
    if (e.target.matches('.cal-day:not(:empty)')) {
      selecionarDia(parseInt(e.target.textContent), mesCal, anoCal);
    }
  };

  $('btn-prev-month').onclick = () => { mesCal--; if (mesCal < 0) { mesCal = 11; anoCal--; } renderizarCalendario(); };
  $('btn-next-month').onclick = () => { mesCal++; if (mesCal > 11) { mesCal = 0; anoCal++; } renderizarCalendario(); };
  
  // Botão "Hoje"
  $('btn-today').onclick = () => selecionarDia(HOJE_OBJ.getDate(), HOJE_OBJ.getMonth(), HOJE_OBJ.getFullYear());

  // Controle de Drawer / Modal
  const toggleDrawer = aberto => {
    ['drawer', 'drawer-overlay'].forEach(id => $(id).classList.toggle('open', aberto));
    if (!aberto) form.reset();
    sincronizarInputDataModal();
  };
  $('btn-open-drawer').onclick = () => toggleDrawer(true);
  $('btn-close-drawer').onclick = $('drawer-overlay').onclick = () => toggleDrawer(false);

  // Organização e Filtragem da Tabela
  const organizarEFiltrarTabela = () => {
    const q = search.value.toLowerCase().trim();
    const ativos = filtros.filter(f => f.checked).map(f => f.value);
    const dataFiltroIso = formatarIso(dataAtual);
    const dividerRow = $('divider-row');

    // Obtém todas as linhas de agendamento (ignorando empty-row e divider-row)
    const linhas = [...body.querySelectorAll('tr[data-status]')];

    let visiveisDoDia = 0;
    let visiveisOutrasDatas = 0;

    linhas.forEach(r => {
      const dataItem = r.dataset.date;
      const statusItem = r.dataset.status;
      const nomeOuTel = r.querySelector('td:nth-child(2)').textContent.toLowerCase();

      const atendeFiltros = ativos.includes(statusItem) && nomeOuTel.includes(q);
      r.hidden = !atendeFiltros;

      // Reorganização DOM: move para cima do divisor (se for a data selecionada) ou para baixo
      if (dataItem === dataFiltroIso) {
        body.insertBefore(r, dividerRow);
        if (atendeFiltros) visiveisDoDia++;
      } else {
        body.appendChild(r);
        if (atendeFiltros) visiveisOutrasDatas++;
      }
    });

    const totalVisiveis = visiveisDoDia + visiveisOutrasDatas;
    $('empty-row').hidden = totalVisiveis > 0;
    dividerRow.hidden = visiveisOutrasDatas === 0;
  };

  search.oninput = organizarEFiltrarTabela;
  filtros.forEach(f => f.onchange = organizarEFiltrarTabela);

  // Alteração dinâmica de Status
  body.onchange = e => {
    if (!e.target.matches('.status-select')) return;
    const valor = e.target.value;
    if (!valor) return;

    const linha = e.target.closest('tr');
    const badge = linha.querySelector('.status-badge');

    linha.dataset.status = valor;
    badge.className = `status-badge status-${valor}`;
    badge.textContent = STATUS[valor];
    e.target.value = '';

    organizarEFiltrarTabela();
  };

  // Submissão do formulário de criação
  form.onsubmit = e => {
    e.preventDefault();
    const dataDigitada = $('input-data').value;
    const horaDigitada = $('input-hora').value;
    const dataSelIso = formatarIso(dataAtual);
    
    const [anoIn, mesIn, diaIn] = dataDigitada.split('-');
    const dataFormatadaBR = `${diaIn}/${mesIn}`;
    const ehDataSelecionada = dataDigitada === dataSelIso;

    const tr = document.createElement('tr');
    tr.dataset.status = 'aguardando';
    tr.dataset.date = dataDigitada;

    tr.innerHTML = `
      <td class="time-col">
        ${horaDigitada} 
        ${ehDataSelecionada ? '' : `<small class="date-subtext">(${dataFormatadaBR})</small>`}
      </td>
      <td>
        <strong class="client-name">${esc($('input-cliente').value)}</strong>
        <span class="client-phone">${esc($('input-telefone').value)}</span>
      </td>
      <td>
        <span class="badge-profile badge-frequente">Novo Cliente</span>
        <span class="metrics-text">0 Presenças / 0 Faltas</span>
      </td>
      <td>${esc($('input-servico').value)}</td>
      <td><span class="status-badge status-aguardando">Aguardando</span></td>
      <td>
        <select class="status-select">
          <option value="">Mudar Status...</option>
          ${opcoes}
        </select>
      </td>`;

    body.appendChild(tr);
    organizarEFiltrarTabela();
    toggleDrawer(false);
  };

  // Inicialização do sistema com a data de HOJE
  selecionarDia(HOJE_OBJ.getDate(), HOJE_OBJ.getMonth(), HOJE_OBJ.getFullYear());
});