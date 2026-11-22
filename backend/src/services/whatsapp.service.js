const pool = require('../config/database');
const env = require('../config/env');

/**
 * Normaliza un número de teléfono para WhatsApp (formato internacional con @c.us).
 * Por defecto adapta números colombianos de 10 dígitos (ej: 3101234567 -> 573101234567@c.us).
 */
const normalizarTelefono = (telefonoRaw) => {
    if (!telefonoRaw) return { error: 'El cliente no tiene un teléfono registrado' };

    let clean = String(telefonoRaw).replace(/\D/g, '');
    clean = clean.replace(/^00+/, ''); // Quitar prefijos 00 si existen

    if (clean.length === 10) {
        clean = `57${clean}`;
    } else if (clean.length === 12 && clean.startsWith('57')) {
        // Formato Colombia completo
    } else if (clean.length >= 8 && clean.length <= 15) {
        // Formato internacional general
    } else {
        return { error: `Teléfono inválido (${telefonoRaw})` };
    }

    return {
        telefono: clean,
        chatId: `${clean}@c.us`
    };
};

/**
 * Registra un mensaje en la tabla mensajes_cliente para auditoría y visualización.
 */
const registrarEnBd = async ({ idOrden = null, telefono, mensaje, tipo = 'Notificacion' }) => {
    try {
        await pool.query(
            `INSERT INTO mensajes_cliente (id_orden, numero_cliente, plataforma, tipo_mensaje, mensaje, fecha)
             VALUES ($1, $2, 'WhatsApp', $3, $4, CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')`,
            [idOrden, telefono, tipo, mensaje]
        );
    } catch (err) {
        console.warn('[WhatsApp] No se pudo guardar en mensajes_cliente:', err.message);
    }
};

/**
 * Envía un mensaje de texto por WhatsApp mediante el webhook de n8n.
 * Es tolerante a fallos: no interrumpe el flujo principal si n8n no está disponible.
 */
const enviarMensajeTexto = async ({ telefono, mensaje, idOrden = null, evento = 'general' }) => {
    const norm = normalizarTelefono(telefono);
    if (norm.error) {
        console.warn(`[WhatsApp] No se envió mensaje (${evento}): ${norm.error}`);
        return { ok: false, error: norm.error };
    }

    // Registrar en BD para que aparezca en el módulo de Mensajes
    await registrarEnBd({ idOrden, telefono: norm.telefono, mensaje });

    const webhookUrl = env.n8n?.webhookUrl || process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn('[WhatsApp] Webhook de n8n no configurado (N8N_WEBHOOK_URL). Mensaje registrado en BD pero no enviado a red.');
        return { ok: false, error: 'N8N_WEBHOOK_URL no configurado' };
    }

    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    };
    const webhookToken = env.n8n?.webhookToken || process.env.N8N_WEBHOOK_TOKEN;
    if (webhookToken) {
        headers['x-api-key'] = webhookToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        const payload = {
            chatId: norm.chatId,
            phone: norm.telefono,
            message: mensaje,
            caption: mensaje,
            text: mensaje,
            evento,
            id_orden: idOrden
        };

        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
            console.log(`[WhatsApp] Mensaje enviado con éxito a ${norm.chatId} [Evento: ${evento}]`);
            return { ok: true };
        }

        console.warn(`[WhatsApp] Webhook n8n respondió con status ${res.status} [Evento: ${evento}]`);
        return { ok: false, status: res.status };
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn(`[WhatsApp] Error al conectar con n8n (${evento}):`, err.message);
        return { ok: false, error: err.message };
    }
};

/* ──────────────────────────────────────────────────────────────────────────
   NOTIFICACIONES AUTOMÁTICAS POR EVENTO
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Evento: Cita agendada (creación)
 */
const notificarCitaAgendada = async (cita) => {
    if (!cita || !cita.telefono) return;
    const fechaFmt = cita.fecha ? new Date(cita.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pronto';
    const horaFmt = cita.hora || 'Por confirmar';

    const mensaje = `🚗 *ZEDAN MOTORS — Cita Agendada* 🚗\n\n` +
        `Hola *${cita.cliente || 'Estimado cliente'}*, tu cita en nuestro taller ha sido agendada con éxito:\n\n` +
        `📅 *Fecha:* ${fechaFmt}\n` +
        `⏰ *Hora:* ${horaFmt}\n` +
        `🚘 *Vehículo:* ${cita.vehiculo || 'No especificado'}\n` +
        `🔧 *Motivo:* ${cita.motivo || 'Revisión técnica'}\n\n` +
        `📍 Te esperamos en nuestras instalaciones. Si deseas reprogramar, por favor contáctanos con anticipación. ¡Gracias por confiar en nosotros!`;

    return enviarMensajeTexto({
        telefono: cita.telefono,
        mensaje,
        evento: 'cita_agendada'
    });
};

/**
 * Evento: Cambio de estado de la Cita (Confirmada, En proceso, Completada, Cancelada)
 */
const notificarCitaCambioEstado = async (cita, estadoNuevo) => {
    if (!cita || !cita.telefono || !estadoNuevo) return;
    const fechaFmt = cita.fecha ? new Date(cita.fecha).toLocaleDateString('es-CO') : '';

    let encabezado = `🔔 *ZEDAN MOTORS — Actualización de Cita*`;
    let cuerpo = `Hola *${cita.cliente || 'Estimado cliente'}*, te informamos que tu cita para el vehículo *${cita.vehiculo || ''}* ha cambiado a estado: *${estadoNuevo.toUpperCase()}*.`;

    if (estadoNuevo.toLowerCase() === 'confirmada') {
        encabezado = `✅ *ZEDAN MOTORS — Cita Confirmada*`;
        cuerpo = `Hola *${cita.cliente || 'Estimado cliente'}*, tu cita del día *${fechaFmt}* a las *${cita.hora || ''}* ha sido *CONFIRMADA*. Nuestro equipo estará listo para recibir tu vehículo *${cita.vehiculo || ''}*.`;
    } else if (estadoNuevo.toLowerCase() === 'cancelada') {
        encabezado = `❌ *ZEDAN MOTORS — Cita Cancelada*`;
        cuerpo = `Hola *${cita.cliente || 'Estimado cliente'}*, te notificamos que tu cita para el vehículo *${cita.vehiculo || ''}* ha sido cancelada. Si necesitas una nueva fecha, estamos a tu disposición.`;
    }

    const mensaje = `${encabezado}\n\n${cuerpo}\n\n📍 Zedan Motors — Pasión por la precisión automotriz.`;

    return enviarMensajeTexto({
        telefono: cita.telefono,
        mensaje,
        evento: `cita_estado_${estadoNuevo.toLowerCase()}`
    });
};

/**
 * Evento: Creación de Orden de Trabajo (asignación a técnico)
 */
const notificarOrdenCreada = async (orden) => {
    if (!orden || !orden.telefono) return;
    const fechaInicio = orden.fecha_inicio ? new Date(orden.fecha_inicio).toLocaleDateString('es-CO') : 'Inmediata';

    const mensaje = `🛠️ *ZEDAN MOTORS — Orden de Trabajo Iniciada* 🛠️\n\n` +
        `Hola *${orden.cliente || 'Estimado cliente'}*, se ha generado la orden de trabajo *#${orden.id_orden}* para tu vehículo:\n\n` +
        `🚘 *Vehículo:* ${orden.vehiculo || 'No registrado'}\n` +
        `👨‍🔧 *Mecánico a cargo:* ${orden.empleado || 'Técnico asignado'}\n` +
        `📅 *Fecha de inicio:* ${fechaInicio}\n` +
        (orden.observaciones ? `📝 *Observaciones:* ${orden.observaciones}\n` : '') +
        `\nTe mantendremos al tanto del progreso de tu vehículo paso a paso. 🔧`;

    return enviarMensajeTexto({
        telefono: orden.telefono,
        mensaje,
        idOrden: orden.id_orden,
        evento: 'orden_creada'
    });
};

/**
 * Evento: Cambio de estado de la Orden de Trabajo (Pendiente, En proceso, Completada / Finalizado)
 */
const notificarOrdenCambioEstado = async ({ cliente, telefono, vehiculo, idOrden, estadoNuevo }) => {
    if (!telefono || !estadoNuevo) return;
    const est = String(estadoNuevo).trim().toLowerCase();

    let mensaje = '';
    if (est === 'en proceso') {
        mensaje = `⚙️ *ZEDAN MOTORS — Vehículo En Proceso* ⚙️\n\n` +
            `Hola *${cliente || 'Estimado cliente'}*, te informamos que tu vehículo *${vehiculo || ''}* (Orden #${idOrden}) ya ingresó a la bahía de servicio y se encuentra *EN PROCESO* de mantenimiento técnico. 🔧\n\n` +
            `Nuestros mecánicos están trabajando en él con el mayor cuidado y profesionalismo.`;
    } else if (est === 'completada' || est === 'finalizado' || est === 'finalizada') {
        mensaje = `✅ *ZEDAN MOTORS — ¡Vehículo Listo para Entrega!* 🚗✨\n\n` +
            `Hola *${cliente || 'Estimado cliente'}*, ¡excelentes noticias! Todos los trabajos de la Orden *#${idOrden}* para tu vehículo *${vehiculo || ''}* han sido *FINALIZADOS* con éxito. 🎉\n\n` +
            `Ya puedes acercarte a nuestras instalaciones a retirar tu vehículo.\n` +
            `📍 Dirección: Calle Falsa 123 • Tel: (57) 318 6950825\n\n` +
            `¡Gracias por confiar en Zedan Motors!`;
    } else if (est === 'pendiente') {
        mensaje = `⏳ *ZEDAN MOTORS — Orden en Espera*\n\n` +
            `Hola *${cliente || 'Estimado cliente'}*, la Orden *#${idOrden}* de tu vehículo *${vehiculo || ''}* se encuentra en estado *PENDIENTE* para programación de taller.`;
    } else {
        mensaje = `🔔 *ZEDAN MOTORS — Estado de Orden de Trabajo*\n\n` +
            `Hola *${cliente || 'Estimado cliente'}*, la Orden *#${idOrden}* para tu vehículo *${vehiculo || ''}* se encuentra en estado: *${estadoNuevo.toUpperCase()}*.`;
    }

    return enviarMensajeTexto({
        telefono,
        mensaje,
        idOrden,
        evento: `orden_estado_${est}`
    });
};

/**
 * Evento: Diagnóstico inicial guardado
 */
const notificarDiagnosticoGuardado = async ({ idDiagnostico, cliente, telefono, vehiculo, kilometraje, estado }) => {
    if (!telefono) return;
    const kmFmt = kilometraje ? `${Number(kilometraje).toLocaleString('es-CO')} km` : 'No registrado';

    const mensaje = `📋 *ZEDAN MOTORS — Recepción y Diagnóstico Registrado* 📋\n\n` +
        `Hola *${cliente || 'Estimado cliente'}*, se ha completado el inventario y recepción técnica inicial de tu vehículo:\n\n` +
        `🚘 *Vehículo:* ${vehiculo || 'No registrado'}\n` +
        `📟 *Kilometraje de ingreso:* ${kmFmt}\n` +
        `📋 *Diagnóstico:* #${idDiagnostico} (Estado: ${estado || 'En proceso'})\n\n` +
        `Puedes consultar con nosotros cualquier duda sobre el estado de recepción de tu auto. 🔍`;

    return enviarMensajeTexto({
        telefono,
        mensaje,
        evento: 'diagnostico_guardado'
    });
};

module.exports = {
    normalizarTelefono,
    enviarMensajeTexto,
    notificarCitaAgendada,
    notificarCitaCambioEstado,
    notificarOrdenCreada,
    notificarOrdenCambioEstado,
    notificarDiagnosticoGuardado
};
