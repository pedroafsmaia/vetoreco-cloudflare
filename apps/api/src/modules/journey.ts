import type { Stage, Typology } from '../types';
import type { TaskMeta, TaskTemplate } from '../domain/templates';
import { getTemplatesForTypology, getActivePackId } from '../knowledge';

export const STAGE_ORDER: Stage[] = ['study', 'anteproject', 'executive', 'construction'];
export const PROJECT_ENCE_STAGES: Stage[] = ['study', 'anteproject', 'executive'];

export function stageIdx(s: Stage) {
  const i = STAGE_ORDER.indexOf(s);
  return i === -1 ? 0 : i;
}

export function stagesUpTo(stageInclusive: Stage) {
  return STAGE_ORDER.slice(0, stageIdx(stageInclusive) + 1);
}

export function nextStage(current: Stage): Stage | null {
  const i = stageIdx(current);
  return i >= STAGE_ORDER.length - 1 ? null : STAGE_ORDER[i + 1];
}

/**
 * Templates do checklist são carregados de um *knowledge pack* versionado.
 * MVP: pacote ativo fixo (INI + RAC maio/2025).
 */
export function getTemplates(typology: Typology): TaskTemplate[] {
  // typology já seleciona uma trilha, mas podemos evoluir com perfil (água quente, HVAC etc.)
  return getTemplatesForTypology(typology);
}

export function getActiveKnowledgePackId() {
  return getActivePackId();
}

export type Readiness = {
  total: number;
  done: number;
  criticalMissing: number;
  progressPct: number;
  status: 'green' | 'yellow' | 'red';
  message: string;
  missingCriticalTaskIds: string[];
};

function getByPath(obj: any, path: string): any {
  const parts = String(path || '').split('.').filter(Boolean);
  let cur: any = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * INI-first: alguns itens do checklist só fazem sentido após decisões do escopo.
 * Ex.: "terá iluminação artificial?" -> habilita LPD/DPIL e evidências relacionadas.
 */
export function isTaskActive(meta: any, project: any): boolean {
  const req = Array.isArray(meta?.decisionRequires) ? meta.decisionRequires : [];
  if (req.length === 0) return true;
  let profile: any = null;
  try { profile = project?.profile_json ? JSON.parse(String(project.profile_json)) : null; } catch { profile = null; }
  return req.every((p: string) => !!getByPath(profile, p));
}

export type TaskSatisfaction = {
  satisfied: boolean;
  missingEvidence: boolean;
  missingCalculation: boolean;
  missingProjectData: boolean;
};

/**
 * Define se um item "conta" como preparado para reduzir retrabalho.
 * Regra: para itens críticos, exigimos evidência quando configurada (ou quando há evidenceHints).
 * Para cálculos, só exigimos quando `calcRequired` estiver true.
 */
export function computeTaskSatisfaction(args: {
  critical: boolean;
  completed: boolean;
  meta?: TaskMeta | null;
  evidenceCount?: number;
  calculationCount?: number;
  project?: any;
}): TaskSatisfaction {
  const meta = args.meta || null;
  // se o item estiver inativo (não aplicável), não deve bloquear nem contar como pendência
  if (!isTaskActive(meta, args.project)) {
    return { satisfied: true, missingEvidence: false, missingCalculation: false, missingProjectData: false };
  }
  const evidenceCount = args.evidenceCount ?? 0;
  const calculationCount = args.calculationCount ?? 0;

  // project/profile checks (dados mínimos)
  let profile: any = null;
  try { profile = args.project?.profile_json ? JSON.parse(String(args.project.profile_json)) : null; } catch { profile = null; }
  const hasTarget = !!String(args.project?.ence_target || '').trim();
  const hasZB = !!String(profile?.bioclimatic_zone || '').trim();
  const facades = Array.isArray(profile?.facades) ? profile.facades : [];
  const hasFacadesMinimum = facades.length > 0 && facades.every((f: any) =>
    typeof f.azimuth_deg === 'number' && !Number.isNaN(f.azimuth_deg)
    && typeof f.facade_area_m2 === 'number' && f.facade_area_m2 > 0
  );

  const req = meta?.projectFieldsRequired || [];
  const missingProjectData = req.some((k) => {
    if (k === 'ence_target') return !hasTarget;
    if (k === 'profile.bioclimatic_zone') return !hasZB;
    if (k === 'profile.facades_minimum') return !hasFacadesMinimum;
    return false;
  });

  const evidenceRequired = meta?.evidenceRequired ?? (!!args.critical && (meta?.evidenceHints?.length || 0) > 0);
  const calcRequired = meta?.calcRequired ?? false;

  const missingEvidence = evidenceRequired && evidenceCount <= 0;
  const missingCalculation = calcRequired && calculationCount <= 0;

  // Auto-satisfy (e também permite manter o checkbox sincronizado via Repo.syncAutoTasks)
  const completedOk = !!args.completed || (!!meta?.autoSatisfyOnProjectData && !missingProjectData);

  const satisfied = completedOk && !missingProjectData && !missingEvidence && !missingCalculation;
  return { satisfied, missingEvidence, missingCalculation, missingProjectData };
}

export function computeReadiness(tasks: { id?: string; active?: boolean; critical: number | boolean; satisfied: boolean }[]): Readiness {
  const activeTasks = tasks.filter((t) => t.active !== false);
  const total = activeTasks.length || 1;
  const done = activeTasks.filter((t) => !!t.satisfied).length;
  const criticalMissingTasks = activeTasks.filter((t) => !!t.critical && !t.satisfied);
  const criticalMissing = criticalMissingTasks.length;
  const missingCriticalTaskIds = criticalMissingTasks.map((t) => String(t.id || '')).filter(Boolean);

  let status: 'green' | 'yellow' | 'red' = 'green';
  let message = 'Projeto bem preparado para avançar.';
  if (criticalMissing >= 2) {
    status = 'red';
    message = 'Faltam itens críticos. Alto risco de retrabalho.';
  } else if (criticalMissing === 1 || done / total < 0.7) {
    status = 'yellow';
    message = 'Há pendências importantes. Revise antes de avançar.';
  }

  return { total, done, criticalMissing, progressPct: Math.round((done / total) * 100), status, message, missingCriticalTaskIds };
}

export function computeReadinessByStages(allTasks: any[], stages: Stage[]): Readiness {
  const set = new Set(stages);
  const tasks = allTasks.filter((t) => set.has(t.stage));
  return computeReadiness(tasks.map((t) => ({ id: t.id, active: t.active !== false, critical: t.critical, satisfied: !!t.satisfied })));
}

export function pickNextActions(allTasks: any[], currentStage: Stage, max = 3) {
  // Próximas ações devem incluir itens "não preparados" (ex.: completou, mas faltou evidência)
  const current = allTasks.filter((t) => t.active !== false && t.stage === currentStage && !t.satisfied);
  const sortKey = (t: any) => [t.critical ? 0 : 1, t.order_index ?? 999, t.title ?? ''];
  current.sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || String(ka[2]).localeCompare(String(kb[2]));
  });
  if (current.length >= 1) return current.slice(0, max);

  // se a etapa atual estiver "limpa", sugere início da próxima etapa
  const ns = nextStage(currentStage);
  if (!ns) return [];
  const next = allTasks.filter((t) => t.active !== false && t.stage === ns && !t.satisfied);
  next.sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || String(ka[2]).localeCompare(String(kb[2]));
  });
  return next.slice(0, max);
}
