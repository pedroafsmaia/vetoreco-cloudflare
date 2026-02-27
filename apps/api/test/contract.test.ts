import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.ts';

function getJson(res: Response) {
  return res.json() as any;
}

// Bindings mínimas para rodar o app no ambiente de teste (sem D1 e sem auth).
// Importante: o middleware de CORS acessa c.env.
const env: any = {
  APP_ORIGIN: '',
};

// Contract tests (mínimos): garantem que rotas core não quebrem o frontend.
// Não dependem de D1/autenticação.

test('GET /education/topics -> shape', async () => {
  const res = await app.request('http://localhost/education/topics', {}, env);
  assert.equal(res.status, 200);
  const body = await getJson(res);
  assert.equal(body.success, true);
  assert.ok(body.data);
  assert.ok(Array.isArray(body.data.topics));

  // Pode ser vazio em ambientes mínimos, mas a estrutura precisa existir.
  const t0 = body.data.topics[0];
  if (t0) {
    assert.ok(typeof t0.key === 'string');
    assert.ok(typeof t0.title === 'string');
    assert.ok(typeof t0.summary === 'string');
    assert.ok(Array.isArray(t0.references));
  }
});

test('GET /climate/estimate -> zone + disclaimer + transparency fields', async () => {
  const res = await app.request('http://localhost/climate/estimate?city=Sao%20Paulo&state=SP', {}, env);
  assert.equal(res.status, 200);
  const body = await getJson(res);
  assert.equal(body.success, true);
  assert.ok(body.data);
  assert.ok(typeof body.data.zone === 'string');
  assert.ok(['high', 'medium', 'low'].includes(body.data.confidence));
  assert.ok(['by_city', 'by_state', 'unknown'].includes(body.data.method));
  assert.ok(typeof body.data.disclaimer === 'string');
  assert.match(body.data.disclaimer, /Estimativa aproximada/i);
});

test('GET /rtqc/dpil -> structured table + reference', async () => {
  const res = await app.request('http://localhost/rtqc/dpil', {}, env);
  assert.equal(res.status, 200);
  const body = await getJson(res);
  assert.equal(body.success, true);
  assert.ok(body.data);

  assert.ok(Array.isArray(body.data.rows));
  assert.ok(Array.isArray(body.data.flat_rows));
  assert.ok(body.data.reference);
  assert.ok(typeof body.data.reference.document === 'string');
  assert.match(body.data.reference.document, /RTQ-?C/i);
  assert.ok(typeof body.data.reference.table === 'string');
  assert.match(body.data.reference.table, /Tabela\s*4\.1/i);

  const fr0 = body.data.flat_rows[0];
  if (fr0) {
    assert.ok(typeof fr0.funcao === 'string');
    assert.ok(['A', 'B', 'C', 'D'].includes(fr0.nivel));
    assert.ok(typeof fr0.dpil_limite === 'number');
    assert.ok(fr0.reference);
    assert.match(fr0.reference.table, /Tabela\s*4\.1/i);
  }
});
