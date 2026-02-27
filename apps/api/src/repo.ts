import type { Env, Stage, Typology } from './types';
import { nowIso, sha256Hex, randomSaltB64, pbkdf2Hash } from './utils';
import { STAGE_ORDER, stageIdx, getTemplates, isTaskActive } from './modules/journey';

export class Repo {
  constructor(private env: Env) {}

  async createUser(email: string, password: string) {
    const id = crypto.randomUUID();
    const salt = randomSaltB64(16);
    const hash = await pbkdf2Hash(password, salt);
    await this.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, password_salt) VALUES (?, ?, ?, ?)`
    ).bind(id, email.toLowerCase(), hash, salt).run();
    return { id, email: email.toLowerCase() };
  }

  async getUserByEmail(email: string) {
    return await this.env.DB.prepare(`SELECT * FROM users WHERE email = ?`).bind(email.toLowerCase()).first() as any | null;
  }

  async getUserById(userId: string) {
    return await this.env.DB.prepare(`SELECT id, email, created_at FROM users WHERE id = ?`).bind(userId).first() as any | null;
  }

  async createSession(userId: string, token: string, expiresAtIso: string) {
    const id = crypto.randomUUID();
    const tokenHash = await sha256Hex(token);
    await this.env.DB.prepare(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(id, userId, tokenHash, expiresAtIso).run();
    return { id, tokenHash };
  }

  async getSessionByToken(token: string) {
    const tokenHash = await sha256Hex(token);
    return await this.env.DB.prepare(`SELECT * FROM sessions WHERE token_hash = ?`).bind(tokenHash).first() as any | null;
  }

  async deleteSessionByToken(token: string) {
    const tokenHash = await sha256Hex(token);
    await this.env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
  }

  async listProjects(userId: string) {
    const r = await this.env.DB.prepare(`SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC`).bind(userId).all();
    return (r.results ?? []) as any[];
  }

  async getProject(userId: string, projectId: string) {
    return await this.env.DB.prepare(`SELECT * FROM projects WHERE id = ? AND user_id = ?`).bind(projectId, userId).first() as any | null;
  }

  async createProject(userId: string, data: { name: string; city?: string; state?: string; typology: Typology; stage_current: Stage; area_m2?: number | null; }) {
    const id = crypto.randomUUID();
    const ts = nowIso();
    await this.env.DB.prepare(
      `INSERT INTO projects (id, user_id, name, city, state, typology, stage_current, area_m2, ence_target, profile_json, knowledge_pack_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      userId,
      data.name,
      data.city ?? null,
      data.state ?? null,
      data.typology,
      data.stage_current,
      data.area_m2 ?? null,
      null,
      null,
      'ini_2025_05',
      ts,
      ts
    ).run();

    for (const t of getTemplates(data.typology)) {
      await this.env.DB.prepare(
        `INSERT INTO project_tasks (id, project_id, stage, order_index, task_key, title, description, meta_json, critical, completed, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      ).bind(
        crypto.randomUUID(),
        id,
        t.stage,
        t.order,
        t.key,
        t.title,
        t.description,
        t.meta ? JSON.stringify(t.meta) : null,
        t.critical ? 1 : 0,
        ts
      ).run();
    }
    return id;
  }

  async updateProject(userId: string, projectId: string, patch: any) {
    const existing = await this.getProject(userId, projectId);
    if (!existing) return null;
    const updatedAt = nowIso();
    await this.env.DB.prepare(
      `UPDATE projects SET name = ?, city = ?, state = ?, stage_current = ?, area_m2 = ?, ence_target = ?, profile_json = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    ).bind(
      patch.name ?? existing.name,
      (patch.city === undefined) ? existing.city : patch.city,
      (patch.state === undefined) ? existing.state : patch.state,
      patch.stage_current ?? existing.stage_current,
      (patch.area_m2 === undefined) ? existing.area_m2 : patch.area_m2,
      (patch.ence_target === undefined) ? existing.ence_target : patch.ence_target,
      (patch.profile_json === undefined) ? existing.profile_json : patch.profile_json,
      updatedAt,
      projectId,
      userId
    ).run();

    // Se o perfil mudou, sincroniza tarefas de auto-check (dados mínimos)
    if (patch.profile_json !== undefined || patch.ence_target !== undefined) {
      await this.syncAutoTasks(userId, projectId);
    }
    return await this.getProject(userId, projectId);
  }

  private async syncAutoTasks(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) return;
    let profile: any = null;
    try { profile = project.profile_json ? JSON.parse(project.profile_json) : null; } catch { profile = null; }

    const hasZB = !!(profile && String(profile.bioclimatic_zone || '').trim());
    const facades = Array.isArray(profile?.facades) ? profile.facades : [];
    const hasFacades = facades.length > 0;
    const hasFacadeGeometry = hasFacades && facades.every((f: any) =>
      typeof f.azimuth_deg === 'number' && !Number.isNaN(f.azimuth_deg)
      && typeof f.facade_area_m2 === 'number' && f.facade_area_m2 > 0
    );
    const hasTarget = !!String(project.ence_target || '').trim();

    const autoKeys: Record<string, boolean> = {
      project_profile_minimum: hasZB && hasFacadeGeometry,
      site_climate: hasZB && hasFacadeGeometry,
      set_ence_goal: hasTarget,
    };

    for (const [taskKey, okFlag] of Object.entries(autoKeys)) {
      await this.env.DB.prepare(
        `UPDATE project_tasks
         SET completed = ?, updated_at = ?
         WHERE project_id = ? AND task_key = ?`
      ).bind(okFlag ? 1 : 0, nowIso(), projectId, taskKey).run();
    }
  }

  async deleteProject(userId: string, projectId: string) {
    await this.env.DB.prepare(`DELETE FROM projects WHERE id = ? AND user_id = ?`).bind(projectId, userId).run();
  }

  async listTasks(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    const stageCase = STAGE_ORDER.map((s, i) => `WHEN '${s}' THEN ${i}`).join(' ');
    const r = await this.env.DB.prepare(
      `SELECT * FROM project_tasks WHERE project_id = ?
       ORDER BY CASE stage ${stageCase} ELSE 999 END, order_index ASC, title ASC`
    ).bind(projectId).all();
    return (r.results ?? []) as any[];
  }

  async evidenceCountsByTask(userId: string, projectId: string): Promise<Record<string, number> | null> {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    const r = await this.env.DB.prepare(
      `SELECT task_id, COUNT(*) as cnt
       FROM project_evidences
       WHERE project_id = ? AND task_id IS NOT NULL
       GROUP BY task_id`
    ).bind(projectId).all();
    const map: Record<string, number> = {};
    for (const row of (r.results ?? []) as any[]) {
      if (row.task_id) map[String(row.task_id)] = Number(row.cnt || 0);
    }
    return map;
  }

  async calcCountsByTask(userId: string, projectId: string): Promise<Record<string, number> | null> {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    const r = await this.env.DB.prepare(
      `SELECT task_id, COUNT(*) as cnt
       FROM project_calculations
       WHERE project_id = ? AND task_id IS NOT NULL
       GROUP BY task_id`
    ).bind(projectId).all();
    const map: Record<string, number> = {};
    for (const row of (r.results ?? []) as any[]) {
      if (row.task_id) map[String(row.task_id)] = Number(row.cnt || 0);
    }
    return map;
  }

  async getTask(userId: string, projectId: string, taskId: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    return await this.env.DB.prepare(
      `SELECT * FROM project_tasks WHERE id = ? AND project_id = ?`
    ).bind(taskId, projectId).first() as any | null;
  }

  async updateTask(userId: string, projectId: string, taskId: string, patch: { completed?: boolean; notes?: string }) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    const ts = nowIso();
    await this.env.DB.prepare(
      `UPDATE project_tasks SET completed = COALESCE(?, completed), notes = COALESCE(?, notes), updated_at = ? WHERE id = ? AND project_id = ?`
    ).bind(
      patch.completed === undefined ? null : (patch.completed ? 1 : 0),
      patch.notes === undefined ? null : patch.notes,
      ts,
      taskId,
      projectId
    ).run();
    return true;
  }

  async listEvidences(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    const r = await this.env.DB.prepare(
      `SELECT e.*, t.title AS task_title
       FROM project_evidences e
       LEFT JOIN project_tasks t ON t.id = e.task_id
       WHERE e.project_id = ?
       ORDER BY e.created_at DESC`
    ).bind(projectId).all();
    return (r.results ?? []) as any[];
  }

  async addEvidence(userId: string, projectId: string, data: { stage: Stage; title: string; url: string; notes?: string; task_id?: string; evidence_type?: 'link'|'file'|'text'; content_text?: string; rac_section?: string; meta?: any }) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    if (data.task_id) {
      const task = await this.getTask(userId, projectId, data.task_id);
      if (!task) return null;
    }
    const id = crypto.randomUUID();
    await this.env.DB.prepare(
      `INSERT INTO project_evidences (id, project_id, task_id, stage, title, url, evidence_type, content_text, rac_section, meta_json, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      projectId,
      data.task_id ?? null,
      data.stage,
      data.title,
      data.url,
      data.evidence_type ?? 'link',
      data.content_text ?? null,
      data.rac_section ?? null,
      data.meta ? JSON.stringify(data.meta) : null,
      data.notes ?? null
    ).run();
    return id;
  }

  async deleteEvidence(userId: string, projectId: string, evidenceId: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    await this.env.DB.prepare(`DELETE FROM project_evidences WHERE id = ? AND project_id = ?`).bind(evidenceId, projectId).run();
    return true;
  }

  async listCalculations(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    const r = await this.env.DB.prepare(
      `SELECT c.*, t.title AS task_title
       FROM project_calculations c
       LEFT JOIN project_tasks t ON t.id = c.task_id
       WHERE c.project_id = ?
       ORDER BY c.created_at DESC`
    ).bind(projectId).all();
    return (r.results ?? []) as any[];
  }

  async addCalculation(userId: string, projectId: string, calc_type: string, inputs: any, result: any, task_id?: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    if (task_id) {
      const task = await this.getTask(userId, projectId, task_id);
      if (!task) return null;
    }
    const id = crypto.randomUUID();
    await this.env.DB.prepare(
      `INSERT INTO project_calculations (id, project_id, task_id, calc_type, inputs_json, result_json) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, projectId, task_id ?? null, calc_type, JSON.stringify(inputs), JSON.stringify(result)).run();
    return id;
  }

  async deleteCalculation(userId: string, projectId: string, calcId: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    await this.env.DB.prepare(`DELETE FROM project_calculations WHERE id = ? AND project_id = ?`).bind(calcId, projectId).run();
    return true;
  }

  async advanceStage(userId: string, projectId: string, opts: { force?: boolean }) {
    const project = await this.getProject(userId, projectId);
    if (!project) return { ok: false as const, code: 'NOT_FOUND' as const };

    const curr = project.stage_current as Stage;
    const next = STAGE_ORDER[stageIdx(curr) + 1] as Stage | undefined;
    if (!next) return { ok: false as const, code: 'NO_NEXT_STAGE' as const };

    // Bloqueadores críticos consideram "preparo" (completou + evidências/cálculos exigidos).
    const tasksRes = await this.env.DB.prepare(
      `SELECT id, title, task_key, completed, meta_json
       FROM project_tasks
       WHERE project_id = ? AND stage = ? AND critical = 1
       ORDER BY order_index ASC, title ASC`
    ).bind(projectId, curr).all();
    const stageTasks = (tasksRes.results ?? []) as any[];

    const evMap = await this.evidenceCountsByTask(userId, projectId) || {};
    const caMap = await this.calcCountsByTask(userId, projectId) || {};

    const blockers = stageTasks
      .map((t) => {
        let meta: any = null;
        try { meta = t.meta_json ? JSON.parse(t.meta_json) : null; } catch { meta = null; }

        // item inativo (não aplicável) não deve bloquear etapa
        if (!isTaskActive(meta, project)) return null;

        // project profile checks (dados mínimos)
        let profile: any = null;
        try { profile = project.profile_json ? JSON.parse(String(project.profile_json)) : null; } catch { profile = null; }
        const hasTarget = !!String(project.ence_target || '').trim();
        const hasZB = !!String(profile?.bioclimatic_zone || '').trim();
        const facades = Array.isArray(profile?.facades) ? profile.facades : [];
        const hasFacadesMinimum = facades.length > 0 && facades.every((f: any) =>
          typeof f.azimuth_deg === 'number' && !Number.isNaN(f.azimuth_deg)
          && typeof f.facade_area_m2 === 'number' && f.facade_area_m2 > 0
        );
        const req = Array.isArray(meta?.projectFieldsRequired) ? meta.projectFieldsRequired : [];
        const missingProjectData = req.some((k: any) => {
          if (k === 'ence_target') return !hasTarget;
          if (k === 'profile.bioclimatic_zone') return !hasZB;
          if (k === 'profile.facades_minimum') return !hasFacadesMinimum;
          return false;
        });

        const evidenceRequired = meta?.evidenceRequired ?? (!!t.critical && (meta?.evidenceHints?.length || 0) > 0);
        const calcRequired = meta?.calcRequired ?? false;
        const ev = evMap[String(t.id)] || 0;
        const ca = caMap[String(t.id)] || 0;
        const missing: string[] = [];
        if (!t.completed) missing.push('marcar como feito');
        if (missingProjectData) missing.push('preencher dados mínimos');
        if (evidenceRequired && ev <= 0) missing.push('anexar evidência');
        if (calcRequired && ca <= 0) missing.push('registrar cálculo');
        const satisfied = !!t.completed && missing.length === 0;
        return satisfied ? null : {
          id: t.id,
          title: t.title,
          task_key: t.task_key,
          missing,
        };
      })
      .filter(Boolean) as any[];

    if (blockers.length > 0 && !opts.force) {
      return { ok: false as const, code: 'BLOCKED' as const, blockers, nextStage: next };
    }

    const updatedAt = nowIso();
    await this.env.DB.prepare(
      `UPDATE projects SET stage_current = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    ).bind(next, updatedAt, projectId, userId).run();

    return { ok: true as const, nextStage: next, forced: blockers.length > 0 };
  }

  // === Dossier PDF cache (D1 -> R2 key) ===
  async getDossierCache(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    return await this.env.DB.prepare(
      `SELECT * FROM project_dossier_cache WHERE project_id = ? AND user_id = ?`
    ).bind(projectId, userId).first() as any | null;
  }

  async upsertDossierCache(userId: string, projectId: string, data: { content_hash: string; r2_key: string; pdf_size?: number | null }) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    await this.env.DB.prepare(
      `INSERT INTO project_dossier_cache (project_id, user_id, content_hash, r2_key, pdf_size, generated_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(project_id) DO UPDATE SET
         content_hash = excluded.content_hash,
         r2_key = excluded.r2_key,
         pdf_size = excluded.pdf_size,
         updated_at = datetime('now')`
    ).bind(projectId, userId, data.content_hash, data.r2_key, data.pdf_size ?? null).run();
    return true;
  }

  async deleteDossierCache(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) return null;
    await this.env.DB.prepare(
      `DELETE FROM project_dossier_cache WHERE project_id = ? AND user_id = ?`
    ).bind(projectId, userId).run();
    return true;
  }

  async audit(userId: string, action: string, projectId?: string, meta?: any) {
    await this.env.DB.prepare(
      `INSERT INTO audit_logs (id, user_id, project_id, action, meta_json) VALUES (?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), userId, projectId ?? null, action, meta ? JSON.stringify(meta) : null).run();
  }
}
