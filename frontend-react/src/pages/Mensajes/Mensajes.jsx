import React, { useEffect, useState } from 'react';
import { getMensajes } from '../../services/mensajesService';
import './Mensajes.css';

export default function Mensajes() {
  const [mensajes, setMensajes] = useState([]);
  const [filteredMensajes, setFilteredMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroPlataforma, setFiltroPlataforma] = useState('todas');

  const fetchMensajes = async () => {
    try {
      setLoading(true);
      const data = await getMensajes();
      setMensajes(data || []);
      setFilteredMensajes(data || []);
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMensajes();
  }, []);

  useEffect(() => {
    let result = [...mensajes];

    if (filtroPlataforma !== 'todas') {
      result = result.filter(m => m.plataforma?.toLowerCase() === filtroPlataforma.toLowerCase());
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(m =>
        m.numero_cliente?.toLowerCase().includes(term) ||
        m.mensaje?.toLowerCase().includes(term) ||
        m.cliente_nombre?.toLowerCase().includes(term) ||
        m.cliente_apellido?.toLowerCase().includes(term) ||
        m.placa?.toLowerCase().includes(term)
      );
    }

    setFilteredMensajes(result);
  }, [searchTerm, filtroPlataforma, mensajes]);

  const countWhatsApp = mensajes.filter(m => m.plataforma?.toLowerCase() === 'whatsapp').length;
  const countTelegram = mensajes.filter(m => m.plataforma?.toLowerCase() === 'telegram').length;

  return (
    <div className="mensajes-container">
      {/* Hero Header */}
      <div className="mensajes-hero">
        <div>
          <h2>
            <i className="bi bi-chat-dots-fill"></i>
            Centro de Mensajes & Notificaciones
          </h2>
          <p>Supervisa el historial de interacciones con clientes enviadas por WhatsApp y Telegram</p>
        </div>
        <button className="btn-primary-action" onClick={fetchMensajes}>
          <i className="bi bi-arrow-clockwise"></i>
          Actualizar
        </button>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="mensajes-stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <i className="bi bi-envelope-paper-fill"></i>
          </div>
          <div className="stat-info">
            <div className="stat-value">{mensajes.length}</div>
            <div className="stat-label">Mensajes Registrados</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon whatsapp">
            <i className="bi bi-whatsapp"></i>
          </div>
          <div className="stat-info">
            <div className="stat-value">{countWhatsApp}</div>
            <div className="stat-label">WhatsApp</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon telegram">
            <i className="bi bi-telegram"></i>
          </div>
          <div className="stat-info">
            <div className="stat-value">{countTelegram}</div>
            <div className="stat-label">Telegram</div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="mensajes-toolbar">
        <div className="search-box">
          <i className="bi bi-search text-muted"></i>
          <input
            type="text"
            placeholder="Buscar por teléfono, cliente, placa o contenido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <select
            className="filter-select"
            value={filtroPlataforma}
            onChange={(e) => setFiltroPlataforma(e.target.value)}
          >
            <option value="todas">Todas las plataformas</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Telegram">Telegram</option>
          </select>
        </div>
      </div>

      {/* Tabla de Mensajes */}
      <div className="mensajes-list-card">
        <div className="table-responsive">
          <table className="table-mensajes">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Plataforma</th>
                <th>Cliente / Destino</th>
                <th>Orden / Vehículo</th>
                <th>Tipo de Evento</th>
                <th>Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <i className="bi bi-arrow-clockwise spinning"></i>
                    <p>Cargando mensajes...</p>
                  </td>
                </tr>
              ) : filteredMensajes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <i className="bi bi-chat-square-text"></i>
                    <h4>No se encontraron mensajes</h4>
                    <p>Los mensajes generados o notificaciones enviadas a clientes aparecerán aquí.</p>
                  </td>
                </tr>
              ) : (
                filteredMensajes.map((m) => (
                  <tr key={m.id_mensaje}>
                    <td>
                      <small className="text-muted">
                        {new Date(m.fecha).toLocaleString('es-CO', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </small>
                    </td>
                    <td>
                      <span className={`platform-badge ${m.plataforma?.toLowerCase()}`}>
                        <i className={`bi bi-${m.plataforma?.toLowerCase()}`}></i>
                        {m.plataforma}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong>{m.cliente_nombre ? `${m.cliente_nombre} ${m.cliente_apellido}` : 'Cliente no asociado'}</strong>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                          <i className="bi bi-telephone"></i> {m.numero_cliente}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="badge bg-light text-dark border">
                          Orden #{m.id_orden}
                        </span>
                        {m.placa && (
                          <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                            <strong>{m.placa}</strong> {m.marca} {m.modelo}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="tipo-badge">{m.tipo_mensaje}</span>
                    </td>
                    <td>
                      <div className="text-msg">{m.mensaje}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
