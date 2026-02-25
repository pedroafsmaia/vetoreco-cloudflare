export async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error(data?.error?.message || `Erro ${res.status}`);
  }
  return data.data;
}
