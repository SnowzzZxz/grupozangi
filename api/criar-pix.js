const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { valor, descricao, nome_cliente } = req.body;

        const CLIENT_ID = 'zpk_541f4b2f71855fb26e1201a7';
        const CLIENT_SECRET = 'zsk_87b13fb23ba5eed5d6d9f0f9e6153d20dfeac10e24a66dd6';
        const ZPAY_API_URL = 'https://zpaysolution.com/api/v1';

        console.log('📤 Enviando para Zpay:', { valor, descricao, nome_cliente });

        const response = await axios.post(
            `${ZPAY_API_URL}/payments`,
            {
                amount: parseFloat(valor),
                payerName: nome_cliente || 'Cliente',
                description: descricao || 'Produto'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'client-id': CLIENT_ID,
                    'client-secret': CLIENT_SECRET
                }
            }
        );

        console.log('✅ Resposta Zpay COMPLETA:', JSON.stringify(response.data, null, 2));

        // Extrai os dados corretamente
        const data = response.data;
        const paymentId = data.id || data.paymentId || data.transactionId;

        // Tenta encontrar o QR Code e o código Pix
        const qrCode = data.qrCode || data.qr_code || data.qrCodeImage || data.pixQrCode || null;
        const pixCode = data.pixCode || data.pix_code || data.brCode || data.pixCopiaCola || data.pixKey || null;

        // Se a Zpay retornou um link de pagamento, podemos gerar um QR Code a partir dele
        const paymentLink = data.paymentUrl || data.url || data.checkoutUrl || data.link || null;

        // Se não veio QR Code da Zpay, gera um QR Code genérico
        const finalQrCode = qrCode || (pixCode ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}` : null);

        // Se não veio nada, avisa
        if (!paymentId || (!finalQrCode && !pixCode && !paymentLink)) {
            console.error('❌ Zpay não retornou dados suficientes:', data);
            return res.status(400).json({
                success: false,
                error: 'A Zpay não retornou os dados do PIX. Resposta: ' + JSON.stringify(data)
            });
        }

        res.status(200).json({
            success: true,
            pix: {
                qrCode: finalQrCode || paymentLink,
                codigoCopiaCola: pixCode || paymentId || paymentLink,
                paymentId: paymentId,
                raw: data // opcional, pra debug
            },
            transactionId: paymentId
        });

    } catch (error) {
        console.error('❌ Erro na Zpay:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });

        res.status(400).json({
            success: false,
            error: error.response?.data?.message || error.message || 'Erro ao gerar PIX'
        });
    }
};
