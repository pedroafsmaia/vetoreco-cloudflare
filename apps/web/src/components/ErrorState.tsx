import React from 'react';
import { Alert } from '../ui';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="error" title="Erro">
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry} style={{ marginTop: 8 }}>
          Tentar novamente
        </button>
      )}
    </Alert>
  );
}
