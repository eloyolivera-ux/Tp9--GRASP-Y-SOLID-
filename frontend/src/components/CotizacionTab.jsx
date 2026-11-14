import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function CotizacionTab({ onProcederAlPago, eventos, refreshData }) {
  const [selectedEventoId, setSelectedEventoId] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState('');
  const [cantidad, setCantidad] = useState(2);
  const [tarifas, setTarifas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  // Al cargar o cambiar eventos, seleccionar el primero si no hay selección
  useEffect(() => {
    if (eventos && eventos.length > 0 && !selectedEventoId) {
      setSelectedEventoId(eventos[0].id);
    }
  }, [eventos, selectedEventoId]);

  // Al seleccionar un evento, cargar sus sectores y tarifas reales
  useEffect(() => {
    if (selectedEventoId) {
      api.getPreciosPorEvento(selectedEventoId)
        .then((data) => {
          setTarifas(data || []);
          if (data && data.length > 0) {
            setSelectedSectorId(data[0].sector.id);
          } else {
            setSelectedSectorId('');
          }
        })
        .catch(() => setTarifas([]));
    }
  }, [selectedEventoId]);

  // Cotizar automáticamente o al presionar el botón
  const handleCotizar = async (e) => {
    if (e) e.preventDefault();
    if (!selectedEventoId || !selectedSectorId) return;

    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const resp = await api.cotizar({
        eventoId: Number(selectedEventoId),
        sectorId: Number(selectedSectorId),
        cantidad: Number(cantidad)
      });
      // Se enriquece la respuesta con nombres legibles para mostrarla y pasarla a la pestaña de pago
      setResultado({
        ...resp,
        nombreEvento: eventoSeleccionado?.nombre,
        nombreSector: tarifaSeleccionada?.sector.nombre,
      });
    } catch (err) {
      setError({
        status: err.status || 400,
        message: err.message || 'Error al cotizar entradas'
      });
    } finally {
      setLoading(false);
    }
  };

  // Botones para simular los criterios de aceptación sobre el evento actualmente seleccionado
  const aplicarEscenario = (escenario) => {
    setError(null);
    setResultado(null);

    if (escenario === 1) {
      // Escenario 1: Cotización exitosa con cantidad válida
      setCantidad(2);
    } else if (escenario === 2) {
      // Escenario 2: Capacidad insuficiente (pide 999 entradas para superar el stock)
      setCantidad(999);
    } else if (escenario === 3) {
      // Escenario 3: Cantidad inválida (0 entradas)
      setCantidad(0);
    }
  };

  const eventoSeleccionado = eventos.find((ev) => String(ev.id) === String(selectedEventoId));
  const tarifaSeleccionada = tarifas.find((t) => String(t.sector.id) === String(selectedSectorId));

  return (
    <div className="tab-view-container">
      <div className="view-header">
        <div>
          <h2>Historia de Usuario 1: Selección y Cotización</h2>
          <p className="subtitle">
            Seleccioná un evento de la cartelera, el sector deseado y la cantidad de entradas para conocer el costo total exacto.
          </p>
        </div>
        <div className="preset-buttons">
          <span className="preset-label">Probar Criterios de Aceptación:</span>
          <button className="preset-btn success" onClick={() => aplicarEscenario(1)}>
            🎯 Escenario 1: Cotización Válida (x2)
          </button>
          <button className="preset-btn warning" onClick={() => aplicarEscenario(2)}>
            ⚠️ Escenario 2: Capacidad Insuficiente (x999)
          </button>
          <button className="preset-btn danger" onClick={() => aplicarEscenario(3)}>
            ❌ Escenario 3: Cantidad Inválida (0)
          </button>
        </div>
      </div>

      <div className="two-columns-layout">
        {/* Formulario de Cotización */}
        <div className="card glass-card">
          <h3 className="card-title">
            <span className="title-icon">🎟️</span> Parámetros de Selección
          </h3>

          <form onSubmit={handleCotizar} className="form-grid">
            <div className="form-group">
              <label>Evento:</label>
              <select
                value={selectedEventoId}
                onChange={(e) => setSelectedEventoId(e.target.value)}
                className="select-input"
              >
                {eventos.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nombre} — {ev.lugar ? ev.lugar.nombre : 'Recinto'}
                  </option>
                ))}
              </select>
            </div>

            {eventoSeleccionado && (
              <div className="preview-tariff-badge">
                <span>📍 <strong>{eventoSeleccionado.lugar?.nombre}</strong> · {eventoSeleccionado.lugar?.direccion}</span>
                <span>📅 {new Date(eventoSeleccionado.fechaHora).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}

            <div className="form-group">
              <label>Sector Disponible:</label>
              <select
                value={selectedSectorId}
                onChange={(e) => setSelectedSectorId(e.target.value)}
                className="select-input"
              >
                {tarifas.map((t) => (
                  <option key={t.id} value={t.sector.id}>
                    {t.sector.nombre} — ${Number(t.precio).toLocaleString('es-AR')} (Capacidad: {t.sector.capacidad})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cantidad de Entradas:</label>
              <div className="quantity-controls">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setCantidad(Math.max(-1, Number(cantidad) - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="input-field font-mono"
                  style={{ textAlign: 'center' }}
                />
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setCantidad(Number(cantidad) + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {tarifaSeleccionada && (
              <div className="preview-tariff-badge">
                <span>Precio fijado por entrada:</span>
                <strong className="text-blue-accent font-mono">
                  ${Number(tarifaSeleccionada.precio).toLocaleString('es-AR')}
                </strong>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedEventoId || !selectedSectorId}
              className="btn-primary full-width"
            >
              {loading ? 'Calculando con Capa de Servicio...' : 'Calcular Costo Total 💰'}
            </button>
          </form>
        </div>

        {/* Panel de Resultado / Estado */}
        <div className="card glass-card">
          <h3 className="card-title">
            <span className="title-icon">📊</span> Desglose de Cotización
          </h3>

          {/* Estado inicial sin cotización previa */}
          {!resultado && !error && !loading && (
            <div className="empty-state">
              <span className="empty-icon">🧾</span>
              <p>Seleccioná evento, sector y cantidad, luego presioná <strong>Calcular Costo Total</strong> para consultar disponibilidad y tarifas en vivo.</p>
            </div>
          )}

          {/* Spinner de carga */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Consultando disponibilidad y delegando cálculo al Experto en Información...</p>
            </div>
          )}

          {/* Escenario 1: Cotización Exitosa */}
          {resultado && (
            <div className="result-box success-box">
              <div className="badge-status badge-success">
                <span>✓ HTTP 200 OK — Cotización Exitosa</span>
              </div>

              <div className="breakdown-list">
                <div className="breakdown-item">
                  <span className="item-label">Evento:</span>
                  <span className="item-val font-mono">{resultado.nombreEvento}</span>
                </div>
                <div className="breakdown-item">
                  <span className="item-label">Sector:</span>
                  <span className="item-val font-mono">{resultado.nombreSector}</span>
                </div>
                <div className="breakdown-item">
                  <span className="item-label">Cantidad:</span>
                  <span className="item-val font-mono">{resultado.cantidad} entradas</span>
                </div>
                <div className="breakdown-item">
                  <span className="item-label">Precio Unitario:</span>
                  <span className="item-val font-mono">${Number(resultado.precio_unitario).toLocaleString('es-AR')}</span>
                </div>
                <div className="breakdown-item">
                  <span className="item-label">Subtotal ({resultado.cantidad} × ${Number(resultado.precio_unitario).toLocaleString('es-AR')}):</span>
                  <span className="item-val font-mono">${Number(resultado.subtotal).toLocaleString('es-AR')}</span>
                </div>
                <div className="breakdown-item">
                  <span className="item-label">Entradas reservadas para vos (IDs):</span>
                  <span className="item-val font-mono">{resultado.entrada_ids.join(', ')}</span>
                </div>
                <div className="breakdown-item total-row">
                  <span className="item-label">Costo Total Exacto:</span>
                  <span className="total-highlight font-mono">
                    ${Number(resultado.total).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-action-next full-width"
                onClick={() => onProcederAlPago(resultado)}
              >
                Proceder al Pago con esta Cotización 💳 ➔
              </button>
            </div>
          )}

          {/* Escenarios 2 y 3: Errores controlados */}
          {error && (
            <div className="result-box error-box">
              <div className="badge-status badge-error">
                <span>✕ HTTP {error.status} — Cotización Rechazada</span>
              </div>
              <div className="error-message-content">
                <p className="error-title">Mensaje retornado por el Backend:</p>
                <div className="error-badge font-mono">"{error.message}"</div>
                <p className="error-desc">
                  {error.message.startsWith('Capacidad insuficiente') && (
                    <span><strong>Escenario 2 Cumplido:</strong> No existen suficientes entradas en estado <em>Disponible</em> para el sector y evento solicitados.</span>
                  )}
                  {error.message.includes('mayor a cero') && (
                    <span><strong>Escenario 3 Cumplido:</strong> La cantidad solicitada debe ser estrictamente mayor a 0.</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
