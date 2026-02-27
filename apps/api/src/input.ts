import type { Context } from 'hono';

// Max body size (bytes) for JSON payloads (best-effort protection)
export const MAX_BODY_BYTES = 150 * 1024;

export const LIMITS = {
  projectName: 120,
  city: 120,
  evidenceTitle: 120,
  evidenceNotes: 600,
  evidenceText: 4000,
  racSection: 120,
};

export function clampStr(v: any, maxLen: number): string {
  const s = (v ?? '').toString().trim();
  if (!s) return '';
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function isValidUF(uf: string): boolean {
  return /^[A-Z]{2}$/.test(uf);
}

// Read JSON with a hard limit. Returns {__too_large:true} when it exceeds.
export async function readJsonLimited(c: Context, maxBytes: number): Promise<any> {
  const lenRaw = c.req.header('content-length');
  if (lenRaw) {
    const len = Number(lenRaw);
    if (!Number.isNaN(len) && len > maxBytes) {
      return { __too_large: true };
    }
  }

  const body = await c.req.text();
  if (body.length > maxBytes) return { __too_large: true };
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
}
