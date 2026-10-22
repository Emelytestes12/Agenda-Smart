document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const inputSlot = $('input-slot-info'), previewSlot = $('preview-slot');

  inputSlot.oninput = e => previewSlot.textContent = e.target.value || 'Horário não especificado';

  $('btn-save-reminders').onclick = () => {
    const time = $('select-antecedence').options[$('select-antecedence').selectedIndex].text;
    alert($('toggle-reminders').checked ? `Configuração Salva!\nOs lembretes automáticos serão enviados ${time}.` : 'Aviso: Os lembretes automáticos de confirmação foram desativados.');
  };

  $('btn-send-slot-notify').onclick = () => {
    const client = $('select-queue-position').options[$('select-queue-position').selectedIndex].text;
    const slot = inputSlot.value.trim();
    if (!slot) return alert('Por favor, informe o horário da vaga liberada.');
    alert(`Sucesso! Notificação de vaga (${slot}) enviada no WhatsApp de: ${client}`);
  };

  $('btn-send-broadcast').onclick = () => {
    const text = $('textarea-announcement').value.trim();
    const target = $('select-broadcast-target').options[$('select-broadcast-target').selectedIndex].text;
    if (!text) return alert('Escreva o texto do comunicado antes de enviar.');
    alert(`Comunicado enviado com sucesso!\n\nPúblico: ${target}\nMensagem: "${text}"`);
    $('textarea-announcement').value = '';
  };
});