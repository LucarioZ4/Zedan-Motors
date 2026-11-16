const { emparejarItem, normalizarTexto, normalizarAlias } = require('../src/modules/inventario-ia/emparejar');

describe('Módulo Emparejar (función pura)', () => {
    const catalogo = [
        {
            id_repuesto: 1,
            nombre: 'Filtro de Aceite PH3593A',
            marca: 'Fram',
            referencia: 'PH3593A',
            codigo_barras: '750100123456'
        },
        {
            id_repuesto: 2,
            nombre: 'Pastillas de Freno Delanteras',
            marca: 'Brembo',
            referencia: 'P85020',
            codigo_barras: '8020584050201'
        },
        {
            id_repuesto: 3,
            nombre: 'Bujía de Iridio IX',
            marca: 'NGK',
            referencia: 'BKR6EIX-11',
            codigo_barras: '087295137680'
        },
        {
            id_repuesto: 4,
            nombre: 'Filtro de Aire Motor',
            marca: 'Bosch',
            referencia: 'F026400001',
            codigo_barras: null
        },
        {
            id_repuesto: 5,
            nombre: 'Filtro de Combustible Gasolina',
            marca: 'Bosch',
            referencia: '0450905002',
            codigo_barras: null
        },
        {
            id_repuesto: 6,
            nombre: 'Filtro de Cabina Polen',
            marca: 'Bosch',
            referencia: '1987432097',
            codigo_barras: null
        }
    ];

    const aliases = [
        { alias_normalizado: 'filtro aceite fram honda civic', id_repuesto: 1 },
        { alias_normalizado: 'bujias ngk iridio bkr6', id_repuesto: 3 }
    ];

    test('normalizarTexto remueve espacios, guiones y tildes correctamente', () => {
        expect(normalizarTexto(' PH-3593_A. ')).toBe('ph3593a');
        expect(normalizarTexto('BKR-6EIX - 11')).toBe('bkr6eix11');
    });

    test('normalizarAlias limpia caracteres especiales y compacta espacios', () => {
        expect(normalizarAlias('Filtro de Aceite: Fram (PH-3593A)')).toBe('filtro de aceite fram ph 3593a');
    });

    test('coincide por código de barras exacto con puntaje 1.0', () => {
        const item = {
            descripcion: 'Filtro genérico',
            codigo_barras: '750100123456',
            referencia: null,
            marca: null
        };
        const res = emparejarItem(item, catalogo, aliases);
        expect(res.estado).toBe('coincide');
        expect(res.candidatos[0].id_repuesto).toBe(1);
        expect(res.candidatos[0].puntaje).toBe(1.0);
    });

    test('coincide por referencia exacta normalizada', () => {
        const item = {
            descripcion: 'Pastillas delanteras',
            referencia: 'p 85-020',
            codigo_barras: null,
            marca: 'Brembo'
        };
        const res = emparejarItem(item, catalogo, aliases);
        expect(res.estado).toBe('coincide');
        expect(res.candidatos[0].id_repuesto).toBe(2);
        expect(res.candidatos[0].puntaje).toBe(0.95);
    });

    test('coincide por alias exacto en repuesto_alias', () => {
        const item = {
            descripcion: 'filtro aceite fram honda civic',
            referencia: null,
            codigo_barras: null,
            marca: null
        };
        const res = emparejarItem(item, catalogo, aliases);
        expect(res.estado).toBe('coincide');
        expect(res.candidatos[0].id_repuesto).toBe(1);
        expect(res.candidatos[0].puntaje).toBe(0.90);
    });

    test('varios candidatos parecidos (ej. filtros Bosch) deben marcarse como "revisar", nunca adivinar', () => {
        const item = {
            descripcion: 'Filtro Bosch',
            marca: 'Bosch',
            referencia: null,
            codigo_barras: null
        };
        const res = emparejarItem(item, catalogo, aliases);
        expect(res.estado).toBe('revisar');
        expect(res.candidatos.length).toBeGreaterThanOrEqual(2);
    });

    test('sin candidatos suficientes devuelve estado "nuevo"', () => {
        const item = {
            descripcion: 'Amortiguador trasero de gas reforzado',
            marca: 'Monroe',
            referencia: 'OESPECTRUM-999',
            codigo_barras: '999999999999'
        };
        const res = emparejarItem(item, catalogo, aliases);
        expect(res.estado).toBe('nuevo');
        expect(res.candidatos.length).toBe(0);
    });

    test('aprovecha id_repuesto_sugerido del modelo de visión si es válido', () => {
        const item = {
            descripcion: 'Filtro motor',
            id_repuesto_sugerido: 4,
            referencia: null,
            codigo_barras: null
        };
        const res = emparejarItem(item, catalogo, aliases);
        expect(res.candidatos.some(c => c.id_repuesto === 4)).toBe(true);
    });
});
