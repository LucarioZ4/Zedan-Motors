const VisionProvider = require('./visionProvider');

class MockProvider extends VisionProvider {
    constructor(mockResponse = null) {
        super();
        this.mockResponse = mockResponse;
        this.llamadas = [];
    }

    setResponse(resp) {
        this.mockResponse = resp;
    }

    async analizarImagenes({ imagenes, modo, catalogo }) {
        this.llamadas.push({ imagenes, modo, catalogo });

        if (this.mockResponse instanceof Error) {
            throw this.mockResponse;
        }

        if (this.mockResponse) {
            return {
                tipo_foto: this.mockResponse.tipo_foto || 'productos',
                items: this.mockResponse.items || [],
                advertencias: this.mockResponse.advertencias || [],
                modelo: this.mockResponse.modelo || 'mock-provider-v1',
                tokens_entrada: this.mockResponse.tokens_entrada || 120,
                tokens_salida: this.mockResponse.tokens_salida || 80
            };
        }

        // Respuesta por defecto si no se especificó mockResponse
        return {
            tipo_foto: 'productos',
            items: [
                {
                    descripcion: 'Filtro de Aceite PH3593A',
                    categoria: 'Filtros',
                    marca: 'Fram',
                    referencia: 'PH3593A',
                    codigo_barras: '009100123456',
                    cantidad: 5,
                    cantidad_segun_documento: null,
                    piezas_enumeradas: [
                        { posicion: 'fila 1 caja 1', nota: 'caja sellada' },
                        { posicion: 'fila 1 caja 2', nota: 'caja sellada' },
                        { posicion: 'fila 1 caja 3', nota: 'caja sellada' },
                        { posicion: 'fila 1 caja 4', nota: 'caja sellada' },
                        { posicion: 'fila 1 caja 5', nota: 'caja sellada' }
                    ],
                    confianza: 0.95,
                    evidencia: '5 cajas apiladas con etiqueta visible',
                    id_repuesto_sugerido: null
                }
            ],
            advertencias: [],
            modelo: 'mock-provider-v1',
            tokens_entrada: 150,
            tokens_salida: 90
        };
    }
}

module.exports = MockProvider;
