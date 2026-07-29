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

        console.log('✅ Resposta Zpay:', JSON.stringify(response.data, null, 2));

        const data = response.data;

        // 🔥 PRIORIDADE: usa o pixCode ou pix da Zpay
        let pixCode = data.pixCode || data.pix_code || data.pix || data.brCode || data.pixCopiaCola || null;

        // Se veio um objeto pix com code dentro
        if (!pixCode && data.pix && data.pix.code) {
            pixCode = data.pix.code;
        }
        if (!pixCode && data.pix && data.pix.pixCode) {
            pixCode = data.pix.pixCode;
        }

        // Se ainda não tem, usa o que veio no campo pix
        if (!pixCode && data.pix && typeof data.pix === 'string') {
            pixCode = data.pix;
        }

        // Último recurso: usa o ID
        if (!pixCode) {
            pixCode = data.id || data.paymentId || data.transactionId;
        }

        // 🔥 GERA O QR CODE A PARTIR DO CÓDIGO PIX
        const qrCodeUrl = pixCode ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}` : null;

        const paymentId = data.id || data.paymentId || data.transactionId;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                error: 'Zpay não retornou ID do pagamento. Resposta: ' + JSON.stringify(data)
            });
        }

        res.status(200).json({
            success: true,
            pix: {
                qrCode: qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode || paymentId)}`,
                codigoCopiaCola: pixCode || paymentId,
                raw: data
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
