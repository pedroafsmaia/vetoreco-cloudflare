import type { Repo } from '../repo';
import type {
  CalculationRunRecord,
  ChecklistItemRow,
  GoldenCaseRow,
  MembershipRow,
  NormativePackageRow,
  NormativeRuleRow,
  OrganizationRow,
  ProjectRow,
  RegulatoryContextRow,
  TechnicalInputs,
  UserRow
} from '../types';
import { nowIso, randomId } from '../utils';

type DB = {
  users: UserRow[];
  sessions: { id: string; user_id: string; token_hash: string; expires_at: string; created_at: string; last_seen_at: string }[];
  organizations: OrganizationRow[];
  members: MembershipRow[];
  projects: ProjectRow[];
  versions: any[];
  checklist: { id: string; project_id: string; item_id: string; checked: number; updated_at: string }[];
  contexts: RegulatoryContextRow[];
  technical: { id: string; project_id: string; payload: TechnicalInputs; updated_by_user_id: string; created_at: string; updated_at: string }[];
  runs: CalculationRunRecord[];
  pkgs: NormativePackageRow[];
  rules: NormativeRuleRow[];
  golden: GoldenCaseRow[];
  audit: any[];
};

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

export function createInMemoryRepo(seed?: Partial<DB>): Repo {
  const ts = nowIso();
  const db: DB = {
    users: [],
    sessions: [],
    organizations: [],
    members: [],
    projects: [],
    versions: [],
    checklist: [],
    contexts: [],
    technical: [],
    runs: [],
    pkgs: [
      {
        id: 'pkg-ini-2026',
        code: 'INI-2026',
        title: 'Pacote INI 2026',
        mode: 'INI',
        effective_from: '2026-01-01',
        effective_to: null,
        is_active: 1,
        metadata_json: JSON.stringify({ source: 'seed' }),
        created_at: ts,
        updated_at: ts
      },
      {
        id: 'pkg-rtq-legacy',
        code: 'RTQ-LEGACY',
        title: 'Pacote RTQ Legado',
        mode: 'RTQ',
        effective_from: '2024-01-01',
        effective_to: '2027-12-31',
        is_active: 1,
        metadata_json: JSON.stringify({ source: 'seed' }),
        created_at: ts,
        updated_at: ts
      }
    ],
    rules: [
      {
        id: 'rule-federal-a',
        package_id: 'pkg-ini-2026',
        rule_key: 'PUBLICA_FEDERAL_A',
        title: 'Pública federal meta A',
        sort_order: 10,
        criteria_json: JSON.stringify({ typologies: ['publica'], federalOnly: true }),
        outcome_json: JSON.stringify({ minLevel: 'A', decision: 'Edificação pública federal exige meta A.' }),
        effective_from: '2026-01-01',
        effective_to: null,
        is_active: 1,
        notes: null,
        created_at: ts,
        updated_at: ts
      },
      {
        id: 'rule-autodecl',
        package_id: 'pkg-ini-2026',
        rule_key: 'AUTODECLARACAO_PERMITIDA',
        title: 'Autodeclaração permitida quando solicitada',
        sort_order: 90,
        criteria_json: JSON.stringify({ classificationMethods: ['INI'] }),
        outcome_json: JSON.stringify({ decision: 'Autodeclaração pode ser usada se solicitada no contexto.' }),
        effective_from: '2026-01-01',
        effective_to: null,
        is_active: 1,
        notes: null,
        created_at: ts,
        updated_at: ts
      }
    ],
    golden: [],
    audit: [],
    ...seed
  };

  return {
    async insertAuditLog(input) { db.audit.push({ id: randomId(), ...input, created_at: nowIso() }); },

    async getUserByEmail(email) { return clone(db.users.find((u) => u.email === email) || null); },
    async getUserById(id) { return clone(db.users.find((u) => u.id === id) || null); },
    async createUser(input) {
      const row: UserRow = { id: randomId(), email: input.email, password_hash: input.password_hash, password_salt: input.password_salt, is_super_admin: Number(input.is_super_admin || 0), created_at: nowIso(), updated_at: nowIso() };
      db.users.push(row); return clone(row);
    },

    async createSession(input) {
      const row = { id: randomId(), user_id: input.user_id, token_hash: input.token_hash, expires_at: input.expires_at, created_at: nowIso(), last_seen_at: nowIso() };
      db.sessions.push(row); return { id: row.id };
    },
    async getSessionByTokenHash(tokenHash) {
      const row = db.sessions.find((s) => s.token_hash === tokenHash);
      return row ? clone({ session_id: row.id, user_id: row.user_id, expires_at: row.expires_at }) : null;
    },
    async touchSession(id, lastSeenAt) { const row = db.sessions.find((s) => s.id === id); if (row) row.last_seen_at = lastSeenAt; },
    async deleteSession(id) { db.sessions = db.sessions.filter((s) => s.id !== id); },

    async createOrganization(input) {
      const row: OrganizationRow = { id: randomId(), name: input.name, slug: input.slug, owner_user_id: input.owner_user_id, created_at: nowIso(), updated_at: nowIso() };
      db.organizations.push(row); return clone(row);
    },
    async addOrganizationMember(input) {
      const row: MembershipRow = { id: randomId(), organization_id: input.organization_id, user_id: input.user_id, role: input.role, created_at: nowIso() };
      db.members.push(row); return clone(row);
    },
    async listOrganizationsForUser(userId) {
      return clone(db.members.filter((m) => m.user_id === userId).map((m) => ({ ...(db.organizations.find((o) => o.id === m.organization_id)!), role: m.role })));
    },

    async listProjects(orgId) { return clone(db.projects.filter((p) => p.organization_id === orgId).sort((a,b)=>a.updated_at < b.updated_at ? 1 : -1)); },
    async createProject(input) {
      const row: ProjectRow = { id: randomId(), created_at: nowIso(), updated_at: nowIso(), ...input };
      db.projects.push(row); return clone(row);
    },
    async getProject(id, orgId) { return clone(db.projects.find((p) => p.id === id && p.organization_id === orgId) || null); },
    async updateProject(id, orgId, patch) {
      const row = db.projects.find((p) => p.id === id && p.organization_id === orgId);
      if (!row) return null;
      Object.assign(row, patch, { updated_at: nowIso() });
      return clone(row);
    },
    async deleteProject(id, orgId) { db.projects = db.projects.filter((p) => !(p.id === id && p.organization_id === orgId)); },
    async createProjectVersion(projectId, label, snapshot) { db.versions.push({ id: randomId(), projectId, label, snapshot, created_at: nowIso() }); },

    async getChecklistItems(projectId) {
      return clone(db.checklist.filter((c) => c.project_id === projectId).map((c) => ({ item_id: c.item_id, checked: c.checked })));
    },
    async upsertChecklistItems(projectId, items) {
      for (const item of items) {
        const row = db.checklist.find((c) => c.project_id === projectId && c.item_id === item.item_id);
        if (row) { row.checked = Number(item.checked); row.updated_at = nowIso(); }
        else db.checklist.push({ id: randomId(), project_id: projectId, item_id: item.item_id, checked: Number(item.checked), updated_at: nowIso() });
      }
    },

    async getRegulatoryContext(projectId) { return clone(db.contexts.find((c) => c.project_id === projectId) || null); },
    async upsertRegulatoryContext(projectId, userId, patch) {
      let row = db.contexts.find((c) => c.project_id === projectId);
      if (!row) {
        row = {
          id: randomId(),
          project_id: projectId,
          classification_method: 'INI',
          protocol_date: null,
          permit_protocol_date: null,
          public_tender_date: null,
          municipality_population_band: null,
          public_entity_level: 'na',
          is_public_building: 0,
          requests_autodeclaration: 0,
          legacy_reason: null,
          legacy_ence_project_evidence: null,
          notes: null,
          updated_by_user_id: userId,
          created_at: nowIso(),
          updated_at: nowIso()
        };
        db.contexts.push(row);
      }
      Object.assign(row, patch, { updated_by_user_id: userId, updated_at: nowIso() });
      return clone(row);
    },

    async getTechnicalInputs(projectId) {
      return clone(db.technical.find((t) => t.project_id === projectId)?.payload || { general: {}, envelope: {}, systems: {}, autodeclaration: {} });
    },
    async upsertTechnicalInputs(projectId, userId, payload) {
      let row = db.technical.find((t) => t.project_id === projectId);
      if (!row) {
        row = { id: randomId(), project_id: projectId, payload: clone(payload), updated_by_user_id: userId, created_at: nowIso(), updated_at: nowIso() };
        db.technical.push(row);
      } else {
        row.payload = clone(payload);
        row.updated_by_user_id = userId;
        row.updated_at = nowIso();
      }
      return clone(row.payload);
    },

    async insertCalculationRun(input) {
      const row: CalculationRunRecord = { id: randomId(), created_at: nowIso(), ...input };
      db.runs.push(row);
      return clone(row);
    },
    async getLatestCalculationRun(projectId) { return clone(db.runs.filter((r) => r.project_id === projectId).sort((a,b)=>a.created_at < b.created_at ? 1 : -1)[0] || null); },
    async listCalculationRuns(projectId, limit = 20) { return clone(db.runs.filter((r) => r.project_id === projectId).sort((a,b)=>a.created_at < b.created_at ? 1 : -1).slice(0, limit)); },

    async getActiveNormativePackage(date, mode) {
      const rows = db.pkgs.filter((p) => p.is_active && (!mode || p.mode === mode) && p.effective_from <= date && (!p.effective_to || p.effective_to >= date))
        .sort((a,b)=> a.effective_from < b.effective_from ? 1 : -1);
      return clone(rows[0] || null);
    },
    async listNormativePackages() { return clone([...db.pkgs].sort((a,b)=>a.effective_from < b.effective_from ? 1 : -1)); },
    async createNormativePackage(input) {
      const row: NormativePackageRow = { id: randomId(), code: input.code, title: input.title, mode: (input.mode as any), effective_from: input.effective_from, effective_to: input.effective_to ?? null, is_active: Number(input.is_active ?? 1), metadata_json: input.metadata_json ?? null, created_at: nowIso(), updated_at: nowIso() };
      db.pkgs.push(row); return clone(row);
    },
    async updateNormativePackage(id, patch) {
      const row = db.pkgs.find((p) => p.id === id);
      if (!row) return null;
      Object.assign(row, patch, { updated_at: nowIso() });
      return clone(row);
    },

    async listNormativeRules(packageId) { return clone(db.rules.filter((r) => !packageId || r.package_id === packageId).sort((a,b)=>a.sort_order-b.sort_order)); },
    async createNormativeRule(input) {
      const row: NormativeRuleRow = { id: randomId(), package_id: input.package_id, rule_key: input.rule_key, title: input.title, sort_order: Number(input.sort_order ?? 100), criteria_json: input.criteria_json, outcome_json: input.outcome_json, effective_from: input.effective_from, effective_to: input.effective_to ?? null, is_active: Number(input.is_active ?? 1), notes: input.notes ?? null, created_at: nowIso(), updated_at: nowIso() };
      db.rules.push(row); return clone(row);
    },
    async updateNormativeRule(id, patch) {
      const row = db.rules.find((r) => r.id === id);
      if (!row) return null;
      Object.assign(row, patch, { updated_at: nowIso() });
      return clone(row);
    },
    async deleteNormativeRule(id) { db.rules = db.rules.filter((r) => r.id !== id); },

    async listGoldenCaseResults(limit = 50) { return clone([...db.golden].sort((a,b)=>a.updated_at < b.updated_at ? 1 : -1).slice(0, limit)); },
    async upsertGoldenCaseResult(input) {
      let row = db.golden.find((g) => g.case_key === input.case_key);
      if (!row) {
        row = { id: randomId(), created_at: nowIso(), updated_at: nowIso(), ...input };
        db.golden.push(row);
      } else {
        Object.assign(row, input, { updated_at: nowIso() });
      }
    }
  };
}
