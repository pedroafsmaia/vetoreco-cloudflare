import { runPreCalculation } from './calculation';
import { calculateRTQC, calculateRTQR, validateNBR15575 } from './thermalCalculations';
import type { GoldenCaseRow } from '../types';
import { parseJsonSafe } from '../utils';

type RunStatus = 'PASS' | 'FAIL' | 'SKIPPED';

type RunResult = {
  caseKey: string;
  label: string;
  kind: string;
  ok: boolean;
  status: RunStatus;
  skipReason?: string;
  mismatches: Array<{ path: string; expected: unknown; actual: unknown; detail?: string }>;
  actual: unknown;
};

type ExecutionResult =
  | { kind: string; actual: unknown; skipped?: false }
  | { kind: string; actual: unknown; skipped: true; skipReason: string };

function getTolerance(tol: any, path: string): number {
  if (!tol) return 1e-6;
  if (typeof tol === 'number') return tol;
  if (typeof tol[path] === 'number') return tol[path];
  if (typeof tol.default === 'number') return tol.default;
  if (typeof tol.defaultAbs === 'number') return tol.defaultAbs;
  return 1e-6;
}

function compareDeep(expected: any, actual: any, tol: any, path = '$'): RunResult['mismatches'] {
  const mismatches: RunResult['mismatches'] = [];
  if (typeof expected === 'number') {
    if (typeof actual !== 'number' || Number.isNaN(actual)) {
      mismatches.push({ path, expected, actual, detail: 'actual_not_number' });
      return mismatches;
    }
    const delta = Math.abs(expected - actual);
    if (delta > getTolerance(tol, path)) mismatches.push({ path, expected, actual, detail: `delta=${delta}` });
    return mismatches;
  }
  if (expected === null || typeof expected !== 'object') {
    if (expected !== actual) mismatches.push({ path, expected, actual });
    return mismatches;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [{ path, expected, actual, detail: 'actual_not_array' }];
    if (expected.length !== actual.length) mismatches.push({ path: `${path}.length`, expected: expected.length, actual: actual.length });
    const len = Math.min(expected.length, actual.length);
    for (let i = 0; i < len; i++) mismatches.push(...compareDeep(expected[i], actual[i], tol, `${path}[${i}]`));
    return mismatches;
  }
  if (actual === null || typeof actual !== 'object') return [{ path, expected, actual, detail: 'actual_not_object' }];
  for (const key of Object.keys(expected)) mismatches.push(...compareDeep(expected[key], (actual as any)[key], tol, `${path}.${key}`));
  return mismatches;
}

function normalizeReportReferenceCase(input: any) {
  return {
    report_case_id: input?.report_case_id || null,
    normative: String(input?.normative || 'UNKNOWN'),
    building_type: input?.building_type ?? null,
    bioclimatic_zone: input?.bioclimatic_zone ?? null,
    source_url: input?.source_url ?? null,
    technical_inputs: input?.technical_inputs ?? null,
    expected_results: input?.expected_results ?? null
  };
}

function executeGoldenCase(input: any): ExecutionResult {
  const looksLikeReportCase =
    input &&
    typeof input === 'object' &&
    typeof input.normative === 'string' &&
    ('technical_inputs' in input || 'expected_results' in input);

  if (looksLikeReportCase && !input.kind) {
    const normalized = normalizeReportReferenceCase(input);
    return {
      kind: `report_reference:${normalized.normative}`,
      actual: normalized,
      skipped: true,
      skipReason: `Caso de referência ${normalized.normative} importado; execução normativa automática ainda não foi implementada para este formato`
    };
  }

  const kind = String(input?.kind || input?.type || (input?.payload?.zone ? 'thermal' : 'precalc'));
  const payload = input?.payload ?? input;

  if (kind === 'report_reference') {
    const normalized = normalizeReportReferenceCase(payload);
    return {
      kind: `report_reference:${normalized.normative}`,
      actual: normalized,
      skipped: true,
      skipReason: `Caso de referência ${normalized.normative} armazenado para regressão futura; motor completo ainda pendente`
    };
  }

  if (kind === 'precalc') return { kind, actual: runPreCalculation(payload) };
  if (kind === 'thermal_rtqr') return { kind, actual: calculateRTQR(payload) };
  if (kind === 'thermal_rtqc') return { kind, actual: calculateRTQC(payload) };
  if (kind === 'thermal_nbr') {
    return {
      kind,
      actual: validateNBR15575(payload.zone, payload.avgWallU, payload.avgRoofU, payload.avgWallCT, payload.avgTimeLag)
    };
  }
  if (kind === 'passthrough') return { kind, actual: payload };
  if (payload?.project && payload?.legalFraming) return { kind: 'precalc', actual: runPreCalculation(payload) };

  throw new Error(`Golden case kind não suportado: ${kind}`);
}

export function runGoldenCases(cases: GoldenCaseRow[], opts: { caseKeys?: string[] } = {}) {
  const filtered = opts.caseKeys?.length ? cases.filter((c) => opts.caseKeys!.includes(c.case_key)) : cases;
  const results: RunResult[] = [];

  for (const row of filtered) {
    const input = parseJsonSafe<any>(row.input_json, {});
    const expected = parseJsonSafe<any>(row.expected_output_json, {});
    const tol = row.tolerance_json ? parseJsonSafe<any>(row.tolerance_json, {}) : {};

    try {
      const exec = executeGoldenCase(input);
      if (exec.skipped) {
        results.push({
          caseKey: row.case_key,
          label: row.label,
          kind: exec.kind,
          ok: true,
          status: 'SKIPPED',
          skipReason: exec.skipReason,
          mismatches: [],
          actual: exec.actual
        });
        continue;
      }

      const mismatches = compareDeep(expected, exec.actual, tol);
      const status: RunStatus = mismatches.length === 0 ? 'PASS' : 'FAIL';
      results.push({ caseKey: row.case_key, label: row.label, kind: exec.kind, ok: status !== 'FAIL', status, mismatches, actual: exec.actual });
    } catch (err: any) {
      results.push({
        caseKey: row.case_key,
        label: row.label,
        kind: String(input?.kind || 'unknown'),
        ok: false,
        status: 'FAIL',
        mismatches: [{ path: '$', expected: 'exec_ok', actual: err?.message || 'error', detail: 'execution_error' }],
        actual: null
      });
    }
  }

  const skipped = results.filter((r) => r.status === 'SKIPPED').length;
  const supportedTotal = results.length - skipped;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  return {
    summary: {
      total: results.length,
      supportedTotal,
      skipped,
      passed,
      failed,
      passRate: supportedTotal ? Number(((passed / supportedTotal) * 100).toFixed(2)) : 0
    },
    results
  };
}
