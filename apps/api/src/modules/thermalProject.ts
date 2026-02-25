import { calculateRTQC, calculateRTQR, calculateWeightedAverage, validateNBR15575 } from './thermalCalculations';
import { nowIso, randomId } from '../utils';

type Num = number | null | undefined;

type ThermalQuickPayload = {
  metadata?: {
    bioclimaticZone?: number;
    totalBuiltArea?: number;
    conditionedArea?: number;
    municipalityName?: string;
    municipalityState?: string;
  };
  wall?: {
    name?: string;
    totalArea?: number;
    uValue?: number;
    thermalCapacity?: number;
    timeLag?: number;
    solarFactor?: number;
    absorptance?: number;
    orientation?: string;
  };
  roof?: {
    name?: string;
    totalArea?: number;
    uValue?: number;
    thermalCapacity?: number;
    timeLag?: number;
    solarFactor?: number;
    absorptance?: number;
    hasAttic?: boolean;
    atticVentilated?: boolean;
  };
  windows?: Array<{
    roomName?: string;
    orientation?: string;
    width?: number;
    height?: number;
    quantity?: number;
    uValue?: number;
    shgc?: number;
    hasShading?: boolean;
    shadingType?: string;
    shadingDepth?: number;
  }>;
  lighting?: Array<{
    zoneName?: string;
    area?: number;
    totalPower?: number;
    hasDaylightControl?: boolean;
    hasOccupancySensor?: boolean;
    hasDimming?: boolean;
  }>;
  hvac?: Array<{
    systemName?: string;
    systemType?: string;
    conditionedArea?: number;
    cop?: number;
    inmetroCertified?: boolean;
    hasIndividualControl?: boolean;
  }>;
  projectType?: 'residencial' | 'comercial';
};

const n = (v: Num, fallback = 0): number => {
  if (v === null || v === undefined) return fallback;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : fallback;
};

async function dbFirst<T = any>(db: D1Database, sql: string, params: unknown[] = []): Promise<T | null> {
  return (await db.prepare(sql).bind(...params).first<T>()) as T | null;
}

async function dbAll<T = any>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await db.prepare(sql).bind(...params).all<T>();
  return (((result as any)?.results) || []) as T[];
}

async function dbRun(db: D1Database, sql: string, params: unknown[] = []): Promise<void> {
  await db.prepare(sql).bind(...params).run();
}

function buildLayersJson(kind: 'wall' | 'roof', payload: ThermalQuickPayload): string {
  const source = kind === 'wall' ? payload.wall : payload.roof;
  const layer = {
    name: source?.name || (kind === 'wall' ? 'Parede principal' : 'Cobertura principal'),
    uValue: n(source?.uValue),
    ct: n(source?.thermalCapacity),
    timeLag: n(source?.timeLag),
    solarFactor: n(source?.solarFactor),
    absorptance: n(source?.absorptance, 0.6)
  };
  return JSON.stringify([layer]);
}

async function resolveZone(db: D1Database, projectId: string, provided?: number, municipalityName?: string, municipalityState?: string) {
  let zoneId = provided;
  if (!zoneId && municipalityName) {
    const muni = await dbFirst<{ bioclimatic_zone: number }>(
      db,
      `SELECT bioclimatic_zone FROM municipalities WHERE lower(name)=lower(?) ${municipalityState ? 'AND upper(state)=upper(?)' : ''} LIMIT 1`,
      municipalityState ? [municipalityName, municipalityState] : [municipalityName]
    );
    zoneId = muni?.bioclimatic_zone;
  }
  if (!zoneId) {
    const p = await dbFirst<any>(db, `SELECT bioclimatic_zone FROM projects WHERE id=?`, [projectId]);
    zoneId = p?.bioclimatic_zone ? Number(p.bioclimatic_zone) : undefined;
  }
  if (!zoneId) return { zoneId: null, zone: null as any };
  const zone = await dbFirst<any>(db, `SELECT * FROM bioclimatic_zones WHERE id=?`, [zoneId]);
  return { zoneId, zone };
}

export async function listThermalZones(db: D1Database) {
  return dbAll(db, `SELECT * FROM bioclimatic_zones ORDER BY id ASC`);
}

export async function listThermalMaterials(db: D1Database, categoryId?: string) {
  return dbAll(
    db,
    `SELECT m.*, c.name as category_name FROM thermal_materials m JOIN material_categories c ON c.id=m.category_id ${categoryId ? 'WHERE m.category_id=?' : ''} ORDER BY m.name ASC`,
    categoryId ? [categoryId] : []
  );
}

export async function searchMunicipalities(db: D1Database, opts: { q?: string; state?: string; limit?: number }) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.q) { clauses.push(`name LIKE ?`); params.push(`%${opts.q}%`); }
  if (opts.state) { clauses.push(`upper(state)=upper(?)`); params.push(opts.state); }
  const limit = Math.max(1, Math.min(opts.limit || 20, 100));
  return dbAll(db, `SELECT * FROM municipalities ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY name ASC LIMIT ?`, [...params, limit]);
}

export async function getProjectThermalQuick(db: D1Database, projectId: string) {
  const project = await dbFirst<any>(db, `SELECT id, bioclimatic_zone, total_built_area, conditioned_area, city, state FROM projects WHERE id=?`, [projectId]);
  const wall = await dbFirst<any>(db, `SELECT * FROM project_wall_types WHERE project_id=? ORDER BY created_at ASC LIMIT 1`, [projectId]);
  const roof = await dbFirst<any>(db, `SELECT * FROM project_roof_types WHERE project_id=? ORDER BY created_at ASC LIMIT 1`, [projectId]);
  const windows = await dbAll<any>(db, `SELECT * FROM project_windows WHERE project_id=? ORDER BY created_at ASC`, [projectId]);
  const lighting = await dbAll<any>(db, `SELECT * FROM project_lighting_zones WHERE project_id=? ORDER BY created_at ASC`, [projectId]);
  const hvac = await dbAll<any>(db, `SELECT * FROM project_hvac_systems WHERE project_id=? ORDER BY created_at ASC`, [projectId]);
  const latestCalculation = await dbFirst<any>(db, `SELECT * FROM project_thermal_calculations WHERE project_id=? ORDER BY calculation_date DESC, created_at DESC LIMIT 1`, [projectId]);
  const latestChecks = latestCalculation
    ? await dbFirst<any>(db, `SELECT * FROM project_compliance_checks WHERE calculation_id=? ORDER BY created_at DESC LIMIT 1`, [latestCalculation.id])
    : null;

  return {
    metadata: {
      bioclimaticZone: project?.bioclimatic_zone == null ? null : Number(project.bioclimatic_zone),
      totalBuiltArea: project?.total_built_area == null ? null : Number(project.total_built_area),
      conditionedArea: project?.conditioned_area == null ? null : Number(project.conditioned_area),
      municipalityName: project?.city || null,
      municipalityState: project?.state || null
    },
    wall: wall ? {
      name: wall.name,
      orientation: wall.orientation,
      totalArea: n(wall.total_area),
      uValue: wall.u_value == null ? null : Number(wall.u_value),
      thermalCapacity: wall.thermal_capacity == null ? null : Number(wall.thermal_capacity),
      timeLag: wall.time_lag == null ? null : Number(wall.time_lag),
      solarFactor: wall.solar_factor == null ? null : Number(wall.solar_factor),
      absorptance: (() => {
        try { return Number(JSON.parse(wall.layers_json || '[]')?.[0]?.absorptance ?? 0.6); } catch { return 0.6; }
      })()
    } : null,
    roof: roof ? {
      name: roof.name,
      totalArea: n(roof.total_area),
      uValue: roof.u_value == null ? null : Number(roof.u_value),
      thermalCapacity: roof.thermal_capacity == null ? null : Number(roof.thermal_capacity),
      timeLag: roof.time_lag == null ? null : Number(roof.time_lag),
      solarFactor: roof.solar_factor == null ? null : Number(roof.solar_factor),
      absorptance: (() => {
        try { return Number(JSON.parse(roof.layers_json || '[]')?.[0]?.absorptance ?? 0.6); } catch { return 0.6; }
      })(),
      hasAttic: !!roof.has_attic,
      atticVentilated: !!roof.attic_ventilated
    } : null,
    windows: windows.map((w) => ({
      roomName: w.room_name,
      orientation: w.orientation,
      width: n(w.width),
      height: n(w.height),
      quantity: Number(w.quantity || 1),
      uValue: w.u_value == null ? null : Number(w.u_value),
      shgc: w.shgc == null ? null : Number(w.shgc),
      hasShading: !!w.has_shading,
      shadingType: w.shading_type,
      shadingDepth: w.shading_depth == null ? null : Number(w.shading_depth)
    })),
    lighting: lighting.map((l) => ({
      zoneName: l.zone_name,
      area: n(l.area),
      totalPower: n(l.total_power),
      hasDaylightControl: !!l.has_daylight_control,
      hasOccupancySensor: !!l.has_occupancy_sensor,
      hasDimming: !!l.has_dimming
    })),
    hvac: hvac.map((h) => ({
      systemName: h.system_name,
      systemType: h.system_type,
      conditionedArea: n(h.conditioned_area),
      cop: h.cop == null ? null : Number(h.cop),
      inmetroCertified: !!h.inmetro_certified,
      hasIndividualControl: !!h.has_individual_control
    })),
    latestCalculation,
    latestChecks: latestChecks ? { ...latestChecks, checks: JSON.parse(latestChecks.checks_json || '{}') } : null
  };
}

export async function saveProjectThermalQuick(db: D1Database, projectId: string, payload: ThermalQuickPayload) {
  const ts = nowIso();
  const meta = payload.metadata || {};

  if (meta.bioclimaticZone !== undefined || meta.totalBuiltArea !== undefined || meta.conditionedArea !== undefined || meta.municipalityName || meta.municipalityState) {
    const current = await dbFirst<any>(db, `SELECT city,state,bioclimatic_zone,total_built_area,conditioned_area FROM projects WHERE id=?`, [projectId]);
    await dbRun(db, `UPDATE projects SET city=?, state=?, bioclimatic_zone=?, total_built_area=?, conditioned_area=?, updated_at=? WHERE id=?`, [
      meta.municipalityName ?? current?.city ?? null,
      meta.municipalityState ?? current?.state ?? null,
      meta.bioclimaticZone ?? current?.bioclimatic_zone ?? null,
      meta.totalBuiltArea ?? current?.total_built_area ?? null,
      meta.conditionedArea ?? current?.conditioned_area ?? null,
      ts,
      projectId
    ]);
  }

  await dbRun(db, `DELETE FROM project_wall_types WHERE project_id=?`, [projectId]);
  await dbRun(db, `DELETE FROM project_roof_types WHERE project_id=?`, [projectId]);
  await dbRun(db, `DELETE FROM project_windows WHERE project_id=?`, [projectId]);
  await dbRun(db, `DELETE FROM project_lighting_zones WHERE project_id=?`, [projectId]);
  await dbRun(db, `DELETE FROM project_hvac_systems WHERE project_id=?`, [projectId]);

  if (payload.wall) {
    await dbRun(db, `INSERT INTO project_wall_types (id,project_id,name,orientation,layers_json,u_value,thermal_capacity,time_lag,solar_factor,total_area,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [
      randomId(), projectId, payload.wall.name || 'Parede principal', payload.wall.orientation || null, buildLayersJson('wall', payload),
      payload.wall.uValue ?? null, payload.wall.thermalCapacity ?? null, payload.wall.timeLag ?? null, payload.wall.solarFactor ?? null, payload.wall.totalArea ?? null, ts, ts
    ]);
  }

  if (payload.roof) {
    await dbRun(db, `INSERT INTO project_roof_types (id,project_id,name,layers_json,u_value,thermal_capacity,time_lag,solar_factor,total_area,has_attic,attic_ventilated,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      randomId(), projectId, payload.roof.name || 'Cobertura principal', buildLayersJson('roof', payload), payload.roof.uValue ?? null,
      payload.roof.thermalCapacity ?? null, payload.roof.timeLag ?? null, payload.roof.solarFactor ?? null, payload.roof.totalArea ?? null,
      payload.roof.hasAttic ? 1 : 0, payload.roof.atticVentilated ? 1 : 0, ts, ts
    ]);
  }

  for (const w of payload.windows || []) {
    await dbRun(db, `INSERT INTO project_windows (id,project_id,room_name,orientation,width,height,quantity,u_value,shgc,has_shading,shading_type,shading_depth,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      randomId(), projectId, w.roomName || 'Ambiente', w.orientation || null, n(w.width, 1), n(w.height, 1), Math.max(1, Math.round(n(w.quantity, 1))),
      w.uValue ?? null, w.shgc ?? null, w.hasShading ? 1 : 0, w.shadingType || null, w.shadingDepth ?? null, ts
    ]);
  }

  for (const l of payload.lighting || []) {
    const area = n(l.area, 1);
    const power = n(l.totalPower, 0);
    await dbRun(db, `INSERT INTO project_lighting_zones (id,project_id,zone_name,area,total_power,has_daylight_control,has_occupancy_sensor,has_dimming,power_density,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
      randomId(), projectId, l.zoneName || 'Zona', area, power, l.hasDaylightControl ? 1 : 0, l.hasOccupancySensor ? 1 : 0, l.hasDimming ? 1 : 0,
      area > 0 ? power / area : null, ts, ts
    ]);
  }

  for (const h of payload.hvac || []) {
    await dbRun(db, `INSERT INTO project_hvac_systems (id,project_id,system_name,system_type,conditioned_area,cop,inmetro_certified,has_individual_control,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`, [
      randomId(), projectId, h.systemName || 'Sistema HVAC', h.systemType || 'split', n(h.conditionedArea, 0), h.cop ?? null,
      h.inmetroCertified ? 1 : 0, h.hasIndividualControl ? 1 : 0, ts, ts
    ]);
  }

  return getProjectThermalQuick(db, projectId);
}

export async function getLatestProjectThermalCalculation(db: D1Database, projectId: string) {
  const calc = await dbFirst<any>(db, `SELECT * FROM project_thermal_calculations WHERE project_id=? ORDER BY calculation_date DESC, created_at DESC LIMIT 1`, [projectId]);
  if (!calc) return null;
  const checks = await dbFirst<any>(db, `SELECT * FROM project_compliance_checks WHERE calculation_id=? ORDER BY created_at DESC LIMIT 1`, [calc.id]);
  return {
    calculation: calc,
    checks: checks ? { ...checks, checks: JSON.parse(checks.checks_json || '{}') } : null
  };
}

export async function calculateProjectThermal(db: D1Database, projectId: string, opts: { mode?: 'auto' | 'rtqr' | 'rtqc'; metadata?: ThermalQuickPayload['metadata'] } = {}) {
  if (opts.metadata) {
    await saveProjectThermalQuick(db, projectId, { metadata: opts.metadata });
  }

  const current = await getProjectThermalQuick(db, projectId);
  const { zoneId, zone } = await resolveZone(db, projectId, current.metadata.bioclimaticZone || undefined, current.metadata.municipalityName || undefined, current.metadata.municipalityState || undefined);
  if (!zone || !zoneId) throw new Error('Zona bioclimática não definida ou não encontrada.');

  const wallArea = n(current.wall?.totalArea);
  const roofArea = n(current.roof?.totalArea);
  const windowAreas = (current.windows || []).map((w: any) => ({
    area: n(w.width) * n(w.height) * Math.max(1, Number(w.quantity || 1)),
    uValue: n(w.uValue, 5.7),
    shgc: n(w.shgc, 0.8),
    hasShading: !!w.hasShading,
    shadingDepth: n(w.shadingDepth),
    height: n(w.height, 1)
  }));
  const totalWindowArea = windowAreas.reduce((sum, w) => sum + w.area, 0);
  const totalFacadeArea = Math.max(1, wallArea + totalWindowArea);
  const paft = totalWindowArea / totalFacadeArea;

  const avgWindowU = calculateWeightedAverage(windowAreas.map((w) => ({ value: w.uValue, area: w.area })));
  const avgShgc = calculateWeightedAverage(windowAreas.map((w) => ({ value: w.shgc, area: w.area })));
  const avgWallAbs = n(current.wall?.absorptance, 0.6);
  const avgRoofAbs = n(current.roof?.absorptance, 0.6);
  const avgWallU = n(current.wall?.uValue, 3.7);
  const avgRoofU = n(current.roof?.uValue, 2.0);
  const avgWallCT = n(current.wall?.thermalCapacity, 130);
  const avgTimeLag = n(current.wall?.timeLag, 4);
  const totalArea = n(current.metadata.totalBuiltArea) || Math.max(wallArea + roofArea, 1);
  const conditionedArea = n(current.metadata.conditionedArea) || totalArea;
  const permanentArea = Math.max(0.1, Math.min(totalArea, conditionedArea > 0 ? conditionedArea : totalArea * 0.8));
  const transitoryArea = Math.max(0, totalArea - permanentArea);
  const avs = (() => {
    if (!windowAreas.length || totalWindowArea <= 0) return 0.05;
    const weighted = windowAreas.reduce((sum, w) => {
      const proxy = w.hasShading
        ? Math.max(0.03, Math.min(0.35, n(w.shadingDepth, 0.2) / Math.max(0.5, n(w.height, 1))))
        : 0.03;
      return sum + (proxy * w.area);
    }, 0);
    return Math.max(0.01, Math.min(0.35, weighted / totalWindowArea));
  })();

  const nbr = validateNBR15575(zone as any, avgWallU, avgRoofU, avgWallCT, avgTimeLag);

  const mode = opts.mode && opts.mode !== 'auto' ? opts.mode : ((current.hvac?.length || current.lighting?.length) ? 'rtqc' : 'rtqr');
  let rtqr: any = null;
  let rtqc: any = null;

  if (mode === 'rtqr') {
    rtqr = calculateRTQR({
      zone: zone as any,
      totalFloorArea: Math.max(totalArea, 1),
      permanentArea,
      transitoryArea,
      avgWallU,
      avgRoofU,
      avgWallAbsorptance: avgWallAbs,
      avgRoofAbsorptance: avgRoofAbs,
      paft,
      avgShgc,
      avs
    });
  } else {
    const totalLightingPower = (current.lighting || []).reduce((sum: number, l: any) => sum + n(l.totalPower), 0);
    const illuminatedArea = (current.lighting || []).reduce((sum: number, l: any) => sum + n(l.area), 0) || conditionedArea;
    rtqc = calculateRTQC({
      zone: zone as any,
      buildingUse: 'office',
      totalArea: Math.max(totalArea, 1),
      conditionedArea: Math.max(conditionedArea, 1),
      paft,
      avgWallU,
      avgRoofU,
      avgShgc,
      avs,
      totalLightingPower,
      illuminatedArea,
      hasAutomaticControl: (current.lighting || []).some((l: any) => !!l.hasOccupancySensor),
      hasDaylightIntegration: (current.lighting || []).some((l: any) => !!l.hasDaylightControl),
      hvacSystems: (current.hvac || []).map((h: any) => {
        const raw = String(h.systemType || 'split').toLowerCase();
        const type = raw === 'vrf' ? 'vrf' : raw === 'chiller' ? 'chiller' : raw === 'self_contained' ? 'self_contained' : 'split';
        return { type, cop: n(h.cop, 2.8), conditionedArea: Math.max(0, n(h.conditionedArea)), certified: !!h.inmetroCertified };
      })
    });
  }

  const calcId = randomId();
  const ts = nowIso();
  await dbRun(db, `INSERT INTO project_thermal_calculations (
    id,project_id,calculation_date,bioclimatic_zone,project_type,total_area,conditioned_area,
    avg_wall_u,avg_roof_u,avg_window_u,paft,avg_shgc,avg_wall_absorptance,avg_roof_absorptance,
    rtqr_eq_num_env,rtqr_rating,rtqc_envelope_score,rtqc_lighting_score,rtqc_hvac_score,rtqc_total_score,rtqc_rating,
    nbr_compliant,nbr_violations_json,calculation_method,valid,notes,created_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
    calcId, projectId, ts, zoneId, mode === 'rtqc' ? 'comercial' : 'residencial', totalArea, conditionedArea,
    avgWallU, avgRoofU, avgWindowU, paft, avgShgc, avgWallAbs, avgRoofAbs,
    rtqr?.eqNumEnv ?? null, rtqr?.rating ?? null,
    rtqc?.envelopeScore ?? null, rtqc?.lightingScore ?? null, rtqc?.hvacScore ?? null, rtqc?.totalScore ?? null, rtqc?.rating ?? null,
    nbr.compliant ? 1 : 0, JSON.stringify(nbr.violations), mode.toUpperCase(), (nbr.compliant && (rtqr?.compliant ?? rtqc?.compliant ?? true)) ? 1 : 0,
    null, ts
  ]);

  const violations = [...(nbr.violations || []), ...(rtqr?.violations || []), ...(rtqc?.violations || [])];
  const warnings = [...(rtqr?.warnings || []), ...(rtqc?.bonuses || []).map((b: any) => `Bônus: ${b.type} (+${b.points})`)];
  const checksPayload = {
    mode,
    zoneId,
    rtqr,
    rtqc,
    nbr,
    aggregates: {
      totalArea,
      conditionedArea,
      wallArea,
      roofArea,
      totalWindowArea,
      paft,
      avgWallU,
      avgRoofU,
      avgWindowU,
      avgShgc
    },
    violations,
    warnings
  };

  await dbRun(db, `INSERT INTO project_compliance_checks (id,project_id,calculation_id,check_date,checks_json,overall_compliant,critical_issues,warnings,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`, [
    randomId(), projectId, calcId, ts, JSON.stringify(checksPayload), (violations.length === 0) ? 1 : 0, violations.length, warnings.length, ts
  ]);

  return getLatestProjectThermalCalculation(db, projectId);
}
