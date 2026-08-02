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

        // 🔥 BUSCA TODAS AS DOAÇÕES (SEM FILTRO DE STATUS)
        const response = await axios.get(
            `${ZPAY_API_URL}/donations?limit=100`,
            {
                headers: {
                    'client-id': CLIENT_ID,
                    'client-secret': CLIENT_SECRET
                }
            }
        );

        // A Zpay pode retornar os dados em diferentes estruturas
        let donations = [];
        if (response.data && Array.isArray(response.data)) {
            donations = response.data;
        } else if (response.data && response.data.donations && Array.isArray(response.data.donations)) {
            donations = response.data.donations;
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
            donations = response.data.data;
        } else {
            // Se veio um objeto único, tenta transformar em array
            donations = Object.values(response.data).filter(item => typeof item === 'object' && item !== null);
        }

        console.log(`📦 ${donations.length} doações encontradas`);

        // 🔥 PROCURA O PAGAMENTO PELO ID EM VÁRIOS CAMPOS
        const found = donations.find(d => {
            const dId = d.id || d.paymentId || d.transactionId || d.externalId || d._id || '';
            const searchId = id || '';
            return String(dId).trim() === String(searchId).trim();
        });

        if (found) {
            // 🔥 EXTRAI O STATUS DE VÁRIOS CAMPOS POSSÍVEIS
            const status = found.status || found.paymentStatus || found.state || found.paymentState || 'pending';
            const statusLower = String(status).toLowerCase();
            
            console.log(`✅ Pagamento encontrado: status = ${status}`);

            // 🔥 VERIFICA SE ESTÁ PAGO
            const isPaid = statusLower === 'paid' || 
                          statusLower === 'approved' || 
                          statusLower === 'confirmado' || 
                          statusLower === 'completed' ||
                          statusLower === 'success' ||
                          statusLower === 'pago';

            res.status(200).json({
                status: isPaid ? 'paid' : 'pending'
            });
        } else {
            console.log(`❌ Pagamento ${id} não encontrado na lista de doações`);
            
            // 🔥 TENTA BUSCAR DIRETAMENTE PELO ID SE NÃO ACHOU NA LISTA
            try {
                const directResponse = await axios.get(
                    `${ZPAY_API_URL}/donations/${id}`,
                    {
                        headers: {
                            'client-id': CLIENT_ID,
                            'client-secret': CLIENT_SECRET
                        }
                    }
                );
                
                if (directResponse.data) {
                    const directData = directResponse.data;
                    const status = directData.status || directData.paymentStatus || 'pending';
                    const statusLower = String(status).toLowerCase();
                    const isPaid = statusLower === 'paid' || statusLower === 'approved' || statusLower === 'confirmado';
                    
                    console.log(`✅ Pagamento encontrado via busca direta: status = ${status}`);
                    res.status(200).json({
                        status: isPaid ? 'paid' : 'pending'
                    });
                    return;
                }
            } catch (directError) {
                console.log('⚠️ Busca direta falhou:', directError.response?.status);
            }

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
