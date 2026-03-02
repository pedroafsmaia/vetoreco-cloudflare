import type { Context, Next } from 'hono';
import type { Env } from './types';
import { cookieSerialize, err, ok, pbkdf2Hash } from './utils';
import { Repo } from './repo';

const SESSION_COOKIE = 'vetoreco_session';

function getCookie(c: Context, name: string): string | null {
  const cookie = c.req.header('Cookie') || '';
  const parts = cookie.split(';').map(s => s.trim());
  for (const p of parts) {
    const [k, ...rest] = p.split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export async function requireAuth(c: Context<{ Bindings: Env; Variables: { userId: string } }>, next: Next) {
  const requestId = c.get('requestId');
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json(err(requestId, 'UNAUTHENTICATED', 'Faça login para continuar.'), 401);
  const repo = new Repo(c.env);
  const session = await repo.getSessionByToken(token);
  if (!session) return c.json(err(requestId, 'UNAUTHENTICATED', 'Sessão inválida.'), 401);
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await repo.deleteSessionByToken(token);
    return c.json(err(requestId, 'UNAUTHENTICATED', 'Sessão expirada.'), 401);
  }
  c.set('userId', session.user_id);
  await next();
}

export async function authRoutes(app: any) {
  app.post('/auth/register', async (c: any) => {
    const requestId = c.get('requestId');
    const { email, password } = await c.req.json().catch(() => ({}));
    if (!email || !password || String(password).length < 8) {
      return c.json(err(requestId, 'INVALID_INPUT', 'Informe email e senha (mínimo 8 caracteres).'), 400);
    }
    const repo = new Repo(c.env);
    try {
      const u = await repo.createUser(String(email), String(password));
      await repo.audit(u.id, 'auth.register');
      return c.json(ok(requestId, { user: u }), 201);
    } catch (e: any) {
      const message = String(e?.message || '');
      const lower = message.toLowerCase();
      const isDuplicateEmail =
        lower.includes('unique') ||
        lower.includes('constraint') ||
        lower.includes('already exists');

      if (isDuplicateEmail) {
        return c.json(err(requestId, 'EMAIL_ALREADY_EXISTS', 'Este email já está cadastrado.'), 409);
      }

      console.error(JSON.stringify({
        level: 'error',
        requestId,
        route: '/auth/register',
        message,
      }));
      return c.json(err(requestId, 'REGISTER_FAILED', 'Não foi possível cadastrar no momento.'), 500);
    }
  });

  app.post('/auth/login', async (c: any) => {
    const requestId = c.get('requestId');
    const { email, password } = await c.req.json().catch(() => ({}));
    if (!email || !password) return c.json(err(requestId, 'INVALID_INPUT', 'Informe email e senha.'), 400);
    const repo = new Repo(c.env);
    const user = await repo.getUserByEmail(String(email));
    if (!user) return c.json(err(requestId, 'INVALID_CREDENTIALS', 'Credenciais inválidas.'), 401);

    const computed = await pbkdf2Hash(String(password), user.password_salt);
    if (computed !== user.password_hash) return c.json(err(requestId, 'INVALID_CREDENTIALS', 'Credenciais inválidas.'), 401);

    const token = crypto.randomUUID();
    const days = Number(c.env.SESSION_DAYS || '14');
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    await repo.createSession(user.id, token, expiresAt);
    await repo.audit(user.id, 'auth.login');

    const secureCookie = (String(c.env.COOKIE_SECURE || '').toLowerCase() === 'true')
      || String(c.req.url || '').startsWith('https://');

    const cookie = cookieSerialize(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: secureCookie,
      // Frontend (pages.dev) and API (workers.dev) are cross-site; cookie must be SameSite=None.
      sameSite: 'None',
      maxAge: days * 24 * 60 * 60
    });
    c.header('Set-Cookie', cookie);
    return c.json(ok(requestId, { user: { id: user.id, email: user.email } }));
  });

  app.post('/auth/logout', async (c: any) => {
    const requestId = c.get('requestId');
    const token = getCookie(c, SESSION_COOKIE);
    if (token) {
      const repo = new Repo(c.env);
      const session = await repo.getSessionByToken(token);
      if (session) await repo.audit(session.user_id, 'auth.logout');
      await repo.deleteSessionByToken(token);
    }
    const secureCookie = (String(c.env.COOKIE_SECURE || '').toLowerCase() === 'true')
      || String(c.req.url || '').startsWith('https://');
    const cookie = cookieSerialize(SESSION_COOKIE, '', { httpOnly: true, secure: secureCookie, sameSite: 'None', maxAge: 0 });
    c.header('Set-Cookie', cookie);
    return c.json(ok(requestId, { ok: true }));
  });

  app.get('/auth/me', requireAuth, async (c: any) => {
    const requestId = c.get('requestId');
    const repo = new Repo(c.env);
    const user = await repo.getUserById(c.get('userId'));
    return c.json(ok(requestId, { user }));
  });
}
