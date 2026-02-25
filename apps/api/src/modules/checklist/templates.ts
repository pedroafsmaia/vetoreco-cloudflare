export type Typology = 'residencial' | 'comercial' | 'publica';
export type ChecklistItem = {
  key: string;
  label: string;
  category: 'envoltoria' | 'sistemas' | 'documentacao' | 'clima';
  stage: 'estudo' | 'anteprojeto' | 'executivo' | 'obra';
  required: boolean;
  critical: boolean;
  order: number;
  appliesTo: Typology[];
};

const base: Omit<ChecklistItem, 'order'>[] = [
  { key: 'zona_bioclimatica', label: 'Zona bioclimática definida', category: 'clima', stage: 'estudo', required: true, critical: true, appliesTo: ['residencial', 'comercial', 'publica'] },
  { key: 'env_orientacao', label: 'Orientação solar das fachadas definida', category: 'envoltoria', stage: 'estudo', required: true, critical: true, appliesTo: ['comercial', 'publica'] },
  { key: 'envoltoria', label: 'Dados de envoltória (paredes/cobertura) preenchidos', category: 'envoltoria', stage: 'anteprojeto', required: true, critical: true, appliesTo: ['residencial', 'comercial', 'publica'] },
  { key: 'aberturas', label: 'Dimensões e proteção solar das aberturas', category: 'envoltoria', stage: 'anteprojeto', required: true, critical: true, appliesTo: ['residencial', 'comercial', 'publica'] },
  { key: 'iluminacao_pot', label: 'Potência de iluminação por ambiente lançada', category: 'sistemas', stage: 'executivo', required: true, critical: true, appliesTo: ['comercial', 'publica'] },
  { key: 'ar_cond', label: 'Sistema de condicionamento de ar especificado', category: 'sistemas', stage: 'executivo', required: true, critical: true, appliesTo: ['comercial', 'publica'] },
  { key: 'agua_quente', label: 'Sistema de aquecimento de água informado', category: 'sistemas', stage: 'executivo', required: true, critical: true, appliesTo: ['residencial'] },
  { key: 'ventilacao', label: 'Ventilação/sombreamento avaliados', category: 'envoltoria', stage: 'anteprojeto', required: false, critical: false, appliesTo: ['residencial'] },
  { key: 'vent_natural', label: 'Estratégia de ventilação natural descrita', category: 'envoltoria', stage: 'anteprojeto', required: false, critical: false, appliesTo: ['comercial', 'publica'] },
  { key: 'comissionamento', label: 'Plano de comissionamento previsto', category: 'sistemas', stage: 'obra', required: false, critical: false, appliesTo: ['publica'] },
  { key: 'memorial', label: 'Memorial técnico atualizado', category: 'documentacao', stage: 'executivo', required: true, critical: false, appliesTo: ['residencial', 'comercial', 'publica'] },
];

export function getChecklistTemplate(typology: Typology): ChecklistItem[] {
  return base
    .filter((item) => item.appliesTo.includes(typology))
    .map((item, idx) => ({ ...item, order: idx + 1 }))
    .sort((a, b) => a.order - b.order);
}
