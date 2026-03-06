import React from 'react';
import { Alert } from '../ui';

export function PrivacyNotice() {
  return (
    <Alert variant="info" title="Privacidade">
      O dossiê (PDF) pode ser armazenado temporariamente para performance e evitar
      reprocessamento. A expiração automática (TTL) é configurável no bucket R2 (recomendado: 7 dias).
    </Alert>
  );
}
