/**
 * Interfaz base / contrato para proveedores de visión de inventario.
 */
class VisionProvider {
    /**
     * Analiza una lista de imágenes y devuelve una propuesta estructurada.
     * @param {Object} params
     * @param {Array<{buffer: Buffer, mimetype: string, originalname?: string}>} params.imagenes
     * @param {'entrada'|'conteo'} params.modo
     * @param {Array<{id_repuesto: number, nombre: string, marca: string|null, referencia: string|null, codigo_barras: string|null}>} [params.catalogo]
     * @returns {Promise<{
     *   tipo_foto: 'factura'|'productos'|'estante'|'otro',
     *   items: Array<{
     *     descripcion: string,
     *     categoria?: string,
     *     marca?: string|null,
     *     referencia?: string|null,
     *     codigo_barras?: string|null,
     *     cantidad: number,
     *     cantidad_segun_documento?: number|null,
     *     piezas_enumeradas?: Array<{posicion: string, nota: string}>,
     *     confianza?: number,
     *     evidencia?: string,
     *     id_repuesto_sugerido?: number|null
     *   }>,
     *   advertencias: string[],
     *   modelo: string,
     *   tokens_entrada: number,
     *   tokens_salida: number
     * }>}
     */
    async analizarImagenes({ imagenes, modo, catalogo }) {
        throw new Error('Método analizarImagenes() debe ser implementado por la subclase');
    }
}

module.exports = VisionProvider;
