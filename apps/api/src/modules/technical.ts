import type { TechnicalInputs, TechnicalValidationResult, Typology } from '../types';
import { clamp } from '../utils';

export function normalizeTechnicalInputs(raw: unknown): TechnicalInputs {
  const body = (raw && typeof raw === 'object' ? raw : {}) as any;
  const g = body.general || {};
  const e = body.envelope || {};
  const s = body.systems || {};
  const a = body.autodeclaration || {};
  const num = (v: any): number | undefined => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? undefined : Number(v));
  return {
    general: {
      climateZone: g.climateZone ? String(g.climateZone).trim() : undefined,
      floors: num(g.floors),
      conditionedAreaM2: num(g.conditionedAreaM2),
      useHoursPerDay: num(g.useHoursPerDay)
    },
    envelope: {
      wallUValue: num(e.wallUValue),
      roofUValue: num(e.roofUValue),
      windowToWallRatio: num(e.windowToWallRatio),
      shadingFactor: num(e.shadingFactor)
    },
    systems: {
      lightingLPD: num(s.lightingLPD),
      hvacType: s.hvacType ? String(s.hvacType).trim() : undefined,
      hvacCop: num(s.hvacCop),
      waterHeatingType: s.waterHeatingType ? String(s.waterHeatingType).trim() : undefined
    },
    autodeclaration: {
      requested: !!a.requested,
      justification: a.justification ? String(a.justification).trim() : undefined
    }
  };
}

const baseRequired = [
  'general.climateZone',
  'general.floors',
  'general.conditionedAreaM2',
  'envelope.wallUValue',
  'envelope.roofUValue',
  'envelope.windowToWallRatio'
];
const typologyRequired: Record<Typology, string[]> = {
  residencial: ['systems.waterHeatingType'],
  comercial: ['systems.lightingLPD', 'systems.hvacType', 'systems.hvacCop'],
  publica: ['systems.lightingLPD', 'systems.hvacType', 'systems.hvacCop']
};

function getValue(inputs: TechnicalInputs, path: string): unknown {
  return path.split('.').reduce<any>((acc, key) => (acc ? acc[key] : undefined), inputs as any);
}

export function validateTechnicalInputs(typology: Typology, inputs: TechnicalInputs): TechnicalValidationResult {
  const errors: TechnicalValidationResult['errors'] = [];
  const warnings: TechnicalValidationResult['warnings'] = [];
  const fields = [...baseRequired, ...typologyRequired[typology]];
  let filled = 0;

  for (const f of fields) {
    const v = getValue(inputs, f);
    const hasValue = v !== undefined && v !== null && v !== '';
    if (hasValue) filled++;
    if (!hasValue) errors.push({ field: f, message: 'Campo obrigatório para esta tipologia.' });
  }

  const wwr = Number(inputs.envelope.windowToWallRatio);
  if (!Number.isNaN(wwr)) {
    if (wwr > 80) errors.push({ field: 'envelope.windowToWallRatio', message: 'WWR acima do intervalo aceitável (0–80%).' });
    if (wwr > 50) warnings.push({ field: 'envelope.windowToWallRatio', message: 'WWR elevado pode piorar desempenho térmico.' });
  }
  const shading = inputs.envelope.shadingFactor;
  if (shading !== undefined && (shading < 0 || shading > 1)) {
    errors.push({ field: 'envelope.shadingFactor', message: 'Fator de sombreamento deve estar entre 0 e 1.' });
  }
  const cop = inputs.systems.hvacCop;
  if (cop !== undefined && cop < 1) {
    warnings.push({ field: 'systems.hvacCop', message: 'COP muito baixo. Verifique unidade/valor informado.' });
  }
  if (inputs.autodeclaration.requested && !inputs.autodeclaration.justification) {
    warnings.push({ field: 'autodeclaration.justification', message: 'Autodeclaração solicitada sem justificativa.' });
  }

  return {
    errors,
    warnings,
    coverage: { filled, total: fields.length, percent: fields.length ? clamp(Math.round((filled / fields.length) * 100), 0, 100) : 0 }
  };
}
