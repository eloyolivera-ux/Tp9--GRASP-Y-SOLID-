import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import QrCodeBadge from './QrCodeBadge';

export default function AccesoTab({ codigoQRInicial }) {
  const [codigoQR, setCodigoQR] = useState(codigoQRInicial || '');
  const [entradas, setEntradas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  // Actualizar si se recibe un QR desde el flujo de pago previo
  useEffect(() => {
    if (codigoQRInicial) {
      setCodigoQR(codigoQRInicial);
      setError(null);
      setResultado(null);
    }
  }, [codigoQRInicial]);

  // Entradas reales de la base: sirven para los atajos de prueba y para mostrar evento/sector del ingreso
  const cargarEntradas = () => api.getEntradas().then(setEntradas).catch(() => setEntradas([]));
  useEffect(() => { cargarEntradas(); }, []);

  const handleValidarAcceso = async (e) => {
    if (e) e.preventDefault();
    if (!codigoQR || !codigoQR.trim()) return;

    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const resp = await api.escanearAcceso(codigoQR.trim());
      const lista = await api.getEntradas().catch(() => entradas);
      setEntradas(lista);
      const entrada = lista.find((en) => en.codigo_qr === codigoQR.trim());
      const eventos = await api.getEventos().catch(() => []);
      const sectores = await api.getSectores().catch(() => []);
      setResultado({
        ...resp,
        codigoQR: codigoQR.trim(),
        evento: eventos.find((ev) => ev.id === entrada?.evento_id)?.nombre,
        sector: sectores.find((se) => se.id === entrada?.sector_id)?.nombre,
      });
    } catch (err) {
      setError({
        status: err.status || 400,
        message: err.message || 'Error al validar acceso'
      });
    } finally {
      setLoading(false);
    }
  };

  // Atajos: eligen un QR real de la base según el estado de la entrada (o uno inventado para el QR falso)
  const seleccionarPreset = (estado) => {
    setError(null);
    setResultado(null);
    if (estado === 'FALSO') { setCodigoQR('QR-FALSO-ADULTERADO-999'); return; }
    const candidata = (estado === 'NO_EMITIDA'
      ? entradas.find((e) => e.estado === 'RESERVADA') || entradas.find((e) => e.estado === 'DISPONIBLE')
      : entradas.find((e) => e.estado === estado));
    if (candidata) {
      setCodigoQR(candidata.codigo_qr);
    } else {
      setCodigoQR('');
      setError({ status: 0, message: `No hay entradas en estado ${estado.replace('_', ' ')}: ${estado === 'EMITIDA' ? 'comprá una en la pestaña de pago' : estado === 'UTILIZADA' ? 'escaneá antes una entrada emitida' : 'cargá datos con seed.py'}.` });
    }
  };

  return (
    <div className="tab-view-container">
      <div className="view-header">
        <div>
          <h2>Historia de Usuario 3: Control de Acceso en Puerta</h2>
          <p className="subtitle">
            Módulo para acomodadores y torniquetes: escanea el código QR del espectador para validar ingreso y prevenir fraude.
          </p>
        </div>

        <div className="preset-buttons">
          <span className="preset-label">Criterios de Aceptación:</span>
          <button className="preset-btn success" onClick={() => seleccionarPreset('EMITIDA')}>
            🟢 Esc. 1: Emitida Válida
          </button>
          <button className="preset-btn warning" onClick={() => seleccionarPreset('UTILIZADA')}>
            🔴 Esc. 2: Ya Utilizada
          </button>
          <button className="preset-btn danger" onClick={() => seleccionarPreset('FALSO')}>
            ❌ Esc. 3: QR Falso
          </button>
          <button className="preset-btn info" onClick={() => seleccionarPreset('NO_EMITIDA')}>
            ⚪ Esc. 4: No Pagada
          </button>
        </div>
      </div>

      <div className="two-columns-layout">
        {/* Terminal del Escáner */}
        <div className="card glass-card">
          <h3 className="card-title">
            <span className="title-icon">📷</span> Escáner Óptico de Torniquete
          </h3>

          <div className="scanner-frame">
            <div className="scanner-line"></div>
            <div className="scanner-corner top-left"></div>
            <div className="scanner-corner top-right"></div>
            <div className="scanner-corner bottom-left"></div>
            <div className="scanner-corner bottom-right"></div>

            <div className="scanner-content">
              {codigoQR ? (
                <div style={{ textAlign: 'center' }}>
                  <QrCodeBadge code={codigoQR} size={110} />
                  <div className="ticket-qr-code font-mono" style={{ marginTop: '6px' }}>
                    {codigoQR}
                  </div>
                </div>
              ) : (
                <>
                  <span className="scanner-icon">📷</span>
                  <span className="scanner-tip">Apunta el código QR al lector</span>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleValidarAcceso} className="form-grid">
            <div className="form-group">
              <label>Código QR a Escanear:</label>
              <div className="qr-input-wrapper">
                <input
                  type="text"
                  value={codigoQR}
                  onChange={(e) => setCodigoQR(e.target.value)}
                  placeholder="Pegá o elegí un código QR"
                  className="input-field font-mono"
                  required
                />
              </div>
              <span className="help-text">
                Ingresá o escaneá el código QR impreso en el ticket digital del espectador.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !codigoQR}
              className="btn-primary full-width"
            >
              {loading ? 'Consultando Base de Datos en Tiempo Real...' : 'Escanear y Validar Acceso 🔍'}
            </button>
          </form>
        </div>

        {/* Torniquete Electrónico y Respuesta */}
        <div className="card glass-card">
          <h3 className="card-title">
            <span className="title-icon">🚪</span> Estado del Torniquete en Puerta
          </h3>

          {/* Esperando escaneo */}
          {!resultado && !error && !loading && (
            <div className="turnstile-idle">
              <div className="turnstile-light"></div>
              <p>Esperando lectura de código QR en la entrada...</p>
            </div>
          )}

          {/* Spinner de lectura */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Verificando autenticidad del QR, hora y estado de entrada...</p>
            </div>
          )}

          {/* Escenario 1: Acceso Permitido */}
          {resultado && (
            <div className="turnstile-result approved">
              <div className="turnstile-icon-badge approved">✓</div>
              <h3 className="access-title">Acceso Permitido</h3>
              <p className="access-subtitle">{resultado.mensaje}</p>

              <div className="access-details-card">
                <div className="access-row">
                  <span>Evento:</span>
                  <strong>{resultado.evento}</strong>
                </div>
                <div className="access-row">
                  <span>Sector:</span>
                  <strong>{resultado.sector}</strong>
                </div>
                <div className="access-row">
                  <span>Código Validado:</span>
                  <span className="font-mono text-cyan">{resultado.codigoQR}</span>
                </div>
                <div className="access-row">
                  <span>Hora de Ingreso:</span>
                  <span className="font-mono text-blue-light">{new Date(resultado.hora_ingreso).toLocaleString('es-AR')}</span>
                </div>
                <div className="access-row">
                  <span>Nuevo Estado:</span>
                  <span className="badge-used">UTILIZADA</span>
                </div>
              </div>

              <p className="turnstile-action-note">
                El torniquete se ha desbloqueado. La entrada queda inhabilitada para futuros ingresos.
              </p>
            </div>
          )}

          {/* Escenarios 2, 3 y 4: Acceso Denegado */}
          {error && (
            <div className="turnstile-result denied">
              <div className="turnstile-icon-badge denied">✕</div>
              <h3 className="access-title">{error.status === 0 ? 'Sin datos para la prueba' : 'Acceso Denegado'}</h3>

              <div className="turnstile-error-box">
                <span className="error-badge font-mono">
                  {error.status === 0 ? '' : `HTTP ${error.status}: `}{error.message}
                </span>
                <p>
                  {error.status === 409 && (
                    <span><strong>Prevención de Fraude:</strong> Este código QR ya fue escaneado e ingresado previamente. No se permite reingreso.</span>
                  )}
                  {error.status === 404 && (
                    <span><strong>Ticket Falso:</strong> El código no coincide con ningún registro emitido en la base de datos oficial.</span>
                  )}
                  {error.status === 403 && (
                    <span><strong>Sin Pago Registrado:</strong> El ticket existe en el recinto pero nunca fue pagado ni emitido.</span>
                  )}
                </p>
              </div>

              {error.status !== 0 && (
                <p className="turnstile-action-note">
                  Torniquete BLOQUEADO. Derivar al espectador a Atención al Cliente o Boletería.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
