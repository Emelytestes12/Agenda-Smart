document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  // URL base do Backend Express
  const API_URL = 'http://localhost:3000/api/whatsapp';

  const lerJSON = async res => {
    try { return await res.json(); } catch { return {}; }
  };

  // 1. Salvar Regra de Lembrete
  $('btn-save-reminders').onclick = () => {
    const enabled = $('toggle-reminders').checked;
    const antecedence = $('select-antecedence').options[$('select-antecedence').selectedIndex].text;

    if (enabled) {
      alert(`Configuração Salva!\nOs lembretes automáticos (simulados) serão enviados com ${antecedence} de antecedência.`);
    } else {
      alert('Aviso: As simulações de lembretes automáticos foram desativadas.');
    }
  };

  // 2. Testar Lembrete (Simulação local)
  $('btn-test-reminder').onclick = async () => {
    const btn = $('btn-test-reminder');
    const phone = $('input-broadcast-phone').value.trim();

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Simulando...';

    try {
      const res = await fetch(`${API_URL}/send-reminder-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await lerJSON(res);

      if (res.ok) {
        // Exibe um mini painel de simulação de resposta para o teste
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
        $('btn-test-reminder').after(simContainer);
        alert('Simulação de lembrete registrada! Veja o Dashboard para conferir o log.');
      } else {
        alert(`Erro na simulação: ${data.error || 'Nenhum agendamento para testar'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Testar Lembrete (Simulação)';
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
        alert(`Sucesso! O agendamento foi ${resposta === 'sim' ? 'CONFIRMADO' : 'CANCELADO'} via simulação.`);
        document.querySelector('.simulation-box')?.remove();
      } else {
        alert('Erro ao simular resposta.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão.');
    }
  };

  // 3. Registrar Comunicado Simulado
  $('btn-send-broadcast').onclick = async () => {
    const phone = $('input-broadcast-phone').value.trim();
    const text = $('textarea-announcement').value.trim();

    if (!phone) return alert('Informe o telefone para a simulação.');
    if (!text) return alert('Escreva o texto do comunicado.');

    const btn = $('btn-send-broadcast');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    try {
      const response = await fetch(`${API_URL}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: text })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Comunicado simulado com sucesso! (WhatsApp real desativado)');
        $('textarea-announcement').value = '';
      } else {
        alert(`Falha na simulação: ${data.message || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor backend.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Registrar Simulação';
    }
  };
});
