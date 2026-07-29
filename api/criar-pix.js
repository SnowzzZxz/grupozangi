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
        console.log('📦 Resposta Zpay:', JSON.stringify(data, null, 2));

        // ============================================================
        // 🔥 CORREÇÃO: USA O CAMPO CERTO
        // ============================================================
        // O dono da Zpay disse:
        // - O código Pix copia e cola vem no campo "copypaste" (ou pixCode/brCode)
        // - O paymentId é só o ID interno, NÃO é o código Pix
        // - O QR Code pode vir pronto (qrCodeURL) ou vc gera a partir do copypaste
        // ============================================================

        const paymentId = data.id || data.paymentId || data.transactionId;

        // 🔥 CAMPO CERTO: copypaste (ou pixCode, brCode, etc)
        const codigoPix = data.copypaste || data.pixCode || data.pix_code || data.brCode || data.pix || data.payload || null;

        // 🔥 QR Code: se a Zpay já retorna, usa ele. Senão, gera a partir do copypaste
        const qrCodeURL = data.qrCodeURL || data.qrCode || data.qr_code || data.qrCodeImage || null;

        // Se não veio QR Code pronto, gera a partir do código Pix
        let qrCodeFinal = qrCodeURL;
        if (!qrCodeFinal && codigoPix) {
            qrCodeFinal = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codigoPix)}`;
        }

        // Se ainda não tem QR Code, usa o paymentId como fallback (mas não é ideal)
        if (!qrCodeFinal) {
            qrCodeFinal = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentId)}`;
        }

        res.status(200).json({
            success: true,
            pix: {
                qrCode: qrCodeFinal,
                codigoCopiaCola: codigoPix || paymentId, // USA O copypaste, NÃO o paymentId
                paymentId: paymentId // só pra referência
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
