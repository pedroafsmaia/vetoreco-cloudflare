import { useEffect } from 'react';

export function useKeyboard(key: string, callback: () => void, deps: any[] = []) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === key) callback();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, ...deps]);
}
