import { getChecklistTemplate, Typology } from './templates';

export type RiskSummary = {
  status: 'Verde' | 'Amarelo' | 'Vermelho';
  progress: number;
  done: number;
  total: number;
  criticalMissing: number;
  message: string;
  coverageScore: number;
};

export function computeRisk(typology: Typology, checkedKeys: string[]): RiskSummary {
  const items = getChecklistTemplate(typology);
  const checked = new Set(checkedKeys);
  const done = items.filter((i) => checked.has(i.key)).length;
  const criticalMissing = items.filter((i) => i.critical && !checked.has(i.key)).length;
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;
  let status: RiskSummary['status'] = 'Verde';
  let message = 'Checklist em boa cobertura para avançar.';
  if (criticalMissing >= 2 || progress < 45) {
    status = 'Vermelho';
    message = 'Pendências críticas elevadas. Alto risco de retrabalho.';
  } else if (criticalMissing >= 1 || progress < 75) {
    status = 'Amarelo';
    message = 'Ainda há pendências relevantes antes da documentação final.';
  }
  return { status, progress, done, total: items.length, criticalMissing, message, coverageScore: progress };
}
