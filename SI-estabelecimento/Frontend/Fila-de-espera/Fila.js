document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const form = $('queue-form'), search = $('search-input'), filterServ = $('filter-service'), body = $('queue-body');

  const toggleDrawer = aberto => {
    ['drawer', 'drawer-overlay'].forEach(id => $(id).classList.toggle('open', aberto));
    if (!aberto) form.reset();
  };

  $('btn-open-drawer').onclick = () => toggleDrawer(true);
  $('btn-close-drawer').onclick = $('drawer-overlay').onclick = () => toggleDrawer(false);

  const updatePositions = () => {
    let pos = 0;
    body.querySelectorAll('tr').forEach(row => {
      if (!row.hidden) {
        pos++;
        const badge = row.querySelector('.pos-badge');
        if (badge) {
          badge.textContent = `${pos}º`;
          badge.classList.toggle('pos-next', pos === 1);
        }
      }
    });
    $('total-queue-count').textContent = pos;
  };

  const applyFilters = () => {
    const q = search.value.toLowerCase().trim(), s = filterServ.value;
    body.querySelectorAll('tr').forEach(row => {
      const text = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
      row.hidden = !(text.includes(q) && (s === 'all' || row.dataset.service === s));
    });
    updatePositions();
  };

  search.oninput = filterServ.onchange = applyFilters;

  body.onclick = e => {
    const row = e.target.closest('tr');
    if (!row) return;
    const name = row.querySelector('.client-name').textContent;

    if (e.target.matches('.btn-fit')) {
      alert(`Cliente ${name} encaixado(a) na agenda principal com sucesso!`);
      row.remove();
      updatePositions();
    } else if (e.target.matches('.btn-notify, .btn-resend')) {
      alert(`Mensagem WhatsApp reenviada para ${name}!`);
      const badge = row.querySelector('.status-badge');
      if (badge) {
        badge.className = 'status-badge status-disparado';
        badge.textContent = `📱 Zap Disparado (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
      }
    } else if (e.target.matches('.btn-remove')) {
      row.remove();
      updatePositions();
    }
  };

  form.onsubmit = e => {
    e.preventDefault();
    const esc = s => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
    const nome = esc($('input-cliente').value), tel = esc($('input-telefone').value);
    const servico = esc($('input-servico').value), prof = esc($('input-profissional').value);
    
    const tr = document.createElement('tr');
    tr.dataset.service = servico;
    tr.innerHTML = `
      <td><span class="pos-badge">0º</span></td>
      <td><strong class="client-name">${nome}</strong><span class="client-phone">${tel}</span></td>
      <td><strong>${servico}</strong><span class="metrics-text">Prefere: ${prof}</span></td>
      <td><span class="time-col">Sem Vaga</span><span class="date-subtext">Aguardando cancelamento</span></td>
      <td><span class="status-badge status-aguardando">Na Fila</span></td>
      <td class="actions-cell"><button class="btn-action btn-call btn-notify">Notificar Zap</button><button class="btn-action btn-remove">Remover</button></td>
    `;
    body.appendChild(tr);
    applyFilters();
    toggleDrawer(false);
  };
});