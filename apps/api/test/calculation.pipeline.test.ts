import { describe, expect, it } from 'vitest';
import { runPreCalculation } from '../src/modules/calculation/pipeline';
import { evaluateLegalFraming, normalizeRegulatoryContext } from '../src/modules/regulatory/engine';
import { normalizeTechnicalInputs, validateTechnicalInputs } from '../src/modules/technical/inputs';

const project = { typology: 'comercial', municipality_size: 'large', protocol_year: 2028, state: 'MG', is_federal_public: 0 };

describe('calculation pipeline', () => {
  it('gera saída canônica auditável', () => {
    const inputs = normalizeTechnicalInputs({
      general: { zona_bioclimatica: 4, area_util_m2: 1000 },
      envelope: { area_fachada_total_m2: 500, area_fachada_envidracada_m2: 200, parede_u: 2.1, cobertura_u: 1.2 },
      systems: { iluminacao_dpi_w_m2: 9, hvac_cop: 3.4 },
      declaration: { use_autodeclaracao: false }
    });
    const validation = validateTechnicalInputs(inputs, 'comercial');
    const legal = evaluateLegalFraming(project, normalizeRegulatoryContext({ protocol_date: '2028-02-01' }, project));
    const result = runPreCalculation({ project, legalFraming: legal, inputs, validation, checkedKeys: ['zona_bioclimatica','envoltoria','aberturas','iluminacao_pot','ar_cond'] });
    expect(result.algorithmVersion).toBeTruthy();
    expect(result.summary.status).toBe('PRELIMINAR');
    expect(result.normalizedInputs.general.area_util_m2).toBe(1000);
  });
});
