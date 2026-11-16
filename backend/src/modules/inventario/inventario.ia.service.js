// Identifica productos y cantidades en una foto usando Google Gemini (gratuito) o Claude.
// Usa axios (ya instalado) en vez de un SDK para no sumar dependencias.
const axios = require('axios');
const { ia } = require('../../config/env');

const HERRAMIENTA = 'registrar_conteo';

const SISTEMA = `Eres el asistente experto de inventario de un taller mecánico automotriz en Colombia (especializado en repuestos, suspensión, frenos, transmisión, dirección, motor, lubricantes, filtros, embragues, rodamientos, baterías e insumos).
Recibirás una foto y el catálogo actual del inventario del taller. Tu misión es identificar meticulosamente cada repuesto o producto que aparezca y contar cuántas unidades visibles hay de cada uno.

Reglas fundamentales:
1. NUNCA DEVOLVER ITEMS VACÍO SI HAY REPUESTOS: Si en la imagen se observa cualquier pieza mecánica, repuesto, componente de carro, herramienta o insumo automotriz, es OBLIGATORIO incluirlo en el arreglo "items".
2. FOTOS CON MÚLTIPLES PIEZAS O SURTIDOS: Si la imagen muestra un conjunto variado o despiece de repuestos (por ejemplo: amortiguadores, resortes espirales, ejes de transmisión/palieres, juntas homocinéticas, fuelles/guardapolvos, crucetas, rodamientos/balineras, discos de freno, cáliper/mordazas, terminales de dirección, etc.), desglosa y agrupa cada categoría de repuesto en una fila de "items" con la cantidad de unidades que logres contar o estimar en la foto.
3. COINCIDENCIA CON EL CATÁLOGO:
   - Si la pieza pertenece claramente a un tipo de repuesto presente en el catálogo (por ejemplo, identificas amortiguadores y en el catálogo hay "Amortiguador delantero a gas", o identificas fuelles y en el catálogo hay "Guardapolvo / Fuelle de junta homocinética", o discos de freno y hay "Disco de freno delantero"), asigna el "id_repuesto" numérico correspondiente de ese ítem del catálogo.
   - Si dudas entre varias líneas similares del catálogo (ej. delantero vs trasero), elige la opción más representativa o afín y ajusta la confianza.
   - Si la pieza visible NO coincide con ningún repuesto del catálogo provisto, DEBES agregarla igualmente con "id_repuesto": null, especificando su nombre automotriz estándar en español en "nombre_detectado" (ej: "Guardapolvo / fuelle de transmisión", "Eje homocinético", "Cruceta de cardán", "Rodamiento de bola").
4. CALIDAD Y CONFIANZA:
   - confianza: "alta" si la pieza o marca es inequívoca y el conteo es exacto; "media" en tomas con varias piezas o ángulos oblicuos; "baja" si hay piezas parcialmente superpuestas u ocultas.
   - Si la foto está totalmente desenfocada, negra, blanca o NO contiene absolutamente ningún repuesto ni pieza de taller (ej. foto de un animal, paisaje, persona), entonces devuelve "items": [] y explica detalladamente la razón en "observaciones".
5. IDIOMA Y FORMATO:
   - Responde siempre en español.
   - Responde ÚNICAMENTE un JSON estrictamente válido con la siguiente estructura:
{
  "items": [
    {
      "id_repuesto": integer o null,
      "nombre_detectado": "string",
      "marca_detectada": "string o null",
      "cantidad": integer,
      "confianza": "alta" | "media" | "baja",
      "nota": "string o null"
    }
  ],
  "observaciones": "string",
  "calidad_imagen": "buena" | "regular" | "mala"
}`;

const DEFINICION_HERRAMIENTA = {
    name: HERRAMIENTA,
    description: 'Registra los productos automotrices identificados en la foto con su cantidad.',
    input_schema: {
        type: 'object',
        properties: {
            items: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id_repuesto:      { type: ['integer', 'null'], description: 'id del catálogo si coincide; null si no.' },
                        nombre_detectado: { type: 'string', description: 'Nombre del producto o tipo de repuesto tal como se ve.' },
                        marca_detectada:  { type: ['string', 'null'] },
                        cantidad:         { type: 'integer', minimum: 1, description: 'Unidades visibles contadas.' },
                        confianza:        { type: 'string', enum: ['alta', 'media', 'baja'] },
                        nota:             { type: ['string', 'null'], description: 'Aclaración breve si hace falta.' },
                    },
                    required: ['id_repuesto', 'nombre_detectado', 'cantidad', 'confianza'],
                },
            },
            observaciones: { type: 'string', description: 'Comentario general sobre la foto o las piezas encontradas.' },
            calidad_imagen: { type: 'string', enum: ['buena', 'regular', 'mala'] },
        },
        required: ['items'],
    },
};

const errorHttp = (status, mensaje) => {
    const err = new Error(mensaje);
    err.status = status;
    return err;
};

const texto = (valor, max) => {
    if (typeof valor !== 'string') return null;
    const limpio = valor.trim().slice(0, max);
    return limpio || null;
};

// La salida de un modelo se valida y se limpia antes de enviarla al navegador.
const normalizarResultado = (entrada, catalogo) => {
    const idsValidos = new Set(catalogo.map((r) => r.id_repuesto));
    const crudo = Array.isArray(entrada?.items) ? entrada.items : [];
    const confianzas = ['alta', 'media', 'baja'];

    const items = crudo.slice(0, 100).map((it) => {
        const id = Number.isInteger(it?.id_repuesto) && idsValidos.has(it.id_repuesto) ? it.id_repuesto : null;
        const cantidad = Number.isInteger(it?.cantidad) ? Math.min(Math.max(it.cantidad, 1), 100000) : 1;
        return {
            id_repuesto:      id,
            nombre_detectado: texto(it?.nombre_detectado, 100) || 'Repuesto automotriz',
            marca_detectada:  texto(it?.marca_detectada, 50),
            cantidad,
            confianza:        confianzas.includes(it?.confianza) ? it.confianza : 'media',
            nota:             texto(it?.nota, 200),
        };
    });

    return {
        items,
        observaciones:  texto(entrada?.observaciones, 500) || '',
        calidad_imagen: ['buena', 'regular', 'mala'].includes(entrada?.calidad_imagen) ? entrada.calidad_imagen : 'buena',
    };
};

// Llamada con Google Gemini (gratuito) con tolerancia a caídas temporales de modelo
const analizarConGemini = async ({ base64, mediaType, lineasCatalogo }) => {
    const candidatosModelos = [ia.geminiModel, 'gemini-3.5-flash-lite', 'gemini-3.5-flash'].filter(Boolean);
    const modelosUnicos = [...new Set(candidatosModelos)];

    let ultimoError = null;

    for (const modelo of modelosUnicos) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${ia.geminiApiKey}`;

        try {
            const res = await axios.post(
                url,
                {
                    systemInstruction: {
                        parts: [{ text: SISTEMA }]
                    },
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Catálogo actual del taller (id | nombre | marca | stock):\n${lineasCatalogo || '(el inventario está vacío)'}\n\nAnaliza detenidamente la foto adjunta. Identifica todos los repuestos o piezas automotrices visibles, compáralos con el catálogo y devuelve el JSON estricto.`
                                },
                                {
                                    inlineData: {
                                        mimeType: mediaType,
                                        data: base64
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.1
                    }
                },
                { timeout: 50000 }
            );

            const textoRespuesta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textoRespuesta) throw errorHttp(502, 'Gemini no devolvió texto de respuesta');
            return JSON.parse(textoRespuesta);
        } catch (err) {
            ultimoError = err;
            const status = err.response?.status;
            console.error(`Error en Gemini API (${modelo}):`, status || err.code, err.response?.data?.error?.message || err.message);

            if (status === 503 || status === 404) {
                continue;
            }
            break;
        }
    }

    if (ultimoError.status) throw ultimoError;
    const status = ultimoError.response?.status;
    if (ultimoError.code === 'ECONNABORTED') throw errorHttp(504, 'La IA tardó demasiado en responder.');
    if (status === 400 || status === 403) throw errorHttp(502, 'Error de autenticación con Gemini. Revisa GEMINI_API_KEY en .env');
    if (status === 429) throw errorHttp(429, 'Límite de peticiones de Gemini excedido. Intenta de nuevo en un momento.');
    throw errorHttp(502, 'Error al comunicarse con la IA de Google Gemini.');
};

// Llamada con Claude Anthropic (fallback)
const analizarConClaude = async ({ base64, mediaType, lineasCatalogo }) => {
    const respuesta = await axios.post(
        `${ia.baseUrl}/v1/messages`,
        {
            model: ia.model,
            max_tokens: 2048,
            system: SISTEMA,
            tools: [DEFINICION_HERRAMIENTA],
            tool_choice: { type: 'tool', name: HERRAMIENTA },
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                    {
                        type: 'text',
                        text: `Catálogo actual del taller (id | nombre | marca | stock):\n${lineasCatalogo || '(el inventario está vacío)'}\n\nAnaliza la foto adjunta.`,
                    },
                ],
            }],
        },
        {
            headers: {
                'x-api-key': ia.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            timeout: 50000,
        }
    );

    const bloque = (respuesta.data?.content || []).find((b) => b.type === 'tool_use' && b.name === HERRAMIENTA);
    if (!bloque) throw errorHttp(502, 'La IA no devolvió un resultado utilizable.');
    return bloque.input;
};

const analizarFoto = async ({ base64, mediaType, catalogo }) => {
    const usaGemini = Boolean(ia.geminiApiKey);
    const usaClaude = Boolean(ia.apiKey);

    if (!usaGemini && !usaClaude) {
        throw errorHttp(503, 'La función de IA no está configurada (agrega GEMINI_API_KEY en el archivo backend/.env).');
    }

    const lineasCatalogo = catalogo
        .map((r) => `${r.id_repuesto} | ${r.nombre} | ${r.marca || '-'} | stock ${r.stock}`)
        .join('\n');

    let resultadoCrudo;
    if (usaGemini) {
        resultadoCrudo = await analizarConGemini({ base64, mediaType, lineasCatalogo });
    } else {
        resultadoCrudo = await analizarConClaude({ base64, mediaType, lineasCatalogo });
    }

    return normalizarResultado(resultadoCrudo, catalogo);
};

module.exports = { analizarFoto, normalizarResultado };
