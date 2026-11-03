document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  // URL base do Backend Express
  const API_URL = 'http://localhost:3000/api/notificacoes';

  const lerJSON = async res => {
    try { return await res.json(); } catch { return {}; }
  };

  // --- Status da integração (Telegram) ---
  const carregarStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/status`);
      const data = await lerJSON(res);

      const conectado = Boolean(data.configured);
      $('status-dot')?.classList.toggle('online', conectado);
      if ($('connection-title')) {
        $('connection-title').textContent = conectado ? 'Telegram Conectado' : 'Telegram Desconectado';
      }
      if ($('whatsapp-status-phone')) {
        $('whatsapp-status-phone').textContent = data.chatId ? `Chat ID: ${data.chatId}` : 'Chat ID não definido';
      }
      if ($('connection-subtext')) {
        $('connection-subtext').textContent = conectado ? 'Bot ativo para disparos' : 'Verifique o .env do backend';
      }
    } catch {
      if ($('connection-title')) $('connection-title').textContent = 'Backend Offline';
    }
  };

  carregarStatus();

  // 1. Salvar Regra de Lembrete
  $('btn-save-reminders').onclick = () => {
    const enabled = $('toggle-reminders').checked;
    const antecedence = $('select-antecedence').options[$('select-antecedence').selectedIndex].text;

    if (enabled) {
      alert(`Configuração Salva!\nOs lembretes automáticos serão enviados via Telegram com ${antecedence} de antecedência.`);
    } else {
      alert('Aviso: Os lembretes automáticos foram desativados.');
    }
  };

  // 2. Testar Lembrete (envio real via Telegram)
  $('btn-test-reminder').onclick = async () => {
    const btn = $('btn-test-reminder');
    const phone = $('input-broadcast-phone').value.trim();

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Enviando...';

    try {
      const res = await fetch(`${API_URL}/send-reminder-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await lerJSON(res);

      if (res.ok) {
        // Painel para simular a resposta do cliente (sem custo, apenas demonstração)
        const simContainer = document.createElement('div');
        simContainer.className = 'chat-bubble simulation-box';
        simContainer.style.marginTop = '15px';
        simContainer.style.border = '1px dashed var(--brand-blue)';
        simContainer.innerHTML = `
          <span class="preview-tag">Simular Resposta do Cliente (${data.phone}):</span>
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button class="btn-action btn-resend" onclick="window.simularResposta(${data.agendamentoId}, 'sim')">Sim, confirmar</button>
            <button class="btn-action btn-remove" onclick="window.simularResposta(${data.agendamentoId}, 'nao')">Não, cancelar</button>
          </div>
        `;

        document.querySelector('.simulation-box')?.remove();
        btn.after(simContainer);
        alert('Lembrete enviado para o seu Telegram! Confira a mensagem no aplicativo.');
      } else {
        alert(`Erro no disparo: ${data.error || 'Nenhum agendamento para testar'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Testar Lembrete (Telegram)';
    }
  };

  // Função global para resposta simulada
  window.simularResposta = async (id, resposta) => {
    try {
      const res = await fetch(`${API_URL}/responder-agendamento/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resposta })
      });

      if (res.ok) {
        alert(`Sucesso! O agendamento foi ${resposta === 'sim' ? 'CONFIRMADO' : 'CANCELADO'}.`);
        document.querySelector('.simulation-box')?.remove();
      } else {
        alert('Erro ao processar a resposta.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão.');
    }
  };

  // 3. Enviar Comunicado
  $('btn-send-broadcast').onclick = async () => {
    const chatId = $('input-broadcast-phone').value.trim();
    const text = $('textarea-announcement').value.trim();

    if (!text) return alert('Escreva o texto do comunicado.');

    const btn = $('btn-send-broadcast');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const response = await fetch(`${API_URL}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message: text })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Comunicado enviado pelo Telegram!');
        $('textarea-announcement').value = '';
      } else {
        alert(`Falha no envio: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor backend.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar Comunicado';
    }
  };
});
