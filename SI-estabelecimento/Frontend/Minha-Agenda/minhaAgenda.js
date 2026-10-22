document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  
  let profissionais = JSON.parse(localStorage.getItem('agenda_profissionais')) || [];
  let servicos = JSON.parse(localStorage.getItem('agenda_servicos')) || [];
  let agendamentos = JSON.parse(localStorage.getItem('agenda_agendamentos')) || [];

  let dataSelecionada = new Date(2026, 9, 22);
  let mesCalendario = dataSelecionada.getMonth();
  let anoCalendario = dataSelecionada.getFullYear();

  const horarios = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const nomesDiasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const formatarIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const formatarBR = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

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
      if (dia === dataSelecionada.getDate() && mesCalendario === dataSelecionada.getMonth() && anoCalendario === dataSelecionada.getFullYear()) btn.classList.add('ativo');

      btn.onclick = () => atualizarDataSelecionada(new Date(anoCalendario, mesCalendario, dia));
      calDias.appendChild(btn);
    }
  };

  const atualizarDataSelecionada = novaData => {
    dataSelecionada = novaData;
    mesCalendario = novaData.getMonth();
    anoCalendario = novaData.getFullYear();
    
    const isHoje = formatarIso(dataSelecionada) === '2026-10-22'; // Default "Hoje" in this file
    const textoData = `${nomesDiasSemana[dataSelecionada.getDay()]}, ${formatarBR(dataSelecionada)}`;
    $('tituloDataExibida').textContent = isHoje ? `Hoje, ${textoData}` : textoData;
    
    $('dataSelect').value = formatarIso(dataSelecionada);
    renderizarMiniCalendario();
    renderizarGridHorarios();
  };

  $('btnPrevMes').onclick = () => { mesCalendario--; if (mesCalendario < 0) { mesCalendario = 11; anoCalendario--; } renderizarMiniCalendario(); };
  $('btnNextMes').onclick = () => { mesCalendario++; if (mesCalendario > 11) { mesCalendario = 0; anoCalendario++; } renderizarMiniCalendario(); };

  const renderizarSelects = () => {
    const optionsServicos = servicos.map(s => `<option value="${s}">${s}</option>`).join('');
    $('filtroServico').innerHTML = `<option value="todos">Todos os Serviços</option>${optionsServicos}`;
    $('servicoSelect').innerHTML = optionsServicos;
    
    // Filtros de remoção
    if ($('selectRemoverProfissional')) $('selectRemoverProfissional').innerHTML = '<option value="" disabled selected>Selecione um profissional...</option>' + profissionais.map(p => `<option value="${p.nome}">${p.nome}</option>`).join('');
    if ($('selectRemoverServico')) $('selectRemoverServico').innerHTML = '<option value="" disabled selected>Selecione um serviço...</option>' + servicos.map(s => `<option value="${s}">${s}</option>`).join('');
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
      chkContainer.innerHTML = profissionais.map(p => `<label class="checkbox-item"><input type="checkbox" checked value="${p.nome}" class="chk-prof"> ${p.nome}</label>`).join('');
      selProf.innerHTML = profissionais.map(p => `<option value="${p.nome}">${p.nome}</option>`).join('');
      profissionais.forEach(p => thead.innerHTML += `<th class="col-prof" data-prof="${p.nome}">${p.nome}<br><small>(${p.especialidade})</small></th>`);
      document.querySelectorAll('.chk-prof').forEach(chk => chk.onchange = aplicarFiltros);
    }
    renderizarGridHorarios();
  };

  window.excluirAgendamento = id => {
    agendamentos = agendamentos.filter(item => item.id !== id);
    localStorage.setItem('agenda_agendamentos', JSON.stringify(agendamentos));
    renderizarGridHorarios();
    renderizarMiniCalendario();
  };

  const renderizarGridHorarios = () => {
    const body = $('corpoGrid');
    body.innerHTML = horarios.map(hora => {
      const tds = profissionais.map(p => `<td data-prof="${p.nome}" data-hora="${hora}"></td>`).join('');
      return `<tr><td class="time-col">${hora}</td>${tds}</tr>`;
    }).join('');

    agendamentos.filter(item => item.data === formatarIso(dataSelecionada)).forEach(item => {
      const td = document.querySelector(`td[data-prof="${item.prof}"][data-hora="${item.hora}"]`);
      if (td) {
        td.innerHTML += `<div class="card-agendamento" data-servico="${item.servico}"><button class="btn-excluir-card" onclick="excluirAgendamento(${item.id})">&times;</button><span class="titulo-card">${item.servico}</span>${item.obs ? `<span class="sub-tag">${item.obs}</span>` : ''}</div>`;
      }
    });
    aplicarFiltros();
  };

  // Gavetas
  const togglePainel = (id, abrir) => {
    $(id).classList.toggle('open', abrir);
    $('drawer-overlay').classList.toggle('open', abrir);
  };

  $('btnNovoAgendamento').onclick = () => togglePainel('painelAgendamento', true);
  $('btnNovoProfissional').onclick = () => togglePainel('painelProfissional', true);
  $('btnNovoServico').onclick = () => togglePainel('painelServico', true);
  $('drawer-overlay').onclick = () => document.querySelectorAll('.drawer').forEach(d => togglePainel(d.id, false));
  document.querySelectorAll('.btn-fechar-drawer').forEach(btn => btn.onclick = e => togglePainel(e.target.dataset.fechar, false));

  // Forms
  $('formAgendamento').onsubmit = e => {
    e.preventDefault();
    if (profissionais.length === 0 || servicos.length === 0) return alert('Cadastre Profissional e Serviço primeiro!');
    agendamentos.push({
      id: Date.now(),
      data: $('dataSelect').value,
      hora: $('horaSelect').value,
      prof: $('profissionalSelect').value,
      servico: $('servicoSelect').value,
      obs: $('observacao').value
    });
    localStorage.setItem('agenda_agendamentos', JSON.stringify(agendamentos));
    atualizarDataSelecionada(new Date($('dataSelect').value.split('-').map((v, i) => i === 1 ? v - 1 : v)));
    $('formAgendamento').reset();
    togglePainel('painelAgendamento', false);
  };

  $('formProfissional').onsubmit = e => {
    e.preventDefault();
    profissionais.push({ nome: $('nomeProfissional').value, especialidade: $('especialidadeProfissional').value });
    localStorage.setItem('agenda_profissionais', JSON.stringify(profissionais));
    renderizarProfissionais();
    $('formProfissional').reset();
    togglePainel('painelProfissional', false);
  };

  $('formServico').onsubmit = e => {
    e.preventDefault();
    servicos.push($('nomeServico').value);
    localStorage.setItem('agenda_servicos', JSON.stringify(servicos));
    renderizarSelects();
    $('formServico').reset();
    togglePainel('painelServico', false);
  };

  // Funções de Remoção
  if ($('btnRemoverProfissional')) {
    $('btnRemoverProfissional').onclick = () => {
      const select = $('selectRemoverProfissional');
      const nome = select.value;
      if (!nome) return alert('Por favor, selecione um profissional para remover.');
      if (confirm(`Tem certeza que deseja remover o profissional "${nome}"? Todos os agendamentos vinculados a ele não terão mais um profissional associado.`)) {
        profissionais = profissionais.filter(p => p.nome !== nome);
        localStorage.setItem('agenda_profissionais', JSON.stringify(profissionais));
        renderizarProfissionais();
        renderizarSelects();
        togglePainel('painelProfissional', false);
      }
    };
  }

  if ($('btnRemoverServico')) {
    $('btnRemoverServico').onclick = () => {
      const select = $('selectRemoverServico');
      const nome = select.value;
      if (!nome) return alert('Por favor, selecione um serviço para remover.');
      if (confirm(`Tem certeza que deseja remover o serviço "${nome}"?`)) {
        servicos = servicos.filter(s => s !== nome);
        localStorage.setItem('agenda_servicos', JSON.stringify(servicos));
        renderizarSelects();
        renderizarGridHorarios();
        togglePainel('painelServico', false);
      }
    };
  }

  renderizarSelects();
  renderizarProfissionais();
  atualizarDataSelecionada(dataSelecionada);
});