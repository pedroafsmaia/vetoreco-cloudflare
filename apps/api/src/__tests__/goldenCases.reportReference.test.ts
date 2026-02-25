import { describe, expect, it } from 'vitest';
import { runGoldenCases } from '../modules/goldenCases';

describe('goldenCases runner - report reference format', () => {
  it('accepts report-format cases and marks them as skipped', () => {
    const report = runGoldenCases([
      {
        id: '1',
        case_key: 'GC-INI-C-001',
        label: 'INI-C hotel',
        normative_package_id: null,
        input_json: JSON.stringify({
          kind: 'report_reference',
          report_case_id: 'GC-INI-C-001',
          normative: 'INI-C',
          building_type: 'Comercial (Hospedagem / hotel)',
          bioclimatic_zone: 'ZB3',
          source_url: 'https://example.test/manual.pdf',
          technical_inputs: { Ape_m2: 4640 },
          expected_results: { classe_geral: 'A' }
        }),
        expected_output_json: JSON.stringify({ expected_results: { classe_geral: 'A' } }),
        tolerance_json: null,
        notes: null,
        updated_by_user_id: 'u_admin_demo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any
    ]);

    expect(report.summary.total).toBe(1);
    expect(report.summary.skipped).toBe(1);
    expect(report.summary.supportedTotal).toBe(0);
    expect(report.results[0]?.status).toBe('SKIPPED');
    expect(report.results[0]?.ok).toBe(true);
    expect(report.results[0]?.skipReason).toContain('INI-C');
  });
});
