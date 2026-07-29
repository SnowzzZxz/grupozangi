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

        // 🔥 FUNÇÃO PARA EXTRAIR O CÓDIGO PIX REAL
        function extrairCodigoPix(obj) {
            // Lista de campos que podem conter o código Pix
            const campos = [
                'pixCode', 'pix_code', 'pix', 'brCode', 'pixCopiaCola',
                'pixKey', 'qrCodeString', 'payload', 'pixPayload',
                'code', 'paymentCode', 'transactionCode', 'qrCode',
                'qr_code', 'pixQrCode'
            ];

            // Procura em todos os campos do objeto
            for (const campo of campos) {
                if (obj[campo] && typeof obj[campo] === 'string') {
                    const valor = obj[campo];
                    // Se começa com "000201" ou contém "br.gov.bcb.pix", é o código Pix
                    if (valor.startsWith('000201') || valor.includes('br.gov.bcb.pix')) {
                        return valor;
                    }
                    // Se parece com um código Pix (começa com números e tem pontuação)
                    if (/^[0-9]{6}/.test(valor) && valor.length > 30) {
                        return valor;
                    }
                }
            }

            // Procura dentro de objetos aninhados
            for (const key of Object.keys(obj)) {
                if (obj[key] && typeof obj[key] === 'object') {
                    const resultado = extrairCodigoPix(obj[key]);
                    if (resultado) return resultado;
                }
            }

            return null;
        }

        // 🔥 EXTRAI O CÓDIGO PIX REAL
        let pixCode = extrairCodigoPix(data);

        // Se não encontrou, usa o ID como fallback
        if (!pixCode) {
            pixCode = data.id || data.paymentId || data.transactionId;
        }

        // 🔥 GERA QR CODE A PARTIR DO CÓDIGO PIX
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;

        const paymentId = data.id || data.paymentId || data.transactionId;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                error: 'Zpay não retornou ID do pagamento.'
            });
        }

        res.status(200).json({
            success: true,
            pix: {
                qrCode: qrCodeUrl,
                codigoCopiaCola: pixCode,
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
