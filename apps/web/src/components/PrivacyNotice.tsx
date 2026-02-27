import React from 'react';

export function PrivacyNotice() {
  return (
    <div style={{ marginTop: 16, fontSize: 12, opacity: 0.8, lineHeight: 1.4 }}>
      <strong>Privacidade:</strong> o dossiê (PDF) pode ser armazenado temporariamente para performance e evitar
      reprocessamento. A expiração automática (TTL) é configurável no bucket R2 (recomendado: 7 dias).
    </div>
  );
}
