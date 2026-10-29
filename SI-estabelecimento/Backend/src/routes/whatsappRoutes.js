import express from 'express';

const router = express.Router();

// Rota POST para disparar mensagens do WhatsApp
router.post('/send-text', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios.' });
    }

    // Remove caracteres não numéricos do telefone
    const cleanPhone = phone.replace(/\D/g, '');

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      return res.status(500).json({ error: 'Credenciais do WhatsApp não configuradas no .env' });
    }

    const response = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: message }
      })
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, data });
    } else {
      console.error('Erro Meta API:', data);
      return res.status(400).json({ success: false, error: data.error?.message || 'Erro no envio via Meta API' });
    }
  } catch (err) {
    console.error('Erro na rota do WhatsApp:', err);
    return res.status(500).json({ success: false, error: 'Erro interno ao processar disparo.' });
  }
});

export default router;