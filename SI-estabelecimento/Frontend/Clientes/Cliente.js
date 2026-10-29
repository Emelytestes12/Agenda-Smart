document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const API_URL = 'http://localhost:3000/api/clientes';

  // State local dos clientes
  let clientes = [];

  const esc = s => (s || '').toString().replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const form = $('cliente-form'), search = $('search-client'), body = $('client-body');

  // --- CONTROLE DE DRAWER / MODAL ---
  const toggleDrawer = (aberto, cliente = null) => {
    $('drawer-title').textContent = cliente ? 'Editar Cliente' : 'Novo Cliente';
    
    if (cliente) {
      $('input-id').value = cliente.id;
      $('input-nome').value = cliente.nome || '';
      $('input-telefone').value = cliente.telefone || '';
      $('input-obs').value = cliente.observacoes || '';
    } else {
      $('input-id').value = '';
      if (aberto) form.reset();
    }
    
    ['drawer', 'drawer-overlay'].forEach(id => $(id).classList.toggle('open', aberto));
    if (!aberto) form.reset();
  };

  $('btn-open-drawer').onclick = () => toggleDrawer(true);
  $('btn-close-drawer').onclick = $('drawer-overlay').onclick = () => toggleDrawer(false);

  // --- CARREGAMENTO DINÂMICO VIA API ---
  const carregarClientes = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        clientes = await res.json();
        renderizarTabela();
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    }
  };

  // Renderiza e filtra os clientes na tabela
  const renderizarTabela = () => {
    const q = search.value.toLowerCase().trim();

    // Remove apenas as linhas de clientes mantendo a linha de aviso
    body.querySelectorAll('tr[data-id]').forEach(tr => tr.remove());

    const filtrados = clientes.filter(c => {
      const text = `${c.nome || ''} ${c.telefone || ''}`.toLowerCase();
      return text.includes(q);
    });

    filtrados.forEach(cliente => {
      const tr = document.createElement('tr');
      tr.dataset.id = cliente.id;

      tr.innerHTML = `
        <td>${esc(cliente.nome)}</td>
        <td>${esc(cliente.telefone)}</td>
        <td><span class="client-obs">${esc(cliente.observacoes) || '-'}</span></td>
        <td style="text-align: right;">
          <button class="btn-primary btn-sm btn-agendar">+ Agendar Serviço</button>
          <button class="btn-secondary btn-sm btn-editar">Editar</button>
        </td>
      `;

      body.insertBefore(tr, $('empty-row'));
    });

    $('empty-row').hidden = filtrados.length > 0;
  };

  search.oninput = renderizarTabela;

  // Ações nos botões da tabela (Editar e Agendar)
  body.onclick = e => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    
    const id = tr.dataset.id;
    const cliente = clientes.find(c => c.id == id);

    if (e.target.matches('.btn-editar') || e.target.closest('.btn-editar')) {
      toggleDrawer(true, cliente);
    }

    if (e.target.matches('.btn-agendar') || e.target.closest('.btn-agendar')) {
      window.location.href = '../Agendamentos/Agendamento.html';
    }
  };

  // --- SALVAR / EDITAR CLIENTE (POST / PUT) ---
  form.onsubmit = async e => {
    e.preventDefault();

    const id = $('input-id').value;
    const dadosCliente = {
      nome: $('input-nome').value.trim(),
      telefone: $('input-telefone').value.trim(),
      observacoes: $('input-obs').value.trim()
    };

    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `${API_URL}/${id}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosCliente)
      });

      if (res.ok) {
        const clienteSalvo = await res.json();
        if (id) {
          const index = clientes.findIndex(c => c.id == id);
          if (index !== -1) clientes[index] = clienteSalvo;
        } else {
          clientes.unshift(clienteSalvo);
        }
        renderizarTabela();
        toggleDrawer(false);
      } else {
        alert('Erro ao salvar os dados do cliente.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor.');
    }
  };

  // Inicialização
  carregarClientes();
});