import type { ApiError, ApiSuccess } from './types';

export const nowIso = () => new Date().toISOString();
export const randomId = () => crypto.randomUUID();

export const parseJsonSafe = <T = unknown>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export function jsonOk<T>(requestId: string, data: T): ApiSuccess<T> {
  return { success: true, requestId, data };
}

export function jsonErr(requestId: string, message: string, code = 'BAD_REQUEST', details?: unknown): ApiError {
  return { success: false, requestId, error: { code, message, ...(details === undefined ? {} : { details }) } };
}

export function getBody<T extends object>(v: unknown): T {
  return (v && typeof v === 'object' ? v : {}) as T;
}

export function sanitizeSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || `org-${Math.floor(Math.random() * 10000)}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toB64(arr: Uint8Array) {
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
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

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = await hashPassword(password, salt);
  return timingSafeEqual(hash, expectedHash);
}

export function cookieSerialize(
  name: string,
  value: string,
  opts: { maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Lax'|'Strict'|'None'; path?: string } = {}
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
  for (const chunk of header.split(';')) {
    const [k, ...rest] = chunk.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

export function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function dateOnly(iso?: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}
