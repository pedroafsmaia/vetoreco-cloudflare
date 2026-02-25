import type { LegalFramingResult, NormativePackageRow, NormativeRuleRow, ProjectRow, RegulatoryContextRow } from '../types';
import { dateOnly, parseJsonSafe } from '../utils';

type RuleCriteria = {
  typologies?: string[];
  municipalityBands?: string[];
  federalOnly?: boolean;
  minProtocolDate?: string;
  maxProtocolDate?: string;
  classificationMethods?: string[];
};

type RuleOutcome = {
  applicable?: boolean;
  minLevel?: LegalFramingResult['minLevel'];
  compliancePath?: LegalFramingResult['compliancePath'];
  warning?: string;
  disclaimer?: string;
  decision?: string;
};

function ruleMatches(input: {
  project: ProjectRow;
  context: RegulatoryContextRow | null;
  rule: NormativeRuleRow;
}) {
  const criteria = parseJsonSafe<RuleCriteria>(input.rule.criteria_json, {});
  const ctx = input.context;
  const protocolDate = dateOnly(ctx?.protocol_date) || `${input.project.protocol_year}-01-01`;

  if (criteria.typologies?.length && !criteria.typologies.includes(input.project.typology)) return false;
  if (criteria.municipalityBands?.length && !criteria.municipalityBands.includes((ctx?.municipality_population_band || input.project.municipality_size))) return false;
  if (criteria.federalOnly && Number(input.project.is_federal_public) !== 1) return false;
  if (criteria.classificationMethods?.length && !criteria.classificationMethods.includes(ctx?.classification_method || 'INI')) return false;
  if (criteria.minProtocolDate && protocolDate < criteria.minProtocolDate) return false;
  if (criteria.maxProtocolDate && protocolDate > criteria.maxProtocolDate) return false;

  return true;
}

export function resolveLegalFraming(input: {
  project: ProjectRow;
  context: RegulatoryContextRow | null;
  normativePackage: NormativePackageRow | null;
  rules: NormativeRuleRow[];
}): LegalFramingResult {
  const ctx = input.context;
  const method = ctx?.classification_method || 'INI';
  const modeBadge = method === 'RTQ_LEGADO' ? 'RTQ_LEGADO' : 'INI';

  const decisionTrail: string[] = [];
  const warnings: string[] = [];
  const disclaimers: string[] = [
    'Pré-avaliação técnica para organização e compliance operacional; não substitui certificação oficial.',
    'Revisar sempre o enquadramento com documentação normativa vigente e consultoria especializada quando necessário.'
  ];

  let applicable = true;
  let minLevel: LegalFramingResult['minLevel'] = method === 'RTQ_LEGADO' ? 'C' : 'A';
  let compliancePath: LegalFramingResult['compliancePath'] = ctx?.requests_autodeclaration ? 'AUTODECLARACAO' : 'FORMAL';

  if (!input.normativePackage) {
    warnings.push('Nenhum pacote normativo ativo encontrado para a data informada. Usando fallback de segurança.');
    decisionTrail.push('Fallback: pacote normativo não encontrado; aplicando defaults conservadores.');
    return {
      applicable,
      minLevel,
      compliancePath,
      classificationMethod: method,
      modeBadge,
      effectiveDate: null,
      decisionTrail,
      warnings,
      disclaimers,
      normativePackage: null
    };
  }

  decisionTrail.push(`Pacote ativo: ${input.normativePackage.code} (${input.normativePackage.mode})`);
  const protocolDate = dateOnly(ctx?.protocol_date) || `${input.project.protocol_year}-01-01`;
  decisionTrail.push(`Data de protocolo considerada: ${protocolDate}`);
  if (modeBadge === 'RTQ_LEGADO') {
    warnings.push('Modo legado RTQ selecionado. Uso recomendado apenas para transição com justificativa documentada.');
    decisionTrail.push('Modo legado habilitado pelo contexto regulatório.');
  }

  const sorted = [...input.rules].sort((a, b) => a.sort_order - b.sort_order);
  for (const rule of sorted) {
    if (!ruleMatches({ project: input.project, context: ctx, rule })) continue;
    const outcome = parseJsonSafe<RuleOutcome>(rule.outcome_json, {});
    decisionTrail.push(outcome.decision || `Regra aplicada: ${rule.rule_key}`);
    if (typeof outcome.applicable === 'boolean') applicable = outcome.applicable;
    if (outcome.minLevel) minLevel = outcome.minLevel;
    if (outcome.compliancePath) compliancePath = outcome.compliancePath;
    if (outcome.warning) warnings.push(outcome.warning);
    if (outcome.disclaimer) disclaimers.push(outcome.disclaimer);
  }

  // regras finais de coerência
  if (Number(input.project.is_federal_public) === 1 && input.project.typology === 'publica') {
    minLevel = 'A';
    decisionTrail.push('Regra de coerência: edificação pública federal mantém meta mínima A.');
  }
  if (ctx?.requests_autodeclaration) {
    compliancePath = 'AUTODECLARACAO';
    decisionTrail.push('Solicitação explícita de autodeclaração registrada no contexto.');
  }

  return {
    applicable,
    minLevel,
    compliancePath,
    classificationMethod: method,
    modeBadge,
    effectiveDate: input.normativePackage.effective_from,
    decisionTrail,
    warnings,
    disclaimers,
    normativePackage: input.normativePackage
  };
}
