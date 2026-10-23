const pool = require('../../config/database');

/**
 * Obtener todos los mensajes de clientes (WhatsApp / Telegram) con datos de orden y cliente
 */
const getMensajes = async (req, res) => {
    try {
        const query = `
            SELECT 
                m.id_mensaje,
                m.id_orden,
                m.numero_cliente,
                m.plataforma,
                m.tipo_mensaje,
                m.mensaje,
                m.fecha,
                c.nombre AS cliente_nombre,
                c.apellido AS cliente_apellido,
                v.placa,
                v.marca,
                v.modelo
            FROM mensajes_cliente m
            LEFT JOIN orden_trabajo o ON m.id_orden = o.id_orden
            LEFT JOIN cita ci ON o.id_cita = ci.id_cita
            LEFT JOIN cliente c ON ci.id_cliente = c.id_cliente
            LEFT JOIN vehiculo v ON ci.id_vehiculo = v.id_vehiculo
            ORDER BY m.fecha DESC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.status(500).json({ error: 'Error al obtener mensajes de clientes' });
    }
};

/**
 * Registrar un nuevo mensaje de cliente / notificación
 */
const createMensaje = async (req, res) => {
    const { id_orden, numero_cliente, plataforma, tipo_mensaje, mensaje } = req.body;

    if (!id_orden || !numero_cliente || !plataforma || !tipo_mensaje || !mensaje) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        const query = `
            INSERT INTO mensajes_cliente (id_orden, numero_cliente, plataforma, tipo_mensaje, mensaje, fecha)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const { rows } = await pool.query(query, [id_orden, numero_cliente, plataforma, tipo_mensaje, mensaje]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error al registrar mensaje:', error);
        res.status(500).json({ error: 'Error al registrar mensaje' });
    }
};

module.exports = {
    getMensajes,
    createMensaje
};
