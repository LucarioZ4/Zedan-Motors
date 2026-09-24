const axios = require('axios');

class FactusService {
    constructor() {
        this.apiUrl = process.env.FACTUS_API_URL || 'https://api-sandbox.factus.com.co/v1';
        this.apiToken = process.env.FACTUS_API_TOKEN;
    }

    /**
     * Emite una factura electrónica a través de Factus.
     * Como no tenemos una cuenta real por ahora, simularemos la respuesta
     * de éxito en caso de que el token sea el de prueba.
     * 
     * @param {Object} datosFactura - Los datos estructurados de la factura.
     * @returns {Object} - Respuesta simulada o real de Factus.
     */
    async emitirFactura(datosFactura) {
        try {
            // MOCK MODE: Si el token es el de prueba, simulamos una respuesta exitosa
            if (this.apiToken === 'dummy_token_para_pruebas_12345' || !this.apiToken) {
                console.log('[FactusService Mock] Emitiendo factura electrónica simulada...');
                
                // Simular un pequeño retraso de red
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                console.log('[FactusService Mock] Factura emitida con éxito (simulado).');
                
                return {
                    success: true,
                    data: {
                        numero: `FV-SIM-${Math.floor(Math.random() * 10000)}`,
                        cufe: 'cufe_simulado_1234567890abcdef',
                        qr_url: 'https://factus.com.co/qr/simulado',
                        pdf_url: 'https://factus.com.co/pdf/simulado.pdf'
                    }
                };
            }

            // REAL MODE: Petición HTTP real a la API de Factus
            console.log('[FactusService] Enviando petición a la API de Factus...');
            
            const response = await axios.post(
                `${this.apiUrl}/facturas/electronicas`, 
                datosFactura,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('[FactusService Error] Error al emitir factura:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Error de comunicación con Factus');
        }
    }
}

module.exports = new FactusService();
