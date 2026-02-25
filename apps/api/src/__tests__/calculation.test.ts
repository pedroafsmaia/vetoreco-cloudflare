import { runPreCalculation } from '../modules/calculation';

describe('pre-calculation', () => {
  it('returns warning if target is A and grade is lower', () => {
    const output = runPreCalculation({
      project: {
        id: 'p', organization_id: 'o', user_id: 'u', name: 'X', city: '', state: '',
        municipality_size: 'large', typology: 'publica', phase: 'anteprojeto',
        protocol_year: 2027, area_m2: 100, is_federal_public: 1, notes: '', created_at: '', updated_at: ''
      },
      legalFraming: {
        applicable: true, minLevel: 'A', compliancePath: 'FORMAL', classificationMethod: 'INI', modeBadge: 'INI', effectiveDate: '2026-01-01',
        decisionTrail: [], warnings: [], disclaimers: [], normativePackage: null
      },
      technicalValidation: {
        errors: [],
        warnings: [],
        coverage: { filled: 4, total: 10, percent: 40 }
      },
      checklistCoverage: { percent: 40 }
    });

    expect(output.status).toBe('WARN');
    expect(output.warnings.some((w) => w.includes('Meta regulatória mínima A'))).toBe(true);
  });
});
