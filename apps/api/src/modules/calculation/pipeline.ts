import { computeRisk } from '../checklist/risk';
import { getChecklistTemplate } from '../checklist/templates';
import type { LegalFramingResult } from '../regulatory/engine';
import type { TechnicalInputs } from '../technical/inputs';

export type CalculationRunOutput = {
  algorithmVersion: string;
  normativePackage: { code: string; version: string; method: string };
  normalizedInputs: TechnicalInputs;
  blocks: {
    envelope: { glazingRatio: number | null; envelopeCompleteness: number };
    systems: { lightingDensity: number | null; hvacCop: number | null };
    checklist: ReturnType<typeof computeRisk>;
  };
  summary: {
    coverage: number;
    status: 'PRELIMINAR' | 'INSUFICIENTE';
    preClassification: 'A' | 'B' | 'C' | 'INDEFINIDO';
  };
  warnings: string[];
  errors: string[];
  disclaimers: string[];
};

export function runPreCalculation(params: {
  project: any;
  legalFraming: LegalFramingResult;
  inputs: TechnicalInputs;
  validation: { coverage: number; warnings: string[]; errors: string[] };
  checkedKeys: string[];
}): CalculationRunOutput {
  const { project, legalFraming, inputs, validation, checkedKeys } = params;
  const checklist = computeRisk(project.typology, checkedKeys);
  const template = getChecklistTemplate(project.typology);
  const envelope = inputs.envelope;
  const systems = inputs.systems;

  const glazingRatio =
    envelope.area_fachada_total_m2 && envelope.area_fachada_total_m2 > 0 && envelope.area_fachada_envidracada_m2 !== null
      ? Number((envelope.area_fachada_envidracada_m2 / envelope.area_fachada_total_m2).toFixed(4))
      : null;

  let score = 0;
  let maxScore = 0;

  maxScore += 40;
  if (validation.coverage >= 90) score += 40;
  else if (validation.coverage >= 70) score += 28;
  else if (validation.coverage >= 50) score += 18;

  maxScore += 25;
  if (checklist.progress >= 90) score += 25;
  else if (checklist.progress >= 70) score += 18;
  else if (checklist.progress >= 50) score += 10;

  maxScore += 20;
  if (glazingRatio !== null) {
    if (glazingRatio <= 0.4) score += 20;
    else if (glazingRatio <= 0.55) score += 12;
    else score += 6;
  }

  maxScore += 15;
  if ((systems.hvac_cop ?? 0) >= 3.2) score += 10;
  if ((systems.iluminacao_dpi_w_m2 ?? 999) <= 10) score += 5;

  const coverage = Math.round((score / maxScore) * 100);
  let preClassification: 'A' | 'B' | 'C' | 'INDEFINIDO' = 'INDEFINIDO';
  if (validation.errors.length === 0 && validation.coverage >= 50) {
    if (coverage >= 85) preClassification = 'A';
    else if (coverage >= 70) preClassification = 'B';
    else preClassification = 'C';
  }

  const warnings = [...validation.warnings];
  if (legalFraming.minPerformanceLevel === 'A' && preClassification !== 'A' && preClassification !== 'INDEFINIDO') {
    warnings.push('Pré-classificação abaixo do nível mínimo esperado para o enquadramento informado.');
  }
  if (template.length && checkedKeys.length < template.length) {
    warnings.push('Checklist ainda incompleto impacta a confiança da pré-avaliação.');
  }

  const disclaimers = [
    'Resultado preliminar, baseado em pipeline canônico auditável e cobertura parcial do motor normativo.',
    'Não substitui emissão oficial de ENCE nem avaliação por organismo acreditado.',
  ];

  return {
    algorithmVersion: '2.1.0',
    normativePackage: { code: legalFraming.packageCode, version: legalFraming.packageVersion, method: legalFraming.method },
    normalizedInputs: inputs,
    blocks: {
      envelope: {
        glazingRatio,
        envelopeCompleteness: validation.coverage,
      },
      systems: {
        lightingDensity: systems.iluminacao_dpi_w_m2 ?? null,
        hvacCop: systems.hvac_cop ?? null,
      },
      checklist,
    },
    summary: {
      coverage,
      status: validation.errors.length ? 'INSUFICIENTE' : 'PRELIMINAR',
      preClassification,
    },
    warnings,
    errors: [...validation.errors],
    disclaimers,
  };
}
