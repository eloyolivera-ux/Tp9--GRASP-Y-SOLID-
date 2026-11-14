import React, { useState, useEffect } from 'react';
import api from '../services/api';

const tabs = [
  { id: 'eventos', label: '🎪 Eventos', icon: '🎪' },
  { id: 'sectores', label: '🏟️ Sectores', icon: '🏟️' },
  { id: 'entradas', label: '🎫 Entradas', icon: '🎫' },
  { id: 'ventas', label: '💰 Ventas', icon: '💰' },
  { id: 'clientes', label: '👥 Clientes', icon: '👥' },
  { id: 'precios', label: '💲 Precios', icon: '💲' },
];

function DataTable({ columns, data, emptyMsg }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📭</span>
        <p>{emptyMsg || 'Sin datos disponibles'}</p>
      </div>
    );
  }
  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i}>
              {columns.map(col => (
                <td key={col.key} className={col.mono ? 'font-mono' : ''}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div className="stat-info">
        <span className="stat-value" style={{ color: color || 'var(--text-blue-accent)' }}>{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function ExploradorTab() {
  const [activeSection, setActiveSection] = useState('eventos');
  const [data, setData] = useState({
    eventos: [], sectores: [], entradas: [], ventas: [], clientes: [], precios: []
  });
  const [loading, setLoading] = useState(false);

  const [maestros, setMaestros] = useState({ lugares: [], sectores: [], clientes: [], eventos: [] });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [eventos, sectores, entradas, ventas, clientes, lugares] = await Promise.all([
        api.getEventos().catch(() => []),
        api.getSectores().catch(() => []),
        api.getEntradas().catch(() => []),
        api.getVentas().catch(() => []),
        api.getClientes().catch(() => []),
        api.getLugares().catch(() => []),
      ]);
      // Una fila de "precios" por cada (evento, sector): es la clase de asociación PrecioSector del dominio
      const precios = eventos.flatMap((ev) => (ev.precios || []).map((p) => ({
        id: `${ev.id}-${p.sector_id}`, evento_id: ev.id, sector_id: p.sector_id, precio: p.precio,
      })));
      setMaestros({ lugares, sectores, clientes, eventos });
      setData({ eventos, sectores, entradas, ventas, clientes, precios });
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const estadoBadge = (estado) => {
    const colors = {
      'DISPONIBLE': 'var(--success)',
      'RESERVADA': 'var(--warning)',
      'EMITIDA': 'var(--text-blue-accent)',
      'UTILIZADA': 'var(--text-muted)',
      'PAGADA': 'var(--success)',
      'PENDIENTE': 'var(--warning)',
      'CANCELADA': 'var(--error)',
    };
    return (
      <span className="estado-badge font-mono" style={{ color: colors[estado] || 'var(--text-blue-light)', borderColor: colors[estado] || 'var(--border-subtle)' }}>
        {estado}
      </span>
    );
  };

  const entradasDisponibles = data.entradas.filter(e => e.estado === 'DISPONIBLE').length;
  const entradasEmitidas = data.entradas.filter(e => e.estado === 'EMITIDA').length;
  const entradasUtilizadas = data.entradas.filter(e => e.estado === 'UTILIZADA').length;
  const ventasPagadas = data.ventas.filter(v => v.estado === 'PAGADA').length;

  // Helpers para resolver ids -> nombres (el backend devuelve solo las claves foráneas)
  const nombreDe = (lista, id) => lista.find((x) => x.id === id)?.nombre || `#${id}`;
  const dinero = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;
  const fecha = (f) => (f ? new Date(f).toLocaleString('es-AR') : '—');

  const tableConfigs = {
    eventos: {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'nombre', label: 'Nombre del Evento' },
        { key: 'fecha', label: 'Fecha y Hora', render: (r) => fecha(r.fecha) },
        { key: 'lugar', label: 'Lugar', render: (r) => r.lugar?.nombre || `#${r.lugar_id}` },
        { key: 'direccion', label: 'Dirección', render: (r) => r.lugar?.direccion || '—' },
      ],
    },
    sectores: {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'nombre', label: 'Nombre Sector' },
        { key: 'capacidad', label: 'Capacidad Máxima', render: (r) => r.capacidad?.toLocaleString('es-AR') },
        { key: 'lugar', label: 'Lugar', render: (r) => nombreDe(maestros.lugares, r.lugar_id) },
      ],
    },
    entradas: {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'codigo_qr', label: 'Código QR', mono: true },
        { key: 'evento', label: 'Evento', render: (r) => nombreDe(maestros.eventos, r.evento_id) },
        { key: 'sector', label: 'Sector', render: (r) => nombreDe(maestros.sectores, r.sector_id) },
        { key: 'estado', label: 'Estado', render: (r) => estadoBadge(r.estado) },
        { key: 'hora_ingreso', label: 'Ingreso Puerta', render: (r) => (r.hora_ingreso ? new Date(r.hora_ingreso).toLocaleTimeString('es-AR') : '—') },
      ],
    },
    ventas: {
      columns: [
        { key: 'id', label: 'Venta #' },
        { key: 'cliente', label: 'Comprador', render: (r) => nombreDe(maestros.clientes, r.cliente_id) },
        { key: 'cantidad', label: 'Entradas', render: (r) => r.entrada_ids.length },
        { key: 'total', label: 'Total', render: (r) => dinero(r.total) },
        { key: 'estado', label: 'Estado', render: (r) => estadoBadge(r.estado) },
        { key: 'fecha', label: 'Fecha', render: (r) => fecha(r.fecha) },
      ],
    },
    clientes: {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'email', label: 'Email' },
      ],
    },
    precios: {
      columns: [
        { key: 'id', label: 'Evento-Sector' },
        { key: 'evento', label: 'Evento', render: (r) => nombreDe(maestros.eventos, r.evento_id) },
        { key: 'sector', label: 'Sector', render: (r) => nombreDe(maestros.sectores, r.sector_id) },
        { key: 'precio', label: 'Precio fijado', render: (r) => dinero(r.precio) },
      ],
    },
  };

  // Las entradas son cientos: se muestran las primeras 200 para no ahogar la tabla
  const LIMITE_FILAS = 200;
  const filas = (data[activeSection] || []).slice(0, LIMITE_FILAS);
  const recortado = (data[activeSection] || []).length > LIMITE_FILAS;

  return (
    <div className="tab-view-container">
      <div className="view-header">
        <h2>🔍 Explorador de Base de Datos en Vivo</h2>
        <p className="subtitle">Consultá en tiempo real el catálogo de eventos, sectores, stock de entradas y transacciones del sistema.</p>
      </div>

      <div className="stats-row">
        <StatCard icon="🎪" label="Eventos Cartelera" value={data.eventos.length} />
        <StatCard icon="🟢" label="Entradas Disponibles" value={entradasDisponibles} color="var(--success)" />
        <StatCard icon="🔵" label="Entradas Emitidas" value={entradasEmitidas} color="var(--text-blue-accent)" />
        <StatCard icon="⚫" label="Entradas Utilizadas" value={entradasUtilizadas} color="var(--text-muted)" />
        <StatCard icon="💰" label="Ventas Concretadas" value={ventasPagadas} color="var(--success)" />
      </div>

      <div className="explorer-nav">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`explorer-tab-btn ${activeSection === t.id ? 'active' : ''}`}
            onClick={() => setActiveSection(t.id)}
          >
            {t.label}
            <span className="explorer-count">{data[t.id]?.length || 0}</span>
          </button>
        ))}
        <button className="btn-refresh" onClick={fetchAll} disabled={loading}>
          {loading ? '⏳' : '🔄'} Refrescar Datos
        </button>
      </div>

      <div className="card glass-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando registros desde la API...</p>
          </div>
        ) : (
          <DataTable
            columns={tableConfigs[activeSection].columns}
            data={filas}
            emptyMsg={`No hay registros de ${activeSection} actualmente`}
          />
        )}
        {recortado && !loading && (
          <p className="help-text" style={{ marginTop: '10px' }}>
            Mostrando las primeras {LIMITE_FILAS} de {data[activeSection].length} filas.
          </p>
        )}
      </div>
    </div>
  );
}
