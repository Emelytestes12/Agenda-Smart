document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const API_URL = 'http://localhost:3000/api/agendamentos';

  // State local dos agendamentos vindos do banco de dados
  let agendamentos = [];

  // Status e utilitários gerais
  const STATUS = { confirmado: 'Confirmado', aguardando: 'Aguardando', finalizado: 'Finalizado', cancelado: 'Cancelado' };
  const opcoes = Object.entries(STATUS).map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  const esc = s => (s || '').toString().replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

  const body = $('schedule-body'), grid = $('calendar-grid'), search = $('search-input'), form = $('agendamento-form');

  // Popula os checkboxes de filtro por status
  $('status-filters').innerHTML = Object.entries(STATUS).map(([v, t]) =>
    `<label class="checkbox-item"><input type="checkbox" class="filter-status" value="${v}" checked> ${t}s</label>`).join('');
  const filtros = [...document.querySelectorAll('.filter-status')];

  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Formatações de Data
  const formatarBR = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const formatarIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Data de HOJE capturada dinamicamente
  const HOJE_OBJ = new Date();
  const HOJE_STR = formatarIso(HOJE_OBJ);

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

  const sincronizarInputDataModal = () => {
    $('input-data').value = formatarIso(dataAtual);
  };

  const selecionarDia = (dia, mes, ano) => {
    dataAtual = new Date(ano, mes, dia);
    mesCal = mes; anoCal = ano;
    renderizarCalendario();
    sincronizarInputDataModal();

    const dataSelIso = formatarIso(dataAtual);
    const ehHoje = dataSelIso === HOJE_STR;
    
    const displayEl = $('selected-date-display');
    if (displayEl) {
      displayEl.textContent = ehHoje ? `Hoje, ${formatarBR(dataAtual)}` : formatarBR(dataAtual);
    }
    
    renderizarTabela();
  };

  grid.onclick = e => {
    if (e.target.matches('.cal-day:not(:empty)')) {
      selecionarDia(parseInt(e.target.textContent), mesCal, anoCal);
    }
  };

  $('btn-prev-month').onclick = () => { mesCal--; if (mesCal < 0) { mesCal = 11; anoCal--; } renderizarCalendario(); };
  $('btn-next-month').onclick = () => { mesCal++; if (mesCal > 11) { mesCal = 0; anoCal++; } renderizarCalendario(); };
  
  const btnToday = $('btn-today');
  if (btnToday) {
    btnToday.onclick = () => selecionarDia(HOJE_OBJ.getDate(), HOJE_OBJ.getMonth(), HOJE_OBJ.getFullYear());
  }

  // Controle do Drawer / Modal
  const toggleDrawer = aberto => {
    ['drawer', 'drawer-overlay'].forEach(id => $(id).classList.toggle('open', aberto));
    if (!aberto) form.reset();
    sincronizarInputDataModal();
  };
  $('btn-open-drawer').onclick = () => toggleDrawer(true);
  $('btn-close-drawer').onclick = $('drawer-overlay').onclick = () => toggleDrawer(false);

  // --- CARREGAMENTO DINÂMICO VIA API ---
  const carregarAgendamentos = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        agendamentos = await res.json();
        renderizarTabela();
      }
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
    }
  };

  // Renderiza e filtra os dados dinâmicos no DOM
  const renderizarTabela = () => {
    const q = search.value.toLowerCase().trim();
    const ativos = filtros.filter(f => f.checked).map(f => f.value);
    const dataFiltroIso = formatarIso(dataAtual);
    const ehHoje = dataFiltroIso === HOJE_STR;

    // Limpa linhas anteriores mantendo as linhas estruturais de apoio
    body.querySelectorAll('tr[data-id]').forEach(tr => tr.remove());

    const dividerRow = $('divider-row');
    let visiveisDoDia = 0;
    let visiveisOutrasDatas = 0;

    agendamentos.forEach(item => {
      const statusItem = item.status || 'aguardando';
      const nomeOuTel = `${item.clienteNome || ''} ${item.clienteTelefone || ''}`.toLowerCase();
      const atendeFiltros = ativos.includes(statusItem) && nomeOuTel.includes(q);

      const itemDataIso = item.data ? item.data.split('T')[0] : '';
      const ehDataSelecionada = itemDataIso === dataFiltroIso;

      if (!atendeFiltros) return;
      if (!ehHoje && !ehDataSelecionada) return;

      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.dataset.status = statusItem;
      tr.dataset.date = itemDataIso;

      const [anoIn, mesIn, diaIn] = itemDataIso.split('-');
      const dataFormatadaBR = `${diaIn}/${mesIn}`;

      tr.innerHTML = `
        <td class="time-col">
          ${esc(item.hora)} 
          ${ehDataSelecionada ? '' : `<small class="date-subtext">(${dataFormatadaBR})</small>`}
        </td>
        <td>
          <strong class="client-name">${esc(item.clienteNome)}</strong>
          <span class="client-phone">${esc(item.clienteTelefone)}</span>
        </td>
        <td>
          <span class="badge-profile badge-frequente">Cliente</span>
          <span class="metrics-text">Registrado</span>
        </td>
        <td>${esc(item.servico)}</td>
        <td><span class="status-badge status-${statusItem}">${STATUS[statusItem] || statusItem}</span></td>
        <td>
          <select class="status-select">
            <option value="">Mudar Status...</option>
            ${opcoes}
          </select>
        </td>
      `;

      if (itemDataIso === dataFiltroIso) {
        body.insertBefore(tr, dividerRow);
        visiveisDoDia++;
      } else if (ehHoje) {
        body.appendChild(tr);
        visiveisOutrasDatas++;
      }
    });

    const totalVisiveis = ehHoje ? (visiveisDoDia + visiveisOutrasDatas) : visiveisDoDia;

    if (dividerRow) {
      dividerRow.hidden = !ehHoje || visiveisOutrasDatas === 0;
    }

    $('empty-row').hidden = totalVisiveis > 0;
  };

  search.oninput = renderizarTabela;
  filtros.forEach(f => f.onchange = renderizarTabela);

  // Alteração dinâmica de Status conectada ao Backend
  body.onchange = async e => {
    if (!e.target.matches('.status-select')) return;
    const novoStatus = e.target.value;
    if (!novoStatus) return;

    const linha = e.target.closest('tr');
    const id = linha.dataset.id;

    try {
      const res = await fetch(`${API_URL}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });

      if (res.ok) {
        const index = agendamentos.findIndex(a => a.id == id);
        if (index !== -1) agendamentos[index].status = novoStatus;
        renderizarTabela();
      } else {
        alert('Erro ao atualizar status do agendamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor.');
    }
  };

  // Submissão do formulário de criação com POST para a API
  form.onsubmit = async e => {
    e.preventDefault();

    const novoAgendamento = {
      clienteTelefone: $('input-telefone').value.trim(),
      clienteNome: $('input-cliente').value.trim(),
      data: $('input-data').value,
      hora: $('input-hora').value,
      servico: $('input-servico').value,
      status: 'aguardando'
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoAgendamento)
      });

      if (res.ok) {
        const criado = await res.json();
        agendamentos.push(criado);
        renderizarTabela();
        toggleDrawer(false);
      } else {
        alert('Erro ao salvar agendamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor.');
    }
  };

  // Inicialização
  selecionarDia(HOJE_OBJ.getDate(), HOJE_OBJ.getMonth(), HOJE_OBJ.getFullYear());
  carregarAgendamentos();
});