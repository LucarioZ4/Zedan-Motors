process.env.JWT_SECRET = 'test_super_secret_jwt_key_zedan_2026_change_me_32chars';
const jwt = require('jsonwebtoken');

const mockQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();

const mockClient = {
    query: mockClientQuery,
    release: mockClientRelease
};

const mockConnect = jest.fn().mockImplementation((cb) => {
    if (cb) cb(null, mockClient, mockClientRelease);
    return Promise.resolve(mockClient);
});

jest.mock('../src/config/database', () => ({
    query: mockQuery,
    connect: mockConnect
}));

const request = require('supertest');
const app = require('../src/app');

describe('Endpoint POST /api/inventario/ia/:id/confirmar', () => {
    const tokenAdmin = jwt.sign(
        { id_usuario: 1, usuario: 'admin', rol: 'Administrador' },
        process.env.JWT_SECRET
    );
    const tokenJefe = jwt.sign(
        { id_usuario: 2, usuario: 'jefe', rol: 'Jefe de taller' },
        process.env.JWT_SECRET
    );
    const tokenOtroJefe = jwt.sign(
        { id_usuario: 3, usuario: 'otro_jefe', rol: 'Jefe de taller' },
        process.env.JWT_SECRET
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('suma el stock, crea movimientos y guarda alias; unifica duplicados', async () => {
        // Simular análisis pendiente creado por usuario 2 (Jefe)
        mockClientQuery.mockImplementation((sql, params) => {
            if (sql.includes('SELECT id_usuario, estado FROM analisis_ia')) {
                return Promise.resolve({
                    rows: [{ id_usuario: 2, estado: 'pendiente' }]
                });
            }
            if (sql.includes('UPDATE analisis_ia')) {
                return Promise.resolve({ rows: [{ id_analisis: 10 }] });
            }
            if (sql.includes('SELECT id_repuesto, nombre, stock FROM inventario WHERE id_repuesto = $1 FOR UPDATE')) {
                return Promise.resolve({
                    rows: [{ id_repuesto: params[0], nombre: 'Filtro Fram', stock: 15 }]
                });
            }
            if (sql.includes('UPDATE inventario SET stock = stock + $1')) {
                return Promise.resolve({ rowCount: 1 });
            }
            if (sql.includes('INSERT INTO inventario_movimiento')) {
                return Promise.resolve({ rows: [{ id_movimiento: 101 }] });
            }
            if (sql.includes('INSERT INTO repuesto_alias')) {
                return Promise.resolve({ rowCount: 1 });
            }
            return Promise.resolve({ rows: [] });
        });

        // Enviamos dos ítems apuntando al mismo id_repuesto (1) con cantidades 4 y 6 -> debe unificar a 10
        // y un ítem con accion 'ignorar'
        const payload = {
            items: [
                {
                    indice: 0,
                    accion: 'actualizar',
                    id_repuesto: 1,
                    cantidad: 4,
                    descripcion_detectada: 'Filtro aceite fram ph3593a'
                },
                {
                    indice: 1,
                    accion: 'actualizar',
                    id_repuesto: 1,
                    cantidad: 6,
                    descripcion_detectada: 'Filtro aceite fram'
                },
                {
                    indice: 2,
                    accion: 'ignorar',
                    cantidad: 1
                }
            ]
        };

        const res = await request(app)
            .post('/api/inventario/ia/10/confirmar')
            .set('Authorization', `Bearer ${tokenJefe}`)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.actualizados).toBe(1);
        expect(res.body.movimientos).toBe(1);

        // Verificar que inventario fue sumado con cantidad 10 (4 + 6)
        const updateCall = mockClientQuery.mock.calls.find(c => c[0].includes('UPDATE inventario SET stock = stock + $1'));
        expect(updateCall).toBeDefined();
        expect(updateCall[1][0]).toBe(10); // Unificado
        expect(updateCall[1][1]).toBe(1);
    });

    test('crea repuesto nuevo si accion es "crear"', async () => {
        mockClientQuery.mockImplementation((sql, params) => {
            if (sql.includes('SELECT id_usuario, estado FROM analisis_ia')) {
                return Promise.resolve({
                    rows: [{ id_usuario: 1, estado: 'pendiente' }]
                });
            }
            if (sql.includes('UPDATE analisis_ia')) {
                return Promise.resolve({ rows: [{ id_analisis: 25 }] });
            }
            if (sql.includes('INSERT INTO inventario (nombre, marca')) {
                return Promise.resolve({ rows: [{ id_repuesto: 80 }] });
            }
            if (sql.includes('INSERT INTO inventario_movimiento')) {
                return Promise.resolve({ rows: [{ id_movimiento: 202 }] });
            }
            return Promise.resolve({ rows: [] });
        });

        const payload = {
            items: [
                {
                    indice: 0,
                    accion: 'crear',
                    cantidad: 5,
                    nuevo: {
                        nombre: 'Amortiguador Delantero Gas',
                        marca: 'Monroe',
                        precio: 85.50,
                        referencia: 'MNR-100',
                        codigo_barras: '1122334455'
                    }
                }
            ]
        };

        const res = await request(app)
            .post('/api/inventario/ia/25/confirmar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.creados).toBe(1);
        expect(res.body.movimientos).toBe(1);
    });

    test('doble confirmación produce 409 (ya confirmado)', async () => {
        mockClientQuery.mockImplementation((sql) => {
            if (sql.includes('SELECT id_usuario, estado FROM analisis_ia')) {
                return Promise.resolve({
                    rows: [{ id_usuario: 1, estado: 'confirmado' }]
                });
            }
            if (sql.includes('UPDATE analisis_ia')) {
                return Promise.resolve({ rows: [] }); // Ya no está pendiente
            }
            return Promise.resolve({ rows: [] });
        });

        const payload = {
            items: [
                { indice: 0, accion: 'actualizar', id_repuesto: 1, cantidad: 2 }
            ]
        };

        const res = await request(app)
            .post('/api/inventario/ia/30/confirmar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/ya fue confirmado/i);
    });

    test('cantidad inválida devuelve 400', async () => {
        mockClientQuery.mockImplementation((sql) => {
            if (sql.includes('SELECT id_usuario, estado FROM analisis_ia')) {
                return Promise.resolve({
                    rows: [{ id_usuario: 1, estado: 'pendiente' }]
                });
            }
            if (sql.includes('UPDATE analisis_ia')) {
                return Promise.resolve({ rows: [{ id_analisis: 35 }] });
            }
            return Promise.resolve({ rows: [] });
        });

        const payload = {
            items: [
                { indice: 0, accion: 'actualizar', id_repuesto: 1, cantidad: -10 }
            ]
        };

        const res = await request(app)
            .post('/api/inventario/ia/35/confirmar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/cantidad debe ser un entero/i);
    });

    test('no confirma análisis de otro usuario (salvo que sea Administrador)', async () => {
        mockClientQuery.mockImplementation((sql) => {
            if (sql.includes('SELECT id_usuario, estado FROM analisis_ia')) {
                // Análisis creado por usuario 2 (jefe)
                return Promise.resolve({
                    rows: [{ id_usuario: 2, estado: 'pendiente' }]
                });
            }
            return Promise.resolve({ rows: [] });
        });

        const payload = {
            items: [
                { indice: 0, accion: 'actualizar', id_repuesto: 1, cantidad: 2 }
            ]
        };

        // Usuario 3 (otro jefe) intenta confirmar el análisis del usuario 2
        const res = await request(app)
            .post('/api/inventario/ia/40/confirmar')
            .set('Authorization', `Bearer ${tokenOtroJefe}`)
            .send(payload);

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Acceso denegado/i);
    });

    test('ejecuta ROLLBACK ante falla a mitad de la transacción', async () => {
        mockClientQuery.mockImplementation((sql) => {
            if (sql.includes('SELECT id_usuario, estado FROM analisis_ia')) {
                return Promise.resolve({
                    rows: [{ id_usuario: 1, estado: 'pendiente' }]
                });
            }
            if (sql.includes('UPDATE analisis_ia')) {
                return Promise.resolve({ rows: [{ id_analisis: 50 }] });
            }
            if (sql.includes('SELECT id_repuesto, nombre, stock FROM inventario WHERE id_repuesto = $1 FOR UPDATE')) {
                return Promise.resolve({
                    rows: [{ id_repuesto: 1, nombre: 'Filtro', stock: 10 }]
                });
            }
            if (sql.includes('UPDATE inventario SET stock = stock + $1')) {
                return Promise.reject(new Error('Falla forzada de base de datos'));
            }
            return Promise.resolve({ rows: [] });
        });

        const payload = {
            items: [
                { indice: 0, accion: 'actualizar', id_repuesto: 1, cantidad: 5 }
            ]
        };

        const res = await request(app)
            .post('/api/inventario/ia/50/confirmar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(500);
        // Verificar que se llamó a ROLLBACK
        const rollbackLlamado = mockClientQuery.mock.calls.some(c => c[0] === 'ROLLBACK');
        expect(rollbackLlamado).toBe(true);
    });
});
