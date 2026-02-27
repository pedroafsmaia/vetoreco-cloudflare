import { sha256Hex } from '../utils';

export type DossierCacheRecord = {
  content_hash: string;
  r2_key: string;
  pdf_size?: number | null;
  generated_at?: string;
  updated_at?: string;
};

export interface DossierCacheRepo {
  getDossierCache(userId: string, projectId: string): Promise<DossierCacheRecord | null>;
  upsertDossierCache(userId: string, projectId: string, data: { content_hash: string; r2_key: string; pdf_size?: number | null }): Promise<any>;
}

export interface R2BucketLike {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  put(key: string, value: ArrayBuffer | Uint8Array, opts?: any): Promise<any>;
}

function stableSortObj(v: any): any {
  if (Array.isArray(v)) return v.map(stableSortObj);
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const k of Object.keys(v).sort()) out[k] = stableSortObj(v[k]);
    return out;
  }
  return v;
}

export async function computeDossierContentHash(payload: any) {
  const stable = stableSortObj(payload);
  return await sha256Hex(JSON.stringify(stable));
}

export function dossierR2Key(userId: string, projectId: string, contentHash: string) {
  return `dossiers/${userId}/${projectId}/${contentHash}.pdf`;
}

export async function getOrGenerateDossierPdf(params: {
  repo: DossierCacheRepo;
  bucket: R2BucketLike;
  userId: string;
  projectId: string;
  force?: boolean;
  buildPayload: () => Promise<any>;
  buildPdfBytes: (payload: any) => Promise<Uint8Array>;
  nowMs?: () => number;
  cooldownMs?: number;
}) {
  const nowMs = params.nowMs || (() => Date.now());
  const cooldownMs = params.cooldownMs ?? 2 * 60 * 1000;

  const payload = await params.buildPayload();
  const contentHash = await computeDossierContentHash(payload);
  const key = dossierR2Key(params.userId, params.projectId, contentHash);

  const cache = await params.repo.getDossierCache(params.userId, params.projectId);

  const cacheIsFresh = cache?.content_hash === contentHash && cache?.r2_key;
  if (cacheIsFresh && !params.force) {
    const obj = await params.bucket.get(cache!.r2_key);
    if (obj) {
      const bytes = new Uint8Array(await obj.arrayBuffer());
      return { bytes, cached: true, contentHash, r2Key: cache!.r2_key };
    }
  }

  // Cooldown: avoid repeated regeneration
  if (cache?.updated_at && !params.force) {
    const updated = Date.parse(cache.updated_at);
    if (!Number.isNaN(updated) && nowMs() - updated < cooldownMs) {
      // If we have a cache object, return it even if hash differs (still better than re-gen thrash)
      const obj = cache?.r2_key ? await params.bucket.get(cache.r2_key) : null;
      if (obj) {
        const bytes = new Uint8Array(await obj.arrayBuffer());
        return { bytes, cached: true, contentHash, r2Key: cache.r2_key, stale: true };
      }
    }
  }

  const bytes = await params.buildPdfBytes(payload);
  await params.bucket.put(key, bytes, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: { projectId: params.projectId, userId: params.userId, contentHash },
  });
  await params.repo.upsertDossierCache(params.userId, params.projectId, {
    content_hash: contentHash,
    r2_key: key,
    pdf_size: bytes.byteLength,
  });

  return { bytes, cached: false, contentHash, r2Key: key };
}
