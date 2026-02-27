import React from 'react';
import type { User } from '../lib/types';

export function AppShell({ user, onLogout, children }: { user: User | null; onLogout: () => void; children: React.ReactNode }) {
  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="logo">VE</div>
          <div>
            <div className="title">VetorEco</div>
            <div className="subtitle">Guia para conquistar ENCE e evitar retrabalho no habite-se</div>
          </div>
        </div>
        <div className="headerRight">
          {user ? (
            <>
              <span className="muted">{user.email}</span>
              <button className="btn" onClick={onLogout}>Sair</button>
            </>
          ) : (
            <span className="muted">Faça login</span>
          )}
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer muted">VetorEco (rework) — prontidão ≠ etiqueta oficial</footer>
    </div>
  );
}

