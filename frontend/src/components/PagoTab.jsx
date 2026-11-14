import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import QrCodeBadge from './QrCodeBadge';

export default function PagoTab({ cotizacionInicial, onCopiarQRParaAcceso, clientes, eventos }) {
  const [clienteId, setClienteId] = useState('');
  const [eventoId, setEventoId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [cantidad, setCantidad] = useState(2);
  const [tarifas, setTarifas] = useState([]);

  // Datos de Tarjeta
  const [numeroTarjeta, setNumeroTarjeta] = useState('4532 1111 2222 3333');
  const [nombreTitular, setNombreTitular] = useState('Juan Pérez');
  const [mesExpiracion, setMesExpiracion] = useState(12);
  const [anioExpiracion, setAnioExpiracion] = useState(2028);
  const [cvv, setCvv] = useState('123');

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [cotizacion, setCotizacion] = useState(null); // trae las entrada_ids que se van a pagar
  const [aviso, setAviso] = useState(null);

  // Inicializar clientes
  useEffect(() => {
    if (clientes && clientes.length > 0 && !clienteId) {
      setClienteId(clientes[0].id);
      setNombreTitular(clientes[0].nombre);
    }
  }, [clientes, clienteId]);

  // Si se llega desde la pestaña de cotización, se precargan sus datos (una sola vez por cotización)
  useEffect(() => {
    if (cotizacionInicial) {
      setEventoId(cotizacionInicial.evento_id);
      setSectorId(cotizacionInicial.sector_id);
      setCantidad(cotizacionInicial.cantidad);
      setCotizacion(cotizacionInicial);
    }
  }, [cotizacionInicial]);

  // Si no hay cotización previa, se parte del primer evento de la cartelera
  useEffect(() => {
    if (!cotizacionInicial && eventos && eventos.length > 0 && !eventoId) {
      setEventoId(eventos[0].id);
    }
  }, [cotizacionInicial, eventos, eventoId]);

  // Cargar sectores del evento seleccionado
  useEffect(() => {
    if (eventoId) {
      api.getPreciosPorEvento(eventoId)
        .then((data) => {
          setTarifas(data || []);
          if (data && data.length > 0 && (!sectorId || !data.some(d => String(d.sector.id) === String(sectorId)))) {
            setSectorId(data[0].sector.id);
          }
        })
        .catch(() => setTarifas([]));
    }
  }, [eventoId, sectorId]);

  const handleClienteChange = (id) => {
    setClienteId(id);
    const c = clientes.find((item) => String(item.id) === String(id));
    if (c) {
      setNombreTitular(c.nombre);
    }
  };

  // La cotización vigente solo sirve si coincide con lo que está elegido en el formulario
  const cotizacionVigente = () =>
    cotizacion &&
    String(cotizacion.evento_id) === String(eventoId) &&
    String(cotizacion.sector_id) === String(sectorId) &&
    Number(cotizacion.cantidad) === Number(cantidad)
      ? cotizacion
      : null;

  // Si el usuario llegó sin cotizar, se cotiza primero para obtener las entradas a pagar
  const obtenerCotizacion = async () => {
    const vigente = cotizacionVigente();
    if (vigente) return vigente;
    const nueva = await api.cotizar({
      eventoId: Number(eventoId), sectorId: Number(sectorId), cantidad: Number(cantidad),
    });
    setCotizacion(nueva);
    return nueva;
  };

  const armarTarjeta = () => ({
    numero: numeroTarjeta.replace(/\s/g, ''),
    titular: nombreTitular,
    vencimiento: `${String(mesExpiracion).padStart(2, '0')}/${String(anioExpiracion).slice(-2)}`,
    cvv,
  });

  const handlePagar = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setResultado(null);
    setAviso(null);

    try {
      const cot = await obtenerCotizacion();
      const resp = await api.iniciarPago({
        clienteId: Number(clienteId),
        entradaIds: cot.entrada_ids,
        tarjeta: armarTarjeta(),
      });
      const cliente = clientes.find((c) => String(c.id) === String(clienteId));
      setResultado({
        ...resp,
        evento: eventoSeleccionado?.nombre,
        sector: tarifaSeleccionada?.sector.nombre,
        nombreCliente: cliente?.nombre,
      });
      setCotizacion(null); // esas entradas ya fueron emitidas
    } catch (err) {
      setError({ status: err.status ?? 400, message: err.message || 'Error al procesar pago' });
    } finally {
      setLoading(false);
    }
  };

  // Presets para los 3 escenarios de la HU-2
  const setTarjetaAprobada = () => {
    setNumeroTarjeta('4532 1111 2222 3333');
    setError(null);
  };

  const setTarjetaRechazada = () => {
    setNumeroTarjeta('4532 1111 2222 0000'); // Termina en 0000 -> rechazo de pasarela
    setError(null);
  };

  // Escenario 3: "otro usuario" paga las MISMAS entradas cotizadas antes de que este cliente lo haga.
  const setPruebaConcurrencia = async () => {
    setLoading(true);
    setError(null);
    setResultado(null);
    setAviso(null);
    try {
      const cot = await obtenerCotizacion();
      const otroCliente = clientes.find((c) => String(c.id) !== String(clienteId)) || clientes[0];
      await api.iniciarPago({
        clienteId: otroCliente.id,
        entradaIds: cot.entrada_ids,
        tarjeta: { numero: '4111111111111111', titular: otroCliente.nombre, vencimiento: '12/28', cvv: '123' },
      });
      setNumeroTarjeta('4532 1111 2222 3333');
      setAviso(`${otroCliente.nombre} acaba de comprar las entradas ${cot.entrada_ids.join(', ')}. Ahora presioná "Pagar y Emitir Entradas": el sistema debe abortar antes de consultar a la pasarela.`);
    } catch (err) {
      setError({ status: err.status ?? 400, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const eventoSeleccionado = eventos.find(e => String(e.id) === String(eventoId));
  const tarifaSeleccionada = tarifas.find(t => String(t.sector.id) === String(sectorId));
  const montoEstimado = tarifaSeleccionada ? Number(tarifaSeleccionada.precio) * Number(cantidad) : 0;

  return (
    <div className="tab-view-container">
      <div className="view-header">
        <div>
          <h2>Historia de Usuario 2: Procesamiento de Pago y Emisión</h2>
          <p className="subtitle">
            Simula el pago seguro de tus entradas. Al aprobarse, el sistema emite automáticamente las entradas con sus códigos QR de acceso.
          </p>
        </div>
        <div className="preset-buttons">
          <span className="preset-label">Simular Pasarela:</span>
          <button className="preset-btn success" onClick={setTarjetaAprobada}>
            💳 Tarjeta Válida (Escenario 1)
          </button>
          <button className="preset-btn warning" onClick={setTarjetaRechazada}>
            🚫 Tarjeta Rechazada (...0000)
          </button>
          <button className="preset-btn danger" onClick={setPruebaConcurrencia}>
            ⚡ Otro usuario compra primero (Escenario 3)
          </button>
        </div>
      </div>

      <div className="two-columns-layout">
        {/* Formulario de Pago con Tarjeta */}
        <div className="card glass-card">
          <h3 className="card-title">
            <span className="title-icon">💳</span> Datos de la Transacción
          </h3>

          {/* Tarjeta visual estilizada */}
          <div className="virtual-card">
            <div className="card-chip">💳</div>
            <div className="card-number font-mono">{numeroTarjeta || '•••• •••• •••• ••••'}</div>
            <div className="card-footer">
              <div className="card-holder">
                <span className="card-label">TITULAR</span>
                <span className="card-name">{nombreTitular || 'NOMBRE APELLIDO'}</span>
              </div>
              <div className="card-expires">
                <span className="card-label">VENCE</span>
                <span className="card-date font-mono">{mesExpiracion}/{String(anioExpiracion).slice(-2)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handlePagar} className="form-grid">
            <div className="form-group">
              <label>Cliente Comprador:</label>
              <select
                value={clienteId}
                onChange={(e) => handleClienteChange(e.target.value)}
                className="select-input"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Evento a Pagar:</label>
              <select
                value={eventoId}
                onChange={(e) => setEventoId(e.target.value)}
                className="select-input"
              >
                {eventos.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nombre} ({ev.lugar?.nombre})
                  </option>
                ))}
              </select>
            </div>

            <div className="two-inputs-row">
              <div className="form-group">
                <label>Sector:</label>
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="select-input"
                >
                  {tarifas.map((t) => (
                    <option key={t.id} value={t.sector.id}>
                      {t.sector.nombre} (${Number(t.precio).toLocaleString('es-AR')})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Cantidad:</label>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => { setCantidad(Number(e.target.value)); setAviso(null); }}
                  className="input-field font-mono"
                  required
                />
              </div>
            </div>

            {montoEstimado > 0 && (
              <div className="preview-tariff-badge">
                <span>Total a procesar:</span>
                <strong className="text-blue-accent font-mono" style={{ fontSize: '1.1rem' }}>
                  ${montoEstimado.toLocaleString('es-AR')}
                </strong>
              </div>
            )}

            <div className="form-group">
              <label>Número de Tarjeta:</label>
              <input
                type="text"
                value={numeroTarjeta}
                onChange={(e) => setNumeroTarjeta(e.target.value)}
                placeholder="4532 1111 2222 3333"
                className="input-field font-mono"
                required
              />
            </div>

            <div className="two-inputs-row">
              <div className="form-group">
                <label>Mes / Año Vencimiento:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={mesExpiracion}
                    onChange={(e) => setMesExpiracion(e.target.value)}
                    className="input-field font-mono"
                    required
                  />
                  <input
                    type="number"
                    min="2024"
                    max="2035"
                    value={anioExpiracion}
                    onChange={(e) => setAnioExpiracion(e.target.value)}
                    className="input-field font-mono"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>CVV (Seguridad):</label>
                <input
                  type="password"
                  maxLength="4"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className="input-field font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !clienteId || !eventoId || !sectorId}
              className="btn-primary full-width"
            >
              {loading ? 'Consultando Pasarela y Emitiendo Entradas...' : 'Pagar y Emitir Entradas 🔒'}
            </button>
          </form>
        </div>

        {/* Panel de Resultado / Tickets Emitidos */}
        <div className="card glass-card">
          <h3 className="card-title">
            <span className="title-icon">🎟️</span> Comprobante y Entradas Emitidas
          </h3>

          {aviso && !loading && !error && (
            <div className="result-box error-box">
              <div className="error-message-content">
                <p className="error-title">⚡ Simulación de concurrencia</p>
                <p className="error-desc">{aviso}</p>
              </div>
            </div>
          )}

          {!resultado && !error && !loading && !aviso && (
            <div className="empty-state">
              <span className="empty-icon">💳</span>
              <p>Completá el formulario de pago y hacé clic en <strong>Pagar y Emitir Entradas</strong>. Al confirmarse el cobro se generarán tus códigos QR oficiales.</p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Verificando stock, consultando pasarela de pago simulada y cambiando estado a EMITIDA...</p>
            </div>
          )}

          {/* Escenario 1: Pago Aprobado */}
          {resultado && (
            <div className="result-box success-box">
              <div className="badge-status badge-success">
                <span>✓ HTTP 201 Created — Venta #{resultado.venta_id} {resultado.estado.toUpperCase()}</span>
              </div>

              <div className="breakdown-list">
                <div className="breakdown-item">
                  <span className="item-label">Evento:</span>
                  <span className="item-val font-mono">{resultado.evento}</span>
                </div>
                <div className="breakdown-item">
                  <span className="item-label">Sector:</span>
                  <span className="item-val font-mono">{resultado.sector}</span>
                </div>
                <div className="breakdown-item">
                  <span className="item-label">Titular:</span>
                  <span className="item-val font-mono">{resultado.nombreCliente}</span>
                </div>
                <div className="breakdown-item total-row">
                  <span className="item-label">Monto Pagado:</span>
                  <span className="total-highlight font-mono">
                    ${Number(resultado.total).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              <h4 className="tickets-title">
                🎫 Entradas Emitidas ({resultado.entradas ? resultado.entradas.length : 0})
              </h4>

              <div className="tickets-grid">
                {resultado.entradas && resultado.entradas.map((ticket) => (
                  <div key={ticket.id} className="ticket-card">
                    <div className="ticket-qr-section">
                      <QrCodeBadge code={ticket.codigo_qr} size={110} />
                    </div>
                    <div className="ticket-info-section">
                      <span className="ticket-event">{resultado.evento}</span>
                      <span className="ticket-sector">{resultado.sector} · Entrada #{ticket.id}</span>
                      <div className="ticket-qr-code font-mono">{ticket.codigo_qr}</div>
                      <span className="ticket-badge-emitted">ESTADO: {ticket.estado.toUpperCase()}</span>

                      <button
                        type="button"
                        className="btn-use-qr"
                        onClick={() => onCopiarQRParaAcceso(ticket.codigo_qr)}
                      >
                        Validar en Puerta 🛡️ ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Escenarios 2 y 3: Errores controlados */}
          {error && (
            <div className="result-box error-box">
              <div className="badge-status badge-error">
                <span>✕ HTTP {error.status} — Pago No Procesado</span>
              </div>
              <div className="error-message-content">
                <p className="error-title">Mensaje retornado por el Backend:</p>
                <div className="error-badge font-mono">"{error.message}"</div>
                <p className="error-desc">
                  {error.message === 'Pago denegado' && (
                    <span><strong>Escenario 2 Cumplido:</strong> La pasarela simulada rechazó la tarjeta (fondos insuficientes). No se creó la venta y las entradas se mantienen en estado <em>Disponible</em>.</span>
                  )}
                  {error.message.includes('disponibles') && (
                    <span><strong>Escenario 3 Cumplido:</strong> Concurrencia detectada. El sistema abortó la operación antes de cobrar con tarjeta porque las entradas ya no están disponibles.</span>
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
