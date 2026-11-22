// Identifica productos y cantidades en una foto usando Google Gemini (gratuito) o Claude.
// Usa axios (ya instalado) en vez de un SDK para no sumar dependencias.
const axios = require('axios');
const { ia } = require('../../config/env');

const { sistema: SISTEMA, herramienta: DEFINICION_HERRAMIENTA } = require('./analisis-inventario.json');
const HERRAMIENTA = DEFINICION_HERRAMIENTA.name;

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
        const cantidad = Number.isInteger(it?.cantidad) && it.cantidad >= 1 && it.cantidad <= 100000 ? it.cantidad : null;
        return {
            id_repuesto:      id,
            nombre_detectado: texto(it?.nombre_detectado, 100) || 'Repuesto automotriz',
            marca_detectada:  texto(it?.marca_detectada, 50),
            cantidad,
            confianza:        cantidad === null ? 'baja' : confianzas.includes(it?.confianza) ? it.confianza : 'media',
            nota:             cantidad === null ? 'Indica la cantidad: la IA no devolvió un conteo válido.' : texto(it?.nota, 200),
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

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
                { timeout: 50000, headers: { 'x-goog-api-key': ia.geminiApiKey } }
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

    if (!axios.isAxiosError(ultimoError) && ultimoError.status) throw ultimoError;
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
        try {
            resultadoCrudo = await analizarConClaude({ base64, mediaType, lineasCatalogo });
        } catch (err) {
            if (!axios.isAxiosError(err)) throw err;
            if (err.code === 'ECONNABORTED') throw errorHttp(504, 'La IA tardó demasiado en responder.');
            if (err.response?.status === 429) throw errorHttp(429, 'Límite de peticiones de IA excedido.');
            throw errorHttp(502, 'Error al comunicarse con la IA.');
        }
    }

    return normalizarResultado(resultadoCrudo, catalogo);
};

module.exports = { analizarFoto, normalizarResultado };
