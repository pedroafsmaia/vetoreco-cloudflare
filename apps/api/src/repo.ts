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
} from './types';
import { nowIso, parseJsonSafe, randomId } from './utils';

type AuditPayload = { userId?: string | null; projectId?: string | null; action: string; details?: unknown; requestId?: string | null };

export interface Repo {
  insertAuditLog(input: AuditPayload): Promise<void>;

  getUserByEmail(email: string): Promise<UserRow | null>;
  getUserById(id: string): Promise<UserRow | null>;
  createUser(input: { email: string; password_hash: string; password_salt: string; is_super_admin?: number }): Promise<UserRow>;

  createSession(input: { user_id: string; token_hash: string; expires_at: string }): Promise<{ id: string }>;
  getSessionByTokenHash(tokenHash: string): Promise<{ session_id: string; user_id: string; expires_at: string } | null>;
  touchSession(id: string, lastSeenAt: string): Promise<void>;
  deleteSession(id: string): Promise<void>;

  createOrganization(input: { name: string; slug: string; owner_user_id: string }): Promise<OrganizationRow>;
  addOrganizationMember(input: { organization_id: string; user_id: string; role: MembershipRow['role'] }): Promise<MembershipRow>;
  listOrganizationsForUser(userId: string): Promise<(OrganizationRow & { role: MembershipRow['role'] })[]>;

  listProjects(organizationId: string): Promise<ProjectRow[]>;
  createProject(input: Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectRow>;
  getProject(projectId: string, organizationId: string): Promise<ProjectRow | null>;
  updateProject(projectId: string, organizationId: string, patch: Partial<ProjectRow>): Promise<ProjectRow | null>;
  deleteProject(projectId: string, organizationId: string): Promise<void>;
  createProjectVersion(projectId: string, label: string, snapshot: unknown): Promise<void>;

  getChecklistItems(projectId: string): Promise<ChecklistItemRow[]>;
  upsertChecklistItems(projectId: string, items: ChecklistItemRow[]): Promise<void>;

  getRegulatoryContext(projectId: string): Promise<RegulatoryContextRow | null>;
  upsertRegulatoryContext(projectId: string, userId: string, patch: Partial<RegulatoryContextRow>): Promise<RegulatoryContextRow>;

  getTechnicalInputs(projectId: string): Promise<TechnicalInputs>;
  upsertTechnicalInputs(projectId: string, userId: string, payload: TechnicalInputs): Promise<TechnicalInputs>;

  insertCalculationRun(input: Omit<CalculationRunRecord, 'id' | 'created_at'>): Promise<CalculationRunRecord>;
  getLatestCalculationRun(projectId: string): Promise<CalculationRunRecord | null>;
  listCalculationRuns(projectId: string, limit?: number): Promise<CalculationRunRecord[]>;

  getActiveNormativePackage(date: string, mode?: string): Promise<NormativePackageRow | null>;
  listNormativePackages(): Promise<NormativePackageRow[]>;
  createNormativePackage(input: { code: string; title: string; mode: string; effective_from: string; effective_to?: string | null; is_active?: number; metadata_json?: string | null }): Promise<NormativePackageRow>;
  updateNormativePackage(id: string, patch: Partial<NormativePackageRow>): Promise<NormativePackageRow | null>;

  listNormativeRules(packageId?: string): Promise<NormativeRuleRow[]>;
  createNormativeRule(input: { package_id: string; rule_key: string; title: string; sort_order?: number; criteria_json: string; outcome_json: string; effective_from: string; effective_to?: string | null; notes?: string | null; is_active?: number }): Promise<NormativeRuleRow>;
  updateNormativeRule(id: string, patch: Partial<NormativeRuleRow>): Promise<NormativeRuleRow | null>;
  deleteNormativeRule(id: string): Promise<void>;

  listGoldenCaseResults(limit?: number): Promise<GoldenCaseRow[]>;
  upsertGoldenCaseResult(input: Omit<GoldenCaseRow, 'id' | 'created_at' | 'updated_at'>): Promise<void>;
}

const mapProject = (r: any): ProjectRow => ({ ...r, protocol_year: Number(r.protocol_year), area_m2: r.area_m2 == null ? null : Number(r.area_m2), is_federal_public: Number(r.is_federal_public) });
const mapCalcRun = (r: any): CalculationRunRecord => ({ ...r });
const emptyTechnicalInputs = (): TechnicalInputs => ({ general: {}, envelope: {}, systems: {}, autodeclaration: {} });

export function createD1Repo(DB: D1Database): Repo {
  const first = async <T = any>(sql: string, params: any[] = []) => (await DB.prepare(sql).bind(...params).first<T>()) as T | null;
  const all = async <T = any>(sql: string, params: any[] = []) => (((await DB.prepare(sql).bind(...params).all<T>()) as any).results || []) as T[];
  const run = async (sql: string, params: any[] = []) => { await DB.prepare(sql).bind(...params).run(); };

  return {
    async insertAuditLog(input) {
      await run(
        `INSERT INTO audit_logs (id,user_id,project_id,action,details_json,request_id,created_at) VALUES (?,?,?,?,?,?,?)`,
        [randomId(), input.userId || null, input.projectId || null, input.action, input.details ? JSON.stringify(input.details) : null, input.requestId || null, nowIso()]
      );
    },

    async getUserByEmail(email) { return await first<UserRow>(`SELECT * FROM users WHERE email=?`, [email]); },
    async getUserById(id) { return await first<UserRow>(`SELECT * FROM users WHERE id=?`, [id]); },
    async createUser(input) {
      const ts = nowIso(); const id = randomId();
      await run(`INSERT INTO users (id,email,password_hash,password_salt,is_super_admin,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`,
        [id, input.email, input.password_hash, input.password_salt, Number(input.is_super_admin || 0), ts, ts]);
      return (await this.getUserById(id))!;
    },

    async createSession(input) {
      const id = randomId(); const ts = nowIso();
      await run(`INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?,?)`, [id, input.user_id, input.token_hash, input.expires_at, ts, ts]);
      return { id };
    },
    async getSessionByTokenHash(tokenHash) {
      return await first<{ session_id: string; user_id: string; expires_at: string }>(`SELECT id as session_id,user_id,expires_at FROM sessions WHERE token_hash=?`, [tokenHash]);
    },
    async touchSession(id, lastSeenAt) { await run(`UPDATE sessions SET last_seen_at=? WHERE id=?`, [lastSeenAt, id]); },
    async deleteSession(id) { await run(`DELETE FROM sessions WHERE id=?`, [id]); },

    async createOrganization(input) {
      const ts = nowIso(); const id = randomId();
      await run(`INSERT INTO organizations (id,name,slug,owner_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
        [id, input.name, input.slug, input.owner_user_id, ts, ts]);
      return (await first<OrganizationRow>(`SELECT * FROM organizations WHERE id=?`, [id]))!;
    },
    async addOrganizationMember(input) {
      const ts = nowIso(); const id = randomId();
      await run(`INSERT INTO organization_members (id,organization_id,user_id,role,created_at) VALUES (?,?,?,?,?)`, [id, input.organization_id, input.user_id, input.role, ts]);
      return (await first<MembershipRow>(`SELECT * FROM organization_members WHERE id=?`, [id]))!;
    },
    async listOrganizationsForUser(userId) {
      return await all<any>(
        `SELECT o.*, m.role FROM organizations o JOIN organization_members m ON m.organization_id=o.id WHERE m.user_id=? ORDER BY o.created_at ASC`,
        [userId]
      );
    },

    async listProjects(organizationId) {
      const rows = await all<any>(`SELECT * FROM projects WHERE organization_id=? ORDER BY updated_at DESC`, [organizationId]);
      return rows.map(mapProject);
    },
    async createProject(input) {
      const id = randomId(); const ts = nowIso();
      await run(`INSERT INTO projects (id,organization_id,user_id,name,city,state,municipality_size,typology,phase,protocol_year,area_m2,is_federal_public,notes,created_at,updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, input.organization_id, input.user_id, input.name, input.city, input.state, input.municipality_size, input.typology, input.phase, input.protocol_year, input.area_m2, input.is_federal_public, input.notes, ts, ts]);
      return (await this.getProject(id, input.organization_id))!;
    },
    async getProject(projectId, organizationId) {
      const row = await first<any>(`SELECT * FROM projects WHERE id=? AND organization_id=?`, [projectId, organizationId]);
      return row ? mapProject(row) : null;
    },
    async updateProject(projectId, organizationId, patch) {
      const current = await this.getProject(projectId, organizationId);
      if (!current) return null;
      const next: ProjectRow = { ...current, ...patch, updated_at: nowIso() } as ProjectRow;
      await run(`UPDATE projects SET name=?,city=?,state=?,municipality_size=?,typology=?,phase=?,protocol_year=?,area_m2=?,is_federal_public=?,notes=?,updated_at=? WHERE id=? AND organization_id=?`,
        [next.name, next.city, next.state, next.municipality_size, next.typology, next.phase, next.protocol_year, next.area_m2, next.is_federal_public, next.notes, next.updated_at, projectId, organizationId]);
      return (await this.getProject(projectId, organizationId))!;
    },
    async deleteProject(projectId, organizationId) {
      await run(`DELETE FROM projects WHERE id=? AND organization_id=?`, [projectId, organizationId]);
    },
    async createProjectVersion(projectId, label, snapshot) {
      await run(`INSERT INTO project_versions (id,project_id,label,snapshot_json,created_at) VALUES (?,?,?,?,?)`,
        [randomId(), projectId, label, JSON.stringify(snapshot), nowIso()]);
    },

    async getChecklistItems(projectId) {
      return await all<ChecklistItemRow>(`SELECT item_id,checked FROM project_checklist_items WHERE project_id=?`, [projectId]);
    },
    async upsertChecklistItems(projectId, items) {
      for (const item of items) {
        await run(`INSERT INTO project_checklist_items (id,project_id,item_id,checked,updated_at)
                   VALUES (?,?,?,?,?)
                   ON CONFLICT(project_id,item_id) DO UPDATE SET checked=excluded.checked, updated_at=excluded.updated_at`,
          [randomId(), projectId, item.item_id, Number(item.checked), nowIso()]);
      }
    },

    async getRegulatoryContext(projectId) {
      return await first<RegulatoryContextRow>(`SELECT * FROM project_regulatory_context WHERE project_id=?`, [projectId]);
    },
    async upsertRegulatoryContext(projectId, userId, patch) {
      const current = await this.getRegulatoryContext(projectId);
      const ts = nowIso();
      if (!current) {
        const row: RegulatoryContextRow = {
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
          created_at: ts,
          updated_at: ts,
          ...patch
        } as RegulatoryContextRow;
        await run(`INSERT INTO project_regulatory_context (id,project_id,classification_method,protocol_date,permit_protocol_date,public_tender_date,municipality_population_band,public_entity_level,is_public_building,requests_autodeclaration,legacy_reason,legacy_ence_project_evidence,notes,updated_by_user_id,created_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [row.id,row.project_id,row.classification_method,row.protocol_date,row.permit_protocol_date,row.public_tender_date,row.municipality_population_band,row.public_entity_level,row.is_public_building,row.requests_autodeclaration,row.legacy_reason,row.legacy_ence_project_evidence,row.notes,row.updated_by_user_id,row.created_at,row.updated_at]);
      } else {
        const row = { ...current, ...patch, updated_by_user_id: userId, updated_at: ts } as RegulatoryContextRow;
        await run(`UPDATE project_regulatory_context SET classification_method=?,protocol_date=?,permit_protocol_date=?,public_tender_date=?,municipality_population_band=?,public_entity_level=?,is_public_building=?,requests_autodeclaration=?,legacy_reason=?,legacy_ence_project_evidence=?,notes=?,updated_by_user_id=?,updated_at=? WHERE project_id=?`,
          [row.classification_method,row.protocol_date,row.permit_protocol_date,row.public_tender_date,row.municipality_population_band,row.public_entity_level,row.is_public_building,row.requests_autodeclaration,row.legacy_reason,row.legacy_ence_project_evidence,row.notes,row.updated_by_user_id,row.updated_at,projectId]);
      }
      return (await this.getRegulatoryContext(projectId))!;
    },

    async getTechnicalInputs(projectId) {
      const row = await first<{ payload_json: string }>(`SELECT payload_json FROM technical_inputs WHERE project_id=?`, [projectId]);
      return row ? parseJsonSafe<TechnicalInputs>(row.payload_json, emptyTechnicalInputs()) : emptyTechnicalInputs();
    },
    async upsertTechnicalInputs(projectId, userId, payload) {
      const exists = await first<{ id: string }>(`SELECT id FROM technical_inputs WHERE project_id=?`, [projectId]);
      const ts = nowIso();
      if (exists) {
        await run(`UPDATE technical_inputs SET payload_json=?,updated_by_user_id=?,updated_at=? WHERE project_id=?`, [JSON.stringify(payload), userId, ts, projectId]);
      } else {
        await run(`INSERT INTO technical_inputs (id,project_id,payload_json,updated_by_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
          [randomId(), projectId, JSON.stringify(payload), userId, ts, ts]);
      }
      return payload;
    },

    async insertCalculationRun(input) {
      const id = randomId(); const ts = nowIso();
      await run(`INSERT INTO calculation_runs (id,project_id,normative_package_id,algorithm_version,status,input_snapshot_json,output_json,created_by_user_id,created_at)
                 VALUES (?,?,?,?,?,?,?,?,?)`,
        [id, input.project_id, input.normative_package_id, input.algorithm_version, input.status, input.input_snapshot_json, input.output_json, input.created_by_user_id, ts]);
      return (await first<CalculationRunRecord>(`SELECT * FROM calculation_runs WHERE id=?`, [id]))!;
    },
    async getLatestCalculationRun(projectId) {
      return await first<CalculationRunRecord>(`SELECT * FROM calculation_runs WHERE project_id=? ORDER BY created_at DESC LIMIT 1`, [projectId]);
    },
    async listCalculationRuns(projectId, limit = 20) {
      return await all<CalculationRunRecord>(`SELECT * FROM calculation_runs WHERE project_id=? ORDER BY created_at DESC LIMIT ?`, [projectId, Math.max(1, Math.min(limit, 100))]);
    },

    async getActiveNormativePackage(date, mode) {
      const rows = await all<NormativePackageRow>(
        `SELECT * FROM normative_packages WHERE is_active=1 AND (? IS NULL OR mode=?) AND effective_from<=? AND (effective_to IS NULL OR effective_to>=?) ORDER BY effective_from DESC LIMIT 1`,
        [mode || null, mode || null, date, date]
      );
      return rows[0] || null;
    },
    async listNormativePackages() {
      return await all<NormativePackageRow>(`SELECT * FROM normative_packages ORDER BY effective_from DESC, created_at DESC`);
    },
    async createNormativePackage(input) {
      const id = randomId(); const ts = nowIso();
      await run(`INSERT INTO normative_packages (id,code,title,mode,effective_from,effective_to,is_active,metadata_json,created_at,updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [id, input.code, input.title, input.mode, input.effective_from, input.effective_to ?? null, Number(input.is_active ?? 1), input.metadata_json ?? null, ts, ts]);
      return (await first<NormativePackageRow>(`SELECT * FROM normative_packages WHERE id=?`, [id]))!;
    },
    async updateNormativePackage(id, patch) {
      const row = await first<NormativePackageRow>(`SELECT * FROM normative_packages WHERE id=?`, [id]);
      if (!row) return null;
      const next = { ...row, ...patch, updated_at: nowIso() };
      await run(`UPDATE normative_packages SET code=?,title=?,mode=?,effective_from=?,effective_to=?,is_active=?,metadata_json=?,updated_at=? WHERE id=?`,
        [next.code, next.title, next.mode, next.effective_from, next.effective_to, Number(next.is_active), next.metadata_json, next.updated_at, id]);
      return (await first<NormativePackageRow>(`SELECT * FROM normative_packages WHERE id=?`, [id]))!;
    },

    async listNormativeRules(packageId) {
      if (packageId) return await all<NormativeRuleRow>(`SELECT * FROM normative_rules WHERE package_id=? ORDER BY sort_order ASC, created_at ASC`, [packageId]);
      return await all<NormativeRuleRow>(`SELECT * FROM normative_rules ORDER BY sort_order ASC, created_at ASC`);
    },
    async createNormativeRule(input) {
      const id = randomId(); const ts = nowIso();
      await run(`INSERT INTO normative_rules (id,package_id,rule_key,title,sort_order,criteria_json,outcome_json,effective_from,effective_to,is_active,notes,created_at,updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, input.package_id, input.rule_key, input.title, Number(input.sort_order ?? 100), input.criteria_json, input.outcome_json, input.effective_from, input.effective_to ?? null, Number(input.is_active ?? 1), input.notes ?? null, ts, ts]);
      return (await first<NormativeRuleRow>(`SELECT * FROM normative_rules WHERE id=?`, [id]))!;
    },
    async updateNormativeRule(id, patch) {
      const row = await first<NormativeRuleRow>(`SELECT * FROM normative_rules WHERE id=?`, [id]);
      if (!row) return null;
      const next = { ...row, ...patch, updated_at: nowIso() };
      await run(`UPDATE normative_rules SET package_id=?,rule_key=?,title=?,sort_order=?,criteria_json=?,outcome_json=?,effective_from=?,effective_to=?,is_active=?,notes=?,updated_at=? WHERE id=?`,
        [next.package_id, next.rule_key, next.title, next.sort_order, next.criteria_json, next.outcome_json, next.effective_from, next.effective_to, Number(next.is_active), next.notes, next.updated_at, id]);
      return (await first<NormativeRuleRow>(`SELECT * FROM normative_rules WHERE id=?`, [id]))!;
    },
    async deleteNormativeRule(id) { await run(`DELETE FROM normative_rules WHERE id=?`, [id]); },

    async listGoldenCaseResults(limit = 50) {
      return await all<GoldenCaseRow>(`SELECT * FROM golden_case_results ORDER BY updated_at DESC LIMIT ?`, [Math.max(1, Math.min(limit, 200))]);
    },
    async upsertGoldenCaseResult(input) {
      const ts = nowIso();
      const existing = await first<{ id: string }>(`SELECT id FROM golden_case_results WHERE case_key=?`, [input.case_key]);
      if (existing) {
        await run(`UPDATE golden_case_results SET label=?,normative_package_id=?,input_json=?,expected_output_json=?,tolerance_json=?,notes=?,updated_by_user_id=?,source_url=?,normative_code=?,building_type=?,bioclimatic_zone=?,data_quality=?,completeness_pct=?,updated_at=? WHERE case_key=?`,
          [input.label, input.normative_package_id ?? null, input.input_json, input.expected_output_json, input.tolerance_json ?? null, input.notes ?? null, input.updated_by_user_id, (input as any).source_url ?? null, (input as any).normative_code ?? null, (input as any).building_type ?? null, (input as any).bioclimatic_zone ?? null, (input as any).data_quality ?? null, (input as any).completeness_pct ?? null, ts, input.case_key]);
      } else {
        await run(`INSERT INTO golden_case_results (id,case_key,label,normative_package_id,input_json,expected_output_json,tolerance_json,notes,updated_by_user_id,source_url,normative_code,building_type,bioclimatic_zone,data_quality,completeness_pct,created_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [randomId(), input.case_key, input.label, input.normative_package_id ?? null, input.input_json, input.expected_output_json, input.tolerance_json ?? null, input.notes ?? null, input.updated_by_user_id, (input as any).source_url ?? null, (input as any).normative_code ?? null, (input as any).building_type ?? null, (input as any).bioclimatic_zone ?? null, (input as any).data_quality ?? null, (input as any).completeness_pct ?? null, ts, ts]);
      }
    }
  };
}
