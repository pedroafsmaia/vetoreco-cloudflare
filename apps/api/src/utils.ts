export const nowIso = () => new Date().toISOString();
export const randomId = () => crypto.randomUUID();

export function jsonOk<T>(data: T, requestId?: string) {
  return { success: true, data, requestId };
}

export function jsonErr(message: string, code = 'BAD_REQUEST', details?: unknown, requestId?: string) {
  return { success: false, error: { code, message, details }, requestId };
}

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function assert(condition: unknown, status: number, code: string, message: string, details?: unknown): asserts condition {
  if (!condition) throw new HttpError(status, code, message, details);
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toB64(arr: Uint8Array) {
  let s = '';
  arr.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromB64(b64: string) {
  const s = atob(b64);
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function hashPassword(password: string, saltB64?: string) {
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, key, 256);
  return { hash: toB64(new Uint8Array(bits)), salt: toB64(salt) };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = await hashPassword(password, salt);
  return timingSafeEqual(hash, expectedHash);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function cookieSerialize(
  name: string,
  value: string,
  opts: { maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Lax' | 'Strict' | 'None'; path?: string } = {},
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? '/'}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly ?? true) parts.push('HttpOnly');
  if (opts.secure ?? true) parts.push('Secure');
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  return parts.join('; ');
}

export function parseCookie(header?: string | null) {
  const out: Record<string, string> = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('='));
  });
  return out;
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function isIsoDate(input?: string | null): boolean {
  if (!input) return false;
  const t = Date.parse(input);
  return Number.isFinite(t);
}
