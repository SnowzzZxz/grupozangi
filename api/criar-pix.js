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

        console.log('✅ Resposta Zpay:', JSON.stringify(response.data, null, 2));

        const data = response.data;

        // 🔥 CAPTURA TODOS OS CAMPOS POSSÍVEIS
        const paymentId = data.id || data.paymentId || data.transactionId || data.payment_id;

        // QR Code - tenta vários nomes de campo
        const qrCode = data.qrCode || data.qr_code || data.qrCodeImage || data.pixQrCode || data.qrcode || data.qr || null;

        // Código Pix (copia e cola) - tenta vários nomes
        const pixCode = data.pixCode || data.pix_code || data.brCode || data.pixCopiaCola || data.pixKey || data.pix || data.pixQrCode || null;

        // Link de pagamento
        const paymentLink = data.paymentUrl || data.url || data.checkoutUrl || data.link || data.payment_link || null;

        // Se veio a resposta mas não os campos específicos, tenta extrair de dentro de objetos aninhados
        let finalQrCode = qrCode;
        let finalPixCode = pixCode;

        // Se não encontrou, procura dentro de objetos
        if (!finalQrCode && data.pix && data.pix.qrCode) {
            finalQrCode = data.pix.qrCode;
            finalPixCode = data.pix.pixCode || data.pix.code;
        }

        if (!finalQrCode && data.data && data.data.qrCode) {
            finalQrCode = data.data.qrCode;
            finalPixCode = data.data.pixCode || data.data.code;
        }

        // Se ainda não tem, usa o paymentId como fallback
        if (!finalQrCode && paymentId) {
            finalQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentId)}`;
        }

        if (!finalPixCode && paymentId) {
            finalPixCode = paymentId;
        }

        // Se não veio nada, avisa
        if (!paymentId) {
            return res.status(400).json({
                success: false,
                error: 'Zpay não retornou ID do pagamento. Resposta: ' + JSON.stringify(data)
            });
        }

        res.status(200).json({
            success: true,
            pix: {
                qrCode: finalQrCode || paymentLink || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentId)}`,
                codigoCopiaCola: finalPixCode || paymentId,
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
