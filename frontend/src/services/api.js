// Cliente HTTP centralizado hacia el backend FastAPI de SmartTicket.
// Si cambiás el puerto de uvicorn, editá solo esta línea.
export const API_BASE_URL = 'http://localhost:8000';

// FastAPI devuelve los errores como { "detail": "mensaje" } (o una lista, si falla la validación de Pydantic).
function extraerMensaje(data, status) {
  if (data && typeof data.detail === 'string') return data.detail;
  if (data && Array.isArray(data.detail)) return data.detail.map((d) => d.msg).join(' | ');
  return `Error HTTP ${status}`;
}

async function request(endpoint, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    const err = new Error(`No se pudo conectar con el backend (${API_BASE_URL}). Levantalo con: uvicorn app.main:app --reload`);
    err.status = 0;
    throw err;
  }
  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const err = new Error(extraerMensaje(data, response.status));
    err.status = response.status;
    throw err;
  }
  return data;
}

const post = (ruta, body) => request(ruta, { method: 'POST', body: JSON.stringify(body) });
const mayus = (txt) => (txt ? String(txt).toUpperCase() : txt);

export const api = {
  // ---------- HU-1: Selección y Cotización ----------
  // Devuelve además entrada_ids: las entradas propuestas, que luego recibe /iniciar-pago.
  cotizar: ({ eventoId, sectorId, cantidad }) =>
    post('/cotizar', { evento_id: eventoId, sector_id: sectorId, cantidad }),

  // ---------- HU-2: Pago y emisión ----------
  iniciarPago: ({ clienteId, entradaIds, tarjeta }) =>
    post('/iniciar-pago', { cliente_id: clienteId, entrada_ids: entradaIds, tarjeta }),

  // ---------- HU-3: Control de acceso ----------
  escanearAcceso: (codigoQR) => post('/escanear-acceso', { codigo_qr: codigoQR }),

  // ---------- Consultas ----------
  getLugares: () => request('/lugares'),
  getClientes: () => request('/clientes'),
  getSectores: () => request('/sectores'),

  // Eventos con su lugar embebido y la fecha como "fechaHora"
  async getEventos() {
    const [eventos, lugares] = await Promise.all([request('/eventos'), request('/lugares')]);
    return eventos.map((e) => ({
      ...e,
      fechaHora: e.fecha,
      lugar: lugares.find((l) => l.id === e.lugar_id) || null,
    }));
  },

  // Tarifas de un evento: [{ id, precio, sector: { id, nombre, capacidad } }]
  async getPreciosPorEvento(eventoId) {
    const [evento, sectores] = await Promise.all([request(`/eventos/${eventoId}`), request('/sectores')]);
    return evento.precios.map((p) => ({
      id: `${evento.id}-${p.sector_id}`,
      precio: p.precio,
      evento: { id: evento.id, nombre: evento.nombre },
      sector: sectores.find((s) => s.id === p.sector_id) || { id: p.sector_id, nombre: `Sector ${p.sector_id}` },
    }));
  },

  async getEntradas() {
    const entradas = await request('/entradas');
    return entradas.map((e) => ({ ...e, estado: mayus(e.estado) }));
  },

  async getVentas() {
    const ventas = await request('/ventas');
    return ventas.map((v) => ({ ...v, estado: mayus(v.estado) }));
  },
};

export default api;
