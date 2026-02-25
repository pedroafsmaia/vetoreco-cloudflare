import { describe, expect, it } from 'vitest';
import { normalizeTechnicalInputs, validateTechnicalInputs } from '../src/modules/technical/inputs';

describe('technical inputs validation', () => {
  it('normaliza números e calcula cobertura', () => {
    const inputs = normalizeTechnicalInputs({
      general: { zona_bioclimatica: '4', area_util_m2: '120' },
      envelope: { area_fachada_total_m2: '100', area_fachada_envidracada_m2: '40', parede_u: '2', cobertura_u: '1.3' },
      systems: { aquecimento_agua_tipo: 'solar' },
      declaration: { use_autodeclaracao: true },
    });
    const v = validateTechnicalInputs(inputs, 'residencial');
    expect(v.valid).toBe(true);
    expect(v.coverage).toBeGreaterThanOrEqual(80);
  });

  it('detecta erro de área envidraçada maior que total', () => {
    const inputs = normalizeTechnicalInputs({
      general: { zona_bioclimatica: 3, area_util_m2: 200 },
      envelope: { area_fachada_total_m2: 100, area_fachada_envidracada_m2: 120, parede_u: 2, cobertura_u: 1.5 },
      systems: { aquecimento_agua_tipo: 'gas' },
    });
    const v = validateTechnicalInputs(inputs, 'residencial');
    expect(v.valid).toBe(false);
    expect(v.errors.join(' ')).toContain('maior');
  });
});
