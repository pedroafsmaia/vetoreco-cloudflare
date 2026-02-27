const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export type ApiError = {
  error: { code: string; message: string; requestId?: string };
  status?: number;
  raw?: any;
};

function normalizeError(status: number, data: any, requestIdFromHeader?: string | null): ApiError {
  const msg = data?.error?.message || data?.message || 'Erro inesperado.';
  const code = data?.error?.code || data?.code || 'UNKNOWN';
  const requestId = data?.requestId || data?.error?.requestId || requestIdFromHeader || undefined;
  return { error: { code, message: msg, requestId }, status, raw: data };
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(API_URL + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      credentials: 'include'
    });

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) return await res.text() as any;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw normalizeError(res.status, data, res.headers.get('x-request-id'));
    return data;
  } catch (e: any) {
    if (e?.error?.code) throw e as ApiError;
    // Falha de rede / CORS / etc.
    throw { error: { code: 'NETWORK', message: 'Falha de rede ao acessar a API. Verifique sua conexão e o VITE_API_URL.' } } as ApiError;
  }
}
