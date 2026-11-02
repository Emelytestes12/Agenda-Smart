import express from 'express';

const router = express.Router();

const GRAPH_VERSION = 'v25.0';
const TEMPLATE_FALLBACK = { name: 'hello_world', language: { code: 'en_US' } };

// Garante o DDI 55 e remove o 9º dígito se necessário (padrão Meta/WhatsApp Business)
function normalizarTelefone(phone) {
  let clean = String(phone).replace(/\D/g, '');
  
  // Adiciona DDI 55 se faltar
  if (clean.length <= 11 && !clean.startsWith('55')) {
    clean = '55' + clean;
  }

  // Se o número brasileiro tiver 13 dígitos (55 + DDD + 9 + 8 dígitos),
  // removemos o 9 extra (posição 4) para garantir a entrega
  if (clean.startsWith('55') && clean.length === 13) {
    clean = clean.substring(0, 4) + clean.substring(5);
  }
  
  return clean;
}

// Rota POST para disparar mensagens do WhatsApp
router.post('/send-text', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Telefone é obrigatório.' });
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      return res.status(500).json({ error: 'Credenciais do WhatsApp não configuradas no .env' });
    }

    const cleanPhone = normalizarTelefone(phone);
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;

    const enviar = async (payload) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      return { ok: response.ok, status: response.status, data: await response.json() };
    };

    // 1) Tenta o texto personalizado (funciona dentro da janela de 24h)
    const texto = message && message.trim() ? message.trim() : 'Mensagem do Agenda Smart';
    let resultado = await enviar({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: { preview_url: false, body: texto }
    });

    // 2) Se a janela de 24h estiver fechada, usa o template padrão como reserva
    const codigoErro = resultado.data?.error?.code;
    const usarTemplate = !resultado.ok && [470, 131047, 131026].includes(codigoErro);

    if (usarTemplate) {
      resultado = await enviar({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: TEMPLATE_FALLBACK
      });
    }

    if (resultado.ok) {
      return res.status(200).json({
        success: true,
        modo: usarTemplate ? 'template' : 'texto',
        data: resultado.data
      });
    }

    console.error('Erro Meta API:', resultado.data);
    return res.status(400).json({
      success: false,
      error: resultado.data.error?.message || 'Erro no envio via Meta API'
    });
  } catch (err) {
    console.error('Erro na rota do WhatsApp:', err);
    return res.status(500).json({ success: false, error: 'Erro interno ao processar disparo.' });
  }
});

export default router;
