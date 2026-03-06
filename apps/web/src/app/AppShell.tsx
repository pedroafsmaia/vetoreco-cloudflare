import React from 'react';
import type { User } from '../lib/types';
import { AppLayout } from '../layouts/AppLayout';

export function AppShell({
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
  if (!user) {
    return (
      <div className="auth-layout">
        <div className="auth-layout-inner">
          <div className="auth-brand">
            <div className="logo" aria-hidden="true">VE</div>
            <div>
              <div className="title">VetorEco</div>
              <div className="subtitle">Guia técnico para prontidão ENCE</div>
            </div>
          </div>
          {children}
          <footer className="footer muted" style={{ textAlign: 'center', marginTop: 32 }}>
            VetorEco — guia de prontidão técnica · prontidão ≠ etiqueta oficial
          </footer>
        </div>
      </div>
    );
  }

  return (
    <AppLayout user={user} onLogout={onLogout} projectName={projectName}>
      {children}
    </AppLayout>
  );
}

