import type { ChecklistSummary, LegalFramingResult, ProjectRow, TechnicalInputs } from '../types';
import { escapeHtml } from '../utils';

type Doc = { type: 'memorial' | 'dossier'; version: string; html: string; text: string; json: any };

const labels: Record<string, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial / Serviços',
  publica: 'Pública',
  estudo: 'Estudo',
  anteprojeto: 'Anteprojeto',
  executivo: 'Executivo',
  obra: 'Obra'
};

function projectLines(project: ProjectRow): string[] {
  return [
    `Projeto: ${project.name}`,
    `Cidade/UF: ${project.city || '-'} / ${project.state || '-'}`,
    `Tipologia: ${labels[project.typology] || project.typology}`,
    `Fase: ${labels[project.phase] || project.phase}`,
    `Ano de protocolo: ${project.protocol_year}`,
    `Área estimada: ${project.area_m2 ?? '-'} m²`,
    `Pública federal: ${Number(project.is_federal_public) ? 'Sim' : 'Não'}`
  ];
}

function htmlPage(title: string, sections: { title: string; lines: string[] }[]) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
body{font-family:Inter,Arial,sans-serif;max-width:920px;margin:24px auto;padding:0 16px;color:#111}
h1{font-size:24px;margin:0 0 4px}
small{color:#666}
section{margin-top:16px;border:1px solid #ddd;border-radius:10px;padding:12px}
h2{font-size:16px;margin:0 0 8px}
ul{margin:0;padding-left:18px}
li{margin:4px 0}
code{background:#f4f4f4;padding:1px 4px;border-radius:4px}
</style>
</head><body>
<h1>${escapeHtml(title)}</h1><small>Gerado pelo VetorEco</small>
${sections.map((s)=>`<section><h2>${escapeHtml(s.title)}</h2><ul>${s.lines.map((l)=>`<li>${escapeHtml(l)}</li>`).join('')}</ul></section>`).join('')}
</body></html>`;
}

function docText(title: string, sections: { title: string; lines: string[] }[]) {
  return [title, `Gerado em: ${new Date().toLocaleString('pt-BR')}`, ...sections.flatMap((s) => ['', s.title, ...s.lines.map((l) => `- ${l}`)])].join('\n');
}

export function buildMemorialDocument(input: {
  project: ProjectRow;
  legalFraming: LegalFramingResult;
  technicalInputs: TechnicalInputs;
  calc: any | null;
  thermalCalc?: any | null;
}): Doc {
  const sections = [
    { title: '1. Identificação', lines: projectLines(input.project) },
    { title: '2. Enquadramento legal', lines: [
      `Método: ${input.legalFraming.classificationMethod}`,
      `Pacote normativo: ${input.legalFraming.normativePackage?.code || 'fallback'}`,
      `Meta mínima: ${input.legalFraming.minLevel}`,
      `Caminho de conformidade: ${input.legalFraming.compliancePath}`,
      ...input.legalFraming.decisionTrail.map((x) => `Decisão: ${x}`),
      ...input.legalFraming.warnings.map((x) => `Aviso: ${x}`)
    ]},
    { title: '3. Inputs técnicos (resumo)', lines: [
      `Zona bioclimática: ${input.technicalInputs.general.climateZone || '-'}`,
      `Pavimentos: ${input.technicalInputs.general.floors ?? '-'}`,
      `Área condicionada: ${input.technicalInputs.general.conditionedAreaM2 ?? '-'} m²`,
      `U parede: ${input.technicalInputs.envelope.wallUValue ?? '-'}`,
      `U cobertura: ${input.technicalInputs.envelope.roofUValue ?? '-'}`,
      `WWR: ${input.technicalInputs.envelope.windowToWallRatio ?? '-'}%`,
      `Sombreamento: ${input.technicalInputs.envelope.shadingFactor ?? '-'}`,
      `Iluminação LPD: ${input.technicalInputs.systems.lightingLPD ?? '-'}`,
      `HVAC: ${input.technicalInputs.systems.hvacType || '-'} (COP ${input.technicalInputs.systems.hvacCop ?? '-'})`
    ]},
    { title: '4. Pré-avaliação', lines: input.calc ? [
      `Status: ${input.calc.status}`,
      `Score: ${input.calc.score}`,
      `Classe estimada: ${input.calc.grade}`,
      ...((input.calc.warnings || []) as string[]).map((x) => `Aviso: ${x}`),
      ...((input.calc.errors || []) as string[]).map((x) => `Erro: ${x}`)
    ] : ['Nenhuma execução de pré-cálculo registrada.']},
    { title: '5. Resultado térmico complementar', lines: input.thermalCalc?.calculation ? [
      `Método: ${input.thermalCalc.calculation.calculation_method || '-'}`,
      `Zona bioclimática: ${input.thermalCalc.calculation.bioclimatic_zone || '-'}`,
      `RTQ-R: ${input.thermalCalc.calculation.rtqr_rating || '-'}` ,
      `RTQ-C: ${input.thermalCalc.calculation.rtqc_rating || '-'}` ,
      `NBR 15575: ${input.thermalCalc.calculation.nbr_compliant ? 'Conforme' : 'Não conforme'}`,
      `Pendências críticas: ${input.thermalCalc.checks?.critical_issues ?? 0}`
    ] : ['Sem cálculo térmico registrado.']},
    { title: '6. Disclaimers', lines: [...input.legalFraming.disclaimers] }
  ];

  const title = `Memorial técnico preliminar — ${input.project.name}`;
  return {
    type: 'memorial',
    version: '0.4.2',
    html: htmlPage(title, sections),
    text: docText(title, sections),
    json: { title, sections, generatedAt: new Date().toISOString() }
  };
}

export function buildDossierDocument(input: {
  project: ProjectRow;
  legalFraming: LegalFramingResult;
  checklistSummary: ChecklistSummary;
  calc: any | null;
  thermalCalc?: any | null;
}): Doc {
  const done = input.checklistSummary.items.filter((i) => (input.checklistSummary.coverage.done ? true : true)); // items list itself returned to UI
  const sections = [
    { title: '1. Projeto', lines: projectLines(input.project) },
    { title: '2. Checklist e risco', lines: [
      `Cobertura checklist: ${input.checklistSummary.coverage.percent}%`,
      `Pendências críticas: ${input.checklistSummary.criticalMissing}`,
      `Status: ${input.checklistSummary.status}`,
      input.checklistSummary.message
    ]},
    { title: '3. Caminho regulatório', lines: [
      `Método: ${input.legalFraming.classificationMethod}`,
      `Meta mínima: ${input.legalFraming.minLevel}`,
      `Caminho: ${input.legalFraming.compliancePath}`,
      ...(input.legalFraming.warnings.map((w) => `Aviso: ${w}`))
    ]},
    { title: '4. Resultado da pré-avaliação', lines: input.calc ? [
      `Status: ${input.calc.status}`,
      `Score: ${input.calc.score}`,
      `Classe: ${input.calc.grade}`,
      `Cobertura checklist usada: ${input.calc.checklistCoveragePercent}%`
    ] : ['Pré-cálculo ainda não executado.']},
    { title: '5. Resultado térmico complementar', lines: input.thermalCalc?.calculation ? [
      `Método: ${input.thermalCalc.calculation.calculation_method || '-'}`,
      `Zona bioclimática: ${input.thermalCalc.calculation.bioclimatic_zone || '-'}`,
      `RTQ-R: ${input.thermalCalc.calculation.rtqr_rating || '-'}`,
      `RTQ-C: ${input.thermalCalc.calculation.rtqc_rating || '-'}`,
      `NBR 15575: ${input.thermalCalc.calculation.nbr_compliant ? 'Conforme' : 'Não conforme'}`
    ] : ['Sem cálculo térmico registrado.']},
    { title: '6. Itens do checklist', lines: input.checklistSummary.items.map((i) => `${i.critical ? '[CRÍTICO] ' : ''}${i.label}`) }
  ];
  const title = `Dossiê operacional — ${input.project.name}`;
  return {
    type: 'dossier',
    version: '0.4.2',
    html: htmlPage(title, sections),
    text: docText(title, sections),
    json: { title, sections, generatedAt: new Date().toISOString() }
  };
}
