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
      if ($('numero-status-phone')) {
        $('numero-status-phone').textContent = data.chatId ? `Chat ID: ${data.chatId}` : 'Chat ID não definido';
      }
      if ($('connection-subtext')) {
        $('connection-subtext').textContent = conectado ? 'Bot ativo para disparos' : 'Verifique o .env do backend';
      }
    } catch {
      if ($('connection-title')) $('connection-title').textContent = 'Backend Offline';
    }
  };

  carregarStatus();

  // Envio de comunicado em texto simples
  $('btn-send-broadcast').onclick = async () => {
    const text = $('textarea-announcement').value.trim();
    if (!text) return alert('Escreva o texto do comunicado.');

    const btn = $('btn-send-broadcast');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const response = await fetch(`${API_URL}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await lerJSON(response);

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
