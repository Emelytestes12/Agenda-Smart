document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const API_URL = 'http://localhost:3000/api/fila';
  const AGENDA_URL = 'http://localhost:3000/api/minha-agenda';
  const CLIENTES_URL = 'http://localhost:3000/api/clientes';

  let fila = [];
  let clientes = [];
  let combinacoes = []; // Profissional + Serviço disponíveis na data escolhida
  let selecao = null;   // Combinação selecionada no bloco unificado
  let clienteSelecionado = null;

  const esc = s => (s || '').toString().replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const soDigitos = s => (s || '').replace(/\D/g, '');
  const formatarBR = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—';

  const form = $('queue-form'), search = $('search-input'), filterServ = $('filter-service'), body = $('queue-body');

  // --- CONTROLE DE DRAWER / MODAL ---
  const toggleDrawer = aberto => {
    ['drawer', 'drawer-overlay'].forEach(id => $(id).classList.toggle('open', aberto));
    if (!aberto) resetFormulario();
  };

  const resetFormulario = () => {
    form.reset();
    clienteSelecionado = null;
    selecao = null;
    combinacoes = [];
    $('busca-resultados').hidden = true;
    $('input-busca').value = '';
    $('input-telefone').value = '';
    $('disponibilidade-container').innerHTML = '<span class="texto-vazio">Selecione uma data para ver a disponibilidade.</span>';
  };

  $('btn-open-drawer').onclick = () => toggleDrawer(true);
  $('btn-close-drawer').onclick = $('drawer-overlay').onclick = () => toggleDrawer(false);

  // --- BUSCA DE CLIENTE (nome ou telefone) ---
  const carregarClientes = async () => {
    try {
      const res = await fetch(CLIENTES_URL);
      if (res.ok) clientes = await res.json();
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    }
  };

  const selecionarCliente = cliente => {
    clienteSelecionado = cliente;
    $('input-busca').value = cliente.nome;
    $('input-telefone').value = cliente.telefone;
    $('busca-resultados').hidden = true;
  };

  // Fechar resultados ao clicar fora e Delegar clique para seleção
  document.addEventListener('click', e => {
    // Fechar ao clicar fora
    if (!e.target.closest('.busca-grupo')) {
      $('busca-resultados').hidden = true;
    }
    
    // Delegar clique para os itens da busca
    const itemBusca = e.target.closest('.busca-item');
    if (itemBusca) {
      const cliente = clientes.find(c => c.id == itemBusca.dataset.id);
      if (cliente) selecionarCliente(cliente);
    }
  });

  $('input-busca').oninput = e => {
    const termo = e.target.value.trim().toLowerCase();
    clienteSelecionado = null;
    $('input-telefone').value = '';

    if (!termo) { $('busca-resultados').hidden = true; return; }

    const digitos = soDigitos(termo);
    const achados = clientes.filter(c =>
      c.nome.toLowerCase().includes(termo) || (digitos && soDigitos(c.telefone).includes(digitos))
    ).slice(0, 6);

    const dropdown = $('busca-resultados');
    if (achados.length === 0) {
      dropdown.innerHTML = '<span class="texto-vazio">Nenhum cliente encontrado.</span>';
    } else {
      dropdown.innerHTML = achados.map(c =>
        `<button type="button" class="busca-item" data-id="${c.id}">
           <strong>${esc(c.nome)}</strong><span>${esc(c.telefone)}</span>
         </button>`
      ).join('');
    }
    dropdown.hidden = false;
  };

  // --- DISPONIBILIDADE (Minha Agenda) PARA A DATA ESCOLHIDA ---
  $('input-data').onchange = async e => {
    const data = e.target.value;
    selecao = null;
    const container = $('disponibilidade-container');

    if (!data) {
      container.innerHTML = '<span class="texto-vazio">Selecione uma data para ver a disponibilidade.</span>';
      return;
    }

    container.innerHTML = '<span class="texto-vazio">Carregando disponibilidade...</span>';

    try {
      const res = await fetch(`${AGENDA_URL}/disponibilidade?data=${data}`);
      combinacoes = res.ok ? await res.json() : [];

      if (combinacoes.length === 0) {
        container.innerHTML = '<span class="texto-vazio">Nenhum profissional com horário cadastrado neste dia.</span>';
        return;
      }

      container.innerHTML = combinacoes.map((c, i) =>
        `<button type="button" class="combo-item" data-index="${i}">
           <span class="combo-prof">${esc(c.profissional)}</span>
           <span class="combo-servico">${esc(c.servico)}</span>
           ${c.especialidade ? `<span class="combo-esp">${esc(c.especialidade)}</span>` : ''}
         </button>`
      ).join('');

      container.querySelectorAll('.combo-item').forEach(btn => {
        btn.onclick = () => {
          selecao = combinacoes[Number(btn.dataset.index)];
          container.querySelectorAll('.combo-item').forEach(b => b.classList.toggle('selecionado', b === btn));
        };
      });
    } catch (err) {
      console.error('Erro ao buscar disponibilidade:', err);
      container.innerHTML = '<span class="texto-vazio">Erro ao carregar disponibilidade.</span>';
    }
  };

  // --- CARREGAMENTO DINÂMICO VIA API ---
  const carregarFila = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        fila = await res.json();
        renderizarFila();
      }
    } catch (err) {
      console.error('Erro ao buscar fila de espera:', err);
    }
  };

  // Popula o filtro de serviço a partir dos serviços cadastrados em Minha Agenda
  const carregarFiltroServicos = async () => {
    try {
      const res = await fetch(AGENDA_URL);
      if (!res.ok) return;
      const dados = await res.json();
      const servicos = dados.servicos || [];
      filterServ.innerHTML = '<option value="all">Todos os Serviços</option>' +
        servicos.map(s => `<option value="${esc(s.nome)}">${esc(s.nome)}</option>`).join('');
    } catch (err) {
      console.error('Erro ao carregar serviços da agenda:', err);
    }
  };

  // Renderiza e filtra os dados na tabela
  const renderizarFila = () => {
    const q = search.value.toLowerCase().trim();
    const s = filterServ.value;
    const digitos = soDigitos(q);

    body.querySelectorAll('tr[data-id]').forEach(tr => tr.remove());

    // Posição FIFO fixa: definida pela ordem de criação, independente dos filtros
    const posicaoFifo = new Map(fila.map((item, i) => [item.id, i + 1]));

    const filtrados = fila.filter(item => {
      const bateTexto = `${item.clienteNome || ''} ${item.clienteTelefone || ''}`.toLowerCase().includes(q)
        || (digitos && soDigitos(item.clienteTelefone).includes(digitos));
      const bateServico = (s === 'all' || item.servico === s);
      return bateTexto && bateServico;
    });

    let disparosHoje = 0;

    filtrados.forEach(item => {
      const pos = posicaoFifo.get(item.id);
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.dataset.service = item.servico;

      if (item.status === 'disparado') disparosHoje++;

      // Badge do status do Número
      let badgeHtml = '';
      if (item.status === 'notificado') {
        badgeHtml = `<span class="status-badge status-disparado">📱 Notificado / Aguardando</span>`;
      } else if (item.status === 'aceito') {
        badgeHtml = `<span class="status-badge status-aceito">Vaga Aceita</span>`;
      } else if (item.status === 'recusado') {
        badgeHtml = `<span class="status-badge status-cancelado">Vaga Recusada</span>`;
      } else {
        badgeHtml = `<span class="status-badge status-aguardando">Na Fila</span>`;
      }

      // Botões de ação baseados no status
      let acoesHtml = '';
      if (item.status === 'aceito') {
        acoesHtml = `
          <button class="btn-action btn-call btn-fit">Confirmar na Agenda</button>
          <button class="btn-action btn-remove">Remover da Fila</button>
        `;
      } else if (item.status === 'notificado') {
        acoesHtml = `
          <button class="btn-action btn-resend btn-simulate-yes">Simular Aceite</button>
          <button class="btn-action btn-remove btn-simulate-no">Simular Recusa</button>
        `;
      } else if (item.status === 'recusado') {
        acoesHtml = `
          <button class="btn-action btn-resend btn-notify">Tentar Outro Horário</button>
          <button class="btn-action btn-remove">Remover</button>
        `;
      } else {
        acoesHtml = `
          <button class="btn-action btn-call btn-notify">Notificar Zap</button>
          <button class="btn-action btn-remove">Remover</button>
        `;
      }

      tr.innerHTML = `
        <td><span class="pos-badge ${pos === 1 ? 'pos-next' : ''}">${pos}º</span></td>
        <td>
          <strong class="client-name">${esc(item.clienteNome)}</strong>
          <span class="client-phone">${esc(item.clienteTelefone)}</span>
        </td>
        <td><span class="time-col">${formatarBR(item.dataDesejada)}</span></td>
        <td>
          <strong>${esc(item.servico)}</strong>
          <span class="metrics-text">Prefere: ${esc(item.profissional || 'Qualquer')}</span>
        </td>
        <td>
          ${item.vagaOfertada
            ? `<span class="badge-slot">${esc(item.vagaOfertada)}</span>`
            : `<span class="time-col">Sem Vaga</span><span class="date-subtext">Aguardando cancelamento</span>`}
        </td>
        <td>${badgeHtml}</td>
        <td class="actions-cell">${acoesHtml}</td>
      `;

      body.insertBefore(tr, $('empty-row'));
    });

    $('total-queue-count').textContent = filtrados.length;
    if ($('total-disparos-count')) {
      $('total-disparos-count').textContent = `${disparosHoje} envios`;
    }

    $('empty-row').hidden = filtrados.length > 0;
  };

  search.oninput = filterServ.onchange = renderizarFila;

  // --- AÇÕES NA TABELA (ENCAIXAR, NOTIFICAR, REENVIAR, REMOVER) ---
  body.onclick = async e => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;

    const id = tr.dataset.id;
    const item = fila.find(f => f.id == id);
    if (!item) return;

    if (e.target.matches('.btn-fit')) {
      // Confirmar encaixe final na agenda e remover da fila
      try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fila = fila.filter(f => f.id != id);
          renderizarFila();
          alert(`Agendamento de ${item.clienteNome} confirmado na agenda principal!`);
        }
      } catch (err) {
        console.error(err);
      }
    } else if (e.target.matches('.btn-notify')) {
      // Abre prompt para digitar o horário da vaga
      const horario = prompt(`Digite o horário da vaga para ${item.clienteNome}:`, "09:00");
      if (!horario) return;

      try {
        const res = await fetch(`${API_URL}/${id}/notificar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ horario })
        });

        if (res.ok) {
          const atualizado = await res.json();
          Object.assign(item, atualizado);
          renderizarFila();
          alert(`Notificação enviada para ${item.clienteNome} às ${horario}!`);
        } else {
          const err = await res.json();
          alert(`Erro: ${err.error}`);
        }
      } catch (err) {
        console.error(err);
      }
    } else if (e.target.matches('.btn-simulate-yes, .btn-simulate-no')) {
      // Simula a resposta do bot (Sim/Não)
      const resposta = e.target.matches('.btn-simulate-yes') ? 'sim' : 'nao';
      try {
        const res = await fetch(`${API_URL}/${id}/responder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resposta })
        });

        if (res.ok) {
          const atualizado = await res.json();
          Object.assign(item, atualizado);
          renderizarFila();
          alert(resposta === 'sim' ? 'Vaga aceita pelo cliente!' : 'Vaga recusada pelo cliente.');
        }
      } catch (err) {
        console.error(err);
      }
    } else if (e.target.matches('.btn-remove')) {
      try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fila = fila.filter(f => f.id != id);
          renderizarFila();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- SUBMISSÃO DO FORMULÁRIO (CRIAR POSIÇÃO NA FILA) ---
  form.onsubmit = async e => {
    e.preventDefault();

    const data = $('input-data').value;
    if (!clienteSelecionado) return alert('Selecione um cliente na busca pelo nome ou telefone.');
    if (!data) return alert('Selecione a data desejada.');
    if (!selecao) return alert('Selecione o profissional e o serviço disponíveis no dia.');

    const novoItem = {
      clienteNome: clienteSelecionado.nome,
      clienteTelefone: clienteSelecionado.telefone,
      servico: selecao.servico,
      profissional: selecao.profissional,
      dataDesejada: data,
      status: 'aguardando'
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoItem)
      });

      if (res.ok) {
        const criado = await res.json();
        fila.push(criado);
        fila.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        renderizarFila();
        toggleDrawer(false);
      } else {
        alert('Erro ao adicionar cliente à fila.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor.');
    }
  };

  // Inicialização
  carregarClientes();
  carregarFiltroServicos();
  carregarFila();

  // --- SINCRONIZAÇÃO EM TEMPO REAL ---
  // Atualiza a tabela quando o cliente responde à vaga pelo Telegram (botões Sim/Não)
  setInterval(carregarFila, 10000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) carregarFila();
  });
});
