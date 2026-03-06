import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../api';

export function useApi<T>(path: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<any>(path);
      setData(res.data ?? res);
    } catch (e: any) {
      const msg = e?.error?.message || 'Erro ao carregar dados.';
      const rid = e?.error?.requestId;
      setError(rid ? `${msg} (ID: ${rid})` : msg);
    } finally {
      setLoading(false);
    }
  }, [path, ...deps]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh, setData };
}
