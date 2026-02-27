import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface DossierData {
  project: {
    name: string;
    city: string;
    state: string;
    typology: string;
    area_m2?: number;
    climate_zone?: string;
    ence_target?: string;
  };
  responsible: {
    name?: string;
    registration?: string; // CAU, CREA
    email?: string;
  };
  summary: {
    totalTasks: number;
    completedTasks: number;
    criticalMissing: number;
    readinessStatus: string;
  };
  envelope?: Array<{
    type: string;
    orientation?: string;
    area_m2: number;
    u_value?: number;
    material_description?: string;
  }>;
  systems?: Array<{
    type: string;
    description: string;
    power_w?: number;
  }>;
  calculations?: Array<{
    task_id?: string | null;
    task_title?: string | null;
    type: string;
    result: any;
    created_at: string;
  }>;
  evidences?: Array<{
    task_id?: string | null;
    task_title?: string | null;
    title: string;
    url: string;
    stage: string;
    evidence_type?: string;
    content_text?: string;
    rac_section?: string;
    notes?: string;
  }>;
  normativeBase?: Array<{
    title: string;
    url?: string;
    section?: string;
  }>;
  tasks: Array<{
    id?: string;
    stage: string;
    title: string;
    completed: boolean;
    critical: boolean;
    notes?: string;
    satisfied?: boolean;
    missing?: string[];
    active?: boolean;
  }>;
}

function groupByTask<T extends { task_id?: string | null }>(items: T[] | undefined) {
  const out: Record<string, T[]> = {};
  for (const it of items || []) {
    const k = it.task_id ? String(it.task_id) : '';
    if (!k) continue;
    (out[k] = out[k] || []).push(it);
  }
  return out;
}

export async function dossierPdfBytes(data: DossierData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  // === PÁGINA 1: CAPA ===
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 100;

  // Título
  page.drawText('DOSSIÊ DE PREPARAÇÃO', {
    x: margin,
    y,
    size: 24,
    font: helveticaBold,
    color: rgb(0.1, 0.3, 0.6)
  });
  y -= 30;

  page.drawText('Etiqueta Nacional de Conservação de Energia (ENCE)', {
    x: margin,
    y,
    size: 14,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3)
  });
  y -= 60;

  // Dados do projeto
  page.drawText('DADOS DO PROJETO', {
    x: margin,
    y,
    size: 16,
    font: helveticaBold
  });
  y -= 25;

  const projectInfo = [
    `Nome: ${data.project.name}`,
    `Localização: ${data.project.city} - ${data.project.state}`,
    `Tipologia: ${data.project.typology}`,
    ...(data.project.area_m2 ? [`Área: ${data.project.area_m2.toFixed(2)} m²`] : []),
    ...(data.project.climate_zone ? [`Zona Bioclimática: ${data.project.climate_zone}`] : []),
    ...(data.project.ence_target ? [`Nível ENCE Almejado: ${data.project.ence_target}`] : []),
  ];

  for (const line of projectInfo) {
    page.drawText(line, { x: margin, y, size: 12, font: helvetica });
    y -= 20;
  }

  y -= 20;

  // Dados do responsável
  if (data.responsible.name) {
    page.drawText('RESPONSÁVEL TÉCNICO', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold
    });
    y -= 25;

    const respInfo = [
      `Nome: ${data.responsible.name}`,
      ...(data.responsible.registration ? [`Registro: ${data.responsible.registration}`] : []),
      ...(data.responsible.email ? [`Email: ${data.responsible.email}`] : []),
    ];

    for (const line of respInfo) {
      page.drawText(line, { x: margin, y, size: 12, font: helvetica });
      y -= 20;
    }
  }

  // Data de geração
  y = 100;
  const now = new Date().toLocaleString('pt-BR');
  page.drawText(`Documento gerado em: ${now}`, {
    x: margin,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5)
  });

  page.drawText('VetorEco - Guia de preparação para ENCE (PBE Edifica)', {
    x: margin,
    y: y - 15,
    size: 9,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6)
  });

  // === PÁGINA 2: RESUMO EXECUTIVO ===
  page = pdf.addPage([pageWidth, pageHeight]);
  y = pageHeight - 80;

  page.drawText('1. RESUMO EXECUTIVO', {
    x: margin,
    y,
    size: 18,
    font: helveticaBold,
    color: rgb(0.1, 0.3, 0.6)
  });
  y -= 40;

  // Status de prontidão
  const statusColor = 
    data.summary.readinessStatus === 'green' ? rgb(0.1, 0.6, 0.1) :
    data.summary.readinessStatus === 'yellow' ? rgb(0.9, 0.6, 0.1) :
    rgb(0.8, 0.1, 0.1);

  page.drawText(`Status de Prontidão: ${data.summary.readinessStatus.toUpperCase()}`, {
    x: margin,
    y,
    size: 14,
    font: helveticaBold,
    color: statusColor
  });
  y -= 30;

  const summaryLines = [
    `Tarefas concluídas: ${data.summary.completedTasks} de ${data.summary.totalTasks} (${Math.round((data.summary.completedTasks / data.summary.totalTasks) * 100)}%)`,
    `Tarefas críticas pendentes: ${data.summary.criticalMissing}`,
    '',
    'Este dossiê documenta as decisões de projeto e preparação técnica para o processo',
    'oficial de emissão da ENCE. Não substitui a submissão ao PBE Edifica.',
  ];

  for (const line of summaryLines) {
    if (y < margin + 40) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 80;
    }
    page.drawText(line, { x: margin, y, size: 11, font: helvetica });
    y -= 18;
  }

  // === PÁGINA 3+: ENVELOPE ===
  if (data.envelope && data.envelope.length > 0) {
    y -= 30;
    if (y < margin + 100) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 80;
    }

    page.drawText('2. DADOS DE ENVELOPE', {
      x: margin,
      y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.3, 0.6)
    });
    y -= 30;

    for (const elem of data.envelope) {
      if (y < margin + 60) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - 80;
      }

      const elemLines = [
        `Tipo: ${elem.type}${elem.orientation ? ` - Orientação ${elem.orientation}` : ''}`,
        `Área: ${elem.area_m2.toFixed(2)} m²`,
        ...(elem.u_value ? [`U-value: ${elem.u_value.toFixed(3)} W/(m².K)`] : []),
        ...(elem.material_description ? [`Material: ${elem.material_description}`] : []),
        ''
      ];

      for (const line of elemLines) {
        page.drawText(line, { x: margin, y, size: 10, font: helvetica });
        y -= 16;
      }
    }
  }

  // === SISTEMAS ===
  if (data.systems && data.systems.length > 0) {
    y -= 20;
    if (y < margin + 100) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 80;
    }

    page.drawText('3. SISTEMAS PREDIAIS', {
      x: margin,
      y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.3, 0.6)
    });
    y -= 30;

    for (const sys of data.systems) {
      if (y < margin + 50) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - 80;
      }

      const sysLines = [
        `${sys.type}: ${sys.description}`,
        ...(sys.power_w ? [`Potência: ${sys.power_w} W`] : []),
        ''
      ];

      for (const line of sysLines) {
        const wrapped = wrapText(line, 90);
        for (const w of wrapped) {
          page.drawText(w, { x: margin, y, size: 10, font: helvetica });
          y -= 16;
        }
      }
    }
  }

  // === CÁLCULOS ===
  if (data.calculations && data.calculations.length > 0) {
    y -= 20;
    if (y < margin + 100) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 80;
    }

    page.drawText('4. CÁLCULOS REALIZADOS', {
      x: margin,
      y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.3, 0.6)
    });
    y -= 30;

    for (const calc of data.calculations.slice(0, 10)) { // Limita a 10 cálculos
      if (y < margin + 50) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - 80;
      }

      page.drawText(`${calc.type.toUpperCase()}`, { x: margin, y, size: 11, font: helveticaBold });
      y -= 18;

      const resultStr = JSON.stringify(calc.result, null, 2)
        .split('\n')
        .slice(0, 6) // Limita linhas por cálculo
        .join('\n');
      
      const resultLines = resultStr.split('\n');
      for (const line of resultLines) {
        const cleaned = line.replace(/[{}"]/g, '').trim();
        if (cleaned) {
          page.drawText(cleaned.substring(0, 80), { x: margin + 10, y, size: 9, font: helvetica });
          y -= 14;
        }
      }
      y -= 10;
    }
  }

  // === TAREFAS (CHECKLIST) ===
  page = pdf.addPage([pageWidth, pageHeight]);
  y = pageHeight - 80;

  page.drawText('5. CHECKLIST DE TAREFAS', {
    x: margin,
    y,
    size: 18,
    font: helveticaBold,
    color: rgb(0.1, 0.3, 0.6)
  });
  y -= 30;

  const stages = ['study', 'anteproject', 'executive', 'construction'];
  const stageNames: Record<string, string> = {
    'study': 'ESTUDO',
    'anteproject': 'ANTEPROJETO',
    'executive': 'EXECUTIVO',
    'construction': 'OBRA'
  };

  for (const stage of stages) {
    const stageTasks = data.tasks.filter(t => t.stage === stage && (t.active !== false));
    if (stageTasks.length === 0) continue;

    if (y < margin + 80) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 80;
    }

    page.drawText(`${stageNames[stage]}`, {
      x: margin,
      y,
      size: 14,
      font: helveticaBold
    });
    y -= 22;

    for (const task of stageTasks) {
      if (y < margin + 40) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - 80;
      }

      const check = (task.satisfied ?? task.completed) ? '[✓]' : '[ ]';
      const criticalMark = task.critical ? ' (CRÍTICO)' : '';
      
      const missingStr = Array.isArray(task.missing) && task.missing.length ? ` — faltando: ${task.missing.join(', ')}` : '';
      page.drawText(`${check} ${task.title}${criticalMark}${missingStr}`.substring(0, 110), {
        x: margin,
        y,
        size: 10,
        font: (task.satisfied ?? task.completed) ? helvetica : helveticaBold,
        color: (task.satisfied ?? task.completed) ? rgb(0.3, 0.3, 0.3) : rgb(0, 0, 0)
      });
      y -= 16;

      if (task.notes) {
        const noteLines = wrapText(`Nota: ${task.notes}`, 85);
        for (const noteLine of noteLines) {
          page.drawText(noteLine, {
            x: margin + 20,
            y,
            size: 8,
            font: helvetica,
            color: rgb(0.4, 0.4, 0.4)
          });
          y -= 14;
        }
      }
      y -= 4;
    }
    y -= 10;
  }

  // === EVIDÊNCIAS ===
  if (data.evidences && data.evidences.length > 0) {
    if (y < margin + 100) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 80;
    } else {
      y -= 20;
    }

    page.drawText('6. EVIDÊNCIAS E DOCUMENTOS', {
      x: margin,
      y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.3, 0.6)
    });
    y -= 30;

    for (const ev of data.evidences) {
      if (y < margin + 40) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - 80;
      }

      const tlabel = ev.evidence_type ? ` • tipo: ${ev.evidence_type}` : '';
      const rac = ev.rac_section ? ` • RAC: ${ev.rac_section}` : '';
      page.drawText(`• ${ev.title} [${ev.stage}]${tlabel}${rac}`.substring(0, 110), {
        x: margin,
        y,
        size: 10,
        font: helvetica
      });
      y -= 16;

      if (ev.evidence_type === 'text' && ev.content_text) {
        const snippet = String(ev.content_text).trim().slice(0, 600);
        for (const line of wrapText(snippet, 85)) {
          page.drawText(line, { x: margin + 10, y, size: 8, font: helvetica, color: rgb(0.35, 0.35, 0.35) });
          y -= 14;
          if (y < margin + 40) { page = pdf.addPage([pageWidth, pageHeight]); y = pageHeight - 80; }
        }
      } else {
        const urlLines = wrapText(ev.url, 75);
        for (const urlLine of urlLines) {
          page.drawText(urlLine, {
            x: margin + 10,
            y,
            size: 8,
            font: helvetica,
            color: rgb(0.2, 0.2, 0.8)
          });
          y -= 14;
        }
      }
      y -= 6;
    }
  }

  // === TABELA DE RASTREABILIDADE (CHECKLIST → EVIDÊNCIAS → CÁLCULOS) ===
  // Objetivo: permitir auditoria rápida sem “texto genérico” e sem reproduzir norma.
  {
    const evidByTask = groupByTask(data.evidences);
    const calcByTask = groupByTask(data.calculations as any);

    if (y < margin + 120) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 80;
    } else {
      y -= 20;
    }

    page.drawText('7. TABELA DE RASTREABILIDADE', {
      x: margin,
      y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.3, 0.6)
    });
    y -= 18;

    const trNote = [
      'Mapa rápido para conferência: cada tarefa (checklist) deve ter evidências e/ou cálculos quando aplicável.',
      'Itens “não aplicáveis” não entram como pendência crítica.'
    ];
    for (const line of trNote) {
      y -= 14;
      page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: rgb(0.35, 0.35, 0.35) });
    }
    y -= 18;

    // Cabeçalho simples (sem grid pesado)
    const colX = {
      stage: margin,
      task: margin + 80,
      ev: margin + 360,
      ca: margin + 440,
      st: margin + 510,
    };

    page.drawText('Etapa', { x: colX.stage, y, size: 10, font: helveticaBold });
    page.drawText('Tarefa', { x: colX.task, y, size: 10, font: helveticaBold });
    page.drawText('Evid.', { x: colX.ev, y, size: 10, font: helveticaBold });
    page.drawText('Calc.', { x: colX.ca, y, size: 10, font: helveticaBold });
    page.drawText('Status', { x: colX.st, y, size: 10, font: helveticaBold });
    y -= 14;
    page.drawText('—'.repeat(110), { x: margin, y, size: 8, font: helvetica, color: rgb(0.8, 0.8, 0.8) });
    y -= 14;

    const stageLabel: Record<string, string> = {
      study: 'Estudo',
      anteproject: 'Anteproj.',
      executive: 'Executivo',
      construction: 'Obra',
    };

    const tasks = (data.tasks || []).filter((t) => t.active !== false);
    for (const t of tasks) {
      if (y < margin + 60) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - 80;
      }

      const id = t.id ? String(t.id) : '';
      const evN = id ? (evidByTask[id]?.length || 0) : 0;
      const caN = id ? (calcByTask[id]?.length || 0) : 0;

      const status = (t.satisfied || (!t.critical && t.completed)) ? 'OK' : (t.critical ? 'PEND' : '—');
      const statusColor = status === 'OK' ? rgb(0.1, 0.6, 0.1) : status === 'PEND' ? rgb(0.8, 0.1, 0.1) : rgb(0.4, 0.4, 0.4);

      // Quebra de linha leve para o título (2 linhas no máximo)
      const title = t.title || '';
      const maxChars = 52;
      const line1 = title.slice(0, maxChars);
      const line2 = title.length > maxChars ? title.slice(maxChars, maxChars * 2) : '';

      page.drawText(stageLabel[t.stage] || t.stage, { x: colX.stage, y, size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(line1, { x: colX.task, y, size: 9, font: helvetica });
      page.drawText(String(evN), { x: colX.ev, y, size: 9, font: helvetica });
      page.drawText(String(caN), { x: colX.ca, y, size: 9, font: helvetica });
      page.drawText(status, { x: colX.st, y, size: 9, font: helveticaBold, color: statusColor });
      y -= 12;
      if (line2) {
        if (y < margin + 40) {
          page = pdf.addPage([pageWidth, pageHeight]);
          y = pageHeight - 80;
        }
        page.drawText(line2, { x: colX.task, y, size: 9, font: helvetica, color: rgb(0.25, 0.25, 0.25) });
        y -= 12;
      }
    }
  }

  // === PENDÊNCIAS CRÍTICAS ===
  const criticalOpen = data.tasks.filter((t) => (t.active !== false) && t.critical && !(t.satisfied ?? t.completed));
  if (criticalOpen.length > 0) {
    if (y < margin + 120) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 80;
    } else {
      y -= 20;
    }

    page.drawText('8. PENDÊNCIAS CRÍTICAS', {
      x: margin,
      y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.8, 0.1, 0.1)
    });
    y -= 26;

    page.drawText('Itens críticos em aberto na etapa atual ou anteriores (alto risco de retrabalho).', {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.35, 0.35, 0.35)
    });
    y -= 18;

    for (const t of criticalOpen.slice(0, 40)) {
      if (y < margin + 40) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - 80;
      }
      const missing = Array.isArray(t.missing) && t.missing.length ? ` — faltando: ${t.missing.join(', ')}` : '';
      page.drawText(`• [${t.stage}] ${t.title}${missing}`, {
        x: margin,
        y,
        size: 10,
        font: helvetica
      });
      y -= 16;
    }
  }

  // === BASE NORMATIVA (PACK + LINKS OFICIAIS) ===
  if (data.normativeBase && data.normativeBase.length > 0) {
    if (y < margin + 120) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 80;
    } else {
      y -= 20;
    }

    page.drawText('9. BASE NORMATIVA (REFERÊNCIAS)', {
      x: margin,
      y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.3, 0.6)
    });
    y -= 28;

    const items = data.normativeBase.slice(0, 30);
    for (const s of items) {
      if (y < margin + 40) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - 80;
      }
      const line = `• ${s.title}${s.section ? ` — ${s.section}` : ''}`;
      page.drawText(line.substring(0, 95), { x: margin, y, size: 10, font: helvetica });
      y -= 16;
      if (s.url) {
        for (const urlLine of wrapText(s.url, 75)) {
          page.drawText(urlLine, { x: margin + 10, y, size: 8, font: helvetica, color: rgb(0.2, 0.2, 0.8) });
          y -= 14;
        }
      }
      y -= 4;
    }
  }

  // === RODAPÉ FINAL ===
  page = pdf.addPage([pageWidth, pageHeight]);
  y = pageHeight / 2;

  page.drawText('PRÓXIMOS PASSOS', {
    x: margin,
    y,
    size: 16,
    font: helveticaBold
  });
  y -= 30;

  const nextSteps: string[] = [];
  if (criticalOpen.length > 0) {
    nextSteps.push(`1. Resolver ${criticalOpen.length} pendência(s) crítica(s) listadas na seção 7.`);
  } else {
    nextSteps.push('1. Validar que não há pendências críticas em aberto no checklist.');
  }
  const hasCalcs = (data.calculations || []).length > 0;
  nextSteps.push(hasCalcs ? '2. Revisar memórias de cálculo registradas (seção 4) e anexar evidências correspondentes.' : '2. Registrar as memórias de cálculo necessárias e vincular às tarefas do checklist.');
  const hasEvid = (data.evidences || []).length > 0;
  nextSteps.push(hasEvid ? '3. Revisar evidências e garantir rastreabilidade (seção 6).' : '3. Anexar evidências mínimas para itens críticos e decisões de projeto.');
  nextSteps.push('4. Conferir a base normativa do pacote (seção 8) e checar atualizações oficiais.');
  nextSteps.push('');
  nextSteps.push('Observação: o VetorEco não emite ENCE. Este dossiê é um guia técnico e um organizador de evidências para reduzir retrabalho no processo oficial.');

  for (const line of nextSteps) {
    page.drawText(line, { x: margin, y, size: 11, font: helvetica });
    y -= 18;
  }

  return await pdf.save();
}

function wrapText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxLen) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur += (cur ? ' ' : '') + w;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

