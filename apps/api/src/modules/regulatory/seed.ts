import { nowIso, randomId } from '../../utils';

const packages = [
  { code: 'INI-C', version: '2025.1', title: 'INI-C (referência operacional VetorEco)', startsAt: '2025-01-01', endsAt: null, isLegacy: 0 },
  { code: 'INI-R', version: '2025.1', title: 'INI-R (referência operacional VetorEco)', startsAt: '2025-01-01', endsAt: null, isLegacy: 0 },
  { code: 'RTQ-C', version: 'LEGADO', title: 'RTQ-C (legado/transição)', startsAt: '2010-01-01', endsAt: null, isLegacy: 1 },
  { code: 'RTQ-R', version: 'LEGADO', title: 'RTQ-R (legado/transição)', startsAt: '2012-01-01', endsAt: null, isLegacy: 1 },
  { code: 'CGIEE', version: '4-2025', title: 'Resolução CGIEE nº 4/2025 (resumo operacional)', startsAt: '2025-01-01', endsAt: null, isLegacy: 0 },
];

const rules = [
  { key: 'federal_public_min_level', value: 'A', packageCode: 'CGIEE', packageVersion: '4-2025' },
  { key: 'private_large_effective', value: '2028-01-01', packageCode: 'CGIEE', packageVersion: '4-2025' },
  { key: 'private_medium_effective', value: '2029-01-01', packageCode: 'CGIEE', packageVersion: '4-2025' },
  { key: 'private_small_effective', value: '2030-01-01', packageCode: 'CGIEE', packageVersion: '4-2025' },
  { key: 'legacy_transition_required', value: 'true', packageCode: 'CGIEE', packageVersion: '4-2025' },
];

export async function ensureNormativeSeed(db: D1Database) {
  const count = await db.prepare(`SELECT COUNT(*) as n FROM normative_packages`).first<{ n: number }>();
  if ((count?.n || 0) > 0) return { seeded: false };
  const now = nowIso();
  for (const p of packages) {
    await db.prepare(
      `INSERT INTO normative_packages (id,code,version,title,valid_from,valid_to,is_legacy,created_at) VALUES (?,?,?,?,?,?,?,?)`,
    )
      .bind(randomId(), p.code, p.version, p.title, p.startsAt, p.endsAt, p.isLegacy, now)
      .run();
  }
  for (const r of rules) {
    await db.prepare(
      `INSERT INTO normative_rules (id,package_code,package_version,rule_key,rule_value_json,created_at) VALUES (?,?,?,?,?,?)`,
    )
      .bind(randomId(), r.packageCode, r.packageVersion, r.key, JSON.stringify({ value: r.value }), now)
      .run();
  }
  return { seeded: true };
}
