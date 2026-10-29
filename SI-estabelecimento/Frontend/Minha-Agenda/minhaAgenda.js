document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const API_URL = 'http://localhost:3000/api/minha-agenda';

  // State local alimentado pela API
  let profissionais = [];
  let servicos = [];
  let agendamentos = [];

  const HOJE_OBJ = new Date();
  let dataSelecionada = new Date(HOJE_OBJ.getFullYear(), HOJE_OBJ.getMonth(), HOJE_OBJ.getDate());
  let mesCalendario = dataSelecionada.getMonth();
  let anoCalendario = dataSelecionada.getFullYear();

  const horarios = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const nomesDiasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const esc = s => (s || '').toString().replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const formatarIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const formatarBR = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  // --- CARREGAMENTO INICIAL VIA API ---
  const carregarDadosServidor = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const dados = await res.json();
        profissionais = dados.profissionais || [];
        servicos = dados.servicos || [];
        agendamentos = dados.agendamentos || [];

        renderizarSelects();
        renderizarProfissionais();
        atualizarDataSelecionada(dataSelecionada);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do servidor:', err);
    }
  };

  const renderizarMiniCalendario = () => {
    $('calMesAno').textContent = `${nomesMeses[mesCalendario]} ${anoCalendario}`;
    const calDias = $('calDias');
    calDias.innerHTML = '';

    const primeiroDia = new Date(anoCalendario, mesCalendario, 1).getDay();
    const totalDias = new Date(anoCalendario, mesCalendario + 1, 0).getDate();

    for (let i = 0; i < primeiroDia; i++) calDias.innerHTML += '<span class="vazio"></span>';

    for (let dia = 1; dia <= totalDias; dia++) {
      const btn = document.createElement('button');
      btn.textContent = dia;
      const dataIso = `${anoCalendario}-${String(mesCalendario + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      
      if (agendamentos.some(item => item.data === dataIso)) btn.classList.add('tem-agendamento');
      if (dia === dataSelecionada.getDate() && mesCalendario === dataSelecionada.getMonth() && anoCalendario === dataSelecionada.getFullYear()) {
        btn.classList.add('ativo');
      }

      btn.onclick = () => atualizarDataSelecionada(new Date(anoCalendario, mesCalendario, dia));
      calDias.appendChild(btn);
    }
  };

  const atualizarDataSelecionada = novaData => {
    dataSelecionada = novaData;
    mesCalendario = novaData.getMonth();
    anoCalendario = novaData.getFullYear();
    
    const isHoje = formatarIso(dataSelecionada) === formatarIso(HOJE_OBJ);
    const textoData = `${nomesDiasSemana[dataSelecionada.getDay()]}, ${formatarBR(dataSelecionada)}`;
    $('tituloDataExibida').textContent = isHoje ? `Hoje, ${textoData}` : textoData;
    
    $('dataSelect').value = formatarIso(dataSelecionada);
    renderizarMiniCalendario();
    renderizarGridHorarios();
  };

  $('btnPrevMes').onclick = () => { mesCalendario--; if (mesCalendario < 0) { mesCalendario = 11; anoCalendario--; } renderizarMiniCalendario(); };
  $('btnNextMes').onclick = () => { mesCalendario++; if (mesCalendario > 11) { mesCalendario = 0; anoCalendario++; } renderizarMiniCalendario(); };

  const renderizarSelects = () => {
    const optionsServicos = servicos.map(s => `<option value="${esc(s.nome)}">${esc(s.nome)}</option>`).join('');
    $('filtroServico').innerHTML = `<option value="todos">Todos os Serviços</option>${optionsServicos}`;
    $('servicoSelect').innerHTML = optionsServicos;
    
    if ($('selectRemoverProfissional')) {
      $('selectRemoverProfissional').innerHTML = '<option value="" disabled selected>Selecione um profissional...</option>' + 
        profissionais.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('');
    }
    if ($('selectRemoverServico')) {
      $('selectRemoverServico').innerHTML = '<option value="" disabled selected>Selecione um serviço...</option>' + 
        servicos.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join('');
    }
  };

  const aplicarFiltros = () => {
    const s = $('filtroServico').value;
    document.querySelectorAll('.card-agendamento').forEach(c => {
      c.classList.toggle('escondido', s !== 'todos' && c.dataset.servico !== s);
    });

    document.querySelectorAll('.chk-prof').forEach(chk => {
      const prof = chk.value, visivel = chk.checked;
      const th = document.querySelector(`th[data-prof="${prof}"]`);
      if (th) th.style.display = visivel ? '' : 'none';
      document.querySelectorAll(`td[data-prof="${prof}"]`).forEach(td => td.style.display = visivel ? '' : 'none');
    });
  };

  $('filtroServico').onchange = aplicarFiltros;

  const renderizarProfissionais = () => {
    const thead = $('linhaCabecalhoGrid'), chkContainer = $('containerChkProfissionais'), selProf = $('profissionalSelect');
    thead.innerHTML = '<th class="time-col">Horário</th>';
    
    if (profissionais.length === 0) {
      chkContainer.innerHTML = '<span class="texto-vazio">Nenhum profissional cadastrado</span>';
      selProf.innerHTML = '';
    } else {
      chkContainer.innerHTML = profissionais.map(p => `<label class="checkbox-item"><input type="checkbox" checked value="${esc(p.nome)}" class="chk-prof"> ${esc(p.nome)}</label>`).join('');
      selProf.innerHTML = profissionais.map(p => `<option value="${esc(p.nome)}">${esc(p.nome)}</option>`).join('');
      profissionais.forEach(p => thead.innerHTML += `<th class="col-prof" data-prof="${esc(p.nome)}">${esc(p.nome)}<br><small>(${esc(p.especialidade)})</small></th>`);
      document.querySelectorAll('.chk-prof').forEach(chk => chk.onchange = aplicarFiltros);
    }
    renderizarGridHorarios();
  };

  // Excluir Agendamento via API
  window.excluirAgendamento = async id => {
    try {
      const res = await fetch(`${API_URL}/agendamentos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        agendamentos = agendamentos.filter(item => item.id !== id);
        renderizarGridHorarios();
        renderizarMiniCalendario();
      }
    } catch (err) {
      console.error('Erro ao excluir agendamento:', err);
    }
  };

  const renderizarGridHorarios = () => {
    const body = $('corpoGrid');
    body.innerHTML = horarios.map(hora => {
      const tds = profissionais.map(p => `<td data-prof="${esc(p.nome)}" data-hora="${hora}"></td>`).join('');
      return `<tr><td class="time-col">${hora}</td>${tds}</tr>`;
    }).join('');

    agendamentos.filter(item => item.data === formatarIso(dataSelecionada)).forEach(item => {
      const td = document.querySelector(`td[data-prof="${item.prof}"][data-hora="${item.hora}"]`);
      if (td) {
        td.innerHTML += `
          <div class="card-agendamento" data-servico="${esc(item.servico)}">
            <button class="btn-excluir-card" onclick="excluirAgendamento(${item.id})">&times;</button>
            <span class="titulo-card">${esc(item.servico)}</span>
            ${item.obs ? `<span class="sub-tag">${esc(item.obs)}</span>` : ''}
          </div>
        `;
      }
    });
    aplicarFiltros();
  };

  // Drawer Controls
  const togglePainel = (id, abrir) => {
    $(id).classList.toggle('open', abrir);
    $('drawer-overlay').classList.toggle('open', abrir);
  };

  $('btnNovoAgendamento').onclick = () => togglePainel('painelAgendamento', true);
  $('btnNovoProfissional').onclick = () => togglePainel('painelProfissional', true);
  $('btnNovoServico').onclick = () => togglePainel('painelServico', true);
  $('drawer-overlay').onclick = () => document.querySelectorAll('.drawer').forEach(d => togglePainel(d.id, false));
  document.querySelectorAll('.btn-fechar-drawer').forEach(btn => btn.onclick = e => togglePainel(e.target.dataset.fechar, false));

  // Cadastrar Agendamento
  $('formAgendamento').onsubmit = async e => {
    e.preventDefault();
    if (profissionais.length === 0 || servicos.length === 0) return alert('Cadastre Profissional e Serviço primeiro!');

    const novoAgendamento = {
      data: $('dataSelect').value,
      hora: $('horaSelect').value,
      prof: $('profissionalSelect').value,
      servico: $('servicoSelect').value,
      obs: $('observacao').value.trim()
    };

    try {
      const res = await fetch(`${API_URL}/agendamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoAgendamento)
      });

      if (res.ok) {
        const criado = await res.json();
        agendamentos.push(criado);
        atualizarDataSelecionada(new Date($('dataSelect').value.split('-').map((v, i) => i === 1 ? v - 1 : v)));
        $('formAgendamento').reset();
        togglePainel('painelAgendamento', false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cadastrar Profissional
  $('formProfissional').onsubmit = async e => {
    e.preventDefault();
    const dados = {
      nome: $('nomeProfissional').value.trim(),
      especialidade: $('especialidadeProfissional').value.trim()
    };

    try {
      const res = await fetch(`${API_URL}/profissionais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });

      if (res.ok) {
        const criado = await res.json();
        profissionais.push(criado);
        renderizarProfissionais();
        renderizarSelects();
        $('formProfissional').reset();
        togglePainel('painelProfissional', false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cadastrar Serviço
  $('formServico').onsubmit = async e => {
    e.preventDefault();
    const dados = { nome: $('nomeServico').value.trim() };

    try {
      const res = await fetch(`${API_URL}/servicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });

      if (res.ok) {
        const criado = await res.json();
        servicos.push(criado);
        renderizarSelects();
        $('formServico').reset();
        togglePainel('painelServico', false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Remover Profissional
  if ($('btnRemoverProfissional')) {
    $('btnRemoverProfissional').onclick = async () => {
      const id = $('selectRemoverProfissional').value;
      if (!id) return alert('Por favor, selecione um profissional para remover.');

      if (confirm('Tem certeza que deseja remover este profissional?')) {
        try {
          const res = await fetch(`${API_URL}/profissionais/${id}`, { method: 'DELETE' });
          if (res.ok) {
            profissionais = profissionais.filter(p => p.id != id);
            renderizarProfissionais();
            renderizarSelects();
            togglePainel('painelProfissional', false);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
  }

  // Remover Serviço
  if ($('btnRemoverServico')) {
    $('btnRemoverServico').onclick = async () => {
      const id = $('selectRemoverServico').value;
      if (!id) return alert('Por favor, selecione um serviço para remover.');

      if (confirm('Tem certeza que deseja remover este serviço?')) {
        try {
          const res = await fetch(`${API_URL}/servicos/${id}`, { method: 'DELETE' });
          if (res.ok) {
            servicos = servicos.filter(s => s.id != id);
            renderizarSelects();
            renderizarGridHorarios();
            togglePainel('painelServico', false);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
  }

  // Inicialização
  carregarDadosServidor();
});