import { describe, expect, it } from 'vitest';
import { runGoldenCases } from '../modules/goldenCases';

describe('goldenCases runner', () => {
  it('validates a thermal NBR case', () => {
    const report = runGoldenCases([
      {
        id: '1',
        case_key: 'nbr-z3-ok',
        label: 'NBR Z3 conforme',
        normative_package_id: null,
        input_json: JSON.stringify({
          kind: 'thermal_nbr',
          payload: {
            zone: { id: 3, wall_u_max: 3.7, roof_u_max: 2.3, min_wall_ct: 130, min_time_lag: 3.3 },
            avgWallU: 3.2,
            avgRoofU: 2.0,
            avgWallCT: 140,
            avgTimeLag: 4.0
          }
        }),
        expected_output_json: JSON.stringify({ compliant: true }),
        tolerance_json: null,
        notes: null,
        updated_at: new Date().toISOString()
      } as any
    ]);

    expect(report.summary.total).toBe(1);
    expect(report.summary.failed).toBe(0);
    expect(report.results[0]?.ok).toBe(true);
  });
});
