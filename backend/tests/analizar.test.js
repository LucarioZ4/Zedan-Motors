process.env.JWT_SECRET = 'test_super_secret_jwt_key_zedan_2026_change_me_32chars';
const jwt = require('jsonwebtoken');

// Mock centralizado de pg.Pool
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
const { setVisionProvider } = require('../src/modules/inventario-ia/inventarioIa.controller');
const MockProvider = require('../src/modules/inventario-ia/mockProvider');

describe('Endpoint POST /api/inventario/ia/analizar', () => {
    const tokenAdmin = jwt.sign(
        { id_usuario: 1, usuario: 'admin', rol: 'Administrador' },
        process.env.JWT_SECRET
    );
    const tokenMecanico = jwt.sign(
        { id_usuario: 2, usuario: 'mecanico', rol: 'Mecánico' },
        process.env.JWT_SECRET
    );

    // Buffers válidos con magic bytes reales
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

    beforeEach(() => {
        jest.clearAllMocks();
        mockQuery.mockResolvedValue({ rows: [] });
    });

    test('401 sin token de autenticación', async () => {
        const res = await request(app)
            .post('/api/inventario/ia/analizar');
        expect(res.status).toBe(401);
    });

    test('403 para rol no autorizado (Mecánico)', async () => {
        const res = await request(app)
            .post('/api/inventario/ia/analizar')
            .set('Authorization', `Bearer ${tokenMecanico}`);
        expect(res.status).toBe(403);
    });

    test('400 sin imágenes adjuntas', async () => {
        const mockProv = new MockProvider();
        setVisionProvider(mockProv);

        const res = await request(app)
            .post('/api/inventario/ia/analizar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .field('modo', 'entrada');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Debes subir al menos una imagen/i);
    });

    test('400 tipo de archivo falso (extensión .jpg con contenido de texto plano)', async () => {
        const mockProv = new MockProvider();
        setVisionProvider(mockProv);

        const fakeJpgBuffer = Buffer.from('Esto es un archivo de texto haciéndose pasar por JPG');

        const res = await request(app)
            .post('/api/inventario/ia/analizar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagenes', fakeJpgBuffer, 'foto_falsa.jpg')
            .field('modo', 'entrada');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/no es una imagen válida/i);
    });

    test('413 archivo que supera el tamaño máximo permitido', async () => {
        const mockProv = new MockProvider();
        setVisionProvider(mockProv);

        // Buffer de 6 MB (límite default 5 MB)
        const hugeBuffer = Buffer.alloc(6 * 1024 * 1024, 0xff);
        hugeBuffer[0] = 0xff;
        hugeBuffer[1] = 0xd8;
        hugeBuffer[2] = 0xff;

        const res = await request(app)
            .post('/api/inventario/ia/analizar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagenes', hugeBuffer, 'enorme.jpg');

        expect(res.status).toBe(413);
        expect(res.body.error).toMatch(/supera el tamaño máximo/i);
    });

    test('503 si la función de IA está deshabilitada (proveedor null)', async () => {
        setVisionProvider(null);

        const res = await request(app)
            .post('/api/inventario/ia/analizar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagenes', validJpeg, 'repuesto.jpg');

        expect(res.status).toBe(503);
        expect(res.body.error).toMatch(/deshabilitada/i);
    });

    test('201 éxito: descarta ítems inválidos y aplica regla de enumeración (piezas != cantidad -> revisar)', async () => {
        const mockProv = new MockProvider({
            tipo_foto: 'productos',
            items: [
                {
                    descripcion: 'Filtro de Aceite Válido',
                    categoria: 'Filtros',
                    marca: 'Fram',
                    cantidad: 3,
                    piezas_enumeradas: [
                        { posicion: 'izq', nota: 'caja 1' } // Solo 1 pieza pero cantidad 3 -> discrepancia
                    ],
                    confianza: 0.95,
                    evidencia: 'Cajas en mesa'
                },
                {
                    descripcion: 'Ítem Inválido',
                    categoria: 'Varios',
                    cantidad: -5, // Cantidad inválida -> debe descartarse
                    piezas_enumeradas: [],
                    confianza: 0.9,
                    evidencia: 'ninguna'
                }
            ],
            advertencias: ['Foto con sombra']
        });

        setVisionProvider(mockProv);

        // Mock de inventario y análisis
        mockQuery.mockImplementation((sql) => {
            if (sql.includes('SELECT id_repuesto, nombre')) {
                return Promise.resolve({
                    rows: [
                        { id_repuesto: 10, nombre: 'Filtro de Aceite Fram', marca: 'Fram', referencia: 'PH-1' }
                    ]
                });
            }
            if (sql.includes('SELECT alias_normalizado')) {
                return Promise.resolve({ rows: [] });
            }
            if (sql.includes('INSERT INTO analisis_ia')) {
                return Promise.resolve({ rows: [{ id_analisis: 88, creado_en: new Date() }] });
            }
            return Promise.resolve({ rows: [] });
        });

        const res = await request(app)
            .post('/api/inventario/ia/analizar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagenes', validPng, 'foto.png')
            .field('modo', 'entrada');

        expect(res.status).toBe(201);
        expect(res.body.id_analisis).toBe(88);
        expect(res.body.items.length).toBe(1); // El ítem con cantidad -5 fue descartado
        expect(res.body.items[0].estado).toBe('revisar'); // Por discrepancia de piezas != cantidad
        expect(res.body.items[0].confianza).toBeLessThanOrEqual(0.5);
        expect(res.body.advertencias.some(a => a.includes('descartado') || a.includes('no coincide'))).toBe(true);
    });

    test('Rate limit devuelve 429 si se supera el límite de análisis por hora', async () => {
        const mockProv = new MockProvider();
        setVisionProvider(mockProv);

        mockQuery.mockImplementation((sql) => {
            if (sql.includes('SELECT id_repuesto, nombre')) {
                return Promise.resolve({ rows: [] });
            }
            if (sql.includes('SELECT alias_normalizado')) {
                return Promise.resolve({ rows: [] });
            }
            if (sql.includes('INSERT INTO analisis_ia')) {
                return Promise.resolve({ rows: [{ id_analisis: 999, creado_en: new Date() }] });
            }
            return Promise.resolve({ rows: [] });
        });

        // Simulamos peticiones rápidas con un token único de usuario
        const tokenUsuarioSpam = jwt.sign(
            { id_usuario: 9999, usuario: 'spam', rol: 'Administrador' },
            process.env.JWT_SECRET
        );

        let ultimoStatus = 201;
        // Hacemos 22 peticiones (límite default es 20)
        for (let i = 0; i < 22; i++) {
            const r = await request(app)
                .post('/api/inventario/ia/analizar')
                .set('Authorization', `Bearer ${tokenUsuarioSpam}`)
                .attach('imagenes', validJpeg, 'rep.jpg');
            ultimoStatus = r.status;
            if (r.status === 429) break;
        }

        expect(ultimoStatus).toBe(429);
    });
});
