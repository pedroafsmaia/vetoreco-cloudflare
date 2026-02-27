import React from 'react';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12, color: '#b91c1c' }}>{message}</div>
      {onRetry ? (
        <button onClick={onRetry} style={{ padding: '8px 12px' }}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
