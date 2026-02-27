import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrGenerateDossierPdf } from '../src/services/dossier_cache';

class FakeBucket {
  store = new Map<string, Uint8Array>();
  async get(key: string) {
    const v = this.store.get(key);
    if (!v) return null;
    return { arrayBuffer: async () => v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) };
  }
  async put(key: string, value: any) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    this.store.set(key, bytes);
    return {};
  }
}

class FakeRepo {
  cache: any = null;
  async getDossierCache(_userId: string, _projectId: string) { return this.cache; }
  async upsertDossierCache(_userId: string, _projectId: string, data: any) {
    this.cache = { ...data, updated_at: new Date().toISOString() };
  }
}

test('dossier cache hit returns stored pdf without regenerating', async () => {
  const repo = new FakeRepo();
  const bucket = new FakeBucket();

  let genCount = 0;
  const buildPayload = async () => ({ project: { id: 'p1', name: 'A' }, evidences: [] });
  const buildPdfBytes = async (_payload: any) => {
    genCount++;
    return new Uint8Array([1, 2, 3, genCount]);
  };

  const r1 = await getOrGenerateDossierPdf({ repo, bucket, userId: 'u', projectId: 'p', buildPayload, buildPdfBytes, force: false, cooldownMs: 0 });
  assert.equal(r1.cached, false);
  assert.equal(genCount, 1);

  const r2 = await getOrGenerateDossierPdf({ repo, bucket, userId: 'u', projectId: 'p', buildPayload, buildPdfBytes, force: false, cooldownMs: 0 });
  assert.equal(r2.cached, true);
  assert.equal(genCount, 1);
  assert.deepEqual(Array.from(r2.bytes), Array.from(r1.bytes));
});

test('hash change triggers regeneration and stores a new pdf', async () => {
  const repo = new FakeRepo();
  const bucket = new FakeBucket();

  let name = 'A';
  let genCount = 0;

  const buildPayload = async () => ({ project: { id: 'p1', name }, evidences: [] });
  const buildPdfBytes = async (_payload: any) => {
    genCount++;
    return new Uint8Array([9, 9, 9, genCount]);
  };

  const r1 = await getOrGenerateDossierPdf({ repo, bucket, userId: 'u', projectId: 'p', buildPayload, buildPdfBytes, force: false, cooldownMs: 0 });
  assert.equal(genCount, 1);

  name = 'B';
  const r2 = await getOrGenerateDossierPdf({ repo, bucket, userId: 'u', projectId: 'p', buildPayload, buildPdfBytes, force: false, cooldownMs: 0 });
  assert.equal(r2.cached, false);
  assert.equal(genCount, 2);
  assert.notDeepEqual(Array.from(r2.bytes), Array.from(r1.bytes));
});
