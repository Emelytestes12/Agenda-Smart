document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const API_URL = 'http://localhost:3000/api/fila-espera';

  let fila = [];

  const esc = s => (s || '').toString().replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const form = $('queue-form'), search = $('search-input'), filterServ = $('filter-service'), body = $('queue-body');

  // --- CONTROLE DE DRAWER / MODAL ---
  const toggleDrawer = aberto => {
    ['drawer', 'drawer-overlay'].forEach(id => $(id).classList.toggle('open', aberto));
    if (!aberto) form.reset();
  };

  $('btn-open-drawer').onclick = () => toggleDrawer(true);
  $('btn-close-drawer').onclick = $('drawer-overlay').onclick = () => toggleDrawer(false);

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

  // Renderiza e filtra os dados na tabela
  const renderizarFila = () => {
    const q = search.value.toLowerCase().trim();
    const s = filterServ.value;

    // Remove apenas as linhas de itens da fila
    body.querySelectorAll('tr[data-id]').forEach(tr => tr.remove());

    const filtrados = fila.filter(item => {
      const text = `${item.clienteNome || ''} ${item.clienteTelefone || ''}`.toLowerCase();
      const bateTexto = text.includes(q);
      const bateServico = (s === 'all' || item.servico === s);
      return bateTexto && bateServico;
    });

    let disparosHoje = 0;

    filtrados.forEach((item, index) => {
      const pos = index + 1;
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.dataset.service = item.servico;

      if (item.status === 'disparado') disparosHoje++;

      // Badge do status no WhatsApp
      let badgeHtml = '';
      if (item.status === 'disparado') {
        badgeHtml = `<span class="status-badge status-disparado">📱 Zap Disparado</span>`;
      } else if (item.status === 'aceito') {
        badgeHtml = `<span class="status-badge status-aceito">Aceitou via Zap</span>`;
      } else {
        badgeHtml = `<span class="status-badge status-aguardando">Na Fila</span>`;
      }

      // Botões de ação baseados no status
      let acoesHtml = '';
      if (item.status === 'aceito') {
        acoesHtml = `
          <button class="btn-action btn-call btn-fit">Confirmar Encaixe</button>
          <button class="btn-action btn-remove">Remover</button>
        `;
      } else if (item.status === 'disparado') {
        acoesHtml = `
          <button class="btn-action btn-call btn-fit">Encaixar</button>
          <button class="btn-action btn-resend">Reenviar Zap</button>
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
      // Encaixa na agenda e remove da fila de espera
      try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fila = fila.filter(f => f.id != id);
          renderizarFila();
          alert(`Cliente ${item.clienteNome} encaixado(a) com sucesso!`);
        }
      } catch (err) {
        console.error(err);
      }
    } else if (e.target.matches('.btn-notify, .btn-resend')) {
      // Dispara notificação via WhatsApp
      try {
        const res = await fetch(`${API_URL}/${id}/notificar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'disparado' })
        });

        if (res.ok) {
          item.status = 'disparado';
          renderizarFila();
          alert(`Mensagem WhatsApp enviada para ${item.clienteNome}!`);
        }
      } catch (err) {
        console.error(err);
      }
    } else if (e.target.matches('.btn-remove')) {
      // Remove o cliente da fila
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

    const novoItem = {
      clienteNome: $('input-cliente').value.trim(),
      clienteTelefone: $('input-telefone').value.trim(),
      servico: $('input-servico').value,
      profissional: $('input-profissional').value,
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
  carregarFila();
});