process.env.JWT_SECRET = 'test_super_secret_jwt_key_zedan_2026_change_me_32chars';
const jwt = require('jsonwebtoken');

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: mockQuery,
    connect: jest.fn().mockImplementation((cb) => {
        const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
        if (cb) cb(null, client, jest.fn());
        return Promise.resolve(client);
    })
}));

const request = require('supertest');
const app = require('../src/app');
const { ClaudeProvider } = require('../src/modules/inventario-ia/claudeProvider');

describe('Seguridad de credenciales y API Key', () => {
    const SECRET_KEY = 'sk-ant-api03-SECRET_HIGHLY_CONFIDENTIAL_KEY_1234567890';
    const tokenAdmin = jwt.sign(
        { id_usuario: 1, usuario: 'admin', rol: 'Administrador' },
        process.env.JWT_SECRET
    );

    test('la API key de Anthropic nunca aparece en respuestas de error de la API', async () => {
        // Configuramos ClaudeProvider con una API key secreta
        const provider = new ClaudeProvider({
            apiKey: SECRET_KEY,
            modelo: 'claude-sonnet-5-5'
        });

        // Forzar error simulado de Anthropic que intente filtrar la clave en el mensaje
        provider.client = {
            messages: {
                create: jest.fn().mockRejectedValue({
                    status: 401,
                    message: `Invalid request with key ${SECRET_KEY} authorization failed`,
                    code: 'invalid_api_key'
                })
            }
        };

        const { setVisionProvider } = require('../src/modules/inventario-ia/inventarioIa.controller');
        setVisionProvider(provider);

        mockQuery.mockResolvedValue({ rows: [] });

        const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const res = await request(app)
            .post('/api/inventario/ia/analizar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagenes', validJpeg, 'test.jpg')
            .field('modo', 'entrada');

        // La respuesta HTTP no debe contener la clave
        const responseBodyString = JSON.stringify(res.body);
        expect(responseBodyString).not.toContain(SECRET_KEY);

        // Los logs del servidor no deben contener la clave en texto plano
        const consoleCalls = consoleSpy.mock.calls.map(c => JSON.stringify(c)).join(' ');
        expect(consoleCalls).not.toContain(SECRET_KEY);

        consoleSpy.mockRestore();
    });

    test('GET /api/inventario/ia/estado no expone la API key', async () => {
        const res = await request(app)
            .get('/api/inventario/ia/estado')
            .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('habilitado');
        expect(res.body).toHaveProperty('modelo');
        expect(res.body).not.toHaveProperty('apiKey');
        expect(res.body).not.toHaveProperty('key');
        expect(JSON.stringify(res.body)).not.toContain('sk-ant');
    });
});
