import { createApp } from '../index';
import { createInMemoryRepo } from '../testing/inMemoryRepo';

async function api(path: string, init?: RequestInit) {
  const app = createApp({ repo: createInMemoryRepo() });
  return app.request(path, init, { APP_ORIGIN: 'http://localhost:5173' } as any);
}

describe('API basic flow', () => {
  it('registers, logs in and accesses project endpoints', async () => {
    const repo = createInMemoryRepo();
    const app = createApp({ repo });

    const reg = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'pedro@example.com', password: '12345678', workspaceName: 'Studio Maia' })
    }, { APP_ORIGIN: 'http://localhost:5173' } as any);
    expect(reg.status).toBe(201);

    const login = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'pedro@example.com', password: '12345678' })
    }, { APP_ORIGIN: 'http://localhost:5173' } as any);
    expect(login.status).toBe(200);

    const setCookie = login.headers.get('set-cookie');
    expect(setCookie).toContain('vetoreco_session=');

    const me = await app.request('/auth/me', {
      headers: { cookie: setCookie! }
    }, { APP_ORIGIN: 'http://localhost:5173' } as any);
    expect(me.status).toBe(200);
    const meJson = await me.json() as any;
    const orgId = meJson.data.activeOrganizationId;

    const created = await app.request('/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: setCookie!, 'x-organization-id': orgId },
      body: JSON.stringify({ name: 'Projeto Teste', typology: 'comercial', protocol_year: 2028, municipality_size: 'large' })
    }, { APP_ORIGIN: 'http://localhost:5173' } as any);
    expect(created.status).toBe(201);
    const createdJson = await created.json() as any;
    const projectId = createdJson.data.project.id;

    const pdfRes = await app.request(`/projects/${projectId}/memorial.pdf`, {
      headers: { cookie: setCookie!, 'x-organization-id': orgId }
    }, { APP_ORIGIN: 'http://localhost:5173' } as any);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers.get('content-type')).toContain('application/pdf');
  });
});
