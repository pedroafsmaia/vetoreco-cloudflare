import { cookieSerialize, hashPassword, nowIso, parseCookie, randomId, sha256Hex, verifyPassword, HttpError } from '../../utils';
import { audit } from '../../db';

const loginAttempts = new Map<string, number[]>();
const SESSION_DAYS = 14;

export async function requireAuth(c: any, next: any) {
  const cookieName = c.env.SESSION_COOKIE_NAME || 'vetoreco_session';
  const cookies = parseCookie(c.req.header('Cookie'));
  const token = cookies[cookieName];
  if (!token) throw new HttpError(401, 'UNAUTHORIZED', 'Não autenticado');
  const tokenHash = await sha256Hex(token);
  const session = await c.env.DB.prepare(`SELECT id,user_id,expires_at FROM sessions WHERE token_hash=?`).bind(tokenHash).first<any>();
  if (!session) throw new HttpError(401, 'UNAUTHORIZED', 'Sessão inválida');
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await c.env.DB.prepare(`DELETE FROM sessions WHERE id=?`).bind(session.id).run();
    throw new HttpError(401, 'UNAUTHORIZED', 'Sessão expirada');
  }
  c.set('userId', session.user_id);
  c.set('sessionId', session.id);
  await c.env.DB.prepare(`UPDATE sessions SET last_seen_at=? WHERE id=?`).bind(nowIso(), session.id).run();
  await next();
}

export async function register(c: any) {
  const body = await c.req.json<any>().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email.includes('@') || password.length < 8) throw new HttpError(400, 'INVALID_CREDENTIALS', 'Email inválido ou senha curta (mín. 8)');
  const exists = await c.env.DB.prepare(`SELECT id FROM users WHERE email=?`).bind(email).first();
  if (exists) throw new HttpError(409, 'CONFLICT', 'Email já cadastrado');
  const { hash, salt } = await hashPassword(password);
  const ts = nowIso();
  await c.env.DB.prepare(`INSERT INTO users (id,email,password_hash,password_salt,created_at,updated_at) VALUES (?,?,?,?,?,?)`)
    .bind(randomId(), email, hash, salt, ts, ts)
    .run();
  await audit(c, 'auth.register', { email });
  return { email };
}

export async function login(c: any) {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const attempts = (loginAttempts.get(ip) || []).filter((t) => Date.now() - t < 15 * 60_000);
  if (attempts.length >= 10) throw new HttpError(429, 'RATE_LIMITED', 'Muitas tentativas. Tente novamente mais tarde.');

  const body = await c.req.json<any>().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const user = await c.env.DB.prepare(`SELECT id,email,password_hash,password_salt FROM users WHERE email=?`).bind(email).first<any>();
  if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
    attempts.push(Date.now());
    loginAttempts.set(ip, attempts);
    throw new HttpError(401, 'UNAUTHORIZED', 'Credenciais inválidas');
  }

  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await sha256Hex(token);
  const ts = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  const sessionId = randomId();

  await c.env.DB.prepare(`INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?,?)`)
    .bind(sessionId, user.id, tokenHash, expiresAt, ts, ts)
    .run();

  const cookieName = c.env.SESSION_COOKIE_NAME || 'vetoreco_session';
  c.header('Set-Cookie', cookieSerialize(cookieName, token, { maxAge: SESSION_DAYS * 86400, secure: true }));
  await audit(c, 'auth.login', { email });
  return { user: { id: user.id, email: user.email }, expiresAt };
}

export async function logout(c: any) {
  const sessionId = c.get('sessionId');
  if (sessionId) {
    await c.env.DB.prepare(`DELETE FROM sessions WHERE id=?`).bind(sessionId).run();
  }
  const cookieName = c.env.SESSION_COOKIE_NAME || 'vetoreco_session';
  c.header('Set-Cookie', cookieSerialize(cookieName, '', { maxAge: 0, secure: true }));
  await audit(c, 'auth.logout');
  return { ok: true };
}
