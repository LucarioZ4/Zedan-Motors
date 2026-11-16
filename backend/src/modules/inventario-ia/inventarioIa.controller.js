const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../../config/database');
const {
    iaHabilitada,
    anthropicModel,
    iaMaxImagenes,
    iaMaxMb
} = require('../../config/env');
const { ClaudeProvider } = require('./claudeProvider');
const MockProvider = require('./mockProvider');
const { emparejarItem, normalizarAlias } = require('./emparejar');

// Error de negocio con código HTTP (estilo addRepuesto)
class ErrorNegocio extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// Proveedor por defecto (inyectable para pruebas)
let activeProvider = iaHabilitada ? new ClaudeProvider() : null;

/**
 * Permite inyectar un proveedor en tests (ej. MockProvider).
 */
function setVisionProvider(provider) {
    activeProvider = provider;
}

function getVisionProvider() {
    return activeProvider;
}

/**
 * Valida la firma real (magic bytes) de un archivo en memoria.
 * Soporta JPEG, PNG y WebP.
 * @param {Buffer} buffer
 * @returns {'image/jpeg'|'image/png'|'image/webp'|null}
 */
function detectarMagicBytes(buffer) {
    if (!buffer || buffer.length < 12) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return 'image/png';
    }

    // WebP: RIFF....WEBP (bytes 0-3: 'RIFF', bytes 8-11: 'WEBP')
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    if (riff === 'RIFF' && webp === 'WEBP') {
        return 'image/webp';
    }

    return null;
}

/**
 * GET /api/inventario/ia/estado
 */
const getEstado = async (req, res) => {
    res.json({
        habilitado: Boolean(activeProvider || iaHabilitada),
        modelo: anthropicModel,
        maxImagenes: iaMaxImagenes,
        maxMb: iaMaxMb
    });
};

/**
 * POST /api/inventario/ia/analizar
 * Multipart: imagenes[] (1..5), modo='entrada'
 */
const analizar = async (req, res) => {
    try {
        const provider = activeProvider || (iaHabilitada ? new ClaudeProvider() : null);
        if (!provider) {
            return res.status(503).json({
                error: 'La función de IA no está configurada o se encuentra deshabilitada'
            });
        }

        const files = req.files;
        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                error: 'Debes subir al menos una imagen (campo "imagenes")'
            });
        }

        if (files.length > iaMaxImagenes) {
            return res.status(400).json({
                error: `Se permite un máximo de ${iaMaxImagenes} imágenes por análisis`
            });
        }

        const modo = req.body.modo || 'entrada';
        if (modo !== 'entrada') {
            return res.status(400).json({
                error: 'En esta versión solo está soportado el modo "entrada"'
            });
        }

        // Validar mimetype y magic bytes de cada archivo
        const imagenesValidadas = [];
        const nombresArchivosGuardados = [];
        const uploadsDir = path.join(__dirname, '../../../uploads/inventario-ia');

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const realType = detectarMagicBytes(f.buffer);

            if (!realType) {
                return res.status(400).json({
                    error: `El archivo ${f.originalname || `#${i + 1}`} no es una imagen válida (debe ser JPEG, PNG o WebP real)`
                });
            }

            // Guardar en disco con nombre aleatorio criptoseguro
            const ext = realType === 'image/jpeg' ? '.jpg' : realType === 'image/png' ? '.png' : '.webp';
            const randomName = `${Date.now()}_${crypto.randomBytes(16).toString('hex')}${ext}`;
            const diskPath = path.join(uploadsDir, randomName);

            try {
                fs.writeFileSync(diskPath, f.buffer);
                nombresArchivosGuardados.push(randomName);
            } catch (errIo) {
                console.error('Error guardando imagen en uploads:', errIo);
            }

            imagenesValidadas.push({
                buffer: f.buffer,
                mimetype: realType,
                originalname: f.originalname || randomName
            });
        }

        // Obtener catálogo actual para cruce y sugerencias
        const catResult = await pool.query(
            'SELECT id_repuesto, nombre, marca, precio, stock, referencia, codigo_barras FROM inventario ORDER BY nombre'
        );
        const catalogo = catResult.rows;

        // Obtener alias existentes
        const aliasResult = await pool.query(
            'SELECT alias_normalizado, id_repuesto FROM repuesto_alias'
        );
        const aliases = aliasResult.rows;

        // Invocar al proveedor de visión
        const visionResult = await provider.analizarImagenes({
            imagenes: imagenesValidadas,
            modo,
            catalogo
        });

        // Validar rigurosamente la salida del modelo
        const advertencias = Array.isArray(visionResult.advertencias) ? [...visionResult.advertencias] : [];
        const itemsValidados = [];

        const rawItems = Array.isArray(visionResult.items) ? visionResult.items.slice(0, 50) : [];
        if (visionResult.items && visionResult.items.length > 50) {
            advertencias.push('Se limitó el procesamiento a los primeros 50 ítems detectados.');
        }

        for (let idx = 0; idx < rawItems.length; idx++) {
            const it = rawItems[idx];
            if (!it || typeof it !== 'object') continue;

            const descripcion = typeof it.descripcion === 'string' ? it.descripcion.trim().slice(0, 200) : '';
            if (!descripcion) {
                advertencias.push(`Ítem en posición ${idx + 1} descartado por falta de descripción.`);
                continue;
            }

            let cantidad = parseInt(it.cantidad, 10);
            if (isNaN(cantidad) || cantidad < 1 || cantidad > 10000) {
                advertencias.push(`Ítem "${descripcion}" descartado por cantidad inválida (${it.cantidad}).`);
                continue;
            }

            if (cantidad > 500) {
                advertencias.push(`Ítem "${descripcion}": cantidad inusual (${cantidad} unidades). Verifica si es correcto.`);
            }

            const marca = typeof it.marca === 'string' && it.marca.trim() ? it.marca.trim().slice(0, 50) : null;
            const referencia = typeof it.referencia === 'string' && it.referencia.trim() ? it.referencia.trim().slice(0, 60) : null;
            const codigo_barras = typeof it.codigo_barras === 'string' && it.codigo_barras.trim() ? it.codigo_barras.trim().slice(0, 40) : null;
            const categoria = typeof it.categoria === 'string' && it.categoria.trim() ? it.categoria.trim().slice(0, 50) : 'General';
            const evidencia = typeof it.evidencia === 'string' ? it.evidencia.trim().slice(0, 300) : '';

            let confianza = typeof it.confianza === 'number' ? Math.max(0, Math.min(1, it.confianza)) : 0.8;
            const piezas = Array.isArray(it.piezas_enumeradas) ? it.piezas_enumeradas : [];

            // Regla de calidad: Si es objeto suelto y piezas_enumeradas.length !== cantidad
            // (cuando piezas está presente y no es una factura o remisión)
            const esFactura = visionResult.tipo_foto === 'factura' || it.cantidad_segun_documento != null;
            let requiereRevisionPorConteo = false;

            if (!esFactura && piezas.length > 0 && piezas.length !== cantidad) {
                confianza = Math.min(confianza, 0.5);
                requiereRevisionPorConteo = true;
                advertencias.push(`Ítem "${descripcion}": la cantidad detectada (${cantidad}) no coincide con la lista de piezas visibles (${piezas.length}). Requiere revisión manual.`);
            }

            // Cruce con emparejarItem
            const emparejamiento = emparejarItem(
                {
                    descripcion,
                    marca,
                    referencia,
                    codigo_barras,
                    id_repuesto_sugerido: it.id_repuesto_sugerido
                },
                catalogo,
                aliases
            );

            // Si requirió revisión por conteo, degradar a 'revisar'
            let estadoFinal = emparejamiento.estado;
            if (requiereRevisionPorConteo && estadoFinal === 'coincide') {
                estadoFinal = 'revisar';
            }

            itemsValidados.push({
                indice: idx,
                descripcion,
                categoria,
                marca,
                referencia,
                codigo_barras,
                cantidad,
                cantidad_segun_documento: it.cantidad_segun_documento || null,
                piezas_enumeradas: piezas,
                confianza,
                evidencia,
                estado: estadoFinal,
                candidatos: emparejamiento.candidatos
            });
        }

        const propuestaCompleta = {
            tipo_foto: visionResult.tipo_foto || 'otro',
            items: itemsValidados,
            advertencias
        };

        // Guardar en tabla analisis_ia
        const idUsuario = req.usuario.id_usuario;
        const insertResult = await pool.query(
            `INSERT INTO analisis_ia (
                id_usuario, modo, estado, resultado, imagenes, modelo, tokens_entrada, tokens_salida
            ) VALUES ($1, $2, 'pendiente', $3, $4, $5, $6, $7) RETURNING id_analisis, creado_en`,
            [
                idUsuario,
                modo,
                JSON.stringify(propuestaCompleta),
                JSON.stringify(nombresArchivosGuardados),
                visionResult.modelo,
                visionResult.tokens_entrada,
                visionResult.tokens_salida
            ]
        );

        const idAnalisis = insertResult.rows[0].id_analisis;

        res.status(201).json({
            id_analisis: idAnalisis,
            tipo_foto: propuestaCompleta.tipo_foto,
            items: itemsValidados,
            advertencias
        });

    } catch (err) {
        console.error('Error en /api/inventario/ia/analizar:', err);
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Error interno al procesar el análisis de imágenes' });
    }
};

/**
 * GET /api/inventario/ia/:id
 * Retorna propuesta pendiente (solo creador o Administrador)
 */
const getById = async (req, res) => {
    try {
        const idAnalisis = Number(req.params.id);
        if (!Number.isInteger(idAnalisis) || idAnalisis <= 0) {
            return res.status(400).json({ error: 'ID de análisis inválido' });
        }

        const result = await pool.query(
            'SELECT * FROM analisis_ia WHERE id_analisis = $1',
            [idAnalisis]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Análisis no encontrado' });
        }

        const analisis = result.rows[0];

        // Verificar permisos: Creador o Administrador
        const esCreador = analisis.id_usuario === req.usuario.id_usuario;
        const esAdmin = req.usuario.rol === 'Administrador';

        if (!esCreador && !esAdmin) {
            return res.status(403).json({ error: 'Acceso denegado a este análisis' });
        }

        res.json(analisis);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/**
 * POST /api/inventario/ia/:id/confirmar
 * Transacción estilo addRepuesto:
 * 1. BEGIN; UPDATE analisis_ia ... WHERE id_analisis=$1 AND estado='pendiente'
 * 2. Valida body, unifica filas por id_repuesto
 * 3. Procesa repuestos ordenados por id_repuesto con SELECT ... FOR UPDATE
 * 4. Inserta inventario_movimiento
 * 5. Crea nuevos repuestos si aplica
 * 6. Guarda repuesto_alias
 * 7. COMMIT / ROLLBACK
 */
const confirmar = async (req, res) => {
    const idAnalisis = Number(req.params.id);
    if (!Number.isInteger(idAnalisis) || idAnalisis <= 0) {
        return res.status(400).json({ error: 'ID de análisis inválido' });
    }

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Debes enviar la lista de ítems a confirmar' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Bloquear y verificar estado del análisis
        const analisisCheck = await client.query(
            'SELECT id_usuario, estado FROM analisis_ia WHERE id_analisis = $1 FOR UPDATE',
            [idAnalisis]
        );

        if (analisisCheck.rows.length === 0) {
            throw new ErrorNegocio(404, 'Análisis no encontrado');
        }

        const analisisRow = analisisCheck.rows[0];

        // Solo creador o Administrador
        const esCreador = analisisRow.id_usuario === req.usuario.id_usuario;
        const esAdmin = req.usuario.rol === 'Administrador';
        if (!esCreador && !esAdmin) {
            throw new ErrorNegocio(403, 'Acceso denegado: solo el creador o un Administrador puede confirmar este análisis');
        }

        const updateAnalisis = await client.query(
            `UPDATE analisis_ia
             SET estado = 'confirmado', confirmado_en = now()
             WHERE id_analisis = $1 AND estado = 'pendiente'
             RETURNING id_analisis`,
            [idAnalisis]
        );

        if (updateAnalisis.rows.length === 0) {
            throw new ErrorNegocio(409, 'El análisis ya fue confirmado o descartado previamente');
        }

        // 2. Validar body y clasificar acciones
        const mapaActualizar = new Map(); // id_repuesto -> { cantidad, aliasTextos }
        const listaCrear = [];             // [{ nuevo, cantidad, aliasTexto }]
        const aliasesParaGuardar = [];     // [{ texto, id_repuesto }]

        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const accion = it.accion;

            if (!['actualizar', 'crear', 'ignorar'].includes(accion)) {
                throw new ErrorNegocio(400, `Ítem #${i}: acción inválida "${accion}" (debe ser actualizar, crear o ignorar)`);
            }

            if (accion === 'ignorar') continue;

            const cantidad = parseInt(it.cantidad, 10);
            if (isNaN(cantidad) || cantidad < 1 || cantidad > 10000) {
                throw new ErrorNegocio(400, `Ítem #${i}: la cantidad debe ser un entero entre 1 y 10000`);
            }

            const aliasTexto = it.descripcion_detectada || it.nuevo?.nombre || '';

            if (accion === 'actualizar') {
                const idRepuesto = Number(it.id_repuesto);
                if (!Number.isInteger(idRepuesto) || idRepuesto <= 0) {
                    throw new ErrorNegocio(400, `Ítem #${i}: id_repuesto es obligatorio para la acción "actualizar"`);
                }

                if (mapaActualizar.has(idRepuesto)) {
                    const prev = mapaActualizar.get(idRepuesto);
                    prev.cantidad += cantidad;
                    if (aliasTexto) prev.aliasTextos.push(aliasTexto);
                } else {
                    mapaActualizar.set(idRepuesto, {
                        id_repuesto: idRepuesto,
                        cantidad,
                        aliasTextos: aliasTexto ? [aliasTexto] : []
                    });
                }
            } else if (accion === 'crear') {
                const nuevo = it.nuevo;
                if (!nuevo || typeof nuevo !== 'object') {
                    throw new ErrorNegocio(400, `Ítem #${i}: datos de nuevo repuesto requeridos para la acción "crear"`);
                }

                const nombre = nuevo.nombre ? String(nuevo.nombre).trim() : '';
                const precio = parseFloat(nuevo.precio);

                if (!nombre) {
                    throw new ErrorNegocio(400, `Ítem #${i}: el nombre del nuevo repuesto es obligatorio`);
                }
                if (isNaN(precio) || precio <= 0) {
                    throw new ErrorNegocio(400, `Ítem #${i}: el precio del nuevo repuesto debe ser mayor a cero`);
                }

                listaCrear.push({
                    nombre,
                    marca: nuevo.marca ? String(nuevo.marca).trim() : null,
                    precio,
                    referencia: nuevo.referencia ? String(nuevo.referencia).trim() : null,
                    codigo_barras: nuevo.codigo_barras ? String(nuevo.codigo_barras).trim() : null,
                    cantidad,
                    aliasTexto: aliasTexto || nombre
                });
            }
        }

        let totalActualizados = 0;
        let totalCreados = 0;
        const movimientosGenerados = [];

        // 3. Procesar repuestos existentes ordenados por id_repuesto con SELECT ... FOR UPDATE (previene deadlocks)
        const idsOrdenados = Array.from(mapaActualizar.keys()).sort((a, b) => a - b);

        for (const idRep of idsOrdenados) {
            const dataAct = mapaActualizar.get(idRep);

            const repRow = await client.query(
                'SELECT id_repuesto, nombre, stock FROM inventario WHERE id_repuesto = $1 FOR UPDATE',
                [idRep]
            );

            if (repRow.rows.length === 0) {
                throw new ErrorNegocio(404, `Repuesto ID ${idRep} no existe en inventario`);
            }

            const stockAnterior = repRow.rows[0].stock;
            const stockNuevo = stockAnterior + dataAct.cantidad;

            await client.query(
                'UPDATE inventario SET stock = stock + $1 WHERE id_repuesto = $2',
                [dataAct.cantidad, idRep]
            );

            const mov = await client.query(
                `INSERT INTO inventario_movimiento (
                    id_repuesto, tipo, cantidad, stock_anterior, stock_nuevo, origen, id_analisis, id_usuario
                ) VALUES ($1, 'entrada', $2, $3, $4, 'ia', $5, $6) RETURNING id_movimiento`,
                [idRep, dataAct.cantidad, stockAnterior, stockNuevo, idAnalisis, req.usuario.id_usuario]
            );

            totalActualizados++;
            movimientosGenerados.push(mov.rows[0].id_movimiento);

            for (const t of dataAct.aliasTextos) {
                aliasesParaGuardar.push({ texto: t, id_repuesto: idRep });
            }
        }

        // 4. Procesar repuestos a crear
        for (const nuevoRep of listaCrear) {
            const insertRep = await client.query(
                `INSERT INTO inventario (nombre, marca, precio, stock, referencia, codigo_barras)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_repuesto`,
                [
                    nuevoRep.nombre,
                    nuevoRep.marca,
                    nuevoRep.precio,
                    nuevoRep.cantidad,
                    nuevoRep.referencia,
                    nuevoRep.codigo_barras
                ]
            );

            const idNuevo = insertRep.rows[0].id_repuesto;

            const mov = await client.query(
                `INSERT INTO inventario_movimiento (
                    id_repuesto, tipo, cantidad, stock_anterior, stock_nuevo, origen, id_analisis, id_usuario
                ) VALUES ($1, 'entrada', $2, 0, $2, 'ia', $3, $4) RETURNING id_movimiento`,
                [idNuevo, nuevoRep.cantidad, idAnalisis, req.usuario.id_usuario]
            );

            totalCreados++;
            movimientosGenerados.push(mov.rows[0].id_movimiento);

            if (nuevoRep.aliasTexto) {
                aliasesParaGuardar.push({ texto: nuevoRep.aliasTexto, id_repuesto: idNuevo });
            }
        }

        // 5. Guardar alias normalizados en repuesto_alias
        for (const al of aliasesParaGuardar) {
            const aliasNorm = normalizarAlias(al.texto);
            if (aliasNorm && aliasNorm.length >= 3) {
                await client.query(
                    `INSERT INTO repuesto_alias (alias_normalizado, id_repuesto)
                     VALUES ($1, $2)
                     ON CONFLICT (alias_normalizado) DO UPDATE SET id_repuesto = EXCLUDED.id_repuesto`,
                    [aliasNorm, al.id_repuesto]
                );
            }
        }

        await client.query('COMMIT');

        res.json({
            mensaje: 'Inventario actualizado correctamente',
            actualizados: totalActualizados,
            creados: totalCreados,
            movimientos: movimientosGenerados.length
        });

    } catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        if (err instanceof ErrorNegocio) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error('Error al confirmar análisis IA:', err);
        res.status(500).json({ error: err.message || 'Error interno al confirmar análisis' });
    } finally {
        client.release();
    }
};

/**
 * POST /api/inventario/ia/:id/descartar
 */
const descartar = async (req, res) => {
    try {
        const idAnalisis = Number(req.params.id);
        if (!Number.isInteger(idAnalisis) || idAnalisis <= 0) {
            return res.status(400).json({ error: 'ID de análisis inválido' });
        }

        const check = await pool.query(
            'SELECT id_usuario, estado FROM analisis_ia WHERE id_analisis = $1',
            [idAnalisis]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Análisis no encontrado' });
        }

        const row = check.rows[0];
        const esCreador = row.id_usuario === req.usuario.id_usuario;
        const esAdmin = req.usuario.rol === 'Administrador';

        if (!esCreador && !esAdmin) {
            return res.status(403).json({ error: 'Acceso denegado: no puedes descartar este análisis' });
        }

        if (row.estado !== 'pendiente') {
            return res.status(409).json({ error: `El análisis ya se encuentra ${row.estado}` });
        }

        await pool.query(
            "UPDATE analisis_ia SET estado = 'descartado' WHERE id_analisis = $1",
            [idAnalisis]
        );

        res.json({ mensaje: 'Análisis descartado correctamente' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    getEstado,
    analizar,
    getById,
    confirmar,
    descartar,
    setVisionProvider,
    getVisionProvider,
    detectarMagicBytes,
    ErrorNegocio
};
