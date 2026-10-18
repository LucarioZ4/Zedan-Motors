import React, { useEffect, useState, useRef } from 'react';
import {
  getFacturas,
  getFacturaById,
  createFactura,
  deleteFactura
} from '../../services/facturacionService';
import { getOrdenes, getServiciosOrden, getRepuestosOrden } from '../../services/ordenesService';
import './Facturacion.css';

const FACTURA_EMPRESA = {
  nombre: "Zedan Motor's",
  nit: '900.123.456-7',
  direccion: 'Calle Falsa 123, Ciudad',
  contacto: 'Tel. (601) 000 0000'
};

export default function Facturacion() {
  const [facturas, setFacturas] = useState([]);
  const [todasFacturas, setTodasFacturas] = useState([]);
  const [ordenesSinFacturar, setOrdenesSinFacturar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Nueva Factura
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrdenId, setSelectedOrdenId] = useState('');
  const [selectedMetodoPago, setSelectedMetodoPago] = useState('');
  const [previewTotales, setPreviewTotales] = useState(null);
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal Ver Detalle Factura
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [facturaDetalle, setFacturaDetalle] = useState(null);

  // Modal Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [facturaToDelete, setFacturaToDelete] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const timerBuscar = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [facts, ords] = await Promise.all([getFacturas(), getOrdenes()]);
      setTodasFacturas(facts || []);
      setFacturas(facts || []);

      const idsFacturados = (facts || []).map((f) => f.id_orden);
      const sinFacturar = (ords || []).filter((o) => !idsFacturados.includes(o.id_orden));
      setOrdenesSinFacturar(sinFacturar);
    } catch (err) {
      console.error('Error al cargar facturas:', err);
      showToast(err.message || 'Error al cargar facturas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (timerBuscar.current) clearTimeout(timerBuscar.current);
    timerBuscar.current = setTimeout(() => {
      if (!val.trim()) {
        setFacturas(todasFacturas);
        return;
      }
      const term = val.toLowerCase();
      const filtradas = todasFacturas.filter(
        (f) =>
          f.cliente?.toLowerCase().includes(term) ||
          f.vehiculo?.toLowerCase().includes(term) ||
          f.metodo_pago?.toLowerCase().includes(term) ||
          String(f.id_factura).includes(term)
      );
      setFacturas(filtradas);
    }, 300);
  };

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setSelectedOrdenId('');
    setSelectedMetodoPago('');
    setPreviewTotales(null);
    setModalError('');
    setIsModalOpen(true);
  };

  // Calcular totales preview al cambiar orden seleccionada
  const handleOrdenChange = async (idOrden) => {
    setSelectedOrdenId(idOrden);
    if (!idOrden) {
      setPreviewTotales(null);
      return;
    }
    try {
      const [srvs, reps] = await Promise.all([
        getServiciosOrden(idOrden),
        getRepuestosOrden(idOrden)
      ]);
      const totalSrv = (srvs || []).reduce((acc, s) => acc + (parseFloat(s.costo) || 0), 0);
      const totalRep = (reps || []).reduce((acc, r) => acc + (parseFloat(r.total) || 0), 0);
      setPreviewTotales({
        servicios: totalSrv,
        repuestos: totalRep,
        total: totalSrv + totalRep
      });
    } catch (err) {
      console.error('Error calculando preview de totales:', err);
    }
  };

  // Guardar Factura
  const handleSaveFactura = async (e) => {
    e.preventDefault();
    if (!selectedOrdenId) {
      setModalError('Debe seleccionar una orden de trabajo.');
      return;
    }
    if (!selectedMetodoPago) {
      setModalError('Debe seleccionar el método de pago.');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      await createFactura({
        id_orden: selectedOrdenId,
        metodo_pago: selectedMetodoPago
      });
      showToast('Factura generada con éxito', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setModalError(err.message || 'Error al generar la factura');
    } finally {
      setIsSaving(false);
    }
  };

  // Ver Detalle Factura
  const handleVerDetalle = async (idFactura) => {
    try {
      const data = await getFacturaById(idFactura);
      setFacturaDetalle(data);
      setIsDetalleModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Error al obtener detalle de la factura', 'error');
    }
  };

  // Modal Eliminar
  const handleOpenDelete = (factura) => {
    setFacturaToDelete(factura);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!facturaToDelete) return;
    try {
      await deleteFactura(facturaToDelete.id_factura);
      setIsDeleteModalOpen(false);
      setFacturaToDelete(null);
      showToast('Factura eliminada correctamente', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Error al eliminar factura', 'error');
    }
  };

  // Descarga e Impresión de Factura (PDF vía ventana de impresión)
  const handleDescargarPDF = async (idFactura) => {
    showToast('Preparando comprobante de factura...', 'success');
    try {
      const data = await getFacturaById(idFactura);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast('Permite ventanas emergentes para generar el comprobante', 'error');
        return;
      }

      const totalNum = parseFloat(data.total) || 0;
      const srvs = data.servicios || [];
      const reps = data.repuestos || [];

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Factura #${data.id_factura} — ${FACTURA_EMPRESA.nombre}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; padding: 36px; max-width: 780px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 24px; }
            .company h1 { margin: 0; color: #1e3a8a; font-size: 22px; }
            .company p { margin: 2px 0; font-size: 12px; color: #64748b; }
            .fac-badge { text-align: right; background: #eff6ff; padding: 10px 18px; border-radius: 8px; border: 1px solid #dbeafe; }
            .fac-badge h2 { margin: 0; color: #1e3a8a; font-size: 18px; }
            .fac-badge span { font-size: 11px; color: #64748b; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 14px 18px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 13px; }
            .info-grid b { color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
            th { background: #1e3a8a; color: white; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; }
            td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
            .text-right { text-align: right; }
            .total-box { margin-left: auto; width: 280px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #475569; }
            .total-final { display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; color: #1e3a8a; border-top: 2px solid #1e3a8a; padding-top: 8px; margin-top: 6px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">
              <h1>${FACTURA_EMPRESA.nombre}</h1>
              <p>NIT: ${FACTURA_EMPRESA.nit}</p>
              <p>${FACTURA_EMPRESA.direccion}</p>
              <p>${FACTURA_EMPRESA.contacto}</p>
            </div>
            <div class="fac-badge">
              <span>Factura Electrónica de Venta</span>
              <h2>#FE-${String(data.id_factura).padStart(6, '0')}</h2>
              <span>Emisión: ${new Date(data.fecha).toLocaleDateString('es-ES')}</span>
            </div>
          </div>

          <div class="info-grid">
            <div><b>Cliente:</b> ${data.cliente || 'Consumidor final'}</div>
            <div><b>Teléfono:</b> ${data.telefono || 'No registrado'}</div>
            <div><b>Vehículo:</b> ${data.vehiculo || 'No registrado'}</div>
            <div><b>Método de Pago:</b> ${data.metodo_pago || 'Efectivo'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Tipo</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${srvs
          .map(
            (s) => `
                <tr>
                  <td>${s.nombre_servicio}</td>
                  <td>Servicio</td>
                  <td class="text-right">$${parseFloat(s.costo).toLocaleString('es-CO')}</td>
                </tr>`
          )
          .join('')}
              ${reps
          .map(
            (r) => `
                <tr>
                  <td>${r.nombre} ${r.marca ? '(' + r.marca + ')' : ''} x${r.cantidad}</td>
                  <td>Repuesto</td>
                  <td class="text-right">$${parseFloat(r.total).toLocaleString('es-CO')}</td>
                </tr>`
          )
          .join('')}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-final">
              <span>Total Pagado:</span>
              <span>$${totalNum.toLocaleString('es-CO')}</span>
            </div>
          </div>

          <div class="footer">
            <p>Gracias por confiar en ${FACTURA_EMPRESA.nombre} — Comprobante oficial de venta</p>
          </div>
          <script>window.print();</script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err) {
      showToast(err.message || 'Error preparando PDF', 'error');
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const totalRecaudado = facturas.reduce((sum, f) => sum + (parseFloat(f.total) || 0), 0);

  return (
    <div className="facturacion-container">
      {/* Toast Flotante */}
      {toast && (
        <div className={`toast-floating ${toast.type}`}>
          <i
            className={`bi ${toast.type === 'success'
                ? 'bi-check-circle-fill'
                : 'bi-exclamation-triangle-fill'
              }`}
          ></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header superior */}
      <div className="facturacion-header">
        <div className="facturacion-header-info">
          <h2>Módulo de Facturación</h2>
          <p>Comprobantes de pago, liquidación de órdenes y control de recaudación.</p>
        </div>
        <button className="btn-primary-custom" onClick={handleOpenCreate}>
          <i className="bi bi-plus-lg"></i>
          <span>Nueva factura</span>
        </button>
      </div>

      {/* Barra de búsqueda y contadores */}
      <div className="facturacion-actions-row">
        <div className="search-bar">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Buscar por factura #, cliente, vehículo o medio de pago..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="stat-pill">
          <span>{facturas.length}</span> facturas
        </div>
        <div className="stat-pill stat-total">
          Total recaudado: <span>${totalRecaudado.toLocaleString('es-CO')}</span>
        </div>
      </div>

      {/* Tabla de Facturas */}
      <div className="card-custom">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Método de Pago</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    Cargando facturas...
                  </td>
                </tr>
              ) : facturas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    No se encontraron facturas emitidas.
                  </td>
                </tr>
              ) : (
                facturas.map((f) => (
                  <tr key={f.id_factura}>
                    <td>
                      <span className="td-factura-num">#FE-{String(f.id_factura).padStart(4, '0')}</span>
                    </td>
                    <td>{formatearFecha(f.fecha)}</td>
                    <td>
                      <div className="td-primary">{f.cliente}</div>
                    </td>
                    <td className="td-muted">{f.vehiculo}</td>
                    <td>
                      <span className="metodo-badge">
                        <i
                          className={`bi ${f.metodo_pago === 'Tarjeta'
                              ? 'bi-credit-card'
                              : f.metodo_pago === 'Transferencia'
                                ? 'bi-bank'
                                : 'bi-cash-coin'
                            }`}
                        ></i>
                        {f.metodo_pago}
                      </span>
                    </td>
                    <td>
                      <span className="td-total">
                        ${parseFloat(f.total || 0).toLocaleString('es-CO')}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          className="btn-accion ver"
                          title="Ver detalle completo"
                          onClick={() => handleVerDetalle(f.id_factura)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button
                          className="btn-accion dian"
                          title="Imprimir / Comprobante PDF"
                          onClick={() => handleDescargarPDF(f.id_factura)}
                        >
                          <i className="bi bi-file-earmark-pdf"></i>
                        </button>
                        <button
                          className="btn-accion eliminar"
                          title="Eliminar factura"
                          onClick={() => handleOpenDelete(f)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Nueva Factura ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">Generar Factura de Venta</h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isSaving && setIsModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveFactura}>
              <div className="modal-body-custom">
                {modalError && (
                  <div className="alert-modal-error">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group-full">
                    <label className="field-label">Orden de trabajo finalizada *</label>
                    <select
                      className="field-input"
                      value={selectedOrdenId}
                      onChange={(e) => handleOrdenChange(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar orden por facturar...</option>
                      {ordenesSinFacturar.length === 0 ? (
                        <option disabled value="">
                          No hay órdenes pendientes de cobro
                        </option>
                      ) : (
                        ordenesSinFacturar.map((o) => (
                          <option key={o.id_orden} value={o.id_orden}>
                            Orden #{o.id_orden} — {o.cliente} | {o.vehiculo}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="form-group-full">
                    <label className="field-label">Método de pago *</label>
                    <select
                      className="field-input"
                      value={selectedMetodoPago}
                      onChange={(e) => setSelectedMetodoPago(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar medio de pago...</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                      <option value="Transferencia">Transferencia bancaria</option>
                    </select>
                  </div>

                  {/* Previsualización del Total */}
                  {previewTotales && (
                    <div className="form-group-full">
                      <div className="total-preview">
                        <div className="total-row">
                          <span>Subtotal Servicios:</span>
                          <strong>${previewTotales.servicios.toLocaleString('es-CO')}</strong>
                        </div>
                        <div className="total-row">
                          <span>Subtotal Repuestos:</span>
                          <strong>${previewTotales.repuestos.toLocaleString('es-CO')}</strong>
                        </div>
                        <div className="total-row total-final">
                          <span>TOTAL A LIQUIDAR:</span>
                          <span>${previewTotales.total.toLocaleString('es-CO')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn-secondary-custom"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-custom"
                  disabled={isSaving || !selectedOrdenId || !selectedMetodoPago}
                >
                  <i className="bi bi-check-lg"></i>
                  <span>{isSaving ? 'Emitiendo...' : 'Emitir factura'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Ver Detalle Factura ── */}
      {isDetalleModalOpen && facturaDetalle && (
        <div className="modal-overlay" onClick={() => setIsDetalleModalOpen(false)}>
          <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                Factura #FE-{String(facturaDetalle.id_factura).padStart(4, '0')}
              </h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsDetalleModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="modal-body-custom">
              <div className="factura-detalle">
                {/* Header Factura */}
                <div className="factura-header">
                  <div>
                    <div className="sub-lbl">CLIENTE</div>
                    <div className="fac-client-name">
                      {facturaDetalle.cliente || 'Desconocido'}
                    </div>
                    <div className="fac-client-sub">{facturaDetalle.telefono || ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="sub-lbl">FECHA DE EMISIÓN</div>
                    <div className="fac-client-name">
                      {formatearFecha(facturaDetalle.fecha)}
                    </div>
                    <span className="metodo-badge mt-1">
                      {facturaDetalle.metodo_pago}
                    </span>
                  </div>
                </div>

                <div className="fac-vehiculo-row">
                  <i className="bi bi-car-front text-primary me-2"></i>
                  <span>{facturaDetalle.vehiculo}</span>
                </div>

                {/* Servicios */}
                {(facturaDetalle.servicios || []).length > 0 && (
                  <div className="factura-seccion">
                    <div className="factura-seccion-title">Servicios aplicados</div>
                    {facturaDetalle.servicios.map((s) => (
                      <div key={s.id_servicio} className="factura-item">
                        <span>{s.nombre_servicio}</span>
                        <strong>${parseFloat(s.costo).toLocaleString('es-CO')}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {/* Repuestos */}
                {(facturaDetalle.repuestos || []).length > 0 && (
                  <div className="factura-seccion">
                    <div className="factura-seccion-title">Repuestos y repuestos</div>
                    {facturaDetalle.repuestos.map((r) => (
                      <div key={r.id_repuesto} className="factura-item">
                        <span>
                          {r.nombre} {r.marca ? `(${r.marca})` : ''} x{r.cantidad}
                        </span>
                        <strong>${parseFloat(r.total).toLocaleString('es-CO')}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                <div className="factura-total">
                  <span>TOTAL FACTURADO</span>
                  <span>
                    ${parseFloat(facturaDetalle.total || 0).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn-primary-custom"
                onClick={() => handleDescargarPDF(facturaDetalle.id_factura)}
              >
                <i className="bi bi-file-earmark-pdf-fill"></i>
                <span>Imprimir / Descargar PDF</span>
              </button>
              <button
                type="button"
                className="btn-secondary-custom"
                onClick={() => setIsDetalleModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminar ── */}
      {isDeleteModalOpen && facturaToDelete && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-dialog-custom modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">Confirmar anulación</h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body-custom" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <i
                className="bi bi-exclamation-triangle-fill"
                style={{
                  fontSize: '38px',
                  color: '#ef4444',
                  marginBottom: '12px',
                  display: 'inline-block'
                }}
              ></i>
              <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
                ¿Eliminar la factura{' '}
                <strong style={{ color: '#1e293b' }}>
                  #FE-{String(facturaToDelete.id_factura).padStart(4, '0')}
                </strong>
                ?
                <br />
                <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                  Esta acción revertirá el cobro de la orden asociada.
                </span>
              </p>
            </div>
            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn-secondary-custom"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn-danger-custom" onClick={handleConfirmDelete}>
                <i className="bi bi-trash"></i>
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
