document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const esc = s => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  const form = $('cliente-form'), search = $('search-client'), body = $('client-body');

  let editingRow = null;

  const toggleDrawer = (aberto, isEdit = false, row = null) => {
    $('drawer-title').textContent = isEdit ? 'Editar Cliente' : 'Novo Cliente';
    
    if (isEdit && row) {
      editingRow = row;
      $('input-nome').value = row.cells[0].textContent.trim();
      $('input-telefone').value = row.cells[1].textContent.trim();
      const obs = row.cells[2].textContent.trim();
      $('input-obs').value = obs === '-' ? '' : obs;
    } else {
      editingRow = null;
      if (aberto) form.reset();
    }
    
    ['drawer', 'drawer-overlay'].forEach(id => $(id).classList.toggle('open', aberto));
    if (!aberto) form.reset();
  };

  $('btn-open-drawer').onclick = () => toggleDrawer(true);
  $('btn-close-drawer').onclick = $('drawer-overlay').onclick = () => toggleDrawer(false);

  const aplicarFiltro = () => {
    const q = search.value.toLowerCase().trim();
    const linhas = [...body.querySelectorAll('tr:not(.empty-row)')];
    linhas.forEach(r => {
      const text = r.querySelector('td:nth-child(1)').textContent.toLowerCase() + ' ' + r.querySelector('td:nth-child(2)').textContent.toLowerCase();
      r.hidden = !text.includes(q);
    });
    const visiveis = linhas.filter(r => !r.hidden);
    $('empty-row').hidden = visiveis.length > 0;
  };
  search.oninput = aplicarFiltro;

  body.onclick = e => {
    if (e.target.matches('.btn-editar') || e.target.closest('.btn-editar')) toggleDrawer(true, true, e.target.closest('tr'));
    if (e.target.matches('.btn-agendar') || e.target.closest('.btn-agendar')) window.location.href = '../Agendamentos/Agendamento.html';
  };

  form.onsubmit = e => {
    e.preventDefault();
    if (editingRow) {
      editingRow.cells[0].textContent = $('input-nome').value;
      editingRow.cells[1].textContent = $('input-telefone').value;
      editingRow.cells[2].innerHTML = `<span class="client-obs">${esc($('input-obs').value) || '-'}</span>`;
    } else {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc($('input-nome').value)}</td>
        <td>${esc($('input-telefone').value)}</td>
        <td><span class="client-obs">${esc($('input-obs').value) || '-'}</span></td>
        <td style="text-align: right;">
          <button class="btn-primary btn-sm btn-agendar">+ Agendar Serviço</button>
          <button class="btn-secondary btn-sm btn-editar">Editar</button>
        </td>`;
      body.insertBefore(tr, body.firstChild);
    }
    aplicarFiltro();
    toggleDrawer(false);
  };
});