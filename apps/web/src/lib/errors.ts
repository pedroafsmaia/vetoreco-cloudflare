export function formatApiError(e: any, fallback: string) {
  const msg = e?.error?.message || fallback;
  const rid = e?.error?.requestId;
  return rid ? `${msg} (ID: ${rid})` : msg;
}
