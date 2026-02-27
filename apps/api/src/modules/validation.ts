/**
 * Validações técnicas (com fonte pública verificável)
 *
 * Regras do VetorEco:
 * - Não inventar números normativos.
 * - Toda validação numérica precisa citar explicitamente a fonte (doc/tabela/ano/link público).
 */

import type { ClimateZone } from './climate';
import { NORMATIVE_SOURCES, formatNormRef, type NormativeSource } from '../normative_sources';

export interface ValidationResult {
  isValid: boolean;
  severity: 'info' | 'warning' | 'error';
  message: string;
  recommendation?: string;
  normativeReference?: string;
}


/**
 * RTQ-R (Manual 2014) — Tabela 3.1 (paredes)
 */
export function validateWallUValue(uValue: number, climateZone: ClimateZone, absorptance: number): ValidationResult {
  const source = NORMATIVE_SOURCES.RTQR_MANUAL_2014;

  // Tabela 3.1 — Paredes
  // ZB1 e ZB2: U ≤ 2,50 (sem exigência de absortância)
  // ZB3 a ZB6: α ≤ 0,6 → U ≤ 3,70; α > 0,6 → U ≤ 2,50
  // ZB7:       α ≤ 0,6 → U ≤ 3,70; α > 0,6 → U ≤ 2,50
  // ZB8:       α ≤ 0,6 → U ≤ 3,70; α > 0,6 → U ≤ 2,50
  // Fonte: Manual RTQ-R 2014 — Tabela 3.1
  let limit: number;
  if (climateZone === 'ZB1' || climateZone === 'ZB2') limit = 2.5;
  else limit = absorptance > 0.6 ? 2.5 : 3.7;

  if (uValue > limit) {
    return {
      isValid: false,
      severity: 'error',
      message: `U-value de ${uValue.toFixed(2)} W/(m².K) excede o limite de ${limit.toFixed(2)} W/(m².K) para ${climateZone}.`,
      recommendation: 'Revise a composição da parede (isolamento, materiais) e confirme o atendimento conforme a tabela oficial.',
      normativeReference: `${source.document} (${source.year}) — Tabela 3.1 (Paredes) • ${source.url}`,
    };
  }

  return {
    isValid: true,
    severity: 'info',
    message: `U-value atende ao limite-base para ${climateZone} (considerando α=${absorptance.toFixed(2)}).`,
    normativeReference: `${source.document} (${source.year}) — Tabela 3.1 (Paredes) • ${source.url}`,
  };
}

/**
 * RTQ-R (Manual 2014) — Tabela 3.1 (coberturas)
 */
export function validateRoofUValueWithAbsorptance(
  uValue: number,
  climateZone: ClimateZone,
  absorptance: number
): ValidationResult {
  const source = NORMATIVE_SOURCES.RTQR_MANUAL_2014;

  // Tabela 3.1 — Coberturas
  // ZB1 e ZB2: U ≤ 2,30 (sem exigência de absortância)
  // ZB3 a ZB6: α ≤ 0,6 → U ≤ 2,30; α > 0,6 → U ≤ 1,50
  // ZB7 e ZB8: α ≤ 0,4 → U ≤ 2,30; α > 0,4 → U ≤ 1,50
  let limit: number;
  if (climateZone === 'ZB1' || climateZone === 'ZB2') limit = 2.3;
  else if (climateZone === 'ZB7' || climateZone === 'ZB8') limit = absorptance > 0.4 ? 1.5 : 2.3;
  else limit = absorptance > 0.6 ? 1.5 : 2.3;

  if (uValue > limit) {
    return {
      isValid: false,
      severity: 'error',
      message: `U-value de cobertura ${uValue.toFixed(2)} W/(m².K) excede o limite de ${limit.toFixed(2)} W/(m².K) para ${climateZone} (α=${absorptance.toFixed(2)}).`,
      recommendation: 'Revise a composição e/ou cor/absortância da cobertura e confirme o atendimento conforme a tabela oficial.',
      normativeReference: `${source.document} (${source.year}) — Tabela 3.1 (Coberturas) • ${source.url}`,
    };
  }

  return {
    isValid: true,
    severity: 'info',
    message: `U-value de cobertura atende ao limite-base para ${climateZone} (α=${absorptance.toFixed(2)}).`,
    normativeReference: `${source.document} (${source.year}) — Tabela 3.1 (Coberturas) • ${source.url}`,
  };
}

/**
 * Compatibilidade: se a absortância não foi informada, valida apenas contra o limite mais permissivo (2,30)
 * e força o disclaimer de conferência.
 */
export function validateRoofUValue(uValue: number, climateZone: ClimateZone): ValidationResult {
  const source = NORMATIVE_SOURCES.RTQR_MANUAL_2014;
  const maxPermissive = 2.3;
  if (uValue > maxPermissive) {
    return {
      isValid: false,
      severity: 'error',
      message: `U-value de cobertura ${uValue.toFixed(2)} W/(m².K) excede o limite-base de ${maxPermissive.toFixed(2)} W/(m².K).`,
      recommendation: 'Informe a absortância (α) para validar corretamente e confirme na tabela oficial.',
      normativeReference: `${source.document} (${source.year}) — Tabela 3.1 (Coberturas) • ${source.url}`,
    };
  }
  return {
    isValid: true,
    severity: 'warning',
    message: `U-value de cobertura atende ao limite-base permissivo (U ≤ ${maxPermissive.toFixed(2)}). Para validação completa, informe α e confirme na tabela oficial.`,
    normativeReference: `${source.document} (${source.year}) — Tabela 3.1 (Coberturas) • ${source.url}`,
  };
}

/**
 * WWR: validador QUALITATIVO (sem limites numéricos) — evita números "típicos" sem fonte.
 */
export function validateWWR(
  _wwr: number,
  orientation: string,
  _climateZone: ClimateZone,
  hasShadingDevice: boolean
): ValidationResult {
  const criticalOrientations = ['E', 'W', 'NE', 'NW', 'SE', 'SW'];
  const ori = String(orientation || '').toUpperCase();
  if (!hasShadingDevice && criticalOrientations.includes(ori)) {
    return {
      isValid: true,
      severity: 'warning',
      message: `Fachada ${ori} sem sombreamento: verifique risco de ganho térmico e os pré-requisitos exigidos no método aplicável (INI/RTQ).`,
      recommendation: 'Considere proteção solar externa (brises, marquises, beirais) e registre a justificativa/evidência no dossiê.',
    };
  }
  return {
    isValid: true,
    severity: 'info',
    message: 'WWR calculado. Confirme limites e pré-requisitos no método/norma aplicável (INI/RTQ).',
  };
}

/**
 * RTQ-R (Manual 2014) — Tabela 3.2
 * Percentual de áreas mínimas de abertura para ventilação (A) em relação à área útil do ambiente.
 */
export function validateMinimumVentilationOpening(
  openingArea_m2: number,
  usefulArea_m2: number,
  climateZone: ClimateZone
): ValidationResult {
  const source = NORMATIVE_SOURCES.RTQR_MANUAL_2014;
  if (!(openingArea_m2 >= 0) || !(usefulArea_m2 > 0)) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Áreas inválidas para verificação de ventilação mínima.',
    };
  }

  // Tabela 3.2:
  // ZB1 a ZB6: A ≥ 8%
  // ZB7:       A ≥ 5%
  // ZB8:       A ≥ 10%
  const minPct = climateZone === 'ZB7' ? 5 : climateZone === 'ZB8' ? 10 : 8;
  const pct = (openingArea_m2 / usefulArea_m2) * 100;

  if (pct < minPct) {
    return {
      isValid: false,
      severity: 'error',
      message: `Abertura para ventilação (${pct.toFixed(1)}%) abaixo do mínimo (${minPct}%) para ${climateZone}.`,
      recommendation: 'Revise dimensões/quantidade de aberturas e confirme o atendimento conforme o RTQ-R.',
      normativeReference: `${source.document} (${source.year}) — Tabela 3.2 • ${source.url}`,
    };
  }

  return {
    isValid: true,
    severity: 'info',
    message: `Ventilação mínima atendida (${pct.toFixed(1)}% ≥ ${minPct}%).`,
    normativeReference: `${source.document} (${source.year}) — Tabela 3.2 • ${source.url}`,
  };
}
