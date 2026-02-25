import { describe, expect, it } from 'vitest';
import { evaluateLegalFraming, normalizeRegulatoryContext } from '../src/modules/regulatory/engine';

const baseProject = {
  id: 'p1',
  name: 'Projeto',
  typology: 'comercial',
  municipality_size: 'large',
  protocol_year: 2028,
  state: 'MG',
  is_federal_public: 0,
};

describe('regulatory engine', () => {
  it('aplica INI-first para comercial grande em 2028', () => {
    const ctx = normalizeRegulatoryContext({ protocol_date: '2028-03-01' }, baseProject);
    const res = evaluateLegalFraming(baseProject, ctx);
    expect(res.applicable).toBe(true);
    expect(res.method).toBe('INI');
    expect(res.packageCode).toBe('INI-C');
    expect(res.minPerformanceLevel).toBe('C');
  });

  it('marca público federal com nível A', () => {
    const pub = { ...baseProject, typology: 'publica', is_federal_public: 1 };
    const ctx = normalizeRegulatoryContext({ protocol_date: '2027-01-02', entity_scope: 'federal' }, pub);
    const res = evaluateLegalFraming(pub, ctx);
    expect(res.minPerformanceLevel).toBe('A');
    expect(res.effectiveDate).toBe('2027-01-01');
  });

  it('exige evidência para RTQ_LEGADO', () => {
    expect(() => normalizeRegulatoryContext({ classification_method: 'RTQ_LEGADO', legacy_reason: 'Transição' }, baseProject)).toThrow();
  });
});
