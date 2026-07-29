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

        const data = response.data;

        // 🔥 EXTRAINDO OS CAMPOS CERTOS
        const paymentId = data.paymentId || data.id || data.transactionId;

        // 🔥 CÓDIGO PIX REAL (copyPaste) - USAR ESTE!
        const codigoPix = data.copyPaste || data.pixCode || data.pix_code || data.brCode || data.pix || null;

        // 🔥 QR CODE PRONTO (prioridade)
        const qrCodeBase64 = data.qrCodeBase64 || data.qrCode || data.qr_code || null;
        const qrCodeUrl = data.qrcodeUrl || data.qrCodeURL || data.qrCodeUrl || null;

        // 🔥 DEFINE O QR CODE FINAL
        let qrCodeFinal = null;

        // 1. Prioridade: QR Code Base64 (já vem pronto da Zpay)
        if (qrCodeBase64) {
            qrCodeFinal = qrCodeBase64;
        }
        // 2. Segunda opção: URL do QR Code da Zpay
        else if (qrCodeUrl) {
            qrCodeFinal = qrCodeUrl;
        }
        // 3. Último recurso: gerar QR Code a partir do copyPaste
        else if (codigoPix) {
            qrCodeFinal = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(codigoPix)}`;
        }
        // 4. Fallback: se não tiver nada, usa o paymentId (mas não deveria)
        else {
            qrCodeFinal = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentId)}`;
        }

        // 🔥 CÓDIGO PIX PARA COPIAR E COLAR
        const codigoCopiaCola = codigoPix || paymentId;

        console.log('📦 Resumo:', {
            paymentId,
            codigoPix: codigoPix ? codigoPix.substring(0, 30) + '...' : null,
            qrCodeFinal: qrCodeFinal ? '✅' : '❌',
        });

        res.status(200).json({
            success: true,
            pix: {
                qrCode: qrCodeFinal,
                codigoCopiaCola: codigoCopiaCola,
                paymentId: paymentId,
                raw: data // debug
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
