import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { audit, getOwnedProject, snapshotProject } from './db';
import type { HonoEnv } from './types';
import { HttpError, assert, jsonErr, jsonOk, nowIso, randomId, safeJsonParse } from './utils';
import { login, logout, register, requireAuth } from './modules/auth/session';
import { ensureNormativeSeed } from './modules/regulatory/seed';
import { evaluateLegalFraming, normalizeRegulatoryContext } from './modules/regulatory/engine';
import { getChecklistTemplate } from './modules/checklist/templates';
import { computeRisk } from './modules/checklist/risk';
import { normalizeTechnicalInputs, validateTechnicalInputs } from './modules/technical/inputs';
import { runPreCalculation } from './modules/calculation/pipeline';
import { buildDossier, buildMemorial } from './modules/documents/render';

const app = new Hono<HonoEnv>();
let seedOnce: Promise<any> | null = null;

async function ensureSeed(c: any) {
  if (!seedOnce) seedOnce = ensureNormativeSeed(c.env.DB);
  await seedOnce;
}

app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  await ensureSeed(c);
  return cors({
    origin: (origin) => (!origin || origin === c.env.APP_ORIGIN ? origin || c.env.APP_ORIGIN : ''),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
  })(c, next);
});

app.onError((err, c) => {
  const requestId = c.get('requestId');
  if (err instanceof HttpError) {
    return c.json(jsonErr(err.message, err.code, err.details, requestId), err.status);
  }
  console.error(JSON.stringify({ requestId, message: (err as Error).message, stack: (err as Error).stack }));
  return c.json(jsonErr('Erro interno', 'INTERNAL_ERROR', undefined, requestId), 500);
});

app.get('/health', (c) => c.json(jsonOk({ status: 'ok', time: nowIso(), service: 'vetoreco-api' }, c.get('requestId'))));
app.get('/version', (c) => c.json(jsonOk({ version: '0.1.0', channel: 'v2.1-tech-preview' }, c.get('requestId'))));

app.post('/auth/register', async (c) => c.json(jsonOk(await register(c), c.get('requestId'))));
app.post('/auth/login', async (c) => c.json(jsonOk(await login(c), c.get('requestId'))));
app.post('/auth/logout', requireAuth, async (c) => c.json(jsonOk(await logout(c), c.get('requestId'))));
app.get('/auth/me', requireAuth, async (c) => {
  const user = await c.env.DB.prepare(`SELECT id,email,created_at FROM users WHERE id=?`).bind(c.get('userId')).first<any>();
  return c.json(jsonOk({ user }, c.get('requestId')));
});

app.use('/projects', requireAuth);
app.use('/projects/*', requireAuth);

app.get('/projects', async (c) => {
  const rows = await c.env.DB.prepare(`SELECT * FROM projects WHERE user_id=? ORDER BY updated_at DESC`).bind(c.get('userId')).all<any>();
  return c.json(jsonOk({ projects: rows.results || [] }, c.get('requestId')));
});

app.post('/projects', async (c) => {
  const b = await c.req.json<any>().catch(() => ({}));
  assert(b.name, 400, 'VALIDATION_ERROR', 'Nome do projeto é obrigatório');
  const ts = nowIso();
  const id = randomId();
  const row = {
    id,
    user_id: c.get('userId'),
    name: String(b.name).trim(),
    city: String(b.city || ''),
    state: String(b.state || '').toUpperCase(),
    municipality_size: b.municipality_size || 'large',
    typology: b.typology || 'residencial',
    phase: b.phase || 'anteprojeto',
    protocol_year: Number(b.protocol_year || new Date().getFullYear()),
    area_m2: b.area_m2 ? Number(b.area_m2) : null,
    is_federal_public: b.is_federal_public ? 1 : 0,
    notes: String(b.notes || ''),
    technical_inputs_json: JSON.stringify({}),
    technical_inputs_updated_at: null,
    created_at: ts,
    updated_at: ts,
  };
  await c.env.DB.prepare(
    `INSERT INTO projects (id,user_id,name,city,state,municipality_size,typology,phase,protocol_year,area_m2,is_federal_public,notes,technical_inputs_json,technical_inputs_updated_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      row.id,
      row.user_id,
      row.name,
      row.city,
      row.state,
      row.municipality_size,
      row.typology,
      row.phase,
      row.protocol_year,
      row.area_m2,
      row.is_federal_public,
      row.notes,
      row.technical_inputs_json,
      row.technical_inputs_updated_at,
      row.created_at,
      row.updated_at,
    )
    .run();

  const defaultContext = normalizeRegulatoryContext({}, row);
  await c.env.DB.prepare(
    `INSERT INTO project_regulatory_context (id,project_id,protocol_date,permit_issue_date,public_bid_date,population_band,entity_scope,classification_method,legacy_reason,evidence_ence_projeto_legacy,state_code,autodeclaration_requested,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      randomId(),
      id,
      defaultContext.protocol_date,
      defaultContext.permit_issue_date,
      defaultContext.public_bid_date,
      defaultContext.population_band,
      defaultContext.entity_scope,
      defaultContext.classification_method,
      defaultContext.legacy_reason,
      defaultContext.evidence_ence_projeto_legacy,
      defaultContext.state_code,
      defaultContext.autodeclaration_requested ? 1 : 0,
      ts,
    )
    .run();

  await audit(c, 'projects.create', { name: row.name }, id);
  return c.json(jsonOk({ project: row }, c.get('requestId')));
});

app.get('/projects/:id', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  return c.json(jsonOk({ project }, c.get('requestId')));
});

app.put('/projects/:id', async (c) => {
  const projectId = c.req.param('id');
  const project = await getOwnedProject(c, projectId);
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const b = await c.req.json<any>().catch(() => ({}));
  const updated = {
    ...project,
    name: String(b.name ?? project.name),
    city: String(b.city ?? project.city ?? ''),
    state: String(b.state ?? project.state ?? '').toUpperCase(),
    municipality_size: b.municipality_size ?? project.municipality_size,
    typology: b.typology ?? project.typology,
    phase: b.phase ?? project.phase,
    protocol_year: Number(b.protocol_year ?? project.protocol_year),
    area_m2: b.area_m2 === '' ? null : Number(b.area_m2 ?? project.area_m2),
    is_federal_public: b.is_federal_public ? 1 : 0,
    notes: String(b.notes ?? project.notes ?? ''),
    updated_at: nowIso(),
  };

  await c.env.DB.prepare(
    `UPDATE projects SET name=?,city=?,state=?,municipality_size=?,typology=?,phase=?,protocol_year=?,area_m2=?,is_federal_public=?,notes=?,updated_at=? WHERE id=? AND user_id=?`,
  )
    .bind(
      updated.name,
      updated.city,
      updated.state,
      updated.municipality_size,
      updated.typology,
      updated.phase,
      updated.protocol_year,
      updated.area_m2,
      updated.is_federal_public,
      updated.notes,
      updated.updated_at,
      projectId,
      c.get('userId'),
    )
    .run();

  await snapshotProject(c, projectId, updated, 'project');
  await audit(c, 'projects.update', { fields: Object.keys(b) }, projectId);
  return c.json(jsonOk({ project: updated }, c.get('requestId')));
});

app.delete('/projects/:id', async (c) => {
  const projectId = c.req.param('id');
  const project = await getOwnedProject(c, projectId);
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  await c.env.DB.prepare(`DELETE FROM projects WHERE id=? AND user_id=?`).bind(projectId, c.get('userId')).run();
  await audit(c, 'projects.delete', { projectId }, projectId);
  return c.json(jsonOk({}, c.get('requestId')));
});

async function getCheckedKeys(c: any, projectId: string) {
  const rows = await c.env.DB.prepare(`SELECT item_key FROM project_checklist_items WHERE project_id=? AND checked=1`).bind(projectId).all<any>();
  return (rows.results || []).map((r: any) => String(r.item_key));
}

app.get('/projects/:id/checklist', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const template = getChecklistTemplate(project.typology);
  const rows = await c.env.DB.prepare(`SELECT item_key,checked FROM project_checklist_items WHERE project_id=?`).bind(project.id).all<any>();
  const map = new Map((rows.results || []).map((r: any) => [r.item_key, Boolean(r.checked)]));
  const items = template.map((t) => ({ ...t, checked: map.get(t.key) ?? false }));
  return c.json(jsonOk({ items }, c.get('requestId')));
});

app.put('/projects/:id/checklist', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const body = await c.req.json<any>().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  const ts = nowIso();
  for (const item of items) {
    await c.env.DB.prepare(
      `INSERT INTO project_checklist_items (id,project_id,item_key,checked,updated_at) VALUES (?,?,?,?,?)
       ON CONFLICT(project_id,item_key) DO UPDATE SET checked=excluded.checked, updated_at=excluded.updated_at`,
    )
      .bind(randomId(), project.id, String(item.key), item.checked ? 1 : 0, ts)
      .run();
  }
  await c.env.DB.prepare(`UPDATE projects SET updated_at=? WHERE id=?`).bind(ts, project.id).run();
  await audit(c, 'checklist.update', { count: items.length }, project.id);
  return c.json(jsonOk({ ok: true }, c.get('requestId')));
});

app.get('/projects/:id/risk', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const checked = await getCheckedKeys(c, project.id);
  return c.json(jsonOk({ risk: computeRisk(project.typology, checked) }, c.get('requestId')));
});

async function getRegContext(c: any, project: any) {
  const raw = await c.env.DB.prepare(`SELECT * FROM project_regulatory_context WHERE project_id=?`).bind(project.id).first<any>();
  return normalizeRegulatoryContext(
    {
      protocol_date: raw?.protocol_date,
      permit_issue_date: raw?.permit_issue_date,
      public_bid_date: raw?.public_bid_date,
      population_band: raw?.population_band,
      entity_scope: raw?.entity_scope,
      classification_method: raw?.classification_method,
      legacy_reason: raw?.legacy_reason,
      evidence_ence_projeto_legacy: raw?.evidence_ence_projeto_legacy,
      state_code: raw?.state_code,
      autodeclaration_requested: Boolean(raw?.autodeclaration_requested),
    },
    project,
  );
}

app.get('/projects/:id/regulatory-context', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const context = await getRegContext(c, project);
  return c.json(jsonOk({ context }, c.get('requestId')));
});

app.put('/projects/:id/regulatory-context', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const body = await c.req.json<any>().catch(() => ({}));
  const ctx = normalizeRegulatoryContext(body, project);
  const ts = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO project_regulatory_context (id,project_id,protocol_date,permit_issue_date,public_bid_date,population_band,entity_scope,classification_method,legacy_reason,evidence_ence_projeto_legacy,state_code,autodeclaration_requested,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(project_id) DO UPDATE SET
       protocol_date=excluded.protocol_date,
       permit_issue_date=excluded.permit_issue_date,
       public_bid_date=excluded.public_bid_date,
       population_band=excluded.population_band,
       entity_scope=excluded.entity_scope,
       classification_method=excluded.classification_method,
       legacy_reason=excluded.legacy_reason,
       evidence_ence_projeto_legacy=excluded.evidence_ence_projeto_legacy,
       state_code=excluded.state_code,
       autodeclaration_requested=excluded.autodeclaration_requested,
       updated_at=excluded.updated_at`,
  )
    .bind(
      randomId(),
      project.id,
      ctx.protocol_date,
      ctx.permit_issue_date,
      ctx.public_bid_date,
      ctx.population_band,
      ctx.entity_scope,
      ctx.classification_method,
      ctx.legacy_reason,
      ctx.evidence_ence_projeto_legacy,
      ctx.state_code,
      ctx.autodeclaration_requested ? 1 : 0,
      ts,
    )
    .run();

  await audit(c, 'regulatory_context.update', { method: ctx.classification_method, entity: ctx.entity_scope }, project.id);
  return c.json(jsonOk({ context: ctx }, c.get('requestId')));
});

app.get('/projects/:id/legal-framing', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const context = await getRegContext(c, project);
  const framing = evaluateLegalFraming(project, context);
  return c.json(jsonOk({ framing }, c.get('requestId')));
});

app.get('/projects/:id/diagnosis', async (c) => {
  // compat route
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const context = await getRegContext(c, project);
  const framing = evaluateLegalFraming(project, context);
  return c.json(jsonOk({ diagnosis: framing, badge: framing.ruleMode === 'INI_FIRST' ? 'Motor versionado (INI-first)' : 'RTQ legado (transição)' }, c.get('requestId')));
});

app.get('/projects/:id/technical-inputs', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const inputs = normalizeTechnicalInputs(safeJsonParse(project.technical_inputs_json, {}));
  const validation = validateTechnicalInputs(inputs, project.typology);
  return c.json(jsonOk({ inputs, validation }, c.get('requestId')));
});

app.put('/projects/:id/technical-inputs', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const body = await c.req.json<any>().catch(() => ({}));
  const inputs = normalizeTechnicalInputs(body);
  const validation = validateTechnicalInputs(inputs, project.typology);
  const ts = nowIso();
  await c.env.DB.prepare(`UPDATE projects SET technical_inputs_json=?, technical_inputs_updated_at=?, updated_at=? WHERE id=? AND user_id=?`)
    .bind(JSON.stringify(inputs), ts, ts, project.id, c.get('userId'))
    .run();
  await snapshotProject(c, project.id, { type: 'technical-inputs', inputs, validation }, 'technical');
  await audit(c, 'technical_inputs.update', { coverage: validation.coverage, valid: validation.valid }, project.id);
  return c.json(jsonOk({ inputs, validation }, c.get('requestId')));
});

app.post('/projects/:id/calculation/run', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const inputs = normalizeTechnicalInputs(safeJsonParse(project.technical_inputs_json, {}));
  const validation = validateTechnicalInputs(inputs, project.typology);
  const context = await getRegContext(c, project);
  const framing = evaluateLegalFraming(project, context);
  const checkedKeys = await getCheckedKeys(c, project.id);
  const result = runPreCalculation({ project, legalFraming: framing, inputs, validation, checkedKeys });

  const ts = nowIso();
  const runId = randomId();
  await c.env.DB.prepare(
    `INSERT INTO calculation_runs (id,project_id,normative_package_code,normative_package_version,algorithm_version,status,input_snapshot_json,result_json,warnings_json,errors_json,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      runId,
      project.id,
      result.normativePackage.code,
      result.normativePackage.version,
      result.algorithmVersion,
      result.summary.status,
      JSON.stringify({ inputs, context, checkedKeys }),
      JSON.stringify(result),
      JSON.stringify(result.warnings),
      JSON.stringify(result.errors),
      ts,
    )
    .run();

  await audit(c, 'calculation.run', { runId, status: result.summary.status, coverage: result.summary.coverage }, project.id);
  return c.json(jsonOk({ runId, result }, c.get('requestId')));
});

app.get('/projects/:id/calculation/runs', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const rows = await c.env.DB.prepare(`SELECT id,normative_package_code,normative_package_version,algorithm_version,status,created_at FROM calculation_runs WHERE project_id=? ORDER BY created_at DESC LIMIT 20`).bind(project.id).all<any>();
  return c.json(jsonOk({ runs: rows.results || [] }, c.get('requestId')));
});

app.get('/projects/:id/calculation/latest', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const row = await c.env.DB.prepare(`SELECT * FROM calculation_runs WHERE project_id=? ORDER BY created_at DESC LIMIT 1`).bind(project.id).first<any>();
  return c.json(jsonOk({ latest: row ? { ...row, result: safeJsonParse(row.result_json, null) } : null }, c.get('requestId')));
});

app.get('/projects/:id/memorial', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const format = (c.req.query('format') || 'json').toLowerCase();
  const inputs = normalizeTechnicalInputs(safeJsonParse(project.technical_inputs_json, {}));
  const legal = evaluateLegalFraming(project, await getRegContext(c, project));
  const latestRun = await c.env.DB.prepare(`SELECT * FROM calculation_runs WHERE project_id=? ORDER BY created_at DESC LIMIT 1`).bind(project.id).first<any>();
  const memorial = buildMemorial(project, legal, inputs, latestRun);
  await audit(c, 'documents.memorial', { format }, project.id);
  if (format === 'html') return c.html(memorial.html);
  return c.json(jsonOk(memorial.json, c.get('requestId')));
});

app.get('/projects/:id/dossier', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  const format = (c.req.query('format') || 'json').toLowerCase();
  const checkedKeys = await getCheckedKeys(c, project.id);
  const legal = evaluateLegalFraming(project, await getRegContext(c, project));
  const checklistItems = getChecklistTemplate(project.typology);
  const latestRunRow = await c.env.DB.prepare(`SELECT * FROM calculation_runs WHERE project_id=? ORDER BY created_at DESC LIMIT 1`).bind(project.id).first<any>();
  const latestRun = latestRunRow ? safeJsonParse(latestRunRow.result_json, null) : null;
  const dossier = buildDossier(project, legal, checklistItems, checkedKeys, latestRun);
  await audit(c, 'documents.dossier', { format }, project.id);
  if (format === 'html') return c.html(dossier.html);
  return c.json(jsonOk(dossier.json, c.get('requestId')));
});

app.get('/projects/:id/memorial.pdf', async (c) => {
  const project = await getOwnedProject(c, c.req.param('id'));
  assert(project, 404, 'NOT_FOUND', 'Projeto não encontrado');
  return c.json(jsonErr('PDF em Workers ainda não habilitado. Use /memorial?format=html ou json.', 'NOT_IMPLEMENTED', { featureFlag: 'PDF_EXPORT' }, c.get('requestId')), 501);
});

app.post('/projects/demo', async (c) => {
  const ts = nowIso();
  const id = randomId();
  await c.env.DB.prepare(
    `INSERT INTO projects (id,user_id,name,city,state,municipality_size,typology,phase,protocol_year,area_m2,is_federal_public,notes,technical_inputs_json,technical_inputs_updated_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      id,
      c.get('userId'),
      'Projeto Demo VetorEco',
      'Araguari',
      'MG',
      'large',
      'comercial',
      'anteprojeto',
      2028,
      1250,
      0,
      'Projeto de demonstração para validar fluxo técnico.',
      JSON.stringify({
        general: { zona_bioclimatica: 4, area_util_m2: 1250, pavimentos: 2 },
        envelope: { area_fachada_total_m2: 780, area_fachada_envidracada_m2: 290, possui_protecao_solar: true, cobertura_u: 1.4, parede_u: 2.1 },
        systems: { iluminacao_dpi_w_m2: 9.5, hvac_cop: 3.3, aquecimento_agua_tipo: null },
        declaration: { use_autodeclaracao: false },
      }),
      ts,
      ts,
      ts,
    )
    .run();

  await c.env.DB.prepare(
    `INSERT INTO project_regulatory_context (id,project_id,protocol_date,population_band,entity_scope,classification_method,state_code,autodeclaration_requested,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  )
    .bind(randomId(), id, '2028-02-15', 'large', 'privado', 'INI', 'MG', 0, ts)
    .run();

  for (const key of ['zona_bioclimatica', 'env_orientacao', 'envoltoria', 'aberturas', 'iluminacao_pot']) {
    await c.env.DB.prepare(`INSERT INTO project_checklist_items (id,project_id,item_key,checked,updated_at) VALUES (?,?,?,?,?)`).bind(randomId(), id, key, 1, ts).run();
  }

  await audit(c, 'projects.demo', {}, id);
  return c.json(jsonOk({ projectId: id }, c.get('requestId')));
});

app.get('/normatives/packages', requireAuth, async (c) => {
  const rows = await c.env.DB.prepare(`SELECT code,version,title,valid_from,valid_to,is_legacy FROM normative_packages ORDER BY code, version`).all<any>();
  return c.json(jsonOk({ packages: rows.results || [] }, c.get('requestId')));
});

app.get('/normatives/rules', requireAuth, async (c) => {
  const rows = await c.env.DB.prepare(`SELECT package_code,package_version,rule_key,rule_value_json FROM normative_rules ORDER BY package_code,rule_key`).all<any>();
  return c.json(jsonOk({ rules: rows.results || [] }, c.get('requestId')));
});

export default app;
