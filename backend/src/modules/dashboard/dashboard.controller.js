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
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
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
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ─────────────────────────────────────────────────────────────
// Datos para las gráficas del dashboard (Recharts)
// ─────────────────────────────────────────────────────────────
const getGraficas = async (req, res) => {
    try {
        const [ingresos, citasPorEstado, topServicios, stockCritico] = await Promise.all([
            // Ingresos de los últimos 6 meses (incluye meses en 0)
            pool.query(`
                SELECT
                    TO_CHAR(m.mes, 'YYYY-MM') AS periodo,
                    COALESCE(SUM(f.total), 0)::float AS total
                FROM generate_series(
                    date_trunc('month', CURRENT_DATE)::timestamp - INTERVAL '5 months',
                    date_trunc('month', CURRENT_DATE)::timestamp,
                    INTERVAL '1 month'
                ) AS m(mes)
                LEFT JOIN facturacion f
                    ON date_trunc('month', f.fecha::timestamp) = m.mes
                GROUP BY m.mes
                ORDER BY m.mes
            `),

            // Cantidad de citas por estado (incluye estados en 0)
            pool.query(`
                SELECT
                    e.nombre_estado AS estado,
                    COUNT(c.id_cita)::int AS total
                FROM estado e
                LEFT JOIN cita c ON c.id_estado = e.id_estado
                GROUP BY e.id_estado, e.nombre_estado
                ORDER BY e.id_estado
            `),

            // Top 5 servicios más solicitados en órdenes de trabajo
            pool.query(`
                SELECT
                    s.nombre_servicio AS nombre,
                    COUNT(*)::int AS total
                FROM orden_servicio os
                INNER JOIN servicio s ON s.id_servicio = os.id_servicio
                GROUP BY s.id_servicio, s.nombre_servicio
                ORDER BY total DESC, s.nombre_servicio
                LIMIT 5
            `),

            // Repuestos con stock crítico (mismo umbral que el KPI: < 5)
            pool.query(`
                SELECT nombre, marca, stock
                FROM inventario
                WHERE stock < 5
                ORDER BY stock ASC, nombre ASC
                LIMIT 6
            `)
        ]);

        res.json({
            ingresos:       ingresos.rows,
            citasPorEstado: citasPorEstado.rows,
            topServicios:   topServicios.rows,
            stockCritico:   stockCritico.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { getKPIs, getCitasHoy, getGraficas };