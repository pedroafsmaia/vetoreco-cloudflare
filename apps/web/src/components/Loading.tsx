import React from 'react';

export function Loading({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div style={{ padding: 16, opacity: 0.8 }}>
      <div>{label}</div>
    </div>
  );
}
