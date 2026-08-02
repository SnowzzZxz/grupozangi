const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'ID não fornecido' });
        }

        const CLIENT_ID = 'zpk_541f4b2f71855fb26e1201a7';
        const CLIENT_SECRET = 'zsk_87b13fb23ba5eed5d6d9f0f9e6153d20dfeac10e24a66dd6';
        const ZPAY_API_URL = 'https://zpaysolution.com/api/v1';

        const response = await axios.get(
            `${ZPAY_API_URL}/donations?limit=100`,
            {
                headers: {
                    'client-id': CLIENT_ID,
                    'client-secret': CLIENT_SECRET
                }
            }
        );

        let donations = [];
        if (response.data && Array.isArray(response.data)) {
            donations = response.data;
        } else if (response.data && response.data.donations) {
            donations = response.data.donations;
        } else if (response.data && response.data.data) {
            donations = response.data.data;
        } else {
            donations = Object.values(response.data).filter(item => typeof item === 'object' && item !== null);
        }

        const found = donations.find(d => {
            const dId = d.id || d.paymentId || d.transactionId || d._id || '';
            return String(dId).trim() === String(id).trim();
        });

        if (found) {
            const status = String(found.status || 'pending').toLowerCase();
            const isPaid = ['paid', 'approved', 'confirmado', 'completed', 'success', 'pago'].includes(status);
            res.status(200).json({ status: isPaid ? 'paid' : 'pending' });
        } else {
            res.status(200).json({ status: 'pending' });
        }

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(400).json({ error: 'Erro ao verificar pagamento' });
    }
};
