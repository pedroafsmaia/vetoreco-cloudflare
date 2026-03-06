import React from 'react';
import { Spinner } from '../ui';

export function Loading({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <Spinner label={label} />
    </div>
  );
}
