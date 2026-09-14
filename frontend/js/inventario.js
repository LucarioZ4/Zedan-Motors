// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Inventario
// ═══════════════════════════════════════

let repuestoIdEditar       = null;
let repuestoIdEliminar     = null;
let todosRepuestos         = [];
let repuestosParaImportar  = [];
let modalRepuesto, modalEliminar, modalImportarRepuestos;

document.addEventListener('DOMContentLoaded', () => {
    modalRepuesto          = new bootstrap.Modal(document.getElementById('modalRepuesto'));
    modalEliminar          = new bootstrap.Modal(document.getElementById('modalEliminar'));
    modalImportarRepuestos = new bootstrap.Modal(document.getElementById('modalImportarRepuestos'));
    cargarInventario();
    configurarDragAndDropRepuestos();
});

// ── Cargar inventario ──
async function cargarInventario(buscar = '') {
    try {
        const url = buscar
            ? `${API_URL}/api/inventario?buscar=${encodeURIComponent(buscar)}`
            : `${API_URL}/api/inventario`;

        const res  = await fetch(url, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        todosRepuestos = data;
        aplicarFiltros();
        verificarStockBajo(data);

    } catch (err) {
        mostrarToast('Error al cargar inventario: ' + err.message, 'error');
    }
}

// ── Aplicar filtros ──
function aplicarFiltros() {
    const filtro = document.getElementById('filtroStock').value;
    let lista    = [...todosRepuestos];

    if (filtro === 'bajo') lista = lista.filter(r => r.stock_bajo);
    if (filtro === 'ok')   lista = lista.filter(r => !r.stock_bajo);

    document.getElementById('totalRepuestos').textContent = lista.length;
    renderTabla(lista);
}

// ── Alerta stock bajo ──
function verificarStockBajo(data) {
    const bajos  = data.filter(r => r.stock_bajo);
    const alerta = document.getElementById('alertaStock');
    if (bajos.length > 0) {
        document.getElementById('alertaStockMsg').textContent =
            `⚠ ${bajos.length} repuesto(s) con stock bajo: ${bajos.map(r => r.nombre).join(', ')}`;
        alerta.style.display = 'flex';
    } else {
        alerta.style.display = 'none';
    }
}

// ── Renderizar tabla ──
function renderTabla(repuestos) {
    const tbody = document.getElementById('tablaInventario');

    if (!repuestos || repuestos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4" style="color:#555">
                    No se encontraron repuestos
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = repuestos.map(r => {
        const pct   = Math.min((r.stock / 20) * 100, 100);
        const color = r.stock_bajo ? '#E74C3C' : '#27AE60';

        return `
        <tr>
            <td>
                <div style="font-weight:500;color:var(--text-primary)">
                    ${r.nombre}
                </div>
                <div style="font-size:11px;color:var(--text-muted)">
                    ID #${r.id_repuesto}
                </div>
            </td>
            <td style="color:var(--text-secondary)">
                ${r.marca || '—'}
            </td>
            <td>
                <span style="color:var(--primary);font-weight:600">
                    $${parseFloat(r.precio).toLocaleString('es-CO')}
                </span>
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="stock-bar">
                        <div class="stock-bar-fill"
                             style="width:${pct}%;background:${color}"></div>
                    </div>
                    <span style="font-weight:600;color:${color}">${r.stock}</span>
                </div>
            </td>
            <td>
                ${r.stock_bajo
                    ? '<span class="badge-custom badge-stock-bajo">Stock bajo</span>'
                    : '<span class="badge-custom badge-stock-ok">Normal</span>'
                }
            </td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-accion editar"
                            onclick="abrirModalEditar(${r.id_repuesto})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-accion eliminar"
                            onclick="abrirModalEliminar(${r.id_repuesto}, '${r.nombre}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ── Buscar ──
let timerBuscar;
function buscarRepuestos() {
    clearTimeout(timerBuscar);
    timerBuscar = setTimeout(() => {
        cargarInventario(document.getElementById('inputBuscar').value);
    }, 400);
}

// ── Modal nuevo ──
function abrirModalNuevo() {
    repuestoIdEditar = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo repuesto';
    limpiarModal();
    modalRepuesto.show();
}

// ── Modal editar ──
async function abrirModalEditar(id) {
    try {
        const res  = await fetch(`${API_URL}/api/inventario/${id}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        repuestoIdEditar = id;
        document.getElementById('modalTitulo').textContent = 'Editar repuesto';
        document.getElementById('fNombre').value = data.nombre;
        document.getElementById('fMarca').value  = data.marca  || '';
        document.getElementById('fPrecio').value = data.precio;
        document.getElementById('fStock').value  = data.stock;
        ocultarErrorModal();
        modalRepuesto.show();

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Guardar ──
async function guardarRepuesto() {
    const body = {
        nombre: document.getElementById('fNombre').value.trim(),
        marca:  document.getElementById('fMarca').value.trim(),
        precio: parseFloat(document.getElementById('fPrecio').value),
        stock:  parseInt(document.getElementById('fStock').value) || 0,
    };

    if (!body.nombre) {
        mostrarErrorModal('El nombre es obligatorio.');
        return;
    }
    if (!body.precio || body.precio <= 0) {
        mostrarErrorModal('El precio debe ser mayor a cero.');
        return;
    }

    try {
        const url    = repuestoIdEditar
            ? `${API_URL}/api/inventario/${repuestoIdEditar}`
            : `${API_URL}/api/inventario`;
        const method = repuestoIdEditar ? 'PUT' : 'POST';

        const res  = await fetch(url, {
            method,
            headers: getHeaders(),
            body:    JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) { mostrarErrorModal(data.error); return; }

        modalRepuesto.hide();
        cargarInventario();
        mostrarToast(
            repuestoIdEditar ? 'Repuesto actualizado' : 'Repuesto registrado',
            'success'
        );

    } catch (err) {
        mostrarErrorModal('Error: ' + err.message);
    }
}

// ── Modal eliminar ──
function abrirModalEliminar(id, nombre) {
    repuestoIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = nombre;
    modalEliminar.show();
}

async function confirmarEliminar() {
    try {
        const res  = await fetch(
            `${API_URL}/api/inventario/${repuestoIdEliminar}`,
            { method: 'DELETE', headers: getHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        modalEliminar.hide();
        cargarInventario();
        mostrarToast('Repuesto eliminado correctamente', 'success');

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Helpers ──
function limpiarModal() {
    ['fNombre','fMarca','fPrecio','fStock']
        .forEach(id => document.getElementById(id).value = '');
    ocultarErrorModal();
}

function mostrarErrorModal(msg) {
    document.getElementById('modalError').style.display  = 'flex';
    document.getElementById('modalErrorMsg').textContent = msg;
}

function ocultarErrorModal() {
    document.getElementById('modalError').style.display = 'none';
}

// ═══════════════════════════════════════
// IMPORTACIÓN MASIVA DE REPUESTOS
// ═══════════════════════════════════════

function abrirModalImportar() {
    limpiarImportacionRepuestos();
    modalImportarRepuestos.show();
}

function descargarPlantillaRepuestos() {
    const csvContent = "Nombre,Marca,Precio,Stock\n" +
                       "Filtro de Aceite Sintetico,Bosch,15.50,20\n" +
                       "Pastillas de Freno Delanteras,Brembo,45.00,12\n" +
                       "Bujia de Iridio,Denso,8.75,50\n" +
                       "Aceite 5W-30 Sintetico 1 Galon,Mobil,32.00,15\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_repuestos_zedan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function configurarDragAndDropRepuestos() {
    const dropZone = document.getElementById('dropZoneRepuestos');
    if (!dropZone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            procesarArchivoCSVRepuestos(files[0]);
        }
    });
}

function manejarArchivoRepuestos(event) {
    const file = event.target.files[0];
    if (file) {
        procesarArchivoCSVRepuestos(file);
    }
}

function procesarArchivoCSVRepuestos(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const texto = e.target.result;
        parsearTextoRepuestosContenido(texto);
    };
    reader.readAsText(file, 'UTF-8');
}

function parsearTextoRepuestos() {
    const texto = document.getElementById('textareaRepuestos').value;
    parsearTextoRepuestosContenido(texto);
}

function parsearTextoRepuestosContenido(texto) {
    ocultarErrorImport();
    if (!texto || !texto.trim()) {
        limpiarImportacionRepuestos();
        return;
    }

    const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lineas.length === 0) return;

    // Detectar si la primera fila es encabezado
    let inicio = 0;
    const primeraFila = lineas[0].toLowerCase();
    if (primeraFila.includes('nombre') || primeraFila.includes('precio') || primeraFila.includes('repuesto')) {
        inicio = 1;
    }

    const items = [];
    for (let i = inicio; i < lineas.length; i++) {
        const linea = lineas[i];
        // Detectar separador (coma, punto y coma o tab)
        let separador = ',';
        if (linea.includes('\t')) separador = '\t';
        else if (linea.includes(';') && !linea.includes(',')) separador = ';';

        const cols = linea.split(separador).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length === 0 || !cols[0]) continue;

        const nombre = cols[0] || '';
        const marca  = cols[1] || '';
        const precio = parseFloat(cols[2]?.replace(/[^0-9.]/g, '')) || 0;
        const stock  = parseInt(cols[3]?.replace(/[^0-9]/g, '')) || 0;

        const esValido = nombre.length > 0 && precio > 0 && stock >= 0;

        items.push({
            fila: i + 1,
            nombre,
            marca,
            precio,
            stock,
            valido: esValido
        });
    }

    repuestosParaImportar = items;
    renderPreviewRepuestos(items);
}

function renderPreviewRepuestos(items) {
    const tbody = document.getElementById('tbodyPreviewRepuestos');
    const seccion = document.getElementById('seccionPreviewRepuestos');
    const btnConfirmar = document.getElementById('btnConfirmarImportRepuestos');
    const cantPreview = document.getElementById('cantPreviewRepuestos');

    if (!items || items.length === 0) {
        seccion.style.display = 'none';
        btnConfirmar.disabled = true;
        return;
    }

    cantPreview.textContent = items.length;
    seccion.style.display = 'block';

    const validos = items.filter(it => it.valido);
    btnConfirmar.disabled = validos.length === 0;

    tbody.innerHTML = items.map((it, idx) => `
        <tr style="${it.valido ? '' : 'background:rgba(220,38,38,0.06)'}">
            <td>${idx + 1}</td>
            <td><strong>${it.nombre || '<span class="text-danger">Falta nombre</span>'}</strong></td>
            <td>${it.marca || '<span class="text-muted">—</span>'}</td>
            <td>${it.precio > 0 ? '$' + it.precio.toFixed(2) : '<span class="text-danger">Inválido</span>'}</td>
            <td>${it.stock}</td>
            <td>
                ${it.valido 
                    ? '<span class="badge-custom badge-completada"><i class="bi bi-check"></i> Válido</span>' 
                    : '<span class="badge-custom badge-cancelada"><i class="bi bi-x"></i> Incompleto</span>'}
            </td>
        </tr>
    `).join('');
}

function limpiarImportacionRepuestos() {
    repuestosParaImportar = [];
    const fileInput = document.getElementById('fileInputRepuestos');
    if (fileInput) fileInput.value = '';
    const textarea = document.getElementById('textareaRepuestos');
    if (textarea) textarea.value = '';
    const seccion = document.getElementById('seccionPreviewRepuestos');
    if (seccion) seccion.style.display = 'none';
    const btnConfirmar = document.getElementById('btnConfirmarImportRepuestos');
    if (btnConfirmar) btnConfirmar.disabled = true;
    ocultarErrorImport();
}

async function ejecutarImportacionRepuestos() {
    const validos = repuestosParaImportar.filter(it => it.valido);
    if (validos.length === 0) {
        mostrarErrorImport('No hay elementos válidos para importar.');
        return;
    }

    const btnConfirmar = document.getElementById('btnConfirmarImportRepuestos');
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Importando...';

    try {
        const res = await fetch(`${API_URL}/api/inventario/importar`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ items: validos })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        modalImportarRepuestos.hide();
        limpiarImportacionRepuestos();
        cargarInventario();
        mostrarToast(data.mensaje || 'Repuestos importados correctamente', 'success');

        if (data.errores && data.errores.length > 0) {
            console.warn('Advertencias en importación:', data.errores);
        }

    } catch (err) {
        mostrarErrorImport('Error en la importación: ' + err.message);
    } finally {
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<i class="bi bi-check-circle me-1"></i> Confirmar Importación';
    }
}

function mostrarErrorImport(msg) {
    const errorBox = document.getElementById('modalImportError');
    if (errorBox) {
        errorBox.style.display = 'flex';
        document.getElementById('modalImportErrorMsg').textContent = msg;
    }
}

function ocultarErrorImport() {
    const errorBox = document.getElementById('modalImportError');
    if (errorBox) errorBox.style.display = 'none';
}