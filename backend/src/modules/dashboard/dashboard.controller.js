const pool = require('../../config/database');

const getKPIs = async (req, res) => {
    try {
        const clientes  = await pool.query('SELECT COUNT(*) FROM cliente');
        const vehiculos = await pool.query('SELECT COUNT(*) FROM vehiculo');
        const empleados = await pool.query('SELECT COUNT(*) FROM empleado');
        const stockBajo = await pool.query(
            'SELECT COUNT(*) FROM inventario WHERE stock < 5'
        );
        const ordenes = await pool.query(
            `SELECT COUNT(*) FROM orden_trabajo o
             INNER JOIN cita c ON o.id_cita = c.id_cita
             WHERE c.id_estado IN (2,3)`
        );
        const citasHoy = await pool.query(
            `SELECT COUNT(*) FROM cita
             WHERE fecha = CURRENT_DATE
             AND id_estado IN (1,2)`
        );
        const facturasMes = await pool.query(
            `SELECT COUNT(*) FROM facturacion
             WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND   EXTRACT(YEAR  FROM fecha) = EXTRACT(YEAR  FROM CURRENT_DATE)`
        );

        res.json({
            clientes:  parseInt(clientes.rows[0].count),
            vehiculos: parseInt(vehiculos.rows[0].count),
            empleados: parseInt(empleados.rows[0].count),
            stockBajo: parseInt(stockBajo.rows[0].count),
            ordenes:   parseInt(ordenes.rows[0].count),
            citasHoy:  parseInt(citasHoy.rows[0].count),
            facturas:  parseInt(facturasMes.rows[0].count),
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getCitasHoy = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                c.id_cita,
                TO_CHAR(c.hora, 'HH24:MI') AS hora,
                cl.nombre || ' ' || cl.apellido AS cliente,
                v.marca || ' ' || v.modelo || ' - ' || v.placa AS vehiculo,
                e.nombre_estado AS estado
            FROM cita c
            INNER JOIN vehiculo v  ON c.id_vehiculo = v.id_vehiculo
            INNER JOIN cliente cl  ON v.id_cliente  = cl.id_cliente
            INNER JOIN estado e    ON c.id_estado   = e.id_estado
            WHERE c.fecha = CURRENT_DATE
            ORDER BY c.hora ASC
        `);

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getKPIs, getCitasHoy };