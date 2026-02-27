import { validateWallUValue, validateRoofUValue, validateWWR, type ValidationResult } from './validation';
import type { ClimateZone } from './climate';

export type UValueInputs = {
  orientation?: 'vertical' | 'roof' | 'floor';
  layers: { name?: string; thickness_m: number; conductivity_W_mK: number }[];
  include_surface_resistance?: boolean;
  climate_zone?: ClimateZone;
  absorptance?: number; // Para paredes externas (0-1)
};

export interface UValueResult {
  U_W_m2K: number;
  R_total_m2K_W: number;
  R_layers_detail: Array<{ name?: string; thickness_m: number; R_m2K_W: number }>;
  formula: string;
  note: string;
  references: Array<{ title: string; url: string }>;
  assumptions: {
    Rsi_m2K_W: number;
    Rse_m2K_W: number;
    orientation: string;
  };
  validation?: ValidationResult;
  educational_context?: string;
  recommendations?: string[];
}

export function calcUValue(inputs: UValueInputs): UValueResult {
  const include = inputs.include_surface_resistance ?? true;
  const orientation = inputs.orientation ?? 'vertical';
  const absorptance = inputs.absorptance ?? 0.5;
  
  const Rsi = include ? (orientation === 'roof' ? 0.10 : orientation === 'floor' ? 0.17 : 0.13) : 0;
  const Rse = include ? 0.04 : 0;

  const layersDetail = inputs.layers.map((l) => {
    if (!(l.thickness_m > 0) || !(l.conductivity_W_mK > 0)) {
      throw new Error('Cada camada precisa ter espessura (m) e condutividade (W/mK) > 0.');
    }
    const R = l.thickness_m / l.conductivity_W_mK;
    return {
      name: l.name,
      thickness_m: l.thickness_m,
      R_m2K_W: Number(R.toFixed(4))
    };
  });

  const R_layers = layersDetail.reduce((sum, layer) => sum + layer.R_m2K_W, 0);
  const R_total = Rsi + R_layers + Rse;
  const U = 1 / R_total;

  // Validação automática se zona climática foi fornecida
  let validation: ValidationResult | undefined;
  if (inputs.climate_zone) {
    if (orientation === 'vertical') {
      validation = validateWallUValue(U, inputs.climate_zone, absorptance);
    } else if (orientation === 'roof') {
      validation = validateRoofUValue(U, inputs.climate_zone);
    }
  }

  // Contexto educativo (sem números "típicos" não rastreáveis)
  const educational_context = orientation === 'vertical'
    ? 'A transmitância térmica (U) indica quanto calor passa através da parede. Quanto menor o U, melhor o isolamento. Para verificação normativa, consulte o RTQ-R/INI aplicável e registre no dossiê.'
    : orientation === 'roof'
    ? 'Em coberturas, U influencia fortemente o ganho/perda de calor. Para verificação normativa, consulte o RTQ-R (Tabela 3.1) e registre a absortância (α) quando aplicável.'
    : 'Pisos em contato com exterior ou ambientes não condicionados podem demandar verificação específica conforme o método/norma aplicável.';

  // Recomendações (dirigidas pelos alertas/validação)
  const recommendations: string[] = [];
  if (validation?.severity === 'error') {
    recommendations.push('⚠️ Não atende ao limite-base: revise camadas/isolamento e registre a decisão no dossiê.');
  } else if (validation?.severity === 'warning') {
    recommendations.push('⚠️ Próximo ao limite-base: considere otimizar para reduzir risco de retrabalho.');
  } else {
    recommendations.push('✅ Resultado calculado. Registre as premissas e as camadas como memória técnica.');
  }
  if (orientation === 'vertical' && absorptance > 0.6) {
    recommendations.push('🎨 Absortância alta (α>0,6): confirme os limites aplicáveis para a sua zona (RTQ-R Tabela 3.1).');
  }

  return {
    U_W_m2K: Number(U.toFixed(4)),
    R_total_m2K_W: Number(R_total.toFixed(4)),
    R_layers_detail: layersDetail,
    formula: 'R_total = Rsi + Σ(e/k) + Rse;  U = 1 / R_total',
    note: 'Cálculo de transmitância térmica por camadas. Resistências superficiais padrão (Rsi/Rse) devem ser verificadas conforme o método/norma aplicável.',
    references: [
      {
        title: 'PBE Edifica — RAC: Catálogo de propriedades térmicas (DEZ/2022)',
        url: 'https://www.pbeedifica.com.br/sites/default/files/Manual%20RAC_Cat%C3%A1logo%20de%20propriedades_DEZ-22.pdf',
      },
      {
        title: 'PBE Edifica — Manual do RAC (maio/2025)',
        url: 'https://pbeedifica.com.br/sites/default/files/manuais/Manual%20RAC_novo%20formato_maio25.pdf',
      },
      {
        title: 'PBE Edifica — Manuais INI (maio/2025)',
        url: 'https://pbeedifica.com.br/inicmanuais',
      },
    ],
    assumptions: {
      Rsi_m2K_W: Rsi,
      Rse_m2K_W: Rse,
      orientation,
    },
    validation,
    educational_context,
    recommendations,
  };
}

export function calcWWR(inputs: { window_area_m2: number; facade_area_m2: number; }) {
  if (!(inputs.window_area_m2 >= 0) || !(inputs.facade_area_m2 > 0)) {
    throw new Error('Áreas inválidas. facade_area_m2 deve ser > 0.');
  }
  const pct = (inputs.window_area_m2 / inputs.facade_area_m2) * 100;
  return {
    wwr_pct: Number(pct.toFixed(2)),
    formula: 'WWR (%) = (Área de janelas / Área da fachada) * 100',
    note: 'Indicador de projeto para apoiar decisões de aberturas. Metas/limites dependem do método aplicável.',
    references: [
      { title: 'PBE Edifica — Manuais INI (parâmetros de envoltória e documentação)', url: 'https://pbeedifica.com.br/inicmanuais' },
    ],
  };
}

export function calcWWRFacades(inputs: {
  facades: Array<{ name: string; azimuth_deg?: number; facade_area_m2: number; window_area_m2: number; has_shading?: boolean }>;
  climate_zone?: ClimateZone;
}) {
  const facades = Array.isArray(inputs.facades) ? inputs.facades : [];
  if (!facades.length) throw new Error('Informe ao menos 1 fachada.');
  
  const rows = facades.map((f) => {
    if (!(f.facade_area_m2 > 0) || !(f.window_area_m2 >= 0)) throw new Error('Cada fachada precisa ter área > 0 e janelas >= 0.');
    const pct = (f.window_area_m2 / f.facade_area_m2) * 100;
    
    // Determinar orientação aproximada baseada em azimute
    let orientation = 'N';
    if (typeof f.azimuth_deg === 'number') {
      const az = f.azimuth_deg % 360;
      if (az >= 337.5 || az < 22.5) orientation = 'N';
      else if (az >= 22.5 && az < 67.5) orientation = 'NE';
      else if (az >= 67.5 && az < 112.5) orientation = 'E';
      else if (az >= 112.5 && az < 157.5) orientation = 'SE';
      else if (az >= 157.5 && az < 202.5) orientation = 'S';
      else if (az >= 202.5 && az < 247.5) orientation = 'SW';
      else if (az >= 247.5 && az < 292.5) orientation = 'W';
      else if (az >= 292.5 && az < 337.5) orientation = 'NW';
    }
    
    // Validação se zona climática fornecida
    let validation: ValidationResult | undefined;
    if (inputs.climate_zone) {
      const hasShading = f.has_shading ?? false;
      validation = validateWWR(pct, orientation, inputs.climate_zone, hasShading);
    }
    
    return {
      name: String(f.name || 'Fachada'),
      azimuth_deg: (typeof f.azimuth_deg === 'number' ? f.azimuth_deg : null),
      orientation,
      facade_area_m2: f.facade_area_m2,
      window_area_m2: f.window_area_m2,
      wwr_pct: Number(pct.toFixed(2)),
      validation,
    };
  });
  
  const totalFacade = rows.reduce((a, r) => a + r.facade_area_m2, 0);
  const totalWindow = rows.reduce((a, r) => a + r.window_area_m2, 0);
  const overall = totalFacade > 0 ? (totalWindow / totalFacade) * 100 : 0;
  
  // Recomendações gerais (sem limites numéricos sem fonte)
  const recommendations: string[] = [];
  
  // Verificar fachadas críticas sem sombreamento
  const criticalWithoutShading = facades.filter(f => {
    if (!f.azimuth_deg) return false;
    const az = f.azimuth_deg % 360;
    const isCritical = (az >= 67.5 && az < 112.5) || (az >= 247.5 && az < 292.5); // E ou W
    return isCritical && !f.has_shading && f.window_area_m2 > 0;
  });
  
  if (criticalWithoutShading.length > 0) {
    const names = criticalWithoutShading.map(f => f.name).join(', ');
    recommendations.push(`🌞 Fachadas ${names} sem sombreamento: adicione brises ou marquises`);
  }
  
  return {
    per_facade: rows,
    total: {
      facade_area_m2: Number(totalFacade.toFixed(2)),
      window_area_m2: Number(totalWindow.toFixed(2)),
      wwr_pct: Number(overall.toFixed(2)),
    },
    formula: 'WWR (%) = (Área de janelas / Área da fachada) * 100 (por fachada e total)',
    note: 'Controle de aberturas por fachada para reduzir retrabalho. Metas/limites dependem do método aplicável (INI).',
    references: [
      { title: 'PBE Edifica — Manuais INI (envoltória/aberturas e documentação)', url: 'https://pbeedifica.com.br/inicmanuais' },
      { title: 'PBE Edifica — Manual de Preenchimento da ENCE (campos típicos)', url: 'https://www.pbeedifica.com.br/sites/default/files/Manual%20de%20Preenchimento%20da%20ENCE.pdf' },
    ],
    educational_context: 'WWR (Window-to-Wall Ratio) é o percentual de área envidraçada. Influencia iluminação natural, ganho térmico e ventilação. Fachadas Leste/Oeste requerem especial atenção ao sombreamento.',
    recommendations,
  };
}

export function calcAVS(inputs: {
  overhang_depth_m: number;
  vertical_gap_m: number;
}) {
  const d = Number(inputs.overhang_depth_m);
  const h = Number(inputs.vertical_gap_m);
  if (!(d >= 0) || !(h > 0)) throw new Error('Informe profundidade (>=0) e vão vertical (>0).');
  const radians = Math.atan(d / h);
  const degrees = (radians * 180) / Math.PI;
  return {
    avs_deg: Number(degrees.toFixed(2)),
    formula: 'AVS (°) = arctan(projeção horizontal / vão vertical) * 180/π',
    note: 'Ângulo vertical de sombreamento como apoio de projeto. A forma de uso/avaliação depende do método e do elemento (brise/marquise).',
    references: [
      { title: 'PBE Edifica — Manuais INI (sombreamento/aberturas e documentação)', url: 'https://pbeedifica.com.br/inicmanuais' },
    ],
    assumptions: {
      overhang_depth_m: d,
      vertical_gap_m: h,
    }
  };
}

export function calcLPD(inputs: { total_lighting_watts: number; area_m2: number; }) {
  if (!(inputs.total_lighting_watts >= 0) || !(inputs.area_m2 > 0)) {
    throw new Error('Valores inválidos. area_m2 deve ser > 0.');
  }
  const lpd = inputs.total_lighting_watts / inputs.area_m2;
  return {
    lpd_W_m2: Number(lpd.toFixed(3)),
    formula: 'LPD (W/m²) = Potência total (W) / Área (m²)',
    note: 'Indicador de densidade de potência de iluminação. Metas e limites dependem do método aplicável e da tipologia/uso.',
    references: [
      { title: 'PBE Edifica — Manuais INI-C (iluminação e documentação)', url: 'https://pbeedifica.com.br/inicmanuais' },
      { title: 'Manual Simplificado INI-C (PDF)', url: 'https://pbeedifica.com.br/sites/default/files/manuais/Manual%20INI-C_Simplificado_maio%202025.pdf' },
    ],
  };
}

export function calcLPDSpaces(inputs: {
  spaces: Array<{ name: string; area_m2: number; watts: number }>;
}) {
  const spaces = Array.isArray(inputs.spaces) ? inputs.spaces : [];
  if (!spaces.length) throw new Error('Informe ao menos 1 ambiente.');
  const rows = spaces.map((s) => {
    const a = Number(s.area_m2);
    const w = Number(s.watts);
    if (!(a > 0) || !(w >= 0)) throw new Error('Cada ambiente precisa ter área > 0 e potência >= 0.');
    return {
      name: String(s.name || 'Ambiente'),
      area_m2: a,
      watts: w,
      lpd_W_m2: Number((w / a).toFixed(3)),
    };
  });
  const totalArea = rows.reduce((a, r) => a + r.area_m2, 0);
  const totalWatts = rows.reduce((a, r) => a + r.watts, 0);
  const overall = totalArea > 0 ? totalWatts / totalArea : 0;
  return {
    per_space: rows,
    total: {
      area_m2: Number(totalArea.toFixed(2)),
      watts: Number(totalWatts.toFixed(2)),
      lpd_W_m2: Number(overall.toFixed(3)),
    },
    formula: 'LPD (W/m²) = ΣPotência / ΣÁrea (por ambiente e total)',
    note: 'Indicador de densidade de potência por ambiente para reduzir retrabalho na especificação. Metas/limites dependem do método aplicável (INI-C).',
    references: [
      { title: 'PBE Edifica — Manuais INI-C', url: 'https://pbeedifica.com.br/inicmanuais' },
      { title: 'Manual Simplificado INI-C (PDF)', url: 'https://pbeedifica.com.br/sites/default/files/manuais/Manual%20INI-C_Simplificado_maio%202025.pdf' },
    ],
  };
}
