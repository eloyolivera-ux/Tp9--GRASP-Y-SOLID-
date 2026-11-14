import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import CotizacionTab from './components/CotizacionTab';
import PagoTab from './components/PagoTab';
import AccesoTab from './components/AccesoTab';
import ExploradorTab from './components/ExploradorTab';
import { api } from './services/api';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('cotizar');
  const [backendOnline, setBackendOnline] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cotizacionParaPago, setCotizacionParaPago] = useState(null);
  const [codigoQRParaAcceso, setCodigoQRParaAcceso] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Carga de datos iniciales y comprobación de conectividad
  const cargarDatos = useCallback(async () => {
    try {
      const [evts, cls] = await Promise.all([
        api.getEventos().catch(() => []),
        api.getClientes().catch(() => [])
      ]);
      setEventos(evts || []);
      setClientes(cls || []);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(() => {
      api.getEventos()
        .then(() => setBackendOnline(true))
        .catch(() => setBackendOnline(false));
    }, 10000);
    return () => clearInterval(interval);
  }, [cargarDatos]);

  // Navegación guiada entre HU-1 -> HU-2 -> HU-3
  const handleProcederAlPago = (cotizacion) => {
    setCotizacionParaPago(cotizacion);
    setActiveTab('pagar');
  };

  const handleCopiarQRParaAcceso = (codigoQR) => {
    setCodigoQRParaAcceso(codigoQR);
    setActiveTab('acceso');
  };

  return (
    <div className="app-layout">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
      />

      {!backendOnline && !loadingInitial && (
        <div className="backend-offline-banner">
          <div className="banner-content">
            <span className="banner-icon">⚠️</span>
            <div>
              <strong>Backend Desconectado:</strong> No se pudo contactar al servidor FastAPI en <code>http://localhost:8000</code>.
              Verificá que la API esté iniciada para realizar operaciones en vivo.
            </div>
            <button className="banner-retry-btn" onClick={cargarDatos}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'cotizar' && (
          <CotizacionTab
            onProcederAlPago={handleProcederAlPago}
            eventos={eventos}
            refreshData={cargarDatos}
          />
        )}

        {activeTab === 'pagar' && (
          <PagoTab
            cotizacionInicial={cotizacionParaPago}
            onCopiarQRParaAcceso={handleCopiarQRParaAcceso}
            clientes={clientes}
            eventos={eventos}
          />
        )}

        {activeTab === 'acceso' && (
          <AccesoTab
            codigoQRInicial={codigoQRParaAcceso}
          />
        )}

        {activeTab === 'explorador' && (
          <ExploradorTab />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <span>SmartTicket — TP9 GRASP / SOLID</span>
          <span className="footer-badge">Python • FastAPI • SQLAlchemy • React 18 • Vite</span>
        </div>
      </footer>
    </div>
  );
}

