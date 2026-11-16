// Acceso a Supabase Storage para los videos de las órdenes.
// El navegador sube el archivo DIRECTO a Supabase con una URL firmada: así no pasa por
// Vercel (que limita el cuerpo de cada petición a 4.5 MB). Aquí solo se firma, se verifica
// y se borra. La clave service_role vive únicamente en el servidor.
const { almacenamiento: cfg } = require('../config/env');

let cliente = null;
let bucketListo = false;

const configurado = () => Boolean(cfg.supabaseUrl && cfg.serviceKey);

const getCliente = () => {
    if (!configurado()) {
        const err = new Error(
            'El almacenamiento de videos no está configurado (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor).'
        );
        err.status = 503;
        throw err;
    }
    if (!cliente) {
        const { createClient } = require('@supabase/supabase-js');
        cliente = createClient(cfg.supabaseUrl, cfg.serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    return cliente;
};

// Crea el bucket (privado, solo videos) la primera vez que se usa.
const asegurarBucket = async () => {
    if (bucketListo) return;
    const sb = getCliente();

    const { data } = await sb.storage.getBucket(cfg.bucket);
    if (!data) {
        const { error } = await sb.storage.createBucket(cfg.bucket, {
            public: false,
            fileSizeLimit: `${cfg.videoMaxMb}MB`,
            allowedMimeTypes: ['video/*'],
        });
        if (error && !/already exists/i.test(error.message || '')) throw error;
    }
    bucketListo = true;
};

// URL + token de un solo uso para que el navegador suba un archivo a `ruta`.
const crearSubidaFirmada = async (ruta) => {
    await asegurarBucket();
    const { data, error } = await getCliente().storage.from(cfg.bucket).createSignedUploadUrl(ruta);
    if (error) throw error;
    return { ruta: data.path || ruta, token: data.token };
};

// Confirma que el archivo realmente quedó guardado y devuelve su tamaño y tipo reales.
const infoObjeto = async (ruta) => {
    const carpeta = ruta.substring(0, ruta.lastIndexOf('/'));
    const nombre  = ruta.substring(ruta.lastIndexOf('/') + 1);

    const { data, error } = await getCliente().storage
        .from(cfg.bucket)
        .list(carpeta, { limit: 100, search: nombre });
    if (error) throw error;

    const objeto = (data || []).find((o) => o.name === nombre);
    if (!objeto) return null;
    return {
        tamano: Number(objeto.metadata?.size) || 0,
        mime:   objeto.metadata?.mimetype || '',
    };
};

// Enlaces temporales de reproducción (el bucket es privado).
const urlsFirmadas = async (rutas, segundos = 3600) => {
    if (rutas.length === 0) return {};
    const { data, error } = await getCliente().storage.from(cfg.bucket).createSignedUrls(rutas, segundos);
    if (error) throw error;
    const mapa = {};
    for (const item of data || []) {
        if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
    }
    return mapa;
};

const eliminar = async (rutas) => {
    if (rutas.length === 0) return;
    const { error } = await getCliente().storage.from(cfg.bucket).remove(rutas);
    if (error) throw error;
};

module.exports = {
    configurado,
    bucket: cfg.bucket,
    videoMaxMb: cfg.videoMaxMb,
    crearSubidaFirmada,
    infoObjeto,
    urlsFirmadas,
    eliminar,
};
