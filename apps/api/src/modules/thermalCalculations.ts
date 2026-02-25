/**
 * Thermal Calculations Module
 * Implements RTQ-R, RTQ-C, and NBR 15220/15575 calculations
 * 
 * @module thermalCalculations
 * @version 0.3.0
 */

// ============================================
// CONSTANTS FROM NBR 15220-2
// ============================================

const RSE_HORIZONTAL = 0.04;  // m²·K/W
const RSI_HORIZONTAL = 0.13;
const RSE_VERTICAL = 0.13;
const RSI_VERTICAL = 0.13;
const RSE_UPWARD = 0.10;
const RSI_UPWARD = 0.17;
const RSE_DOWNWARD = 0.04;
const RSI_DOWNWARD = 0.10;

// ============================================
// TYPES
// ============================================

export interface ThermalMaterial {
  id: string;
  name: string;
  thermal_conductivity: number;  // λ (W/m·K)
  density: number;                // ρ (kg/m³)
  specific_heat: number;          // c (kJ/kg·K)
  absorptance?: number;           // α (0-1)
  u_value?: number;               // For glazing (W/m²·K)
  shgc?: number;                  // Solar heat gain coefficient
}

export interface Layer {
  material: ThermalMaterial;
  thickness: number;  // meters
  order: number;
}

export interface UValueCalculation {
  u: number;           // W/m²·K
  rt: number;          // m²·K/W (total resistance)
  ct: number;          // kJ/m²·K (thermal capacity)
  phi: number;         // hours (time lag)
  layers: {
    name: string;
    thickness: number;
    resistance: number;
    thermal_capacity: number;
  }[];
}

export interface BioclimaticZone {
  id: number;
  name: string;
  rtqc_paft_max: number;
  rtqc_upar_max: number;
  rtqc_ucob_max: number;
  rtqc_fs_max_paf60: number;
  rtqc_fs_max_paf_greater: number;
  nbr_upar_max: number;
  nbr_ucob_max: number;
  nbr_ct_min: number;
  nbr_phi_min: number;
  rtqr_equation_type: 'COLD' | 'HOT';
}

// ============================================
// U-VALUE CALCULATION (NBR 15220-2)
// ============================================

export function calculateUValue(
  layers: Layer[],
  flowDirection: 'horizontal' | 'vertical' | 'upward' | 'downward' = 'horizontal'
): UValueCalculation {
  
  // Determine surface resistances based on heat flow direction
  let rse: number, rsi: number;
  switch (flowDirection) {
    case 'horizontal':
      rse = RSE_HORIZONTAL;
      rsi = RSI_HORIZONTAL;
      break;
    case 'vertical':
      rse = RSE_VERTICAL;
      rsi = RSI_VERTICAL;
      break;
    case 'upward':
      rse = RSE_UPWARD;
      rsi = RSI_UPWARD;
      break;
    case 'downward':
      rse = RSE_DOWNWARD;
      rsi = RSI_DOWNWARD;
      break;
  }
  
  // Sort layers by order
  const orderedLayers = [...layers].sort((a, b) => a.order - b.order);
  
  // Calculate resistance and thermal capacity
  let rt = rse + rsi;
  let ct = 0;
  const layerResults: UValueCalculation['layers'] = [];
  
  for (const layer of orderedLayers) {
    const mat = layer.material;
    
    // Thermal resistance: R = e / λ
    const r = layer.thickness / mat.thermal_conductivity;
    rt += r;
    
    // Thermal capacity: CT = e × ρ × c
    const layerCT = layer.thickness * mat.density * mat.specific_heat;
    ct += layerCT;
    
    layerResults.push({
      name: mat.name,
      thickness: layer.thickness,
      resistance: parseFloat(r.toFixed(4)),
      thermal_capacity: parseFloat(layerCT.toFixed(2))
    });
  }
  
  // Transmittance: U = 1 / RT
  const u = 1 / rt;
  
  // Time lag: φ = 1.382 × RT × CT - 3.6 (NBR 15220-2, eq. B.1)
  const phi = Math.max(0, 1.382 * rt * ct - 3.6);
  
  return {
    u: parseFloat(u.toFixed(3)),
    rt: parseFloat(rt.toFixed(3)),
    ct: parseFloat(ct.toFixed(1)),
    phi: parseFloat(phi.toFixed(1)),
    layers: layerResults
  };
}

// ============================================
// SOLAR FACTOR CALCULATION
// ============================================

export function calculateSolarFactor(
  u: number,
  absorptance: number
): number {
  // FS = U × α × Rse (NBR 15220-2)
  const fs = u * absorptance * RSE_HORIZONTAL;
  return parseFloat(fs.toFixed(3));
}

// ============================================
// RTQ-R: RESIDENTIAL CALCULATION
// ============================================

export interface RTQRInputs {
  zone: BioclimaticZone;
  totalFloorArea: number;
  permanentArea: number;
  transitoryArea: number;
  avgWallU: number;
  avgRoofU: number;
  avgWallAbsorptance: number;
  avgRoofAbsorptance: number;
  paft: number;  // Window to wall ratio
  avgShgc: number;
  avs: number;   // Ventilation area / floor area
}

export interface RTQRResult {
  eqNumEnv: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
  eqNumPermanent: number;
  eqNumTransitory: number;
  details: {
    formula: string;
    ic: number;
    ca: number;
  };
}

export function calculateRTQR(inputs: RTQRInputs): RTQRResult {
  const zone = inputs.zone.id;
  
  // Volume (assuming 2.5m ceiling height)
  const VA = inputs.totalFloorArea * 2.50;
  
  let IC: number;
  
  // Formula varies by bioclimatic zone (Portaria INMETRO 18/2012)
  if (inputs.zone.rtqr_equation_type === 'COLD') {
    // Zones 1-2 (cold climate)
    IC = 56.67 * Math.log10(VA) 
         - 36.30 * Math.log10(inputs.avgRoofU)
         - 56.14 * Math.log10(inputs.avgWallU)
         - 17.28 * Math.log10(inputs.avgShgc * inputs.paft)
         + 9.67 * inputs.avgWallAbsorptance
         - 4.36 * inputs.avgRoofAbsorptance
         + 217.76;
  } else {
    // Zones 3-8 (hot climate)
    IC = 38.29 * Math.log10(VA)
         + 11.27 * Math.log10(inputs.avs)
         + 25.81 * Math.log10(inputs.avgRoofU)
         + 24.19 * Math.log10(inputs.avgWallU)
         + 20.14 * Math.log10(inputs.avgShgc * inputs.paft)
         - 6.13 * inputs.avgWallAbsorptance
         + 4.51 * inputs.avgRoofAbsorptance
         - 112.23;
  }
  
  // Thermal capacity (CA) - simplified by zone
  const CA_VALUES: Record<number, number> = {
    1: 60, 2: 60, 3: 80, 4: 100, 5: 130, 6: 130, 7: 150, 8: 150
  };
  const CA = CA_VALUES[zone] || 100;
  
  // Coefficients α and β (vary by zone)
  const ALPHA = inputs.zone.rtqr_equation_type === 'COLD' ? 0.65 : 0.45;
  const BETA = inputs.zone.rtqr_equation_type === 'COLD' ? 0.35 : 0.55;
  
  // EqNum for each room type
  const eqNumPermanent = ALPHA * IC + BETA * CA;
  const eqNumTransitory = eqNumPermanent * 0.85;  // Simplified
  
  // Weights (area of each type / total area)
  const weightPermanent = inputs.permanentArea / inputs.totalFloorArea;
  const weightTransitory = inputs.transitoryArea / inputs.totalFloorArea;
  
  // Envelope EqNum
  const eqNumEnv = (eqNumPermanent * weightPermanent) + (eqNumTransitory * weightTransitory);
  
  // Rating classification (Portaria INMETRO 18/2012, Table 1)
  let rating: 'A' | 'B' | 'C' | 'D' | 'E';
  if (eqNumEnv >= 5.00) rating = 'A';
  else if (eqNumEnv >= 4.00) rating = 'B';
  else if (eqNumEnv >= 3.00) rating = 'C';
  else if (eqNumEnv >= 2.00) rating = 'D';
  else rating = 'E';
  
  return {
    eqNumEnv: parseFloat(eqNumEnv.toFixed(2)),
    rating,
    eqNumPermanent: parseFloat(eqNumPermanent.toFixed(2)),
    eqNumTransitory: parseFloat(eqNumTransitory.toFixed(2)),
    details: {
      formula: inputs.zone.rtqr_equation_type === 'COLD' ? 'Zona 1-2 (frias)' : 'Zona 3-8 (quentes)',
      ic: parseFloat(IC.toFixed(2)),
      ca: CA
    }
  };
}

// ============================================
// RTQ-C: COMMERCIAL CALCULATION
// ============================================

export interface RTQCInputs {
  zone: BioclimaticZone;
  buildingUse: string;
  totalArea: number;
  conditionedArea: number;
  
  // Envelope
  paft: number;
  avgWallU: number;
  avgRoofU: number;
  avgShgc: number;
  avs: number;
  
  // Lighting
  totalLightingPower: number;
  illuminatedArea: number;
  hasAutomaticControl: boolean;
  hasDaylightIntegration: boolean;
  
  // HVAC
  hvacSystems: {
    type: 'split' | 'vrf' | 'chiller' | 'self_contained';
    cop: number;
    conditionedArea: number;
    certified: boolean;
  }[];
}

export interface RTQCResult {
  envelopeScore: number;
  lightingScore: number;
  hvacScore: number;
  totalScore: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
  compliant: boolean;
  violations: string[];
  bonuses: { type: string; points: number }[];
}

export function calculateRTQC(inputs: RTQCInputs): RTQCResult {
  const violations: string[] = [];
  const bonuses: { type: string; points: number }[] = [];
  
  // ===== ENVELOPE VALIDATION =====
  
  // Check PAFt (Portaria INMETRO 372/2010, Table 3.1)
  if (inputs.paft > inputs.zone.rtqc_paft_max) {
    violations.push(`PAFt ${(inputs.paft*100).toFixed(1)}% excede limite de ${(inputs.zone.rtqc_paft_max*100).toFixed(0)}% (Zona ${inputs.zone.id})`);
  }
  
  // Check wall U-value
  if (inputs.avgWallU > inputs.zone.rtqc_upar_max) {
    violations.push(`U parede ${inputs.avgWallU.toFixed(2)} W/m²·K excede ${inputs.zone.rtqc_upar_max} W/m²·K (Zona ${inputs.zone.id})`);
  }
  
  // Check roof U-value
  if (inputs.avgRoofU > inputs.zone.rtqc_ucob_max) {
    violations.push(`U cobertura ${inputs.avgRoofU.toFixed(2)} W/m²·K excede ${inputs.zone.rtqc_ucob_max} W/m²·K (Zona ${inputs.zone.id})`);
  }
  
  // Check solar factor (SHGC)
  const fsLimit = inputs.paft <= 0.60 
    ? inputs.zone.rtqc_fs_max_paf60 
    : inputs.zone.rtqc_fs_max_paf_greater;
  if (inputs.avgShgc > fsLimit) {
    violations.push(`Fator solar ${inputs.avgShgc.toFixed(2)} excede ${fsLimit.toFixed(2)} (PAFt ${(inputs.paft*100).toFixed(0)}%)`);
  }
  
  // Check natural ventilation
  if (inputs.avs < 0.05) {
    violations.push(`Área de ventilação ${(inputs.avs*100).toFixed(1)}% inferior ao mínimo de 5%`);
  }
  
  // Envelope score (simplified - RTQ-C Table 3.6)
  let envelopeScore = 5;
  if (violations.length > 0) {
    envelopeScore = 1;
  } else if (inputs.paft < inputs.zone.rtqc_paft_max * 0.8 && 
             inputs.avgWallU < inputs.zone.rtqc_upar_max * 0.8) {
    envelopeScore = 5;  // High efficiency
  } else if (inputs.paft < inputs.zone.rtqc_paft_max && 
             inputs.avgWallU < inputs.zone.rtqc_upar_max) {
    envelopeScore = 3;  // At limit
  }
  
  // ===== LIGHTING (DPI) =====
  
  const dpi = inputs.totalLightingPower / inputs.illuminatedArea;
  
  // DPI limits by building use (RTQ-C Table 4.2)
  const DPI_LIMITS: Record<string, number> = {
    office: 10.0,
    retail: 12.0,
    school: 9.0,
    hotel: 8.0,
    hospital: 13.0,
  };
  
  const dpiLimit = DPI_LIMITS[inputs.buildingUse] || 10.0;
  const dpiRatio = dpi / dpiLimit;
  
  // Lighting score classification
  let lightingScore: number;
  if (dpiRatio <= 0.50) lightingScore = 5;
  else if (dpiRatio <= 0.70) lightingScore = 4;
  else if (dpiRatio <= 0.85) lightingScore = 3;
  else if (dpiRatio <= 1.00) lightingScore = 2;
  else {
    lightingScore = 1;
    violations.push(`DPI ${dpi.toFixed(2)} W/m² excede limite de ${dpiLimit.toFixed(1)} W/m²`);
  }
  
  // Lighting bonuses
  if (inputs.hasAutomaticControl) {
    bonuses.push({ type: 'Controle automático de iluminação', points: 0.2 });
  }
  if (inputs.hasDaylightIntegration) {
    bonuses.push({ type: 'Integração com luz natural', points: 0.3 });
  }
  
  // ===== HVAC (COP) =====
  
  let totalCoolingCapacity = 0;
  let weightedCOP = 0;
  
  for (const system of inputs.hvacSystems) {
    totalCoolingCapacity += system.conditionedArea;
    weightedCOP += system.cop * system.conditionedArea;
    
    if (!system.certified) {
      violations.push(`Sistema ${system.type} não certificado pelo INMETRO`);
    }
  }
  
  const avgCOP = totalCoolingCapacity > 0 ? weightedCOP / totalCoolingCapacity : 0;
  
  // HVAC score by COP (RTQ-C Table 5.2 - Split example)
  let hvacScore: number;
  if (avgCOP >= 3.23) hvacScore = 5;
  else if (avgCOP >= 3.02) hvacScore = 4;
  else if (avgCOP >= 2.81) hvacScore = 3;
  else if (avgCOP >= 2.60) hvacScore = 2;
  else {
    hvacScore = 1;
    violations.push(`COP médio ${avgCOP.toFixed(2)} W/W inferior ao mínimo`);
  }
  
  // ===== TOTAL SCORE =====
  
  // Weights (RTQ-C - vary by zone, simplified here)
  const PESO_ENV = 0.30;
  const PESO_ILUM = 0.30;
  const PESO_CA = 0.40;
  
  let totalScore = (envelopeScore * PESO_ENV) + 
                   (lightingScore * PESO_ILUM) + 
                   (hvacScore * PESO_CA);
  
  // Apply bonuses
  const totalBonus = bonuses.reduce((sum, b) => sum + b.points, 0);
  totalScore = Math.min(5.0, totalScore + totalBonus);
  
  // Final rating classification (RTQ-C Table 2.1)
  let rating: 'A' | 'B' | 'C' | 'D' | 'E';
  if (totalScore >= 4.5) rating = 'A';
  else if (totalScore >= 3.5) rating = 'B';
  else if (totalScore >= 2.5) rating = 'C';
  else if (totalScore >= 1.5) rating = 'D';
  else rating = 'E';
  
  return {
    envelopeScore: parseFloat(envelopeScore.toFixed(2)),
    lightingScore: parseFloat(lightingScore.toFixed(2)),
    hvacScore: parseFloat(hvacScore.toFixed(2)),
    totalScore: parseFloat(totalScore.toFixed(2)),
    rating,
    compliant: violations.length === 0,
    violations,
    bonuses
  };
}

// ============================================
// NBR 15575 VALIDATION
// ============================================

export interface NBR15575Result {
  compliant: boolean;
  violations: string[];
  checks: {
    wallU: { value: number; limit: number; ok: boolean };
    roofU: { value: number; limit: number; ok: boolean };
    wallCT: { value: number; limit: number; ok: boolean };
    timeLag: { value: number; limit: number; ok: boolean };
  };
}

export function validateNBR15575(
  zone: BioclimaticZone,
  avgWallU: number,
  avgRoofU: number,
  avgWallCT: number,
  avgTimeLag: number
): NBR15575Result {
  const violations: string[] = [];
  
  const wallUOk = avgWallU <= zone.nbr_upar_max;
  const roofUOk = avgRoofU <= zone.nbr_ucob_max;
  const wallCTOk = avgWallCT >= zone.nbr_ct_min;
  const timeLagOk = avgTimeLag >= zone.nbr_phi_min;
  
  if (!wallUOk) {
    violations.push(`Transmitância de parede ${avgWallU.toFixed(2)} excede ${zone.nbr_upar_max} W/m²·K (NBR 15575)`);
  }
  if (!roofUOk) {
    violations.push(`Transmitância de cobertura ${avgRoofU.toFixed(2)} excede ${zone.nbr_ucob_max} W/m²·K (NBR 15575)`);
  }
  if (!wallCTOk) {
    violations.push(`Capacidade térmica de parede ${avgWallCT.toFixed(0)} inferior a ${zone.nbr_ct_min} kJ/m²·K (NBR 15575)`);
  }
  if (!timeLagOk) {
    violations.push(`Atraso térmico ${avgTimeLag.toFixed(1)}h inferior a ${zone.nbr_phi_min}h (NBR 15575)`);
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    checks: {
      wallU: { value: avgWallU, limit: zone.nbr_upar_max, ok: wallUOk },
      roofU: { value: avgRoofU, limit: zone.nbr_ucob_max, ok: roofUOk },
      wallCT: { value: avgWallCT, limit: zone.nbr_ct_min, ok: wallCTOk },
      timeLag: { value: avgTimeLag, limit: zone.nbr_phi_min, ok: timeLagOk }
    }
  };
}

// ============================================
// HELPER: Calculate weighted averages
// ============================================

export function calculateWeightedAverage(
  values: { value: number; area: number }[]
): number {
  const totalArea = values.reduce((sum, v) => sum + v.area, 0);
  if (totalArea === 0) return 0;
  
  const weightedSum = values.reduce((sum, v) => sum + (v.value * v.area), 0);
  return weightedSum / totalArea;
}
