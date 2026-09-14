// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Vehículos
// ═══════════════════════════════════════

let vehiculoIdEditar      = null;
let vehiculoIdEliminar    = null;
let listaClientesCache    = [];
let vehiculosParaImportar = [];
let modalVehiculo, modalEliminar, modalImportarVehiculos;

document.addEventListener('DOMContentLoaded', () => {
    modalVehiculo          = new bootstrap.Modal(document.getElementById('modalVehiculo'));
    modalEliminar          = new bootstrap.Modal(document.getElementById('modalEliminar'));
    modalImportarVehiculos = new bootstrap.Modal(document.getElementById('modalImportarVehiculos'));
    cargarVehiculos();
    cargarClientes();
    configurarDragAndDropVehiculos();
});

// ── Cargar vehículos ──
async function cargarVehiculos(buscar = '') {
    try {
        const url = buscar
            ? `${API_URL}/api/vehiculos?buscar=${encodeURIComponent(buscar)}`
            : `${API_URL}/api/vehiculos`;

        const res  = await fetch(url, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        document.getElementById('totalVehiculos').textContent = data.length;
        renderTabla(data);

    } catch (err) {
        mostrarToast('Error al cargar vehículos: ' + err.message, 'error');
    }
}

// ── Cargar clientes para el select ──
async function cargarClientes() {
    try {
        const res  = await fetch(`${API_URL}/api/clientes`, { headers: getHeaders() });
        const data = await res.json();
        listaClientesCache = data;

        const select = document.getElementById('fCliente');
        select.innerHTML = '<option value="">Seleccionar cliente...</option>';
        data.forEach(c => {
            select.innerHTML += `
                <option value="${c.id_cliente}">
                    ${c.nombre} ${c.apellido}
                </option>`;
        });

        const selectDefecto = document.getElementById('importClienteDefecto');
        if (selectDefecto) {
            selectDefecto.innerHTML = '<option value="">Asignar según columna en archivo (ID o Correo)</option>';
            data.forEach(c => {
                selectDefecto.innerHTML += `
                    <option value="${c.id_cliente}">
                        ${c.nombre} ${c.apellido} (ID #${c.id_cliente})
                    </option>`;
            });
        }

    } catch (err) {
        console.error('Error cargando clientes:', err);
    }
}

// ── Renderizar tabla ──
function renderTabla(vehiculos) {
    const tbody = document.getElementById('tablaVehiculos');

    if (!vehiculos || vehiculos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4" style="color:#555">
                    No se encontraron vehículos
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = vehiculos.map(v => `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="vehiculo-icon">
                        <i class="bi bi-car-front-fill"></i>
                    </div>
                    <div>
                        <div style="font-weight:500;color:var(--text-primary)">
                            ${v.marca} ${v.modelo}
                        </div>
                        <div style="font-size:11px;color:var(--text-muted)">
                            ID #${v.id_vehiculo}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <span style="background:rgba(232,104,26,0.1);color:var(--primary);
                             padding:3px 10px;border-radius:6px;font-weight:600;
                             font-size:12px">
                    ${v.placa}
                </span>
            </td>
            <td style="color:var(--text-secondary)">${v.anio || '—'}</td>
            <td>
                <span class="color-dot"></span>
                ${v.color || '—'}
            </td>
            <td>
                <div style="font-size:13px;color:var(--text-primary)">
                    ${v.cliente}
                </div>
            </td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-accion editar"
                            onclick="abrirModalEditar(${v.id_vehiculo})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-accion eliminar"
                            onclick="abrirModalEliminar(${v.id_vehiculo},
                            '${v.marca} ${v.modelo} - ${v.placa}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ── Buscar ──
let timerBuscar;
function buscarVehiculos() {
    clearTimeout(timerBuscar);
    timerBuscar = setTimeout(() => {
        cargarVehiculos(document.getElementById('inputBuscar').value);
    }, 400);
}

// ── Modal nuevo ──
function abrirModalNuevo() {
    vehiculoIdEditar = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo vehículo';
    limpiarModal();
    modalVehiculo.show();
}

// ── Modal editar ──
async function abrirModalEditar(id) {
    try {
        const res  = await fetch(`${API_URL}/api/vehiculos/${id}`, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        vehiculoIdEditar = id;
        document.getElementById('modalTitulo').textContent = 'Editar vehículo';
        document.getElementById('fPlaca').value   = data.placa;
        document.getElementById('fMarca').value   = data.marca;
        document.getElementById('fModelo').value  = data.modelo;
        document.getElementById('fAnio').value    = data.anio   || '';
        document.getElementById('fColor').value   = data.color  || '';
        document.getElementById('fCliente').value = data.id_cliente;
        ocultarErrorModal();
        modalVehiculo.show();

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Guardar ──
async function guardarVehiculo() {
    const body = {
        placa:      document.getElementById('fPlaca').value.trim().toUpperCase(),
        marca:      document.getElementById('fMarca').value.trim(),
        modelo:     document.getElementById('fModelo').value.trim(),
        anio:       document.getElementById('fAnio').value || null,
        color:      document.getElementById('fColor').value.trim(),
        id_cliente: document.getElementById('fCliente').value,
    };

    if (!body.placa || !body.marca || !body.modelo || !body.id_cliente) {
        mostrarErrorModal('Placa, marca, modelo y cliente son obligatorios.');
        return;
    }

    try {
        const url    = vehiculoIdEditar
            ? `${API_URL}/api/vehiculos/${vehiculoIdEditar}`
            : `${API_URL}/api/vehiculos`;
        const method = vehiculoIdEditar ? 'PUT' : 'POST';

        const res  = await fetch(url, {
            method,
            headers: getHeaders(),
            body:    JSON.stringify(body)
        });
        const data = await res.json();

        if (!res.ok) { mostrarErrorModal(data.error); return; }

        modalVehiculo.hide();
        cargarVehiculos();
        mostrarToast(
            vehiculoIdEditar ? 'Vehículo actualizado' : 'Vehículo registrado',
            'success'
        );

    } catch (err) {
        mostrarErrorModal('Error: ' + err.message);
    }
}

// ── Modal eliminar ──
function abrirModalEliminar(id, nombre) {
    vehiculoIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = nombre;
    modalEliminar.show();
}

async function confirmarEliminar() {
    try {
        const res = await fetch(
            `${API_URL}/api/vehiculos/${vehiculoIdEliminar}`,
            { method: 'DELETE', headers: getHeaders() }
        );
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        modalEliminar.hide();
        cargarVehiculos();
        mostrarToast('Vehículo eliminado correctamente', 'success');

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Helpers ──
function limpiarModal() {
    ['fPlaca','fMarca','fModelo','fAnio','fColor'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('fCliente').value = '';
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
// IMPORTACIÓN MASIVA DE VEHÍCULOS
// ═══════════════════════════════════════

function abrirModalImportar() {
    limpiarImportacionVehiculos();
    modalImportarVehiculos.show();
}

function descargarPlantillaVehiculos() {
    const csvContent = "Placa,Marca,Modelo,Anio,Color,ID_Cliente\n" +
                       "ABC123,Toyota,Corolla,2022,Blanco,1\n" +
                       "XYZ789,Chevrolet,Spark GT,2019,Rojo,2\n" +
                       "KLS456,Mazda,CX-5,2023,Gris Plata,1\n" +
                       "MNP890,Nissan,Sentra,2020,Azul,3\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_vehiculos_zedan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function configurarDragAndDropVehiculos() {
    const dropZone = document.getElementById('dropZoneVehiculos');
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
            procesarArchivoCSVVehiculos(files[0]);
        }
    });
}

function manejarArchivoVehiculos(event) {
    const file = event.target.files[0];
    if (file) {
        procesarArchivoCSVVehiculos(file);
    }
}

function procesarArchivoCSVVehiculos(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const texto = e.target.result;
        parsearTextoVehiculosContenido(texto);
    };
    reader.readAsText(file, 'UTF-8');
}

function parsearTextoVehiculos() {
    const texto = document.getElementById('textareaVehiculos').value;
    parsearTextoVehiculosContenido(texto);
}

function parsearTextoVehiculosContenido(texto) {
    ocultarErrorImportVehiculo();
    if (!texto || !texto.trim()) {
        limpiarImportacionVehiculos();
        return;
    }

    const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lineas.length === 0) return;

    let inicio = 0;
    const primeraFila = lineas[0].toLowerCase();
    if (primeraFila.includes('placa') || primeraFila.includes('marca') || primeraFila.includes('modelo')) {
        inicio = 1;
    }

    const clienteDefecto = document.getElementById('importClienteDefecto')?.value || '';

    const items = [];
    for (let i = inicio; i < lineas.length; i++) {
        const linea = lineas[i];
        let separador = ',';
        if (linea.includes('\t')) separador = '\t';
        else if (linea.includes(';') && !linea.includes(',')) separador = ';';

        const cols = linea.split(separador).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length === 0 || !cols[0]) continue;

        const placa  = (cols[0] || '').toUpperCase();
        const marca  = cols[1] || '';
        const modelo = cols[2] || '';
        const anio   = parseInt(cols[3]?.replace(/[^0-9]/g, '')) || null;
        const color  = cols[4] || '';
        let clienteRef = cols[5] || clienteDefecto;

        // Validar si encontramos el cliente en cache
        let clienteEncontrado = null;
        if (clienteRef) {
            clienteEncontrado = listaClientesCache.find(c => 
                String(c.id_cliente) === String(clienteRef) ||
                (c.correo && c.correo.toLowerCase() === clienteRef.toLowerCase()) ||
                (`${c.nombre} ${c.apellido}`.toLowerCase() === clienteRef.toLowerCase())
            );
        }

        const anioValido = !anio || (anio >= 1900 && anio <= new Date().getFullYear() + 1);
        const esValido = placa.length >= 3 && marca.length > 0 && modelo.length > 0 && !!clienteEncontrado && anioValido;

        items.push({
            fila: i + 1,
            placa,
            marca,
            modelo,
            anio,
            color,
            clienteRaw: clienteRef,
            id_cliente: clienteEncontrado ? clienteEncontrado.id_cliente : null,
            clienteNombre: clienteEncontrado ? `${clienteEncontrado.nombre} ${clienteEncontrado.apellido}` : (clienteRef || 'Sin cliente'),
            valido: esValido
        });
    }

    vehiculosParaImportar = items;
    renderPreviewVehiculos(items);
}

function actualizarPreviewClienteDefecto() {
    const textoArea = document.getElementById('textareaVehiculos')?.value;
    if (textoArea && textoArea.trim()) {
        parsearTextoVehiculosContenido(textoArea);
    } else if (vehiculosParaImportar.length > 0) {
        const clienteDefecto = document.getElementById('importClienteDefecto')?.value || '';
        const clienteEncontrado = listaClientesCache.find(c => String(c.id_cliente) === String(clienteDefecto));
        
        vehiculosParaImportar.forEach(it => {
            if (!it.clienteRaw || it.clienteRaw === '') {
                it.id_cliente = clienteEncontrado ? clienteEncontrado.id_cliente : null;
                it.clienteNombre = clienteEncontrado ? `${clienteEncontrado.nombre} ${clienteEncontrado.apellido}` : 'Sin cliente';
            }
            it.valido = it.placa.length >= 3 && it.marca.length > 0 && it.modelo.length > 0 && !!it.id_cliente;
        });
        renderPreviewVehiculos(vehiculosParaImportar);
    }
}

function renderPreviewVehiculos(items) {
    const tbody = document.getElementById('tbodyPreviewVehiculos');
    const seccion = document.getElementById('seccionPreviewVehiculos');
    const btnConfirmar = document.getElementById('btnConfirmarImportVehiculos');
    const cantPreview = document.getElementById('cantPreviewVehiculos');

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
            <td><strong>${it.placa || '<span class="text-danger">Falta placa</span>'}</strong></td>
            <td>${it.marca || '<span class="text-danger">Falta marca</span>'}</td>
            <td>${it.modelo || '<span class="text-danger">Falta modelo</span>'}</td>
            <td>${it.anio || '—'}</td>
            <td>${it.color || '—'}</td>
            <td>
                <span class="${it.id_cliente ? 'text-primary' : 'text-danger'}">
                    ${it.clienteNombre}
                </span>
            </td>
            <td>
                ${it.valido 
                    ? '<span class="badge-custom badge-completada"><i class="bi bi-check"></i> Válido</span>' 
                    : '<span class="badge-custom badge-cancelada"><i class="bi bi-x"></i> Incompleto</span>'}
            </td>
        </tr>
    `).join('');
}

function limpiarImportacionVehiculos() {
    vehiculosParaImportar = [];
    const fileInput = document.getElementById('fileInputVehiculos');
    if (fileInput) fileInput.value = '';
    const textarea = document.getElementById('textareaVehiculos');
    if (textarea) textarea.value = '';
    const seccion = document.getElementById('seccionPreviewVehiculos');
    if (seccion) seccion.style.display = 'none';
    const btnConfirmar = document.getElementById('btnConfirmarImportVehiculos');
    if (btnConfirmar) btnConfirmar.disabled = true;
    ocultarErrorImportVehiculo();
}

async function ejecutarImportacionVehiculos() {
    const validos = vehiculosParaImportar.filter(it => it.valido);
    if (validos.length === 0) {
        mostrarErrorImportVehiculo('No hay vehículos válidos para importar.');
        return;
    }

    const btnConfirmar = document.getElementById('btnConfirmarImportVehiculos');
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Importando...';

    const clienteDefecto = document.getElementById('importClienteDefecto')?.value || null;

    try {
        const res = await fetch(`${API_URL}/api/vehiculos/importar`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ 
                items: validos,
                idClienteDefecto: clienteDefecto
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        modalImportarVehiculos.hide();
        limpiarImportacionVehiculos();
        cargarVehiculos();
        mostrarToast(data.mensaje || 'Vehículos importados correctamente', 'success');

        if (data.errores && data.errores.length > 0) {
            console.warn('Advertencias en importación de vehículos:', data.errores);
        }

    } catch (err) {
        mostrarErrorImportVehiculo('Error en la importación: ' + err.message);
    } finally {
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<i class="bi bi-check-circle me-1"></i> Confirmar Importación';
    }
}

function mostrarErrorImportVehiculo(msg) {
    const errorBox = document.getElementById('modalImportVehiculoError');
    if (errorBox) {
        errorBox.style.display = 'flex';
        document.getElementById('modalImportVehiculoErrorMsg').textContent = msg;
    }
}

function ocultarErrorImportVehiculo() {
    const errorBox = document.getElementById('modalImportVehiculoError');
    if (errorBox) errorBox.style.display = 'none';
}