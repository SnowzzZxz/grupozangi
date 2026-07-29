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
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                error: 'ID da transação não fornecido'
            });
        }

        const CLIENT_ID = 'zpk_541f4b2f71855fb26e1201a7';
        const CLIENT_SECRET = 'zsk_87b13fb23ba5eed5d6d9f0f9e6153d20dfeac10e24a66dd6';
        const ZPAY_API_URL = 'https://zpaysolution.com/api/v1';

        console.log(`🔍 Verificando pagamento: ${id}`);

        // Busca as últimas 50 transações (todos os status)
        const response = await axios.get(
            `${ZPAY_API_URL}/donations?limit=50`,
            {
                headers: {
                    'client-id': CLIENT_ID,
                    'client-secret': CLIENT_SECRET
                }
            }
        );

        const donations = response.data.donations || response.data || [];
        console.log(`📦 ${donations.length} doações encontradas`);

        // Procura o pagamento pelo ID
        const found = donations.find(d => 
            d.id === id || 
            d.paymentId === id || 
            d.transactionId === id ||
            d.externalId === id
        );

        if (found) {
            const status = found.status || found.paymentStatus || 'pending';
            console.log(`✅ Pagamento encontrado: status = ${status}`);
            res.status(200).json({
                status: status === 'paid' || status === 'approved' || status === 'confirmado' ? 'paid' : 'pending'
            });
        } else {
            console.log(`❌ Pagamento ${id} não encontrado`);
            res.status(200).json({
                status: 'pending'
            });
        }

    } catch (error) {
        console.error('❌ Erro ao verificar:', error.response?.data || error.message);
        res.status(400).json({
            error: 'Erro ao verificar pagamento'
        });
    }
};
