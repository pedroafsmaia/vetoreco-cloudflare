import { assert, isIsoDate } from '../../utils';

export type ClassificationMethod = 'INI' | 'RTQ_LEGADO';
export type Typology = 'residencial' | 'comercial' | 'publica';
export type MunicipalityBand = 'large' | 'medium' | 'small';

export type RegulatoryContextInput = {
  protocol_date?: string | null;
  permit_issue_date?: string | null;
  public_bid_date?: string | null;
  population_band?: MunicipalityBand | null;
  entity_scope?: 'privado' | 'federal' | 'estadual' | 'distrital' | 'municipal' | null;
  classification_method?: ClassificationMethod | null;
  legacy_reason?: string | null;
  evidence_ence_projeto_legacy?: string | null;
  state_code?: string | null;
  autodeclaration_requested?: boolean | null;
};

export type LegalFramingResult = {
  applicable: boolean;
  packageCode: string;
  packageVersion: string;
  method: ClassificationMethod;
  ruleMode: 'INI_FIRST' | 'RTQ_LEGADO_TRANSICAO';
  minPerformanceLevel: 'A' | 'C' | 'NZEB' | 'PLANEJAR';
  compliancePath: 'fluxo_formal' | 'autodeclaracao' | 'planejamento';
  effectiveDate: string;
  warnings: string[];
  disclaimers: string[];
  decisionTrail: string[];
};

const LEGAL_SCHEDULE = {
  federal_public: { effective: '2027-01-01', minLevel: 'A', path: 'fluxo_formal' },
  private_large: { effective: '2028-01-01', minLevel: 'C', path: 'fluxo_formal' },
  private_medium: { effective: '2029-01-01', minLevel: 'C', path: 'autodeclaracao' },
  private_small: { effective: '2030-01-01', minLevel: 'C', path: 'autodeclaracao' },
} as const;

function compareDate(a: string, b: string) {
  return new Date(a).getTime() - new Date(b).getTime();
}

function pickRelevantDate(ctx: RegulatoryContextInput): string | null {
  return ctx.protocol_date || ctx.permit_issue_date || ctx.public_bid_date || null;
}

export function normalizeRegulatoryContext(raw: any, project: any): RegulatoryContextInput {
  const protocolDate = raw?.protocol_date || (project?.protocol_year ? `${project.protocol_year}-01-01` : null);
  const out: RegulatoryContextInput = {
    protocol_date: protocolDate,
    permit_issue_date: raw?.permit_issue_date || null,
    public_bid_date: raw?.public_bid_date || null,
    population_band: raw?.population_band || project?.municipality_size || 'large',
    entity_scope: raw?.entity_scope || (Number(project?.is_federal_public) ? 'federal' : 'privado'),
    classification_method: raw?.classification_method || 'INI',
    legacy_reason: raw?.legacy_reason || null,
    evidence_ence_projeto_legacy: raw?.evidence_ence_projeto_legacy || null,
    state_code: (raw?.state_code || project?.state || '').toUpperCase() || null,
    autodeclaration_requested: raw?.autodeclaration_requested ?? false,
  };
  validateRegulatoryContext(out, project);
  return out;
}

export function validateRegulatoryContext(ctx: RegulatoryContextInput, project?: any) {
  assert(ctx.population_band && ['large', 'medium', 'small'].includes(ctx.population_band), 400, 'INVALID_CONTEXT', 'Faixa populacional inválida');
  assert(ctx.entity_scope && ['privado', 'federal', 'estadual', 'distrital', 'municipal'].includes(ctx.entity_scope), 400, 'INVALID_CONTEXT', 'Ente inválido');
  assert(ctx.classification_method && ['INI', 'RTQ_LEGADO'].includes(ctx.classification_method), 400, 'INVALID_CONTEXT', 'Método de classificação inválido');
  if (ctx.protocol_date) assert(isIsoDate(ctx.protocol_date), 400, 'INVALID_CONTEXT', 'protocol_date inválida');
  if (ctx.permit_issue_date) assert(isIsoDate(ctx.permit_issue_date), 400, 'INVALID_CONTEXT', 'permit_issue_date inválida');
  if (ctx.public_bid_date) assert(isIsoDate(ctx.public_bid_date), 400, 'INVALID_CONTEXT', 'public_bid_date inválida');
  if (ctx.classification_method === 'RTQ_LEGADO') {
    assert(Boolean(ctx.legacy_reason), 400, 'LEGACY_REASON_REQUIRED', 'Informe o motivo de uso do RTQ_LEGADO');
    const isNewProject = !(ctx.evidence_ence_projeto_legacy && ctx.evidence_ence_projeto_legacy.trim());
    assert(!isNewProject, 400, 'LEGACY_EVIDENCE_REQUIRED', 'RTQ_LEGADO exige evidência de ENCE de projeto anterior para transição');
  }
  if (project?.typology !== 'publica' && ctx.entity_scope !== 'privado') {
    // permitido, mas avisa via engine; não bloqueia.
  }
}

export function evaluateLegalFraming(project: any, context: RegulatoryContextInput): LegalFramingResult {
  const warnings: string[] = [];
  const decisionTrail: string[] = [];
  const protocolDate = pickRelevantDate(context) || `${project.protocol_year || new Date().getFullYear()}-01-01`;
  const typology = project.typology as Typology;
  const band = (context.population_band || project.municipality_size || 'large') as MunicipalityBand;
  const isFederalPublic = context.entity_scope === 'federal' || (typology === 'publica' && Number(project.is_federal_public) === 1);

  let effectiveDate = LEGAL_SCHEDULE.private_large.effective;
  let minPerformanceLevel: LegalFramingResult['minPerformanceLevel'] = 'C';
  let compliancePath: LegalFramingResult['compliancePath'] = 'fluxo_formal';

  if (isFederalPublic) {
    effectiveDate = LEGAL_SCHEDULE.federal_public.effective;
    minPerformanceLevel = 'A';
    compliancePath = 'fluxo_formal';
    decisionTrail.push('Projeto identificado como edificação pública federal (cronograma antecipado).');
  } else {
    if (band === 'large') {
      effectiveDate = LEGAL_SCHEDULE.private_large.effective;
      compliancePath = 'fluxo_formal';
      decisionTrail.push('Faixa populacional >100 mil: cronograma 2028 (formal).');
    } else if (band === 'medium') {
      effectiveDate = LEGAL_SCHEDULE.private_medium.effective;
      compliancePath = context.autodeclaration_requested ? 'autodeclaracao' : 'fluxo_formal';
      decisionTrail.push('Faixa populacional 50-100 mil: cronograma 2029, autodeclaração pode ser aplicável.');
    } else {
      effectiveDate = LEGAL_SCHEDULE.private_small.effective;
      compliancePath = context.autodeclaration_requested ? 'autodeclaracao' : 'fluxo_formal';
      decisionTrail.push('Faixa populacional <50 mil: cronograma 2030, autodeclaração pode ser aplicável.');
    }
    minPerformanceLevel = 'C';
  }

  if (context.state_code === 'RS') {
    warnings.push('Verificar exceções e atos complementares aplicáveis ao RS antes do protocolo.');
    decisionTrail.push('UF=RS adiciona aviso de exceção/regra complementar.');
  }

  let applicable = compareDate(protocolDate, effectiveDate) >= 0;
  if (!applicable) {
    minPerformanceLevel = 'PLANEJAR';
    compliancePath = 'planejamento';
    decisionTrail.push(`Data relevante (${protocolDate}) anterior à vigência (${effectiveDate}).`);
  } else {
    decisionTrail.push(`Data relevante (${protocolDate}) dentro da vigência (${effectiveDate}).`);
  }

  let ruleMode: LegalFramingResult['ruleMode'] = 'INI_FIRST';
  let packageCode = typology === 'residencial' ? 'INI-R' : 'INI-C';
  let packageVersion = '2025.1';
  if (context.classification_method === 'RTQ_LEGADO') {
    ruleMode = 'RTQ_LEGADO_TRANSICAO';
    packageCode = typology === 'residencial' ? 'RTQ-R' : 'RTQ-C';
    packageVersion = 'LEGADO';
    warnings.push('RTQ_LEGADO habilitado apenas para transição vinculada a ENCE de projeto já existente.');
    decisionTrail.push('Método de classificação forçado para RTQ_LEGADO com evidência de transição.');
  } else {
    decisionTrail.push('Método de classificação padrão INI-first.');
  }

  if (compliancePath === 'autodeclaracao') {
    warnings.push('Autodeclaração deve respeitar requisitos de documentação e pode exigir conferência posterior.');
  }

  const disclaimers = [
    'Pré-avaliação técnica e enquadramento preliminar. Não substitui análise oficial/OIA.',
    'Motor normativo versionado em evolução; valide casos críticos antes do protocolo.',
  ];

  return {
    applicable,
    packageCode,
    packageVersion,
    method: context.classification_method || 'INI',
    ruleMode,
    minPerformanceLevel,
    compliancePath,
    effectiveDate,
    warnings,
    disclaimers,
    decisionTrail,
  };
}
