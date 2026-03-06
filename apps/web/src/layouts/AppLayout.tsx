import React from 'react';
import type { User } from '../lib/types';
import { Sidebar } from './Sidebar';

export function AppLayout({
  user,
  onLogout,
  projectName,
  children,
}: {
  user: User | null;
  onLogout: () => void;
  projectName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout">
      {user && <Sidebar user={user} onLogout={onLogout} projectName={projectName} />}
      <div className="app-content">
        <main className="main" id="main-content" role="main">
          {children}
        </main>
        <footer className="footer muted">
          VetorEco — guia de prontidão técnica · prontidão ≠ etiqueta oficial
        </footer>
      </div>
    </div>
  );
}
