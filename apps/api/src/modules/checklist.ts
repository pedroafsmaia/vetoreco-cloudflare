import type { ChecklistSummary, ChecklistTemplateItem, Typology } from '../types';

const baseItems: ChecklistTemplateItem[] = [
  { id: 'env_orientacao', label: 'Orientação solar e implantação registradas', category: 'Envoltória', stage: 'Anteprojeto', critical: true, required: true, typologies: ['residencial', 'comercial', 'publica'], order: 10 },
  { id: 'env_aberturas', label: 'Aberturas e proteção solar detalhadas', category: 'Envoltória', stage: 'Anteprojeto', critical: true, required: true, typologies: ['residencial', 'comercial', 'publica'], order: 20 },
  { id: 'env_uvalues', label: 'Transmitâncias (U) de paredes e cobertura informadas', category: 'Envoltória', stage: 'Anteprojeto', critical: true, required: true, typologies: ['residencial', 'comercial', 'publica'], order: 30 },
  { id: 'iluminacao_lpd', label: 'Potência de iluminação (LPD) lançada', category: 'Sistemas', stage: 'Anteprojeto', critical: true, required: true, typologies: ['comercial', 'publica'], order: 40 },
  { id: 'hvac_sistema', label: 'Sistema de climatização especificado', category: 'Sistemas', stage: 'Anteprojeto', critical: true, required: true, typologies: ['comercial', 'publica'], order: 50 },
  { id: 'agua_quente', label: 'Sistema de aquecimento de água informado', category: 'Sistemas', stage: 'Anteprojeto', critical: false, required: false, typologies: ['residencial'], order: 60 },
  { id: 'vent_natural', label: 'Estratégia de ventilação natural descrita', category: 'Projeto', stage: 'Anteprojeto', critical: false, required: false, typologies: ['residencial', 'comercial', 'publica'], order: 70 },
  { id: 'memorial_base', label: 'Memorial técnico preliminar revisado', category: 'Documentação', stage: 'Executivo', critical: false, required: true, typologies: ['residencial', 'comercial', 'publica'], order: 80 },
  { id: 'comissionamento', label: 'Plano de comissionamento previsto', category: 'Operação', stage: 'Executivo', critical: false, required: false, typologies: ['publica'], order: 90 }
];

export function getChecklistTemplate(typology: Typology): ChecklistTemplateItem[] {
  return baseItems
    .filter((i) => i.typologies.includes(typology))
    .sort((a, b) => a.order - b.order)
    .map((i) => ({ ...i }));
}

export function computeChecklistSummary(typology: Typology, checkedItemIds: string[]): ChecklistSummary {
  const items = getChecklistTemplate(typology);
  const checked = new Set(checkedItemIds);
  const done = items.filter((i) => checked.has(i.id)).length;
  const total = items.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const criticalMissing = items.filter((i) => i.critical && !checked.has(i.id)).length;

  let status: ChecklistSummary['status'] = 'VERDE';
  let message = 'Checklist com boa cobertura.';
  if (criticalMissing >= 2 || percent < 40) {
    status = 'VERMELHO';
    message = 'Pendências críticas elevadas. Alto risco de retrabalho.';
  } else if (criticalMissing >= 1 || percent < 75) {
    status = 'AMARELO';
    message = 'Faltam itens importantes para uma pré-avaliação confiável.';
  }

  return {
    items,
    coverage: { done, total, percent },
    criticalMissing,
    status,
    message
  };
}
