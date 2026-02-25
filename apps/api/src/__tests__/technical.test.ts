import { normalizeTechnicalInputs, validateTechnicalInputs } from '../modules/technical';

describe('technical validation', () => {
  it('flags missing required fields for commercial', () => {
    const inputs = normalizeTechnicalInputs({});
    const result = validateTechnicalInputs('comercial', inputs);
    expect(result.errors.length).toBeGreaterThan(3);
  });

  it('accepts a valid commercial payload', () => {
    const inputs = normalizeTechnicalInputs({
      general: { climateZone: 'ZB3', floors: 3, conditionedAreaM2: 800 },
      envelope: { wallUValue: 2.2, roofUValue: 1.8, windowToWallRatio: 35, shadingFactor: 0.4 },
      systems: { lightingLPD: 8.1, hvacType: 'VRF', hvacCop: 3.2 }
    });
    const result = validateTechnicalInputs('comercial', inputs);
    expect(result.errors).toHaveLength(0);
    expect(result.coverage.percent).toBe(100);
  });
});
