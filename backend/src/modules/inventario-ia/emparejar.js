/**
 * Normaliza cadenas de referencia y texto:
 * minúsculas, elimina espacios y guiones y caracteres no alfanuméricos simples.
 * @param {string|null|undefined} str
 * @returns {string}
 */
function normalizarTexto(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quita tildes
        .replace(/[\s\-_./\\]+/g, '')     // Quita espacios, guiones, barras
        .trim();
}

/**
 * Normaliza una descripción libre o alias para búsqueda y almacenamiento en repuesto_alias.
 * Conserva palabras separadas por un espacio único.
 * @param {string|null|undefined} str
 * @returns {string}
 */
function normalizarAlias(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calcula similitud de n-gramas (trigramas) en memoria entre dos cadenas,
 * replicando de forma fiel la métrica de pg_trgm.
 * @param {string} a
 * @param {string} b
 * @returns {number} Valor entre 0 y 1
 */
function calcularSimilitudTrigrama(a, b) {
    if (!a || !b) return 0;
    const str1 = `  ${a.toLowerCase().trim()} `;
    const str2 = `  ${b.toLowerCase().trim()} `;

    if (str1 === str2) return 1;

    const trigs1 = new Set();
    for (let i = 0; i <= str1.length - 3; i++) {
        trigs1.add(str1.substring(i, i + 3));
    }

    const trigs2 = new Set();
    for (let i = 0; i <= str2.length - 3; i++) {
        trigs2.add(str2.substring(i, i + 3));
    }

    if (trigs1.size === 0 || trigs2.size === 0) return 0;

    let interseccion = 0;
    for (const trig of trigs1) {
        if (trigs2.has(trig)) interseccion++;
    }

    const union = trigs1.size + trigs2.size - interseccion;
    return union > 0 ? interseccion / union : 0;
}

/**
 * Función pura que cruza un ítem detectado por la IA contra el catálogo y los alias.
 * Devuelve hasta 3 candidatos con puntaje y un estado: 'coincide' | 'revisar' | 'nuevo'.
 *
 * Prioridades:
 * 1. Código de barras exacto (puntaje 1.0)
 * 2. Referencia exacta normalizada (puntaje 0.95)
 * 3. Alias exacto en repuesto_alias (puntaje 0.90)
 * 4. Similitud trigrama sobre (marca + ' ' + nombre) (puntaje según similitud)
 * 5. id_repuesto_sugerido validado (bonifica o añade candidato con puntaje 0.85 si no está)
 *
 * Reglas de estado:
 * - 'coincide': Si hay un único candidato claro (puntaje >= 0.80 y (sin segundo candidato o puntaje - puntaje_2 >= 0.15))
 * - 'revisar': Si hay múltiples candidatos parecidos (competencia cercana) o puntaje moderado (>= 0.35)
 * - 'nuevo': Si no hay candidatos o el puntaje máximo es < 0.35
 *
 * @param {Object} item - Ítem detectado por el modelo
 * @param {Array<Object>} catalogo - Lista de repuestos ({id_repuesto, nombre, marca, referencia, codigo_barras})
 * @param {Array<Object>} [aliases] - Lista de alias ({alias_normalizado, id_repuesto})
 * @returns {{
 *   estado: 'coincide'|'revisar'|'nuevo',
 *   candidatos: Array<{id_repuesto: number, nombre: string, marca: string|null, referencia: string|null, puntaje: number, razon: string}>
 * }}
 */
function emparejarItem(item, catalogo = [], aliases = []) {
    if (!item || !Array.isArray(catalogo) || catalogo.length === 0) {
        return { estado: 'nuevo', candidatos: [] };
    }

    const mapaCandidatos = new Map(); // id_repuesto -> { candidato, puntaje, razon }

    const itemCodigo = item.codigo_barras ? String(item.codigo_barras).trim() : '';
    const itemRefNorm = normalizarTexto(item.referencia);
    const itemAliasNorm = normalizarAlias(item.descripcion);
    const itemNombreCompleto = `${item.marca || ''} ${item.descripcion || ''}`.trim();

    // 1. Código de barras exacto
    if (itemCodigo) {
        for (const rep of catalogo) {
            if (rep.codigo_barras && String(rep.codigo_barras).trim() === itemCodigo) {
                mapaCandidatos.set(rep.id_repuesto, {
                    id_repuesto: rep.id_repuesto,
                    nombre: rep.nombre,
                    marca: rep.marca,
                    referencia: rep.referencia,
                    codigo_barras: rep.codigo_barras,
                    puntaje: 1.0,
                    razon: 'Código de barras exacto'
                });
            }
        }
    }

    // 2. Referencia exacta normalizada
    if (itemRefNorm) {
        for (const rep of catalogo) {
            const repRefNorm = normalizarTexto(rep.referencia);
            if (repRefNorm && repRefNorm === itemRefNorm) {
                const prev = mapaCandidatos.get(rep.id_repuesto);
                if (!prev || prev.puntaje < 0.95) {
                    mapaCandidatos.set(rep.id_repuesto, {
                        id_repuesto: rep.id_repuesto,
                        nombre: rep.nombre,
                        marca: rep.marca,
                        referencia: rep.referencia,
                        codigo_barras: rep.codigo_barras,
                        puntaje: 0.95,
                        razon: 'Referencia exacta'
                    });
                }
            }
        }
    }

    // 3. Alias exacto en repuesto_alias
    if (itemAliasNorm && Array.isArray(aliases) && aliases.length > 0) {
        for (const al of aliases) {
            if (normalizarAlias(al.alias_normalizado) === itemAliasNorm) {
                const rep = catalogo.find(r => r.id_repuesto === al.id_repuesto);
                if (rep) {
                    const prev = mapaCandidatos.get(rep.id_repuesto);
                    if (!prev || prev.puntaje < 0.90) {
                        mapaCandidatos.set(rep.id_repuesto, {
                            id_repuesto: rep.id_repuesto,
                            nombre: rep.nombre,
                            marca: rep.marca,
                            referencia: rep.referencia,
                            codigo_barras: rep.codigo_barras,
                            puntaje: 0.90,
                            razon: 'Coincidencia por alias histórico'
                        });
                    }
                }
            }
        }
    }

    // 4. Similitud trigrama sobre (marca + ' ' + nombre)
    if (itemNombreCompleto) {
        for (const rep of catalogo) {
            const repNombreCompleto = `${rep.marca || ''} ${rep.nombre || ''}`.trim();
            const sim = calcularSimilitudTrigrama(itemNombreCompleto, repNombreCompleto);

            // También probar solo contra el nombre por si la marca difiere levemente
            const simSoloNombre = calcularSimilitudTrigrama(item.descripcion || '', rep.nombre || '');
            const mejorSim = Math.max(sim, simSoloNombre);

            if (mejorSim >= 0.30) {
                const puntajeSim = Math.round(mejorSim * 100) / 100;
                const prev = mapaCandidatos.get(rep.id_repuesto);
                if (!prev || prev.puntaje < puntajeSim) {
                    mapaCandidatos.set(rep.id_repuesto, {
                        id_repuesto: rep.id_repuesto,
                        nombre: rep.nombre,
                        marca: rep.marca,
                        referencia: rep.referencia,
                        codigo_barras: rep.codigo_barras,
                        puntaje: puntajeSim,
                        razon: `Similitud de texto (${Math.round(puntajeSim * 100)}%)`
                    });
                }
            }
        }
    }

    // 5. id_repuesto_sugerido por el modelo validado
    if (item.id_repuesto_sugerido) {
        const rep = catalogo.find(r => r.id_repuesto === Number(item.id_repuesto_sugerido));
        if (rep) {
            const prev = mapaCandidatos.get(rep.id_repuesto);
            if (!prev) {
                mapaCandidatos.set(rep.id_repuesto, {
                    id_repuesto: rep.id_repuesto,
                    nombre: rep.nombre,
                    marca: rep.marca,
                    referencia: rep.referencia,
                    codigo_barras: rep.codigo_barras,
                    puntaje: 0.85,
                    razon: 'Sugerido por el modelo de visión'
                });
            } else if (prev.puntaje < 0.85) {
                prev.puntaje = 0.85;
                prev.razon += ' + sugerido por el modelo';
            }
        }
    }

    // Ordenar candidatos por puntaje descendente y recortar a top 3
    const ordenados = Array.from(mapaCandidatos.values()).sort((a, b) => b.puntaje - a.puntaje);
    const top3 = ordenados.slice(0, 3);

    if (top3.length === 0 || top3[0].puntaje < 0.35) {
        return {
            estado: 'nuevo',
            candidatos: []
        };
    }

    const primero = top3[0];
    const segundo = top3[1];

    // Regla de desempate claro:
    // Para 'coincide' debe tener puntaje >= 0.80 Y estar alejado del segundo candidato por al menos 0.15
    if (primero.puntaje >= 0.80 && (!segundo || (primero.puntaje - segundo.puntaje) >= 0.15)) {
        return {
            estado: 'coincide',
            candidatos: top3
        };
    }

    // Si hay competencia cercana o puntaje moderado, nunca adivinar: 'revisar'
    return {
        estado: 'revisar',
        candidatos: top3
    };
}

module.exports = {
    emparejarItem,
    normalizarTexto,
    normalizarAlias,
    calcularSimilitudTrigrama
};
