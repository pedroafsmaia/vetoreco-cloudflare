import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { authRoutes, requireAuth } from './auth';
import { Repo } from './repo';
import { err, ok, reqId } from './utils';
import { getKnowledgeOverview } from './knowledge';
import { PROJECT_ENCE_STAGES, STAGE_ORDER, computeReadinessByStages, computeTaskSatisfaction, isTaskActive, nextStage, pickNextActions, stagesUpTo } from './modules/journey';
import { calcAVS, calcLPD, calcLPDSpaces, calcUValue, calcWWR, calcWWRFacades } from './modules/calculators';
import { dossierPdfBytes, type DossierData } from './modules/dossier_improved';
import { computeDossierContentHash, dossierR2Key, getOrGenerateDossierPdf } from './services/dossier_cache';
import { registerEducationRoutes } from './routes/education';
import { registerClimateRoutes } from './routes/climate';
import { registerRtqcRoutes } from './routes/rtqc';
import { readJsonLimited, MAX_BODY_BYTES, clampStr, isValidUF, LIMITS } from './input';

const app = new Hono<{ Bindings: Env; Variables: { userId: string; requestId: string } }>();

// Observabilidade mínima:
// - requestId por request (retornado em X-Request-Id e em toda resposta JSON)
// - log estruturado com duração, rota, status
// - onError padronizado (evita respostas "sem id")
app.use('*', async (c, next) => {
  const rid = reqId();
  c.set('requestId', rid);
  const started = Date.now();
  try {
    await next();
  } finally {
    const ms = Date.now() - started;
    const url = new URL(c.req.url);
    const status = c.res?.status ?? 500;
    c.header('X-Request-Id', rid);
    console.log(JSON.stringify({
      level: 'info',
      requestId: rid,
      method: c.req.method,
      path: url.pathname,
      status,
      ms,
    }));
  }
});

app.onError((e: any, c) => {
  const rid = c.get('requestId') || reqId();
  const url = new URL(c.req.url);
  console.error(JSON.stringify({
    level: 'error',
    requestId: rid,
    method: c.req.method,
    path: url.pathname,
    message: e?.message || String(e),
    stack: e?.stack,
  }));
  c.header('X-Request-Id', rid);
  return c.json(err(rid, 'INTERNAL_ERROR', 'Erro interno. Se persistir, contate o suporte com o ID da requisição.'), 500);
});

app.notFound((c) => {
  const rid = c.get('requestId') || reqId();
  c.header('X-Request-Id', rid);
  return c.json(err(rid, 'NOT_FOUND', 'Rota não encontrada.'), 404);
});

// Rate limit simples (por instância) para geração de PDF do dossiê.
// Objetivo: evitar abuso acidental sem introduzir infraestrutura extra.
const pdfRate: Map<string, number[]> = new Map();
function allowPdf(userId: string, limit = 3, windowMs = 60_000) {
  const now = Date.now();
  const arr = (pdfRate.get(userId) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) return false;
  arr.push(now);
  pdfRate.set(userId, arr);
  return true;
}

// Limite simples de payload por Content-Length (melhor esforço)
// Observação: requests sem Content-Length (chunked) ainda serão limitados por validações e clamps.

// Validações simples para evitar payloads malformados e abuso acidental.
    if (origin && allowlist.includes(origin)) return origin;
    return allowlist[0];
  },
  credentials: true,
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET','POST','PUT','DELETE','OPTIONS']
}));

// Headers básicos de segurança (ajuda a evitar problemas comuns em produção)
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Frame-Options', 'DENY');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
});

await authRoutes(app);

app.get('/health', (c) => c.json({ ok: true }));
app.get('/version', (c) => c.json({ name: 'vetoreco', mode: 'rework', knowledge_pack: 'ini_2025_05' }));

app.get('/knowledge/overview', (c) => {
  const requestId = c.get('requestId');
  return c.json(ok(requestId, { pack: getKnowledgeOverview() }));
});

// Route modules
registerEducationRoutes(app);
registerClimateRoutes(app);
registerRtqcRoutes(app);









app.get('/projects', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const repo = new Repo(c.env);
  const projects = await repo.listProjects(c.get('userId'));
  return c.json(ok(requestId, { projects }));
});

app.post('/projects', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const body = await readJsonLimited(c, MAX_BODY_BYTES);
  if ((body as any).__too_large) {
    return c.json(err(requestId, 'PAYLOAD_TOO_LARGE', 'Payload muito grande. Reduza os campos e tente novamente.'), 413);
  }
  const name = clampStr(body.name, LIMITS.projectName);
  const typology = body.typology;
  const stage_current = body.stage_current;

  const city = body.city ? clampStr(body.city, LIMITS.city) : '';
  const state = body.state ? clampStr(body.state, 2).toUpperCase() : '';

  if (!name || !typology || !stage_current) return c.json(err(requestId, 'INVALID_INPUT', 'Informe nome, tipologia e etapa atual.'), 400);
  if (state && !isValidUF(state)) return c.json(err(requestId, 'INVALID_INPUT', 'UF inválida. Use 2 letras (ex.: SP).'), 400);

  const repo = new Repo(c.env);
  const id = await repo.createProject(c.get('userId'), {
    name,
    city: city || undefined,
    state: state || undefined,
    typology,
    stage_current,
    area_m2: body.area_m2 ?? null
  });
  await repo.audit(c.get('userId'), 'project.create', id);
  const project = await repo.getProject(c.get('userId'), id);
  return c.json(ok(requestId, { project }), 201);
});

app.get('/projects/:id', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const repo = new Repo(c.env);
  const project = await repo.getProject(c.get('userId'), c.req.param('id'));
  if (!project) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
  return c.json(ok(requestId, { project }));
});

app.put('/projects/:id', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const body = await readJsonLimited(c, MAX_BODY_BYTES);
  if ((body as any).__too_large) {
    return c.json(err(requestId, 'PAYLOAD_TOO_LARGE', 'Payload muito grande. Reduza os campos e tente novamente.'), 413);
  }

  // Sanitização básica de strings (evita payloads enormes e estados inválidos)
  if (body.name !== undefined) body.name = clampStr(body.name, LIMITS.projectName);
  if (body.city !== undefined) body.city = clampStr(body.city, LIMITS.city) || null;
  if (body.state !== undefined) {
    const uf = clampStr(body.state, 2).toUpperCase();
    if (uf && !isValidUF(uf)) return c.json(err(requestId, 'INVALID_INPUT', 'UF inválida. Use 2 letras (ex.: SP).'), 400);
    body.state = uf || null;
  }

  const repo = new Repo(c.env);
  const updated = await repo.updateProject(c.get('userId'), c.req.param('id'), body);
  if (!updated) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
  await repo.audit(c.get('userId'), 'project.update', c.req.param('id'));
  return c.json(ok(requestId, { project: updated }));
});

app.delete('/projects/:id', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const repo = new Repo(c.env);
  await repo.deleteProject(c.get('userId'), c.req.param('id'));
  await repo.audit(c.get('userId'), 'project.delete', c.req.param('id'));
  return c.json(ok(requestId, { ok: true }));
});

app.get('/projects/:id/journey', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const repo = new Repo(c.env);
  const project = await repo.getProject(c.get('userId'), c.req.param('id'));
  if (!project) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
  const taskRows = await repo.listTasks(c.get('userId'), c.req.param('id')) || [];

  const evCounts = await repo.evidenceCountsByTask(c.get('userId'), c.req.param('id')) || {};
  const caCounts = await repo.calcCountsByTask(c.get('userId'), c.req.param('id')) || {};

  const tasks = taskRows.map((t: any) => {
    let meta: any = null;
    try { meta = t.meta_json ? JSON.parse(t.meta_json) : null; } catch { meta = null; }

    const active = isTaskActive(meta, project);

    const evidenceCount = evCounts[String(t.id)] || 0;
    const calculationCount = caCounts[String(t.id)] || 0;
    const sat = computeTaskSatisfaction({
      critical: !!t.critical,
      completed: !!t.completed,
      meta,
      evidenceCount,
      calculationCount,
      project,
    });

    return {
      ...t,
      active,
      critical: !!t.critical,
      completed: !!t.completed,
      meta,
      evidence_count: evidenceCount,
      calc_count: calculationCount,
      satisfied: sat.satisfied,
      missing: {
        evidence: sat.missingEvidence,
        calculation: sat.missingCalculation,
        projectData: sat.missingProjectData,
      },
    };
  });

  const readinessProject = computeReadinessByStages(tasks, PROJECT_ENCE_STAGES);
  const readinessBuilt = computeReadinessByStages(tasks, STAGE_ORDER);
  const readinessCurrentStage = computeReadinessByStages(tasks, stagesUpTo(project.stage_current));

  const blockers = tasks
    .filter((t: any) => t.active !== false && t.stage === project.stage_current && t.critical && !t.satisfied)
    .map((t: any) => {
      const missing: string[] = [];
      if (!t.completed) missing.push('marcar como feito');
      if (t.missing?.projectData) missing.push('preencher dados mínimos');
      if (t.missing?.evidence) missing.push('anexar evidência');
      if (t.missing?.calculation) missing.push('registrar cálculo');
      return { id: t.id, title: t.title, task_key: t.task_key, missing };
    });

  const stage = {
    current: project.stage_current,
    next: nextStage(project.stage_current),
    canAdvance: blockers.length === 0,
    blockers,
  };

  const nextActions = pickNextActions(tasks, project.stage_current, 3).map((t: any) => ({
    id: t.id,
    stage: t.stage,
    title: t.title,
    description: t.description,
    critical: !!t.critical,
    task_key: t.task_key,
    meta: t.meta,
    completed: !!t.completed,
    satisfied: !!t.satisfied,
    evidence_count: t.evidence_count || 0,
    calc_count: t.calc_count || 0,
    missing: t.missing,
  }));

  return c.json(ok(requestId, {
    knowledge: { pack: getKnowledgeOverview() },
    project,
    tasks,
    readiness: {
      upToCurrentStage: readinessCurrentStage,
      enceProjeto: readinessProject,
      enceConstruido: readinessBuilt,
    },
    nextActions,
    stage,
  }));
});

app.put('/projects/:id/tasks/:taskId', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const body = await readJsonLimited(c, MAX_BODY_BYTES);
  if ((body as any).__too_large) {
    return c.json(err(requestId, 'PAYLOAD_TOO_LARGE', 'Payload muito grande. Reduza os campos e tente novamente.'), 413);
  }
  const repo = new Repo(c.env);
  const res = await repo.updateTask(c.get('userId'), c.req.param('id'), c.req.param('taskId'), { completed: body.completed, notes: body.notes });
  if (!res) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
  await repo.audit(c.get('userId'), 'task.update', c.req.param('id'), { taskId: c.req.param('taskId') });
  return c.json(ok(requestId, { ok: true }));
});

app.post('/projects/:id/stage/advance', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const body = await readJsonLimited(c, MAX_BODY_BYTES);
  if ((body as any).__too_large) {
    return c.json(err(requestId, 'PAYLOAD_TOO_LARGE', 'Payload muito grande. Reduza os campos e tente novamente.'), 413);
  }
  const force = !!body.force;
  const repo = new Repo(c.env);
  const res = await repo.advanceStage(c.get('userId'), c.req.param('id'), { force });
  if (!res.ok) {
    if (res.code === 'NOT_FOUND') return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
    if (res.code === 'NO_NEXT_STAGE') return c.json(err(requestId, 'NO_NEXT_STAGE', 'O projeto já está na última etapa.'), 409);
    if (res.code === 'BLOCKED') {
      return c.json(err(requestId, 'STAGE_BLOCKED', 'Existem itens críticos pendentes na etapa atual.', {
        blockers: (res as any).blockers,
        nextStage: (res as any).nextStage,
      }), 409);
    }
    return c.json(err(requestId, 'ADVANCE_FAILED', 'Não foi possível avançar etapa.'), 400);
  }
  await repo.audit(c.get('userId'), 'project.stage.advance', c.req.param('id'), { nextStage: res.nextStage, forced: res.forced });
  const project = await repo.getProject(c.get('userId'), c.req.param('id'));
  return c.json(ok(requestId, { project, nextStage: res.nextStage, forced: res.forced }));
});

app.get('/projects/:id/evidences', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const repo = new Repo(c.env);
  const evidences = await repo.listEvidences(c.get('userId'), c.req.param('id'));
  if (!evidences) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
  return c.json(ok(requestId, { evidences }));
});

app.post('/projects/:id/evidences', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const body = await readJsonLimited(c, MAX_BODY_BYTES);
  if ((body as any).__too_large) {
    return c.json(err(requestId, 'PAYLOAD_TOO_LARGE', 'Payload muito grande. Reduza os campos e tente novamente.'), 413);
  }
  const et = String(body.evidence_type || 'link');
  const isText = et === 'text';

  const stage = String(body.stage || '').trim();
  const title = clampStr(body.title, LIMITS.evidenceTitle);
  const rac_section = body.rac_section ? clampStr(body.rac_section, LIMITS.racSection) : undefined;
  const notes = body.notes ? clampStr(body.notes, LIMITS.evidenceNotes) : undefined;

  const content_text = isText ? clampStr(body.content_text, LIMITS.evidenceText) : undefined;
  const url = isText ? 'about:blank' : (body.url ? String(body.url) : '');

  if (!stage || !title || (!isText && !url)) {
    return c.json(err(requestId, 'INVALID_INPUT', 'Informe etapa, título e URL (ou texto, quando for evidência textual).'), 400);
  }
  if (isText && !content_text) {
    return c.json(err(requestId, 'INVALID_INPUT', 'Para evidência textual, informe o conteúdo.'), 400);
  }
  if (!isText && !isSafeHttpUrl(url)) {
    return c.json(err(requestId, 'INVALID_INPUT', 'URL inválida. Use http/https.'), 400);
  }

  const repo = new Repo(c.env);
  const id = await repo.addEvidence(c.get('userId'), c.req.param('id'), {
    stage: stage as any,
    title,
    url,
    evidence_type: et as any,
    content_text,
    rac_section,
    meta: body.meta || undefined,
    notes,
    task_id: body.task_id ? String(body.task_id) : undefined,
  });
  if (!id) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
  await repo.audit(c.get('userId'), 'evidence.add', c.req.param('id'), { evidenceId: id });
  return c.json(ok(requestId, { id }), 201);
});

app.delete('/projects/:id/evidences/:evidenceId', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const repo = new Repo(c.env);
  const res = await repo.deleteEvidence(c.get('userId'), c.req.param('id'), c.req.param('evidenceId'));
  if (!res) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
  await repo.audit(c.get('userId'), 'evidence.delete', c.req.param('id'), { evidenceId: c.req.param('evidenceId') });
  return c.json(ok(requestId, { ok: true }));
});

app.get('/projects/:id/calculations', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const repo = new Repo(c.env);
  const calculations = await repo.listCalculations(c.get('userId'), c.req.param('id'));
  if (!calculations) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
  return c.json(ok(requestId, { calculations }));
});

app.post('/projects/:id/calculations/run', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const body = await readJsonLimited(c, MAX_BODY_BYTES);
  if ((body as any).__too_large) {
    return c.json(err(requestId, 'PAYLOAD_TOO_LARGE', 'Payload muito grande. Reduza os campos e tente novamente.'), 413);
  }
  const type = clampStr(body.type, LIMITS.calcType);
  const inputs = body.inputs;
  const taskId = body.task_id ? String(body.task_id) : undefined;
  if (!type || !inputs) return c.json(err(requestId, 'INVALID_INPUT', 'Informe type e inputs.'), 400);

  // Limita o tamanho do payload armazenado (evita dossiê gigante / abuso acidental)
  const inputsStr = JSON.stringify(inputs ?? {});
  if (inputsStr.length > LIMITS.calcJsonBytes) {
    return c.json(err(requestId, 'INVALID_INPUT', 'Inputs muito grandes para registrar. Reduza os campos/itens e tente novamente.'), 400);
  }

  let result: any;
  try {
    if (type === 'u_value') result = calcUValue(inputs);
    else if (type === 'wwr') result = calcWWR(inputs);
    else if (type === 'wwr_facades') result = calcWWRFacades(inputs);
    else if (type === 'avs') result = calcAVS(inputs);
    else if (type === 'lpd') result = calcLPD(inputs);
    else if (type === 'lpd_spaces') result = calcLPDSpaces(inputs);
    else return c.json(err(requestId, 'INVALID_INPUT', 'Tipo inválido.'), 400);
  } catch (e: any) {
    return c.json(err(requestId, 'CALC_ERROR', e?.message || 'Erro no cálculo.'), 400);
  }

  const resultStr = JSON.stringify(result ?? {});
  if (resultStr.length > LIMITS.calcJsonBytes) {
    return c.json(err(requestId, 'CALC_ERROR', 'Resultado muito grande para registrar.'), 400);
  }

  const repo = new Repo(c.env);
  const id = await repo.addCalculation(c.get('userId'), c.req.param('id'), String(type), inputs, result, taskId);
  if (!id) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
  await repo.audit(c.get('userId'), 'calculation.run', c.req.param('id'), { type });
  return c.json(ok(requestId, { id, result }), 201);
});

// === Dossier cache (R2) ===
// Estratégia:
// - Calcula um hash estável do conteúdo relevante do projeto (dados + tarefas + evidências + cálculos)
// - Se o hash bater com o último PDF gerado, retorna do R2 sem regenerar
// - Caso contrário, gera novamente, salva no R2 e atualiza D1
const DOSSIER_COOLDOWN_MS = 120_000; // 2 min por projeto (anti-spam)

async function buildDossierContext(repo: Repo, userId: string, projectId: string) {
  const project = await repo.getProject(userId, projectId);
  if (!project) return null;
  const taskRows = await repo.listTasks(userId, projectId) || [];
  const evidences = await repo.listEvidences(userId, projectId) || [];
  const calculations = await repo.listCalculations(userId, projectId) || [];
  const evCounts = await repo.evidenceCountsByTask(userId, projectId) || {};
  const caCounts = await repo.calcCountsByTask(userId, projectId) || {};

  // Normaliza tarefas para cálculo de satisfação
  const tasks = taskRows.map((t: any) => {
    let meta: any = null;
    try { meta = t.meta_json ? JSON.parse(t.meta_json) : null; } catch { meta = null; }
    const active = isTaskActive(meta, project);
    const evidenceCount = evCounts[String(t.id)] || 0;
    const calculationCount = caCounts[String(t.id)] || 0;
    const sat = computeTaskSatisfaction({
      critical: !!t.critical,
      completed: !!t.completed,
      meta,
      evidenceCount,
      calculationCount,
      project,
    });
    return {
      ...t,
      active,
      critical: !!t.critical,
      completed: !!t.completed,
      meta,
      evidence_count: evidenceCount,
      calc_count: calculationCount,
      satisfied: sat.satisfied,
      missing: {
        evidence: sat.missingEvidence,
        calculation: sat.missingCalculation,
        projectData: sat.missingProjectData,
      },
    };
  });

  const readiness = {
    upToCurrentStage: computeReadinessByStages(tasks, stagesUpTo(project.stage_current)),
    enceProjeto: computeReadinessByStages(tasks, PROJECT_ENCE_STAGES),
    enceConstruido: computeReadinessByStages(tasks, STAGE_ORDER),
  };

  return { project, tasks, evidences, calculations, readiness };
}

async function buildDossierPdfBytes(ctx: any) {
  const pack: any = getKnowledgeOverview();
  let profile: any = null;
  try { profile = ctx.project.profile_json ? JSON.parse(String(ctx.project.profile_json)) : null; } catch { profile = null; }

  const readinessProjeto = computeReadinessByStages(ctx.tasks, PROJECT_ENCE_STAGES);

  const dossierData: DossierData = {
    project: {
      name: ctx.project.name,
      city: ctx.project.city || '-',
      state: ctx.project.state || '-',
      typology: ctx.project.typology,
      area_m2: ctx.project.area_m2 ?? undefined,
      climate_zone: profile?.bioclimatic_zone || undefined,
      ence_target: ctx.project.ence_target || undefined,
    },
    responsible: {
      name: profile?.responsible_name || undefined,
      registration: profile?.responsible_registration || undefined,
      email: profile?.responsible_email || undefined,
    },
    summary: {
      totalTasks: ctx.tasks.length,
      completedTasks: ctx.tasks.filter((t: any) => !!t.completed).length,
      criticalMissing: readinessProjeto.criticalMissing,
      readinessStatus: readinessProjeto.status,
    },
    calculations: (ctx.calculations || []).map((c0: any) => ({
      task_id: c0.task_id || null,
      task_title: c0.task_title || null,
      type: c0.calc_type,
      result: (() => { try { return c0.result_json ? JSON.parse(c0.result_json) : c0.result; } catch { return c0.result; } })(),
      created_at: c0.created_at,
    })),
    evidences: (ctx.evidences || []).map((e0: any) => ({
      task_id: e0.task_id || null,
      task_title: e0.task_title || null,
      title: e0.title,
      url: e0.url,
      stage: e0.stage,
      evidence_type: e0.evidence_type || 'link',
      content_text: e0.content_text || undefined,
      rac_section: e0.rac_section || undefined,
      notes: e0.notes || undefined,
    })),
    tasks: (ctx.tasks || []).map((t: any) => {
      const miss: string[] = [];
      if (t.critical && !t.satisfied) {
        if (!t.completed) miss.push('marcar como feito');
        if (t.missing?.projectData) miss.push('dados mínimos');
        if (t.missing?.evidence) miss.push('evidência');
        if (t.missing?.calculation) miss.push('cálculo');
      }
      return {
        id: String(t.id),
        stage: t.stage,
        title: t.title,
        completed: !!t.completed,
        critical: !!t.critical,
        notes: t.notes || undefined,
        satisfied: !!t.satisfied,
        missing: miss.length ? miss : undefined,
        active: t.active !== false,
      };
    }),
    normativeBase: [
      ...(Array.isArray(pack?.sources) ? pack.sources : []),
      { title: 'Manual RTQ-R (2014) — Tabelas 3.1 e 3.2', url: 'https://www.pbeedifica.com.br/sites/default/files/projetos/etiquetagem/residencial/downloads/Manual_RTQR_102014.pdf' },
      { title: 'Manual RTQ-C (2016) — Tabela 4.1 (DPIL)', url: 'https://www.pbeedifica.com.br/sites/default/files/projetos/etiquetagem/comercial/downloads/manual_rtqc2016.pdf' },
      { title: 'Manual RAC (maio/2025)', url: 'https://pbeedifica.com.br/sites/default/files/manuais/Manual%20RAC_novo%20formato_maio25.pdf' },
    ],
  };
  return await dossierPdfBytes(dossierData);
}

app.get('/projects/:id/dossier', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const format = c.req.query('format') || 'json';
  const repo = new Repo(c.env);
  const project = await repo.getProject(c.get('userId'), c.req.param('id'));
  if (!project) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);
  const taskRows = await repo.listTasks(c.get('userId'), c.req.param('id')) || [];
  const evidences = await repo.listEvidences(c.get('userId'), c.req.param('id')) || [];
  const calculations = await repo.listCalculations(c.get('userId'), c.req.param('id')) || [];

  const evCounts = await repo.evidenceCountsByTask(c.get('userId'), c.req.param('id')) || {};
  const caCounts = await repo.calcCountsByTask(c.get('userId'), c.req.param('id')) || {};

  const tasks = taskRows.map((t: any) => {
    let meta: any = null;
    try { meta = t.meta_json ? JSON.parse(t.meta_json) : null; } catch { meta = null; }

    const evidenceCount = evCounts[String(t.id)] || 0;
    const calculationCount = caCounts[String(t.id)] || 0;
    const sat = computeTaskSatisfaction({
      critical: !!t.critical,
      completed: !!t.completed,
      meta,
      evidenceCount,
      calculationCount,
      project,
    });

    return {
      ...t,
      critical: !!t.critical,
      completed: !!t.completed,
      meta,
      evidence_count: evidenceCount,
      calc_count: calculationCount,
      satisfied: sat.satisfied,
      missing: {
        evidence: sat.missingEvidence,
        calculation: sat.missingCalculation,
        projectData: sat.missingProjectData,
      },
    };
  });

  const readiness = {
    upToCurrentStage: computeReadinessByStages(tasks, stagesUpTo(project.stage_current)),
    enceProjeto: computeReadinessByStages(tasks, PROJECT_ENCE_STAGES),
    enceConstruido: computeReadinessByStages(tasks, STAGE_ORDER),
  };

  const dossier = { knowledge: { pack: getKnowledgeOverview(), project_pack_id: project.knowledge_pack_id || 'ini_2025_05' }, project, readiness, tasks, evidences, calculations, generated_at: new Date().toISOString() };

  if (format === 'html') {
    c.header('Content-Type', 'text/html; charset=utf-8');
    return c.body(renderDossierHtml(dossier));
  }
  return c.json(ok(requestId, { dossier }));
});

// Status do cache do dossiê (PDF): diz se existe PDF válido e se precisa regenerar.
app.get('/projects/:id/dossier/status', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const repo = new Repo(c.env);
  const ctx = await buildDossierContext(repo, c.get('userId'), c.req.param('id'));
  if (!ctx) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);

  const contentHash = await computeDossierContentHash({
    project: ctx.project,
    tasks: ctx.tasks.map((t: any) => ({ id: t.id, completed: !!t.completed, notes: t.notes || null, meta: t.meta || null, active: t.active !== false })),
    evidences: ctx.evidences,
    calculations: ctx.calculations,
  });

  const cached = await repo.getDossierCache(c.get('userId'), c.req.param('id'));
  const hasCache = !!cached && !!cached.r2_key;
  const upToDate = hasCache && cached.content_hash === contentHash;
  return c.json(ok(requestId, {
    contentHash,
    cached: hasCache,
    cachedHash: cached?.content_hash || null,
    needsRegenerate: !upToDate,
    generatedAt: cached?.generated_at || null,
    pdfSize: cached?.pdf_size || null,
  }));
});

// Gera/atualiza o PDF no R2. Por padrão só gera se o conteúdo mudou.
app.post('/projects/:id/dossier/generate', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  if (!allowPdf(c.get('userId'))) {
    return c.json(err(requestId, 'RATE_LIMITED', 'Muitas gerações de PDF em pouco tempo. Aguarde e tente novamente.'), 429);
  }

  const force = String(c.req.query('force') || '').toLowerCase() === 'true';
  const repo = new Repo(c.env);
  const ctx = await buildDossierContext(repo, c.get('userId'), c.req.param('id'));
  if (!ctx) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);

  const contentHash = await computeDossierContentHash({
    project: ctx.project,
    tasks: ctx.tasks.map((t: any) => ({ id: t.id, completed: !!t.completed, notes: t.notes || null, meta: t.meta || null, active: t.active !== false })),
    evidences: ctx.evidences,
    calculations: ctx.calculations,
  });

  const cached = await repo.getDossierCache(c.get('userId'), c.req.param('id'));
  const upToDate = !!cached && cached.content_hash === contentHash;
  if (upToDate && !force) {
    return c.json(ok(requestId, { status: 'cached', contentHash, r2Key: cached.r2_key, generatedAt: cached.generated_at }));
  }

  // Cooldown por projeto (evita spam mesmo com rate limit por usuário)
  if (!force && cached?.updated_at) {
    const last = Date.parse(String(cached.updated_at));
    if (Number.isFinite(last) && (Date.now() - last) < DOSSIER_COOLDOWN_MS) {
      const retryAfter = Math.ceil((DOSSIER_COOLDOWN_MS - (Date.now() - last)) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json(err(requestId, 'COOLDOWN', `Aguarde ${retryAfter}s para gerar novamente.`), 429);
    }
  }

  const bytes = await buildDossierPdfBytes(ctx);
  const key = dossierR2Key(c.get('userId'), c.req.param('id'), contentHash);
  await c.env.DOSSIERS.put(key, bytes, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: { projectId: c.req.param('id'), userId: c.get('userId'), contentHash },
  });
  await repo.upsertDossierCache(c.get('userId'), c.req.param('id'), { content_hash: contentHash, r2_key: key, pdf_size: bytes.byteLength });
  await repo.audit(c.get('userId'), 'dossier.pdf.cache_generate', c.req.param('id'), { size: bytes.byteLength, contentHash });

  return c.json(ok(requestId, { status: 'generated', contentHash, r2Key: key, pdfSize: bytes.byteLength }));
});

// Faz download do PDF do R2 (somente se existir cache válido). Use /generate para criar.
app.get('/projects/:id/dossier/download', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const repo = new Repo(c.env);
  const ctx = await buildDossierContext(repo, c.get('userId'), c.req.param('id'));
  if (!ctx) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);

  const contentHash = await computeDossierContentHash({
    project: ctx.project,
    tasks: ctx.tasks.map((t: any) => ({ id: t.id, completed: !!t.completed, notes: t.notes || null, meta: t.meta || null, active: t.active !== false })),
    evidences: ctx.evidences,
    calculations: ctx.calculations,
  });

  const cached = await repo.getDossierCache(c.get('userId'), c.req.param('id'));
  if (!cached?.r2_key) return c.json(err(requestId, 'NOT_READY', 'Nenhum PDF gerado ainda. Use /dossier/generate.'), 409);
  if (cached.content_hash !== contentHash) return c.json(err(requestId, 'STALE', 'O PDF está desatualizado. Gere novamente.'), 409);

  const obj = await c.env.DOSSIERS.get(cached.r2_key);
  if (!obj) {
    await repo.deleteDossierCache(c.get('userId'), c.req.param('id'));
    return c.json(err(requestId, 'NOT_FOUND', 'Cache não encontrado. Gere novamente.'), 404);
  }
  const bytes = await obj.arrayBuffer();
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `inline; filename="dossie_${ctx.project.id}.pdf"`);
  return c.body(bytes);
});

app.get('/projects/:id/dossier.pdf', requireAuth, async (c) => {
  const requestId = c.get('requestId');
  const repo = new Repo(c.env);
  const ctx = await buildDossierContext(repo, c.get('userId'), c.req.param('id'));
  if (!ctx) return c.json(err(requestId, 'NOT_FOUND', 'Projeto não encontrado.'), 404);

  const payload = {
    project: ctx.project,
    tasks: ctx.tasks,
    evidences: ctx.evidences,
    calculations: ctx.calculations,
    readiness: ctx.readiness,
  };

  const res = await getOrGenerateDossierPdf({
    repo,
    bucket: c.env.DOSSIERS,
    userId: c.get('userId'),
    projectId: c.req.param('id'),
    force: false,
    buildPayload: async () => payload,
    buildPdfBytes: async () => await buildDossierPdfBytes(ctx),
  });

  c.header('Content-Type', 'application/pdf');
  c.header('Cache-Control', 'no-store');
  return c.body(res.bytes);
});

function renderDossierHtml(d: any) {
  const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c] as string));
  let profile: any = null;
  try { profile = d.project?.profile_json ? JSON.parse(String(d.project.profile_json)) : null; } catch { profile = null; }
  const facades = Array.isArray(profile?.facades) ? profile.facades : [];
  const badgeP = d.readiness?.enceProjeto?.status || 'yellow';
  const badgeB = d.readiness?.enceConstruido?.status || 'yellow';
  const badgeClass = (b: string) => (b === 'green' ? 'green' : b === 'red' ? 'red' : 'yellow');

  const evidByTask: Record<string, any[]> = {};
  for (const e of d.evidences || []) {
    if (e.task_id) (evidByTask[e.task_id] = evidByTask[e.task_id] || []).push(e);
  }
  const calcsByTask: Record<string, any[]> = {};
  for (const c0 of d.calculations || []) {
    if (c0.task_id) (calcsByTask[c0.task_id] = calcsByTask[c0.task_id] || []).push(c0);
  }

  const stages = [
    { key: 'study', label: 'Estudo' },
    { key: 'anteproject', label: 'Anteprojeto' },
    { key: 'executive', label: 'Executivo' },
    { key: 'construction', label: 'Obra (Construído)' },
  ];

  const tasksByStage: Record<string, any[]> = {};
  for (const t of d.tasks || []) (tasksByStage[t.stage] = tasksByStage[t.stage] || []).push(t);

  const missingCriticalProject = (d.tasks || []).filter((t: any) => (t.stage !== 'construction') && t.critical && !t.satisfied);

  return `<!doctype html><html><head><meta charset="utf-8"/><title>Dossiê — ${esc(d.project.name)}</title>
  <style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;max-width:900px;margin:24px auto;padding:0 12px;color:#0f172a}
  .card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:12px 0;background:#fff}
  .muted{color:#475569}
  .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .green{background:#dcfce7;color:#166534}
  .yellow{background:#fef9c3;color:#854d0e}
  .red{background:#fee2e2;color:#991b1b}
  ul{margin:8px 0 0 18px}
  code{background:#f1f5f9;padding:2px 6px;border-radius:6px}
  .kpi{display:flex;gap:10px;flex-wrap:wrap}
  .kpi .pill{border:1px solid #e2e8f0;border-radius:999px;padding:6px 10px}
  </style></head><body>
  <h1>VetorEco — Dossiê de Preparação</h1>
  <p class="muted">Gerado em ${esc(d.generated_at)}</p>

  <div class="card"><h2>Projeto</h2>
    <p><b>${esc(d.project.name)}</b></p>
    <p class="muted">Cidade/UF: ${esc(d.project.city || '-')} / ${esc(d.project.state || '-')} • Tipologia: ${esc(d.project.typology)} • Etapa: ${esc(d.project.stage_current)}</p>
    <p class="muted">Meta (VetorEco): <b>${esc(d.project.ence_target || '-')}</b> • Zona bioclimática: <b>${esc((() => { try { return d.project.profile_json ? (JSON.parse(d.project.profile_json).bioclimatic_zone || '-') : '-'; } catch { return '-'; } })())}</b></p>
  </div>

  <div class="card"><h2>Base do guia (normas e processo)</h2>
    <p class="muted">Pacote de conhecimento do projeto: <code>${esc(d.knowledge?.project_pack_id || d.knowledge?.pack?.id || '-')}</code></p>
    <p class="muted">O VetorEco não emite ENCE. Ele transforma o processo e os manuais em checklist + evidências para reduzir retrabalho.</p>
    ${(() => {
      const src = Array.isArray(d.knowledge?.pack?.sources) ? d.knowledge.pack.sources : [];
      if (!src.length) return '';
      const items = src.slice(0, 8).map((s:any)=>`<li><a href="${esc(s.url||'#')}" target="_blank" rel="noreferrer">${esc(s.title)}</a>${s.section ? ' — ' + esc(s.section) : ''}</li>`).join('');
      return `<ul class="muted">${items}</ul>`;
    })()}
    ${(() => {
      const ex = d.knowledge?.pack?.submission_pack_examples;
      if (!ex) return '';
      const proj = Array.isArray(ex.project) ? ex.project : [];
      const built = Array.isArray(ex.built) ? ex.built : [];
      const ul = (arr:any[]) => `<ul class=\"muted\">${arr.slice(0,12).map((x:any)=>`<li><code>${esc(x)}</code></li>`).join('')}</ul>`;
      return `
        <div class=\"muted\" style=\"margin-top:10px\"><b>Estrutura sugerida de anexos</b></div>
        <div class=\"grid2\" style=\"gap:10px\">
          <div><div class=\"muted\"><b>Pacote ENCE de Projeto</b></div>${ul(proj)}</div>
          <div><div class=\"muted\"><b>Pacote ENCE do Construído</b></div>${ul(built)}</div>
        </div>
      `;
    })()}
    ${(() => {
      const mt = d.knowledge?.pack?.memorial_templates;
      if (!mt) return '';
      const sec = (arr:any[]) => (Array.isArray(arr)?arr:[]).map((s:any)=>`<li><b>${esc(s.title)}</b> — ${esc((s.hints||[]).join(' • '))}</li>`).join('');
      const proj = sec(mt.project?.sections);
      const built = sec(mt.built?.sections);
      return `
        <div class=\"muted\" style=\"margin-top:10px\"><b>Template de memorial (rascunho guiado)</b></div>
        <div class=\"muted\">Use como guia para preencher o memorial e anexar evidências. Não substitui o processo oficial.</div>
        <div class=\"grid2\" style=\"gap:10px\">
          <div><div class=\"muted\"><b>Projeto</b></div><ul class=\"muted\">${proj}</ul></div>
          <div><div class=\"muted\"><b>Construído</b></div><ul class=\"muted\">${built}</ul></div>
        </div>
      `;
    })()}
  </div>

  <div class="card"><h2>Fachadas (perfil técnico)</h2>
    ${facades.length ? `
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="text-align:left;border-bottom:1px solid #e2e8f0;padding:6px">Fachada</th>
          <th style="text-align:right;border-bottom:1px solid #e2e8f0;padding:6px">Azimute (°)</th>
          <th style="text-align:right;border-bottom:1px solid #e2e8f0;padding:6px">Área fachada (m²)</th>
          <th style="text-align:right;border-bottom:1px solid #e2e8f0;padding:6px">Área janelas (m²)</th>
        </tr></thead>
        <tbody>
          ${facades.map((f:any)=>`<tr>
            <td style="padding:6px;border-bottom:1px solid #f1f5f9">${esc(f.name||'-')}</td>
            <td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">${esc(f.azimuth_deg ?? '-')}</td>
            <td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">${esc(f.facade_area_m2 ?? '-')}</td>
            <td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">${esc(f.window_area_m2 ?? '-')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    ` : `<p class="muted">Sem fachadas preenchidas no perfil.</p>`}
    <p class="muted">Use estes dados para controlar WWR/PAF por fachada e reduzir retrabalho na revisão.</p>
  </div>

  <div class="card"><h2>Prontidão</h2>
    <div class="kpi">
      <div class="pill"><b>ENCE de Projeto</b> — <span class="badge ${badgeClass(badgeP)}">${esc(String(badgeP).toUpperCase())}</span> <b>${esc(d.readiness.enceProjeto.progressPct)}%</b> • críticos: <b>${esc(d.readiness.enceProjeto.criticalMissing)}</b></div>
      <div class="pill"><b>Construído</b> — <span class="badge ${badgeClass(badgeB)}">${esc(String(badgeB).toUpperCase())}</span> <b>${esc(d.readiness.enceConstruido.progressPct)}%</b> • críticos: <b>${esc(d.readiness.enceConstruido.criticalMissing)}</b></div>
    </div>
    <p class="muted">A prontidão indica se o projeto está preparado (dados + evidências + cálculos auxiliares) para reduzir retrabalho antes do processo oficial.</p>
  </div>

  <div class="card"><h2>Pendências críticas (Projeto)</h2>
    ${missingCriticalProject.length ? `<ul>${missingCriticalProject.map((t:any)=>`<li><b>${esc(t.title)}</b> <span class="muted">(${esc(t.stage)})</span></li>`).join('')}</ul>` : `<p class="muted">Sem pendências críticas para ENCE de Projeto.</p>`}
  </div>

  <div class="card"><h2>Checklist por etapa</h2>
    ${stages.map(s=>{
      const list = tasksByStage[s.key] || [];
      if (!list.length) return '';
      return `<h3 style="margin:12px 0 6px">${esc(s.label)}</h3><ul>${list.map((t:any)=>{
        const ev = evidByTask[t.id] || [];
        const ca = calcsByTask[t.id] || [];
        const meta = t.meta || {};
        const refs = Array.isArray(meta.references) ? meta.references : [];
        return `<li>
          <b>[${t.completed ? 'x' : ' '}]</b> ${esc(t.title)} ${t.critical ? '<b style="color:#b91c1c">(crítico)</b>' : ''}
          <div class="muted">${esc(t.description || '')}</div>
          ${t.notes ? `<div class="muted">Nota: ${esc(t.notes)}</div>` : ''}
          <div class="muted">Evidências: <b>${ev.length}</b> • Cálculos: <b>${ca.length}</b>${t.critical && !t.satisfied ? ` • <b style="color:#b91c1c">pendente</b>` : ''}</div>
          ${t.critical && !t.satisfied ? `<div class="muted">Faltando: ${[
            (!t.completed ? 'marcar como feito' : null),
            (t.missing?.projectData ? 'dados mínimos' : null),
            (t.missing?.evidence ? 'evidência' : null),
            (t.missing?.calculation ? 'cálculo' : null)
          ].filter(Boolean).map(esc).join(', ')}</div>` : ''}
          ${refs.length ? `<div class="muted">Referências: ${refs.map((r:any)=>r.url?`<a href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.title)}</a>`:esc(r.title)).join(' • ')}</div>` : ''}
        </li>`;
      }).join('')}</ul>`;
    }).join('')}
  </div>

  <div class="card"><h2>Tabela de rastreabilidade</h2>
    <p class="muted">Relação direta entre checklist → evidências → cálculos (apoio à auditoria e ao RAC).</p>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;padding:6px;border-bottom:1px solid #e2e8f0">Etapa</th>
          <th style="text-align:left;padding:6px;border-bottom:1px solid #e2e8f0">Tarefa</th>
          <th style="text-align:right;padding:6px;border-bottom:1px solid #e2e8f0">Evid.</th>
          <th style="text-align:right;padding:6px;border-bottom:1px solid #e2e8f0">Calc.</th>
          <th style="text-align:left;padding:6px;border-bottom:1px solid #e2e8f0">Status</th>
        </tr>
      </thead>
      <tbody>
        ${(d.tasks || []).filter((t:any)=>t.active!==false).map((t:any)=>{
          const ev = evidByTask[t.id] || [];
          const ca = calcsByTask[t.id] || [];
          const st = (t.satisfied || (!t.critical && t.completed)) ? 'OK' : (t.critical ? 'PENDENTE' : '—');
          const stCls = st === 'OK' ? 'green' : (st === 'PENDENTE' ? 'red' : 'yellow');
          return `
            <tr>
              <td style="padding:6px;border-bottom:1px solid #f1f5f9" class="muted">${esc(t.stage)}</td>
              <td style="padding:6px;border-bottom:1px solid #f1f5f9">
                <b>${esc(t.title)}</b>
                ${t.critical ? ' <span class="badge red">crítico</span>' : ''}
                ${(ev.length || ca.length) ? `<div class="muted" style="margin-top:4px">${
                  [
                    ev.length ? `Evidências: ${ev.slice(0,3).map((e:any)=>esc(e.title)).join(' • ')}${ev.length>3?' …':''}` : null,
                    ca.length ? `Cálculos: ${ca.slice(0,2).map((c:any)=>esc(c.calc_type)).join(' • ')}${ca.length>2?' …':''}` : null,
                  ].filter(Boolean).join(' | ')
                }</div>` : ''}
              </td>
              <td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right"><b>${esc(ev.length)}</b></td>
              <td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right"><b>${esc(ca.length)}</b></td>
              <td style="padding:6px;border-bottom:1px solid #f1f5f9"><span class="badge ${stCls}">${esc(st)}</span></td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="card"><h2>Calculadoras</h2><ul>
    ${d.calculations.map((c:any)=>`<li><b>${esc(c.calc_type)}</b> ${c.task_title ? `<span class="muted">• ligado a: ${esc(c.task_title)}</span>` : ''} <span class="muted">• ${esc(c.created_at)}</span><div class="muted"><code>${esc(c.result_json)}</code></div></li>`).join('') || '<li class="muted">Sem cálculos registrados.</li>'}
  </ul></div>

  <div class="card"><h2>Evidências</h2><ul>
    ${d.evidences.map((e:any)=>{
      const type = esc(e.evidence_type || 'link');
      const rac = e.rac_section ? ` <span class="muted">• RAC: ${esc(e.rac_section)}</span>` : '';
      const main = (e.evidence_type === 'text')
        ? `<div class="muted" style="white-space:pre-wrap;margin-top:6px">${esc(String(e.content_text||'').slice(0,1200))}${String(e.content_text||'').length>1200?'…':''}</div>`
        : ` — <a href="${esc(e.url)}" target="_blank" rel="noreferrer">${esc(e.url)}</a>`;
      return `<li><span class="muted">(${esc(e.stage)})</span> <b>${esc(e.title)}</b>${e.task_title ? ` <span class="muted">• ligado a: ${esc(e.task_title)}</span>` : ''} <span class="muted">• tipo: ${type}</span>${rac}${main}${e.notes ? `<div class="muted">Nota: ${esc(e.notes)}</div>`:''}</li>`;
    }).join('') || '<li class="muted">Sem evidências registradas.</li>'}
  </ul></div>

  <div class="card"><h2>Disclaimers</h2>
    <p class="muted">Este dossiê é um guia de preparação. As referências são indicadas para apoiar o preenchimento e a organização do projeto, sem reproduzir conteúdo normativo.</p>
    <p class="muted">A emissão oficial da ENCE segue o processo institucional aplicável (por exemplo, via OIA), conforme orientações do PBE Edifica.</p>
  </div>
  </body></html>`;
}

export default app;
