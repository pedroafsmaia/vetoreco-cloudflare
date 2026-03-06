import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { User } from '../lib/types';

export function Sidebar({ user, onLogout, projectName }: { user: User | null; onLogout: () => void; projectName?: string }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={mobileOpen}
      >
        <span className="sidebar-toggle-icon">{mobileOpen ? '✕' : '☰'}</span>
      </button>
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} role="navigation" aria-label="Navegação principal">
        <div className="sidebar-brand">
          <div className="logo" aria-hidden="true">VE</div>
          <div>
            <div className="sidebar-brand-name">VetorEco</div>
            <div className="sidebar-brand-tagline">Guia técnico ENCE</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {projectName ? (
            <>
              <Link to="/" className="sidebar-nav-item sidebar-back" onClick={() => setMobileOpen(false)}>
                ← Projetos
              </Link>
              <div className="sidebar-project-name">{projectName}</div>
            </>
          ) : (
            <Link
              to="/"
              className={`sidebar-nav-item ${location.pathname === '/' ? 'active' : ''}`}
              aria-current={location.pathname === '/' ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span aria-hidden="true">📊</span> Dashboard
            </Link>
          )}
        </nav>

        {user && (
          <div className="sidebar-footer">
            <div className="sidebar-user-email" title={user.email}>{user.email}</div>
            <button className="btn btn-sm btn-ghost" onClick={onLogout}>Sair</button>
          </div>
        )}
      </aside>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
    </>
  );
}
