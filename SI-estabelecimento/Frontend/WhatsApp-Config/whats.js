document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  
  // URL base do Backend Express
  const API_URL = 'http://localhost:3000/api/whatsapp';

  const inputSlot = $('input-slot-info');
  const previewSlot = $('preview-slot');

  // Atualiza a prévia dinamicamente ao digitar
  if (inputSlot && previewSlot) {
    inputSlot.oninput = e => {
      previewSlot.textContent = e.target.value.trim() || 'Horário não especificado';
    };
  }

  // 1. Salvar Regra de Lembrete
  $('btn-save-reminders').onclick = () => {
    const enabled = $('toggle-reminders').checked;
    const antecedence = $('select-antecedence').options[$('select-antecedence').selectedIndex].text;
    
    if (enabled) {
      alert(`Configuração Salva!\nOs lembretes automáticos serão enviados com ${antecedence} de antecedência.`);
    } else {
      alert('Aviso: Os lembretes automáticos de confirmação foram desativados.');
    }
  };

  // 2. Disparar Notificação de Vaga (Fila)
  $('btn-send-slot-notify').onclick = async () => {
    const phone = $('input-recipient-phone').value.trim();
    const slot = inputSlot.value.trim();

    if (!phone) return alert('Por favor, informe o telefone do destinatário com DDD.');
    if (!slot) return alert('Por favor, informe o horário da vaga liberada.');

    const btn = $('btn-send-slot-notify');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const response = await fetch(`${API_URL}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: `Olá! Uma vaga vagou para *${slot}* na Agenda Smart. Deseja garantir esse horário? Responda SIM para confirmar.`
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`Sucesso! Notificação de vaga enviada via WhatsApp para ${phone}.`);
      } else {
        alert(`Falha ao enviar mensagem: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor backend.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Disparar Notificação';
    }
  };

  // 3. Disparar Comunicado Direto
  $('btn-send-broadcast').onclick = async () => {
    const phone = $('input-broadcast-phone').value.trim();
    const text = $('textarea-announcement').value.trim();

    if (!phone) return alert('Por favor, informe o telefone destinatário.');
    if (!text) return alert('Escreva o texto do comunicado antes de enviar.');

    const btn = $('btn-send-broadcast');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const response = await fetch(`${API_URL}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: text
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Comunicado enviado com sucesso no WhatsApp!');
        $('textarea-announcement').value = '';
      } else {
        alert(`Falha ao enviar comunicado: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor backend.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Disparar Comunicado';
    }
  };
});