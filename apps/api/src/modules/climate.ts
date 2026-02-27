/**
 * Zonas Bioclimáticas Brasileiras (NBR 15220-3)
 * Dados climáticos e requisitos por zona
 */

export type ClimateZone = 'ZB1' | 'ZB2' | 'ZB3' | 'ZB4' | 'ZB5' | 'ZB6' | 'ZB7' | 'ZB8';

export interface ClimateZoneData {
  id: ClimateZone;
  name: string;
  description: string;
  states: string[];
  mainCities: string[];
  characteristics: {
    summer: string;
    winter: string;
    humidity: string;
  };
  designStrategies: string[];
  envelopeRecommendations: {
    walls: string;
    roof: string;
    windows: string;
    shading: string;
  };
}

export const CLIMATE_ZONES: Record<ClimateZone, ClimateZoneData> = {
  ZB1: {
    id: 'ZB1',
    name: 'Zona Bioclimática 1',
    description: 'Clima frio - Região Sul',
    states: ['RS', 'SC'],
    mainCities: ['Caxias do Sul', 'São Joaquim', 'Campos do Jordão'],
    characteristics: {
      summer: 'Ameno',
      winter: 'Frio',
      humidity: 'Moderada'
    },
    designStrategies: [
      'Aquecimento solar passivo no inverno',
      'Vedações internas pesadas (inércia térmica)',
      'Aberturas médias (conforme recomendações da NBR 15220-3)',
      'Sombreamento de aberturas no verão'
    ],
    envelopeRecommendations: {
      walls: 'Paredes pesadas (alta inércia térmica) ou leves com isolamento térmico',
      roof: 'Cobertura isolada termicamente, preferível leve',
      windows: 'Vidros duplos ou baixo-emissivos. Esquadrias com boa vedação',
      shading: 'Proteção solar horizontal nas fachadas Norte'
    }
  },
  ZB2: {
    id: 'ZB2',
    name: 'Zona Bioclimática 2',
    description: 'Clima temperado - Sul e Sudeste',
    states: ['RS', 'SC', 'PR', 'SP'],
    mainCities: ['Curitiba', 'São Paulo', 'Porto Alegre'],
    characteristics: {
      summer: 'Moderado a quente',
      winter: 'Frio, temperatura mínima entre 12-18°C',
      humidity: 'Moderada a alta'
    },
    designStrategies: [
      'Aquecimento solar passivo no inverno',
      'Vedações internas pesadas',
      'Ventilação cruzada seletiva no verão',
      'Aberturas médias (conforme recomendações da NBR 15220-3)'
    ],
    envelopeRecommendations: {
      walls: 'Paredes pesadas ou médias com inércia térmica',
      roof: 'Cobertura isolada, preferível com ventilação',
      windows: 'Janelas com boa vedação, permitir ventilação controlada',
      shading: 'Proteções solares ajustáveis'
    }
  },
  ZB3: {
    id: 'ZB3',
    name: 'Zona Bioclimática 3',
    description: 'Clima temperado quente - Sudeste',
    states: ['SP', 'MG', 'MS', 'PR', 'SC'],
    mainCities: ['São Paulo', 'Belo Horizonte', 'Campo Grande'],
    characteristics: {
      summer: 'Quente',
      winter: 'Ameno, temperatura mínima entre 12-18°C',
      humidity: 'Moderada'
    },
    designStrategies: [
      'Aquecimento solar passivo no inverno',
      'Vedações internas pesadas',
      'Ventilação cruzada permanente no verão',
      'Aberturas médias (conforme recomendações da NBR 15220-3)'
    ],
    envelopeRecommendations: {
      walls: 'Paredes pesadas refletoras ou médias isoladas',
      roof: 'Cobertura isolada e ventilada',
      windows: 'Esquadrias que permitam ventilação permanente',
      shading: 'Sombreamento obrigatório nas fachadas Leste e Oeste'
    }
  },
  ZB4: {
    id: 'ZB4',
    name: 'Zona Bioclimática 4',
    description: 'Clima quente e seco - Centro-Oeste',
    states: ['MS', 'MT', 'GO', 'SP', 'MG'],
    mainCities: ['Brasília', 'Goiânia', 'Cuiabá (época seca)'],
    characteristics: {
      summer: 'Muito quente e seco',
      winter: 'Quente durante o dia, ameno à noite',
      humidity: 'Baixa'
    },
    designStrategies: [
      'Resfriamento evaporativo',
      'Massa térmica para inércia',
      'Ventilação seletiva (noturna)',
      'Aberturas médias (conforme recomendações da NBR 15220-3)'
    ],
    envelopeRecommendations: {
      walls: 'Paredes pesadas com alta inércia térmica',
      roof: 'Cobertura pesada isolada',
      windows: 'Janelas pequenas a médias, bem sombreadas',
      shading: 'Sombreamento total obrigatório em todas as fachadas'
    }
  },
  ZB5: {
    id: 'ZB5',
    name: 'Zona Bioclimática 5',
    description: 'Clima quente e úmido - Litoral Sudeste',
    states: ['RJ', 'ES', 'SP'],
    mainCities: ['Rio de Janeiro', 'Vitória', 'Santos'],
    characteristics: {
      summer: 'Muito quente e úmido',
      winter: 'Quente',
      humidity: 'Alta'
    },
    designStrategies: [
      'Ventilação cruzada permanente',
      'Sombreamento total das aberturas',
      'Vedações leves e refletoras',
      'Aberturas grandes (conforme recomendações da NBR 15220-3)'
    ],
    envelopeRecommendations: {
      walls: 'Paredes leves refletoras',
      roof: 'Cobertura leve refletora e isolada',
      windows: 'Aberturas amplas para ventilação cruzada',
      shading: 'Sombreamento total obrigatório (brises, varandas)'
    }
  },
  ZB6: {
    id: 'ZB6',
    name: 'Zona Bioclimática 6',
    description: 'Clima quente e úmido - Centro-Norte',
    states: ['MT', 'GO', 'MS', 'PA', 'MA', 'BA'],
    mainCities: ['Cuiabá', 'Palmas', 'Imperatriz'],
    characteristics: {
      summer: 'Muito quente e úmido',
      winter: 'Quente',
      humidity: 'Alta'
    },
    designStrategies: [
      'Ventilação cruzada permanente',
      'Sombreamento total',
      'Vedações leves',
      'Aberturas grandes (conforme recomendações da NBR 15220-3)'
    ],
    envelopeRecommendations: {
      walls: 'Paredes leves e refletoras',
      roof: 'Cobertura leve refletora e ventilada',
      windows: 'Grandes aberturas com proteção solar',
      shading: 'Sombreamento total e ventilação de coberturas'
    }
  },
  ZB7: {
    id: 'ZB7',
    name: 'Zona Bioclimática 7',
    description: 'Clima quente e seco - Interior Nordeste',
    states: ['TO', 'PI', 'MA', 'BA', 'MG', 'CE', 'PE'],
    mainCities: ['Petrolina', 'Teresina', 'Feira de Santana'],
    characteristics: {
      summer: 'Muito quente e seco',
      winter: 'Quente',
      humidity: 'Baixa'
    },
    designStrategies: [
      'Ventilação cruzada permanente',
      'Resfriamento evaporativo',
      'Sombreamento total',
      'Aberturas médias (conforme recomendações da NBR 15220-3)'
    ],
    envelopeRecommendations: {
      walls: 'Paredes pesadas ou refletoras',
      roof: 'Cobertura leve refletora e isolada',
      windows: 'Aberturas médias bem sombreadas',
      shading: 'Proteção solar total com dispositivos fixos'
    }
  },
  ZB8: {
    id: 'ZB8',
    name: 'Zona Bioclimática 8',
    description: 'Clima equatorial quente e úmido - Norte',
    states: ['AM', 'PA', 'AP', 'RR', 'AC', 'RO', 'MA'],
    mainCities: ['Manaus', 'Belém', 'Macapá', 'Rio Branco'],
    characteristics: {
      summer: 'Extremamente quente e úmido',
      winter: 'Quente e úmido',
      humidity: 'Muito alta'
    },
    designStrategies: [
      'Ventilação cruzada permanente e abundante',
      'Sombreamento total das aberturas',
      'Vedações muito leves',
      'Aberturas muito grandes (conforme recomendações da NBR 15220-3)'
    ],
    envelopeRecommendations: {
      walls: 'Paredes muito leves e refletoras',
      roof: 'Cobertura muito leve, refletora e ventilada',
      windows: 'Aberturas máximas possíveis, sem vidro quando viável',
      shading: 'Sombreamento total com grandes beirais e varandas'
    }
  }
};

/**
 * Identifica zona bioclimática baseada em cidade/estado
 * Nota: Esta é uma aproximação. Em produção, usar geocoding + mapa oficial
 */
export function getClimateZoneByLocation(city: string, state: string): ClimateZone | null {
  const upperState = state.toUpperCase();
  const lowerCity = city.toLowerCase();

  // Casos especiais por cidade
  const cityZones: Record<string, ClimateZone> = {
    'caxias do sul': 'ZB1',
    'são joaquim': 'ZB1',
    'campos do jordão': 'ZB1',
    'curitiba': 'ZB2',
    'são paulo': 'ZB3',
    'belo horizonte': 'ZB3',
    'brasília': 'ZB4',
    'rio de janeiro': 'ZB5',
    'vitória': 'ZB5',
    'cuiabá': 'ZB6',
    'palmas': 'ZB6',
    'teresina': 'ZB7',
    'petrolina': 'ZB7',
    'manaus': 'ZB8',
    'belém': 'ZB8',
  };

  if (cityZones[lowerCity]) {
    return cityZones[lowerCity];
  }

  // Aproximação por estado (zona mais comum)
  const stateZones: Partial<Record<string, ClimateZone>> = {
    'RS': 'ZB2',
    'SC': 'ZB2',
    'PR': 'ZB2',
    'SP': 'ZB3',
    'MG': 'ZB3',
    'RJ': 'ZB5',
    'ES': 'ZB5',
    'MS': 'ZB6',
    'MT': 'ZB6',
    'GO': 'ZB4',
    'DF': 'ZB4',
    'BA': 'ZB7',
    'PI': 'ZB7',
    'MA': 'ZB7',
    'CE': 'ZB7',
    'RN': 'ZB7',
    'PB': 'ZB7',
    'PE': 'ZB7',
    'AL': 'ZB7',
    'SE': 'ZB7',
    'TO': 'ZB7',
    'AM': 'ZB8',
    'PA': 'ZB8',
    'AP': 'ZB8',
    'RR': 'ZB8',
    'AC': 'ZB8',
    'RO': 'ZB8',
  };

  return stateZones[upperState] || null;
}

export type ClimateEstimateMethod = 'by_city' | 'by_state' | 'unknown';
export type ClimateEstimateConfidence = 'high' | 'medium' | 'low';

export function estimateClimateZone(city: string, state: string): {
  zone: ClimateZone | null;
  method: ClimateEstimateMethod;
  confidence: ClimateEstimateConfidence;
} {
  const cityTrim = String(city || '').trim();
  const stateTrim = String(state || '').trim();
  if (!cityTrim || !stateTrim) {
    return { zone: null, method: 'unknown', confidence: 'low' };
  }

  // Tentativa 1: match por cidade (alta confiança)
  const zoneByCity = getClimateZoneByLocation(cityTrim, stateTrim);
  // getClimateZoneByLocation já tenta cidade e depois fallback por estado.
  // Para distinguir, replicamos a heurística: cidade presente na lista principal => alta confiança.
  const upperCity = cityTrim.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
  const upperState = stateTrim.toUpperCase();

  // Detecta se a cidade é uma "mainCity" de alguma zona do estado
  const zones = Object.values(CLIMATE_ZONES);
  const matchedByCity = zones.some(z => z.states.includes(upperState) && z.mainCities.some(c => {
    const cNorm = c.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
    return cNorm === upperCity;
  }));

  if (zoneByCity && matchedByCity) {
    return { zone: zoneByCity, method: 'by_city', confidence: 'high' };
  }

  if (zoneByCity) {
    // Fallback típico: por estado (confiança média)
    return { zone: zoneByCity, method: 'by_state', confidence: 'medium' };
  }

  return { zone: null, method: 'unknown', confidence: 'low' };
}


// OBS: O VetorEco não mantém tabelas numéricas de "recomendações" climáticas aqui.
// Qualquer número normativo deve estar em um validador com fonte pública verificável.
