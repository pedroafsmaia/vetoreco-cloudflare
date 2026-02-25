import type { CalculationOutput, LegalFramingResult, ProjectRow, TechnicalValidationResult } from '../types';
import { clamp } from '../utils';

export function runPreCalculation(input: {
  project: ProjectRow;
  legalFraming: LegalFramingResult;
  technicalValidation: TechnicalValidationResult;
  checklistCoverage: { percent: number };
}): CalculationOutput {
  const errors: string[] = [];
  const warnings = [...input.legalFraming.warnings, ...input.technicalValidation.warnings.map((w) => `${w.field}: ${w.message}`)];
  if (input.technicalValidation.errors.length) {
    errors.push(...input.technicalValidation.errors.map((e) => `${e.field}: ${e.message}`));
  }

  const checklist = clamp(input.checklistCoverage.percent, 0, 100);
  const tech = clamp(input.technicalValidation.coverage.percent, 0, 100);

  // Scoring heurístico auditável (MVP) – substituível por motor normativo completo
  let score = Math.round(checklist * 0.35 + tech * 0.55 + (input.legalFraming.applicable ? 10 : 5));
  if (errors.length) score -= Math.min(40, errors.length * 8);
  score = clamp(score, 0, 100);

  let grade: CalculationOutput['grade'] = 'D';
  if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';

  let status: CalculationOutput['status'] = 'PASS';
  if (errors.length) status = 'FAIL';
  else if (warnings.length || score < 70) status = 'WARN';

  if (input.legalFraming.minLevel === 'A' && grade !== 'A') {
    warnings.push('Meta regulatória mínima A não atendida na pré-avaliação atual.');
    if (status === 'PASS') status = 'WARN';
  }
  if (input.legalFraming.minLevel === 'C' && (grade === 'D')) {
    warnings.push('Meta regulatória mínima C não atendida na pré-avaliação atual.');
    if (status === 'PASS') status = 'WARN';
  }

  return {
    algorithmVersion: 've-precalc-0.4.2',
    status,
    score,
    grade,
    checklistCoveragePercent: checklist,
    legal: {
      applicable: input.legalFraming.applicable,
      minLevel: input.legalFraming.minLevel,
      compliancePath: input.legalFraming.compliancePath,
      method: input.legalFraming.classificationMethod
    },
    blocks: {
      projectSummary: {
        typology: input.project.typology,
        area_m2: input.project.area_m2,
        protocol_year: input.project.protocol_year
      },
      coverage: {
        technicalCoveragePercent: tech,
        checklistCoveragePercent: checklist
      }
    },
    warnings,
    errors,
    disclaimers: [
      'Resultado heurístico e auditável para triagem interna (MVP). Não substitui cálculo normativo oficial completo.',
      ...input.legalFraming.disclaimers
    ]
  };
}
