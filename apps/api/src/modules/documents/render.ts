import type { LegalFramingResult } from '../regulatory/engine';
import type { TechnicalInputs } from '../technical/inputs';
import type { CalculationRunOutput } from '../calculation/pipeline';

function esc(v: unknown) {
  return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function buildMemorial(project: any, legal: LegalFramingResult, inputs: TechnicalInputs, latestRun: any | null) {
  const payload = {
    generatedAt: new Date().toISOString(),
    kind: 'memorial_tecnico_preliminar',
    product: 'VetorEco',
    project: {
      id: project.id,
      nome: project.name,
      cidade: project.city,
      uf: project.state,
      tipologia: project.typology,
      fase: project.phase,
      area_m2: project.area_m2,
    },
    legalFraming: legal,
    technicalInputs: inputs,
    latestRun: latestRun ? JSON.parse(latestRun.result_json) : null,
    disclaimers: [
      'Memorial técnico preliminar para organização e pré-avaliação.',
      'Não substitui emissão oficial de ENCE/OIA.',
    ],
  };

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>Memorial VetorEco</title>
<style>body{font-family:system-ui;padding:24px;line-height:1.4;color:#111}h1,h2{margin:0 0 8px}section{margin:20px 0;padding:12px;border:1px solid #ddd;border-radius:8px}code,pre{background:#f6f6f6;padding:8px;border-radius:6px;display:block;white-space:pre-wrap}</style>
</head><body>
<h1>VetorEco — Memorial Técnico Preliminar</h1>
<p>Gerado em ${esc(payload.generatedAt)}</p>
<section><h2>Projeto</h2>
<p><b>${esc(project.name)}</b> — ${esc(project.city)}/${esc(project.state)}</p>
<p>Tipologia: ${esc(project.typology)} | Fase: ${esc(project.phase)} | Área: ${esc(project.area_m2 ?? '-')} m²</p>
</section>
<section><h2>Enquadramento Legal</h2>
<p>Pacote: ${esc(legal.packageCode)} ${esc(legal.packageVersion)} (${esc(legal.ruleMode)})</p>
<p>Vigência aplicável: ${esc(legal.effectiveDate)} | Caminho: ${esc(legal.compliancePath)} | Nível mínimo: ${esc(legal.minPerformanceLevel)}</p>
<ul>${legal.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
</section>
<section><h2>Inputs Técnicos (canônico)</h2><pre>${esc(JSON.stringify(inputs, null, 2))}</pre></section>
<section><h2>Pré-cálculo</h2><pre>${esc(latestRun ? latestRun.result_json : JSON.stringify({ status: 'SEM_EXECUCAO' }, null, 2))}</pre></section>
<section><h2>Disclaimers</h2><ul>${payload.disclaimers.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></section>
</body></html>`;

  return { json: payload, html };
}

export function buildDossier(project: any, legal: LegalFramingResult, checklistItems: any[], checkedKeys: string[], latestRun: CalculationRunOutput | null) {
  const checked = new Set(checkedKeys);
  const done = checklistItems.filter((i) => checked.has(i.key));
  const missing = checklistItems.filter((i) => !checked.has(i.key));

  const payload = {
    generatedAt: new Date().toISOString(),
    kind: 'dossie_operacional',
    project: {
      id: project.id,
      nome: project.name,
      tipologia: project.typology,
      fase: project.phase,
    },
    legalSummary: {
      applicable: legal.applicable,
      minLevel: legal.minPerformanceLevel,
      compliancePath: legal.compliancePath,
      method: legal.method,
      packageCode: legal.packageCode,
    },
    checklist: {
      total: checklistItems.length,
      done: done.length,
      missingCritical: missing.filter((i) => i.critical).map((i) => i.label),
      doneItems: done.map((i) => i.label),
      pendingItems: missing.map((i) => i.label),
    },
    latestCalculationSummary: latestRun?.summary || null,
    nextSteps: [
      'Completar pendências críticas do checklist.',
      'Revisar inputs técnicos faltantes.',
      'Executar nova pré-avaliação após atualização dos dados.',
      'Validar memorial e documentação para protocolo.',
    ],
    disclaimers: ['Dossiê de workflow/compliance. Não é documento oficial de certificação.'],
  };

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Dossiê VetorEco</title>
<style>body{font-family:system-ui;padding:24px}section{margin:12px 0;padding:12px;border:1px solid #ddd;border-radius:8px}ul{margin:4px 0}</style></head><body>
<h1>VetorEco — Dossiê Operacional</h1>
<section><b>Projeto:</b> ${esc(project.name)} (${esc(project.typology)})</section>
<section><b>Enquadramento:</b> ${esc(legal.packageCode)} / ${esc(legal.minPerformanceLevel)} / ${esc(legal.compliancePath)}</section>
<section><h2>Checklist</h2><p>${done.length}/${checklistItems.length} itens concluídos</p><ul>${missing.map((i) => `<li>${esc(i.label)}${i.critical ? ' <b>(crítico)</b>' : ''}</li>`).join('')}</ul></section>
<section><h2>Pré-cálculo</h2><pre>${esc(JSON.stringify(latestRun?.summary || { status: 'SEM_EXECUCAO' }, null, 2))}</pre></section>
<section><h2>Próximos passos</h2><ul>${payload.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>
</body></html>`;

  return { json: payload, html };
}
