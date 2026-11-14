import React from 'react';

export default function Navbar({ activeTab, setActiveTab, backendOnline }) {
  const tabs = [
    { id: 'cotizar', label: '1. Cotización', icon: '🎫', badge: 'HU-1' },
    { id: 'pagar', label: '2. Pago y Emisión', icon: '💳', badge: 'HU-2' },
    { id: 'acceso', label: '3. Control de Acceso', icon: '🛡️', badge: 'HU-3' },
    { id: 'explorador', label: 'Explorador del Sistema', icon: '📊', badge: 'En Vivo' },
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        <div className="brand-section">
          <div className="brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
              <path d="M13 5v2"/>
              <path d="M13 17v2"/>
              <path d="M13 11v2"/>
            </svg>
          </div>
          <div className="brand-text">
            <h1>Smart<span>Ticket</span></h1>
            <p>Plataforma de Eventos y Accesos</p>
          </div>
        </div>

        <nav className="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              <span className="tab-badge">{tab.badge}</span>
            </button>
          ))}
        </nav>

        <div className="status-indicator">
          <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`}></span>
          <span className="status-label">
            {backendOnline ? 'API Conectada' : 'API Desconectada (8000)'}
          </span>
        </div>
      </div>
    </header>
  );
}

