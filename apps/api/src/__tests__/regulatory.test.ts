import { createInMemoryRepo } from '../testing/inMemoryRepo';
import { resolveLegalFraming } from '../modules/regulatory';

describe('resolveLegalFraming', () => {
  it('applies public federal A rule', async () => {
    const repo = createInMemoryRepo();
    const [pkg] = await repo.listNormativePackages();
    const rules = await repo.listNormativeRules(pkg.id);
    const project = await repo.createProject({
      organization_id: 'o1',
      user_id: 'u1',
      name: 'Escola',
      city: 'Brasília',
      state: 'DF',
      municipality_size: 'large',
      typology: 'publica',
      phase: 'anteprojeto',
      protocol_year: 2027,
      area_m2: 1000,
      is_federal_public: 1,
      notes: ''
    });
    const framing = resolveLegalFraming({
      project,
      context: {
        id: 'ctx',
        project_id: project.id,
        classification_method: 'INI',
        protocol_date: '2027-02-02',
        permit_protocol_date: null,
        public_tender_date: null,
        municipality_population_band: 'large',
        public_entity_level: 'federal',
        is_public_building: 1,
        requests_autodeclaration: 0,
        legacy_reason: null,
        legacy_ence_project_evidence: null,
        notes: null,
        updated_by_user_id: 'u1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      normativePackage: pkg,
      rules
    });

    expect(framing.minLevel).toBe('A');
    expect(framing.decisionTrail.join(' ')).toContain('federal');
  });
});
