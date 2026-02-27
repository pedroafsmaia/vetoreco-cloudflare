import type { ApiResponse } from './types';
import { randomUUID } from './webcrypto_polyfill';

export function reqId() {
  return randomUUID();
}

export function ok<T>(requestId: string, data: T): ApiResponse<T> {
  return { success: true, data, requestId };
}

export function err(requestId: string, code: string, message: string, details?: unknown): ApiResponse<never> {
  return { success: false, error: { code, message, details }, requestId };
}

export function nowIso() {
  return new Date().toISOString();
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function cookieSerialize(name: string, value: string, opts: {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  path?: string;
  maxAge?: number;
} = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? '/'}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  if (typeof opts.maxAge === 'number') parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join('; ');
}

export async function pbkdf2Hash(password: string, saltB64: string): Promise<string> {
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 120000 },
    key,
    256
  );
  const hash = new Uint8Array(bits);
  return btoa(String.fromCharCode(...hash));
}

export function randomSaltB64(len = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return btoa(String.fromCharCode(...bytes));
}
