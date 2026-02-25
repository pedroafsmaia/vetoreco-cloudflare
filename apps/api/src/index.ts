import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type {
  Bindings,
  CalculationRunRecord,
  MunicipalityBand,
  ProjectRow,
  PublicEntityLevel,
  RegulatoryContextRow,
  Typology,
  Variables
} from './types';
import { cookieSerialize, getBody, hashPassword, jsonErr, jsonOk, nowIso, parseCookie, sanitizeSlug, sha256Hex, verifyPassword } from './utils';
import { createD1Repo, type Repo } from './repo';
import { createInMemoryRepo } from './testing/inMemoryRepo';
import { computeChecklistSummary, getChecklistTemplate } from './modules/checklist';
import { resolveLegalFraming } from './modules/regulatory';
import { normalizeTechnicalInputs, validateTechnicalInputs } from './modules/technical';
import { runPreCalculation } from './modules/calculation';
import { buildDossierDocument, buildMemorialDocument } from './modules/documents';
import { calculateProjectThermal, getLatestProjectThermalCalculation, getProjectThermalQuick, listThermalMaterials, listThermalZones, saveProjectThermalQuick, searchMunicipalities } from './modules/thermalProject';
import { runGoldenCases } from './modules/goldenCases';
import { buildSimplePdfFromText } from './pdf';

const SESSION_DAYS = 14;
const loginAttempts = new Map<string, number[]>();

type AppCtx = { Bindings: Bindings; Variables: Variables };
type AppFactoryOpts = { repo?: Repo };

async function audit(c: any, action: string, details?: unknown, projectId?: string) {
  const repo = c.get('repo') as Repo;
  await repo.insertAuditLog({
    userId: c.get('userId') || null,
    projectId: projectId || null,
    action,
    details,
    requestId: c.get('requestId')
  });
}

function responseOk(c: any, data: any, status = 200) {
  return c.json(jsonOk(c.get('requestId'), data), status);
}
function responseErr(c: any, message: string, code = 'BAD_REQUEST', status = 400, details?: unknown) {
  return c.json(jsonErr(c.get('requestId'), message, code, details), status);
}

async function resolveMembership(c: any) {
  const repo = c.get('repo') as Repo;
  const orgs = await repo.listOrganizationsForUser(c.get('userId'));
  if (!orgs.length) return null;
  const requested = c.req.header('X-Organization-Id') || c.req.query('orgId');
  const chosen = requested ? orgs.find((o) => o.id === requested) : orgs[0];
  if (!chosen) return null;
  c.set('organizationId', chosen.id);
  return chosen;
}

async function requireAuth(c: any, next: any) {
  const repo = c.get('repo') as Repo;
  const token = parseCookie(c.req.header('Cookie')).vetoreco_session;
  if (!token) return responseErr(c, 'Não autenticado', 'UNAUTHORIZED', 401);
  const session = await repo.getSessionByTokenHash(await sha256Hex(token));
  if (!session) return responseErr(c, 'Sessão inválida', 'UNAUTHORIZED', 401);
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await repo.deleteSession(session.session_id);
    return responseErr(c, 'Sessão expirada', 'UNAUTHORIZED', 401);
  }
  const user = await repo.getUserById(session.user_id);
  if (!user) return responseErr(c, 'Usuário não encontrado', 'UNAUTHORIZED', 401);

  c.set('userId', user.id);
  c.set('sessionId', session.session_id);
  c.set('isSuperAdmin', !!user.is_super_admin);
  await repo.touchSession(session.session_id, nowIso());
  const membership = await resolveMembership(c);
  if (!membership) return responseErr(c, 'Usuário sem organização vinculada', 'UNAUTHORIZED', 401);
  return next();
}

function requireSuperAdmin(c: any) {
  if (!c.get('isSuperAdmin')) return responseErr(c, 'Acesso restrito a super-admin', 'FORBIDDEN', 403);
  return null;
}

async function getProjectOr404(c: any): Promise<ProjectRow | null> {
  const repo = c.get('repo') as Repo;
  const project = await repo.getProject(c.req.param('id'), c.get('organizationId'));
  if (!project) return null;
  return project;
}

async function computeLiveFraming(repo: Repo, project: ProjectRow, context: RegulatoryContextRow | null) {
  const protocolDate = context?.protocol_date || `${project.protocol_year}-01-01`;
  const preferredMode = (context?.classification_method === 'RTQ_LEGADO') ? 'RTQ' : 'INI';
  const normativePackage = await repo.getActiveNormativePackage(protocolDate, preferredMode) || await repo.getActiveNormativePackage(protocolDate);
  const rules = normativePackage ? await repo.listNormativeRules(normativePackage.id) : [];
  return resolveLegalFraming({ project, context, normativePackage, rules });
}


function normalizeGoldenCaseImportItem(item: any, index: number, userId: string) {
  const reportCaseId = String(item?.report_case_id || item?.case_id || '').trim();
  const reportNormative = String(item?.normative || '').trim();
  const isReportFormat = !!reportNormative && (item?.technical_inputs !== undefined || item?.expected_results !== undefined);

  if (isReportFormat) {
    const generatedKey = reportCaseId || `GC-${reportNormative}-${index + 1}`.replace(/[^A-Za-z0-9_-]/g, '-');
    return {
      case_key: generatedKey,
      label: String(item?.label || `${reportNormative} • ${item?.building_type || 'Golden case PBE Edifica'}`),
      normative_package_id: item?.normative_package_id || null,
      input_json: JSON.stringify({
        kind: 'report_reference',
        report_case_id: reportCaseId || generatedKey,
        normative: reportNormative,
        building_type: item?.building_type || null,
        bioclimatic_zone: item?.bioclimatic_zone || null,
        source_url: item?.source_url || null,
        technical_inputs: item?.technical_inputs ?? null,
        expected_results: item?.expected_results ?? null
      }),
      expected_output_json: JSON.stringify({
        expected_results: item?.expected_results ?? null,
        final_class_matrix: item?.final_class_matrix ?? null
      }),
      tolerance_json: JSON.stringify(item?.tolerance || item?.tolerance_json || { defaultAbs: 1e-6 }),
      notes: item?.notes || item?.curation_notes || 'Golden case importado do relatório consolidado (formato PBE Edifica)',
      updated_by_user_id: userId,
      source_url: item?.source_url || null,
      normative_code: reportNormative || null,
      building_type: item?.building_type || null,
      bioclimatic_zone: item?.bioclimatic_zone || null,
      data_quality: item?.data_quality || null,
      completeness_pct: item?.completeness_pct ?? null
    } as any;
  }

  const case_key = String(item.case_key || item.caseKey || '').trim();
  if (!case_key) throw new Error('case_key ausente');

  return {
    case_key,
    label: String(item.label || case_key || `Case ${index + 1}`),
    normative_package_id: item.normative_package_id || item.normativePackageId || null,
    input_json: JSON.stringify(item.input ?? item.input_json ?? {}),
    expected_output_json: JSON.stringify(item.expected_output ?? item.expectedOutput ?? item.expected_output_json ?? {}),
    tolerance_json: item.tolerance_json
      ? (typeof item.tolerance_json === 'string' ? item.tolerance_json : JSON.stringify(item.tolerance_json))
      : (item.tolerance ? JSON.stringify(item.tolerance) : null),
    notes: item.notes || null,
    updated_by_user_id: userId,
    source_url: item.source_url || null,
    normative_code: item.normative_code || item.normative || null,
    building_type: item.building_type || null,
    bioclimatic_zone: item.bioclimatic_zone || null,
    data_quality: item.data_quality || null,
    completeness_pct: item.completeness_pct ?? null
  } as any;
}

export function createApp(opts: AppFactoryOpts = {}) {
  const app = new Hono<AppCtx>();

  app.use('*', async (c, next) => {
    c.set('requestId', crypto.randomUUID());
    const repo = opts.repo || createD1Repo(c.env.DB);
    c.set('repo', repo);
    const origin = c.req.header('Origin');
    const allowed = c.env.APP_ORIGIN || origin || '*';
    return cors({
      origin: (requestOrigin) => (!requestOrigin || requestOrigin === allowed ? (requestOrigin || allowed) : allowed),
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'X-Organization-Id'],
      credentials: true
    })(c, next);
  });

  app.onError((err, c) => {
    console.error(JSON.stringify({ requestId: c.get('requestId'), path: c.req.path, error: err.message }));
    return c.json(jsonErr(c.get('requestId'), 'Erro interno', 'INTERNAL_ERROR'), 500);
  });

  app.get('/health', (c) => responseOk(c, { status: 'ok', time: nowIso() }));
  app.get('/version', (c) => responseOk(c, { version: '0.4.2', api: 'vetoreco-cloudflare' }));

  app.post('/auth/register', async (c) => {
    const repo = c.get('repo') as Repo;
    const body = getBody<any>(await c.req.json().catch(() => ({})));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const workspaceName = String(body.workspaceName || '').trim();
    if (!email.includes('@') || password.length < 8) return responseErr(c, 'Email inválido ou senha curta (mínimo 8).');
    if (await repo.getUserByEmail(email)) return responseErr(c, 'Email já cadastrado', 'CONFLICT', 409);

    const { hash, salt } = await hashPassword(password);
    const user = await repo.createUser({ email, password_hash: hash, password_salt: salt });
    const org = await repo.createOrganization({ name: workspaceName || `Workspace ${email.split('@')[0]}`, slug: sanitizeSlug(workspaceName || email.split('@')[0]), owner_user_id: user.id });
    await repo.addOrganizationMember({ organization_id: org.id, user_id: user.id, role: 'owner' });

    await audit(c, 'auth.register', { email, organizationId: org.id });
    return responseOk(c, { user: { id: user.id, email: user.email }, organization: org }, 201);
  });

  app.post('/auth/login', async (c) => {
    const repo = c.get('repo') as Repo;
    const ip = c.req.header('CF-Connecting-IP') || 'local';
    const attempts = (loginAttempts.get(ip) || []).filter((t) => Date.now() - t < 15 * 60_000);
    if (attempts.length >= 10) return responseErr(c, 'Muitas tentativas. Tente novamente depois.', 'RATE_LIMITED', 429);

    const body = getBody<any>(await c.req.json().catch(() => ({})));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    const user = await repo.getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
      attempts.push(Date.now()); loginAttempts.set(ip, attempts);
      return responseErr(c, 'Credenciais inválidas', 'UNAUTHORIZED', 401);
    }

    const rawToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
    const session = await repo.createSession({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });

    const secureCookie = !(c.req.header('Host') || '').includes('localhost');
    c.header('Set-Cookie', cookieSerialize('vetoreco_session', rawToken, { maxAge: SESSION_DAYS * 86400, secure: secureCookie }));
    await audit(c, 'auth.login', { email, sessionId: session.id });
    return responseOk(c, { user: { id: user.id, email: user.email } });
  });

  app.post('/auth/logout', requireAuth, async (c) => {
    const repo = c.get('repo') as Repo;
    await repo.deleteSession(c.get('sessionId'));
    const secureCookie = !(c.req.header('Host') || '').includes('localhost');
    c.header('Set-Cookie', cookieSerialize('vetoreco_session', '', { maxAge: 0, secure: secureCookie }));
    await audit(c, 'auth.logout');
    return responseOk(c, {});
  });

  app.get('/auth/me', requireAuth, async (c) => {
    const repo = c.get('repo') as Repo;
    const user = await repo.getUserById(c.get('userId'));
    const orgs = await repo.listOrganizationsForUser(c.get('userId'));
    return responseOk(c, {
      user: user ? { id: user.id, email: user.email, is_super_admin: !!user.is_super_admin } : null,
      organizations: orgs,
      activeOrganizationId: c.get('organizationId')
    });
  });

  app.use('/organizations', requireAuth);
  app.use('/organizations/*', requireAuth);
  app.get('/organizations', async (c) => {
    const repo = c.get('repo') as Repo;
    const organizations = await repo.listOrganizationsForUser(c.get('userId'));
    return responseOk(c, { organizations });
  });
  app.post('/organizations', async (c) => {
    const repo = c.get('repo') as Repo;
    const body = getBody<any>(await c.req.json().catch(() => ({})));
    const name = String(body.name || '').trim();
    if (name.length < 3) return responseErr(c, 'Nome da organização muito curto');
    const org = await repo.createOrganization({ name, slug: sanitizeSlug(name), owner_user_id: c.get('userId') });
    await repo.addOrganizationMember({ organization_id: org.id, user_id: c.get('userId'), role: 'owner' });
    await audit(c, 'organizations.create', { organizationId: org.id });
    return responseOk(c, { organization: org }, 201);
  });

  app.use('/projects', requireAuth);
  app.use('/projects/*', requireAuth);

  app.get('/projects', async (c) => {
    const repo = c.get('repo') as Repo;
    return responseOk(c, { projects: await repo.listProjects(c.get('organizationId')) });
  });

  app.post('/projects', async (c) => {
    const repo = c.get('repo') as Repo;
    const b = getBody<any>(await c.req.json().catch(() => ({})));
    if (!b.name) return responseErr(c, 'Nome do projeto é obrigatório');
    const project = await repo.createProject({
      organization_id: c.get('organizationId'),
      user_id: c.get('userId'),
      name: String(b.name),
      city: String(b.city || ''),
      state: String(b.state || ''),
      municipality_size: (b.municipality_size || 'large') as MunicipalityBand,
      typology: (b.typology || 'residencial') as Typology,
      phase: String(b.phase || 'anteprojeto'),
      protocol_year: Number(b.protocol_year || new Date().getFullYear()),
      area_m2: b.area_m2 == null || b.area_m2 === '' ? null : Number(b.area_m2),
      is_federal_public: b.is_federal_public ? 1 : 0,
      notes: String(b.notes || '')
    });
    await repo.upsertRegulatoryContext(project.id, c.get('userId'), {
      classification_method: 'INI',
      protocol_date: `${project.protocol_year}-01-01`,
      municipality_population_band: project.municipality_size,
      public_entity_level: project.is_federal_public ? 'federal' : 'na',
      is_public_building: project.typology === 'publica' ? 1 : 0,
      requests_autodeclaration: 0
    });
    await repo.upsertTechnicalInputs(project.id, c.get('userId'), normalizeTechnicalInputs({}));
    await repo.createProjectVersion(project.id, 'initial', project);
    await audit(c, 'projects.create', { projectId: project.id }, project.id);
    return responseOk(c, { project }, 201);
  });

  app.post('/projects/demo', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await repo.createProject({
      organization_id: c.get('organizationId'),
      user_id: c.get('userId'),
      name: 'Projeto Demo VetorEco',
      city: 'São Paulo',
      state: 'SP',
      municipality_size: 'large',
      typology: 'comercial',
      phase: 'anteprojeto',
      protocol_year: 2028,
      area_m2: 1500,
      is_federal_public: 0,
      notes: 'Projeto de demonstração do fluxo de eficiência energética.'
    });
    await repo.upsertRegulatoryContext(project.id, c.get('userId'), {
      classification_method: 'INI',
      protocol_date: '2028-04-10',
      municipality_population_band: 'large',
      public_entity_level: 'na',
      is_public_building: 0,
      requests_autodeclaration: 1
    });
    await repo.upsertChecklistItems(project.id, getChecklistTemplate(project.typology).slice(0, 4).map((i) => ({ item_id: i.id, checked: 1 })));
    await repo.upsertTechnicalInputs(project.id, c.get('userId'), normalizeTechnicalInputs({
      general: { climateZone: 'ZB3', floors: 4, conditionedAreaM2: 1200, useHoursPerDay: 12 },
      envelope: { wallUValue: 2.1, roofUValue: 1.6, windowToWallRatio: 42, shadingFactor: 0.4 },
      systems: { lightingLPD: 8.5, hvacType: 'VRF', hvacCop: 3.2 },
      autodeclaration: { requested: true, justification: 'Pré-avaliação interna do escritório' }
    }));
    await audit(c, 'projects.demo.create', { projectId: project.id }, project.id);
    return responseOk(c, { project }, 201);
  });

  app.get('/projects/:id', async (c) => {
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    return responseOk(c, { project });
  });

  app.put('/projects/:id', async (c) => {
    const repo = c.get('repo') as Repo;
    const current = await getProjectOr404(c);
    if (!current) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const b = getBody<any>(await c.req.json().catch(() => ({})));
    const updated = await repo.updateProject(current.id, c.get('organizationId'), {
      name: b.name ?? current.name,
      city: b.city ?? current.city,
      state: b.state ?? current.state,
      municipality_size: (b.municipality_size ?? current.municipality_size) as MunicipalityBand,
      typology: (b.typology ?? current.typology) as Typology,
      phase: b.phase ?? current.phase,
      protocol_year: b.protocol_year == null ? current.protocol_year : Number(b.protocol_year),
      area_m2: b.area_m2 === '' ? null : (b.area_m2 == null ? current.area_m2 : Number(b.area_m2)),
      is_federal_public: b.is_federal_public === undefined ? current.is_federal_public : (b.is_federal_public ? 1 : 0),
      notes: b.notes ?? current.notes
    });
    if (!updated) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    await repo.createProjectVersion(updated.id, `update-${Date.now()}`, updated);
    await audit(c, 'projects.update', { projectId: updated.id }, updated.id);
    return responseOk(c, { project: updated });
  });

  app.delete('/projects/:id', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    await repo.deleteProject(project.id, c.get('organizationId'));
    await audit(c, 'projects.delete', { projectId: project.id }, project.id);
    return responseOk(c, {});
  });

  app.get('/projects/:id/checklist', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const rows = await repo.getChecklistItems(project.id);
    const checkedIds = rows.filter((r) => Number(r.checked) === 1).map((r) => r.item_id);
    const summary = computeChecklistSummary(project.typology, checkedIds);
    return responseOk(c, {
      items: summary.items.map((i) => ({ ...i, checked: checkedIds.includes(i.id) })),
      summary
    });
  });

  app.put('/projects/:id/checklist', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const body = getBody<any>(await c.req.json().catch(() => ({})));
    const items = Array.isArray(body.items) ? body.items : [];
    await repo.upsertChecklistItems(project.id, items.map((i: any) => ({ item_id: String(i.item_id || i.id || ''), checked: i.checked ? 1 : 0 })).filter((i: any) => i.item_id));
    await audit(c, 'projects.checklist.update', { count: items.length }, project.id);
    return responseOk(c, {});
  });

  app.get('/projects/:id/regulatory-context', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    return responseOk(c, { context: await repo.getRegulatoryContext(project.id) });
  });

  app.put('/projects/:id/regulatory-context', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const b = getBody<any>(await c.req.json().catch(() => ({})));
    const method = (b.classification_method || 'INI') as 'INI' | 'RTQ_LEGADO';
    if (!['INI', 'RTQ_LEGADO'].includes(method)) return responseErr(c, 'classification_method inválido');
    const context = await repo.upsertRegulatoryContext(project.id, c.get('userId'), {
      classification_method: method,
      protocol_date: b.protocol_date || null,
      permit_protocol_date: b.permit_protocol_date || null,
      public_tender_date: b.public_tender_date || null,
      municipality_population_band: (b.municipality_population_band || null) as MunicipalityBand | null,
      public_entity_level: (b.public_entity_level || 'na') as PublicEntityLevel,
      is_public_building: b.is_public_building ? 1 : 0,
      requests_autodeclaration: b.requests_autodeclaration ? 1 : 0,
      legacy_reason: b.legacy_reason || null,
      legacy_ence_project_evidence: b.legacy_ence_project_evidence || null,
      notes: b.notes || null
    });
    await audit(c, 'projects.regulatory_context.update', { method: context.classification_method }, project.id);
    return responseOk(c, { context });
  });

  app.get('/projects/:id/legal-framing', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const context = await repo.getRegulatoryContext(project.id);
    const framing = await computeLiveFraming(repo, project, context);
    return responseOk(c, { framing });
  });

  app.get('/projects/:id/technical-inputs', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const inputs = await repo.getTechnicalInputs(project.id);
    return responseOk(c, { inputs, validation: validateTechnicalInputs(project.typology, inputs) });
  });

  app.put('/projects/:id/technical-inputs', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const body = getBody<any>(await c.req.json().catch(() => ({})));
    const normalized = normalizeTechnicalInputs(body.inputs || body);
    const validation = validateTechnicalInputs(project.typology, normalized);
    if (validation.errors.length) return responseErr(c, 'Falha na validação dos inputs técnicos', 'VALIDATION_ERROR', 422, { errors: validation.errors });
    await repo.upsertTechnicalInputs(project.id, c.get('userId'), normalized);
    await audit(c, 'projects.technical_inputs.update', { coverage: validation.coverage.percent }, project.id);
    return responseOk(c, { inputs: normalized, validation });
  });

  app.post('/projects/:id/calculation/run', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);

    const context = await repo.getRegulatoryContext(project.id);
    const legalFraming = await computeLiveFraming(repo, project, context);
    const technicalInputs = await repo.getTechnicalInputs(project.id);
    const technicalValidation = validateTechnicalInputs(project.typology, technicalInputs);
    const checklistRows = await repo.getChecklistItems(project.id);
    const checklistSummary = computeChecklistSummary(project.typology, checklistRows.filter((x) => Number(x.checked) === 1).map((x) => x.item_id));
    const outputBase = runPreCalculation({ project, legalFraming, technicalValidation, checklistCoverage: checklistSummary.coverage });
    let thermalSummary: any = null;
    let output: any = { ...outputBase };
    if (c.env.DB) {
      try {
        let latestThermal = await getLatestProjectThermalCalculation(c.env.DB, project.id);
        if (!latestThermal) {
          const thermalQuick = await getProjectThermalQuick(c.env.DB, project.id).catch(() => null);
          const hasThermalQuick = !!(thermalQuick && (thermalQuick.wall || thermalQuick.roof || (thermalQuick.windows || []).length || (thermalQuick.lighting || []).length || (thermalQuick.hvac || []).length));
          if (hasThermalQuick) {
            latestThermal = await calculateProjectThermal(c.env.DB, project.id, { mode: 'auto' }).catch(() => null as any);
          }
        }
        if (latestThermal?.calculation) {
          thermalSummary = {
            method: latestThermal.calculation.calculation_method,
            zone: latestThermal.calculation.bioclimatic_zone,
            overallCompliant: !!latestThermal.checks?.overall_compliant,
            rtqrRating: latestThermal.calculation.rtqr_rating || null,
            rtqcRating: latestThermal.calculation.rtqc_rating || null,
            nbrCompliant: !!latestThermal.calculation.nbr_compliant,
            criticalIssues: Number(latestThermal.checks?.critical_issues || 0)
          };
          output = {
            ...outputBase,
            thermalSummary,
            warnings: [
              ...(outputBase.warnings || []),
              ...(thermalSummary.overallCompliant ? [] : ['Verificação térmica complementar com pendências.'])
            ]
          };
        }
      } catch (err) {
        // Tabelas térmicas podem não estar migradas ainda; mantém cálculo base
      }
    }

    const runRecord = await repo.insertCalculationRun({
      project_id: project.id,
      normative_package_id: legalFraming.normativePackage?.id || null,
      algorithm_version: output.algorithmVersion,
      status: output.status,
      input_snapshot_json: JSON.stringify({ project, context, technicalInputs, checklistRows, thermalSummary }),
      output_json: JSON.stringify(output),
      created_by_user_id: c.get('userId')
    });

    await audit(c, 'projects.calculation.run', { runId: runRecord.id, status: output.status }, project.id);
    return responseOk(c, { run: runRecord, output, legalFraming, technicalValidation, checklistSummary, thermalSummary });
  });

  app.get('/projects/:id/calculation/latest', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const run = await repo.getLatestCalculationRun(project.id);
    return responseOk(c, { run, output: run ? JSON.parse(run.output_json) : null });
  });

  app.get('/projects/:id/calculation/runs', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    return responseOk(c, { runs: await repo.listCalculationRuns(project.id, Number(c.req.query('limit') || 20)) });
  });

  app.get('/projects/:id/memorial', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const context = await repo.getRegulatoryContext(project.id);
    const framing = await computeLiveFraming(repo, project, context);
    const technicalInputs = await repo.getTechnicalInputs(project.id);
    const latest = await repo.getLatestCalculationRun(project.id);
    const calc = latest ? JSON.parse(latest.output_json) : null;
    const thermalCalc = c.env.DB ? await getLatestProjectThermalCalculation(c.env.DB, project.id).catch(() => null) : null;
    const doc = buildMemorialDocument({ project, legalFraming: framing, technicalInputs, calc, thermalCalc });
    if (c.req.query('format') === 'html') return c.html(doc.html);
    return responseOk(c, doc);
  });

  app.get('/projects/:id/memorial.pdf', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const context = await repo.getRegulatoryContext(project.id);
    const framing = await computeLiveFraming(repo, project, context);
    const technicalInputs = await repo.getTechnicalInputs(project.id);
    const latest = await repo.getLatestCalculationRun(project.id);
    const calc = latest ? JSON.parse(latest.output_json) : null;
    const thermalCalc = c.env.DB ? await getLatestProjectThermalCalculation(c.env.DB, project.id).catch(() => null) : null;
    const memorial = buildMemorialDocument({ project, legalFraming: framing, technicalInputs, calc, thermalCalc });
    const pdfBytes = await buildSimplePdfFromText(memorial.json.title, memorial.text);
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `inline; filename="memorial-${project.id}.pdf"`);
    return c.body(pdfBytes);
  });

  app.get('/projects/:id/dossier', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const context = await repo.getRegulatoryContext(project.id);
    const framing = await computeLiveFraming(repo, project, context);
    const latest = await repo.getLatestCalculationRun(project.id);
    const calc = latest ? JSON.parse(latest.output_json) : null;
    const checklistRows = await repo.getChecklistItems(project.id);
    const checklistSummary = computeChecklistSummary(project.typology, checklistRows.filter((x) => Number(x.checked) === 1).map((x) => x.item_id));
    const thermalCalc = c.env.DB ? await getLatestProjectThermalCalculation(c.env.DB, project.id).catch(() => null) : null;
    const doc = buildDossierDocument({ project, legalFraming: framing, checklistSummary, calc, thermalCalc });
    if (c.req.query('format') === 'html') return c.html(doc.html);
    return responseOk(c, doc);
  });

  app.get('/projects/:id/diagnosis', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const framing = await computeLiveFraming(repo, project, await repo.getRegulatoryContext(project.id));
    return responseOk(c, { diagnosis: { mandatory: framing.applicable, minLevel: framing.minLevel, path: framing.compliancePath }, badge: `${framing.classificationMethod} • ${framing.compliancePath}` });
  });

  app.get('/projects/:id/risk', async (c) => {
    const repo = c.get('repo') as Repo;
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    const checklistRows = await repo.getChecklistItems(project.id);
    const summary = computeChecklistSummary(project.typology, checklistRows.filter((x) => Number(x.checked) === 1).map((x) => x.item_id));
    return responseOk(c, { risk: { status: summary.status, progress: summary.coverage, criticalMissing: summary.criticalMissing, message: summary.message } });
  });


  app.get('/thermal/catalog/zones', async (c) => {
    if (!c.env.DB) return responseErr(c, 'Banco D1 não configurado', 'NOT_AVAILABLE', 501);
    try {
      return responseOk(c, { zones: await listThermalZones(c.env.DB) });
    } catch (err: any) {
      return responseErr(c, `Falha ao carregar zonas bioclimáticas: ${err.message}`, 'THERMAL_SCHEMA_MISSING', 500);
    }
  });

  app.get('/thermal/catalog/materials', async (c) => {
    if (!c.env.DB) return responseErr(c, 'Banco D1 não configurado', 'NOT_AVAILABLE', 501);
    try {
      return responseOk(c, { materials: await listThermalMaterials(c.env.DB, c.req.query('categoryId') || undefined) });
    } catch (err: any) {
      return responseErr(c, `Falha ao carregar materiais: ${err.message}`, 'THERMAL_SCHEMA_MISSING', 500);
    }
  });

  app.get('/thermal/catalog/municipalities', async (c) => {
    if (!c.env.DB) return responseErr(c, 'Banco D1 não configurado', 'NOT_AVAILABLE', 501);
    try {
      return responseOk(c, {
        municipalities: await searchMunicipalities(c.env.DB, {
          q: c.req.query('q') || undefined,
          state: c.req.query('state') || undefined,
          limit: Number(c.req.query('limit') || 20)
        })
      });
    } catch (err: any) {
      return responseErr(c, `Falha ao carregar municípios: ${err.message}`, 'THERMAL_SCHEMA_MISSING', 500);
    }
  });

  app.get('/projects/:id/thermal/quick', async (c) => {
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    if (!c.env.DB) return responseErr(c, 'Banco D1 não configurado', 'NOT_AVAILABLE', 501);
    try {
      return responseOk(c, { thermal: await getProjectThermalQuick(c.env.DB, project.id) });
    } catch (err: any) {
      return responseErr(c, `Falha ao ler dados térmicos: ${err.message}`, 'THERMAL_SCHEMA_MISSING', 500);
    }
  });

  app.put('/projects/:id/thermal/quick', async (c) => {
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    if (!c.env.DB) return responseErr(c, 'Banco D1 não configurado', 'NOT_AVAILABLE', 501);
    const body = getBody<any>(await c.req.json().catch(() => ({})));
    try {
      const saved = await saveProjectThermalQuick(c.env.DB, project.id, body.thermal || body);
      await audit(c, 'projects.thermal.quick.update', { hasWall: !!saved.wall, windows: (saved.windows || []).length }, project.id);
      return responseOk(c, { thermal: saved });
    } catch (err: any) {
      return responseErr(c, `Falha ao salvar dados térmicos: ${err.message}`, 'THERMAL_SCHEMA_MISSING', 500);
    }
  });

  app.post('/projects/:id/thermal/calculate', async (c) => {
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    if (!c.env.DB) return responseErr(c, 'Banco D1 não configurado', 'NOT_AVAILABLE', 501);
    const body = getBody<any>(await c.req.json().catch(() => ({})));
    try {
      if (body.thermal) await saveProjectThermalQuick(c.env.DB, project.id, body.thermal);
      const latest = await calculateProjectThermal(c.env.DB, project.id, { mode: body.mode || 'auto' });
      await audit(c, 'projects.thermal.calculate', { mode: body.mode || 'auto' }, project.id);
      return responseOk(c, latest);
    } catch (err: any) {
      return responseErr(c, `Falha no cálculo térmico: ${err.message}`, 'THERMAL_CALC_ERROR', 422);
    }
  });

  app.get('/projects/:id/thermal/latest', async (c) => {
    const project = await getProjectOr404(c);
    if (!project) return responseErr(c, 'Projeto não encontrado', 'NOT_FOUND', 404);
    if (!c.env.DB) return responseErr(c, 'Banco D1 não configurado', 'NOT_AVAILABLE', 501);
    try {
      return responseOk(c, await getLatestProjectThermalCalculation(c.env.DB, project.id));
    } catch (err: any) {
      return responseErr(c, `Falha ao buscar cálculo térmico: ${err.message}`, 'THERMAL_SCHEMA_MISSING', 500);
    }
  });

  app.post('/admin/golden-cases/import', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    const body = getBody<any>(await c.req.json().catch(() => ({})));
    const incoming = Array.isArray(body.cases) ? body.cases : [];
    let imported = 0;
    const errors: any[] = [];
    for (const [i, item] of incoming.entries()) {
      try {
        const normalized = normalizeGoldenCaseImportItem(item, i, c.get('userId'));
        await repo.upsertGoldenCaseResult(normalized);
        imported += 1;
      } catch (err: any) {
        errors.push({ index: i, message: err.message || 'erro' });
      }
    }
    await audit(c, 'admin.golden_cases.import', { imported, errors: errors.length });
    return responseOk(c, { imported, errors });
  });

  app.post('/admin/golden-cases/run', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    const body = getBody<any>(await c.req.json().catch(() => ({})));
    const rows = await repo.listGoldenCaseResults(Number(body.limit) || 500);
    const report = runGoldenCases(rows, { caseKeys: Array.isArray(body.caseKeys) ? body.caseKeys : undefined });
    await audit(c, 'admin.golden_cases.run', { total: report.summary.total, supported: report.summary.supportedTotal, skipped: report.summary.skipped, failed: report.summary.failed });
    return responseOk(c, report);
  });

  app.use('/admin', requireAuth);
  app.use('/admin/*', requireAuth);

  app.get('/admin/normative/packages', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    return responseOk(c, { packages: await repo.listNormativePackages() });
  });

  app.post('/admin/normative/packages', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    const b = getBody<any>(await c.req.json().catch(() => ({})));
    const pkg = await repo.createNormativePackage({
      code: String(b.code || ''),
      title: String(b.title || ''),
      mode: String(b.mode || 'INI'),
      effective_from: String(b.effective_from || new Date().toISOString().slice(0,10)),
      effective_to: b.effective_to || null,
      is_active: b.is_active === undefined ? 1 : (b.is_active ? 1 : 0),
      metadata_json: b.metadata_json ? JSON.stringify(b.metadata_json) : null
    });
    return responseOk(c, { package: pkg }, 201);
  });

  app.put('/admin/normative/packages/:id', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    const b = getBody<any>(await c.req.json().catch(() => ({})));
    const pkg = await repo.updateNormativePackage(c.req.param('id'), {
      code: b.code,
      title: b.title,
      mode: b.mode,
      effective_from: b.effective_from,
      effective_to: b.effective_to,
      is_active: b.is_active === undefined ? undefined : (b.is_active ? 1 : 0),
      metadata_json: b.metadata_json ? JSON.stringify(b.metadata_json) : undefined
    } as any);
    if (!pkg) return responseErr(c, 'Pacote não encontrado', 'NOT_FOUND', 404);
    return responseOk(c, { package: pkg });
  });

  app.get('/admin/normative/rules', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    const rules = await repo.listNormativeRules(c.req.query('packageId') || undefined);
    return responseOk(c, { rules });
  });

  app.post('/admin/normative/rules', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    const b = getBody<any>(await c.req.json().catch(() => ({})));
    const rule = await repo.createNormativeRule({
      package_id: String(b.package_id || ''),
      rule_key: String(b.rule_key || ''),
      title: String(b.title || b.rule_key || ''),
      sort_order: Number(b.sort_order || 100),
      criteria_json: JSON.stringify(b.criteria_json || {}),
      outcome_json: JSON.stringify(b.outcome_json || {}),
      effective_from: String(b.effective_from || new Date().toISOString().slice(0,10)),
      effective_to: b.effective_to || null,
      is_active: b.is_active === undefined ? 1 : (b.is_active ? 1 : 0),
      notes: b.notes || null
    });
    return responseOk(c, { rule }, 201);
  });

  app.put('/admin/normative/rules/:id', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    const b = getBody<any>(await c.req.json().catch(() => ({})));
    const rule = await repo.updateNormativeRule(c.req.param('id'), {
      package_id: b.package_id,
      rule_key: b.rule_key,
      title: b.title,
      sort_order: b.sort_order,
      criteria_json: b.criteria_json ? JSON.stringify(b.criteria_json) : undefined,
      outcome_json: b.outcome_json ? JSON.stringify(b.outcome_json) : undefined,
      effective_from: b.effective_from,
      effective_to: b.effective_to,
      is_active: b.is_active === undefined ? undefined : (b.is_active ? 1 : 0),
      notes: b.notes
    } as any);
    if (!rule) return responseErr(c, 'Regra não encontrada', 'NOT_FOUND', 404);
    return responseOk(c, { rule });
  });

  app.delete('/admin/normative/rules/:id', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    await repo.deleteNormativeRule(c.req.param('id'));
    return responseOk(c, {});
  });

  app.get('/admin/golden-cases', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    return responseOk(c, { items: await repo.listGoldenCaseResults(Number(c.req.query('limit') || 50)) });
  });

  app.post('/admin/golden-cases', async (c) => {
    const deny = requireSuperAdmin(c); if (deny) return deny;
    const repo = c.get('repo') as Repo;
    const b = getBody<any>(await c.req.json().catch(() => ({})));
    await repo.upsertGoldenCaseResult(normalizeGoldenCaseImportItem({
      case_key: b.case_key,
      label: b.label,
      normative_package_id: b.normative_package_id,
      input_json: b.input_json || {},
      expected_output_json: b.expected_output_json || {},
      tolerance_json: b.tolerance_json || null,
      notes: b.notes || null,
      source_url: b.source_url || null,
      normative_code: b.normative_code || null,
      building_type: b.building_type || null,
      bioclimatic_zone: b.bioclimatic_zone || null,
      data_quality: b.data_quality || null,
      completeness_pct: b.completeness_pct ?? null
    }, 0, c.get('userId')) as any);
    return responseOk(c, {});
  });

  return app;
}

const app = createApp();
export default app;
export { createInMemoryRepo };
