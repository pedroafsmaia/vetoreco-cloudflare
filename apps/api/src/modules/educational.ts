/**
 * Conteúdo educativo e orientações contextuais
 * Ajuda o usuário a entender conceitos e tomar decisões informadas
 */

export interface EducationalContent {
  title: string;
  summary: string;
  details: string;
  examples?: string[];
  references?: Array<{ title: string; url: string }>;
  relatedTopics?: string[];
}

export const EDUCATIONAL_LIBRARY: Record<string, EducationalContent> = {
  // === CONCEITOS FUNDAMENTAIS ===
  'ence': {
    title: 'ENCE - Etiqueta Nacional de Conservação de Energia',
    summary: 'Certificação que avalia a eficiência energética de edificações brasileiras',
    details: `A ENCE é emitida através do PBE Edifica (Programa Brasileiro de Etiquetagem de Edificações), 
    gerido pelo Inmetro. Avalia o desempenho energético em uma escala de A (mais eficiente) a E (menos eficiente).
    
    Existem dois tipos:
    - ENCE de Projeto: baseada em projeto técnico, antes da construção
    - ENCE de Edificação Construída: baseada em inspeção in loco após a construção
    
    A certificação analisa três envoltórias principais: iluminação, condicionamento de ar (quando aplicável) 
    e envoltória da edificação (paredes, cobertura, janelas).`,
    examples: [
      'A ENCE organiza o processo de documentação e avaliação energética em níveis (A a E)',
      'Regras e exigências podem variar por município e por tipo de empreendimento — confirme com o órgão local'
    ],
    references: [
      { title: 'PBE Edifica - Inmetro', url: 'http://www.inmetro.gov.br/consumidor/pbe-edifica' },
      { title: 'RTQ-R - Regulamento Técnico Residencial', url: 'http://www.pbeedifica.com.br/etiquetagem/residencial' }
    ],
    relatedTopics: ['rtq-r', 'rtq-c', 'climate-zones']
  },

  'climate-zones': {
    title: 'Zonas Bioclimáticas Brasileiras',
    summary: 'Brasil é dividido em 8 zonas bioclimáticas (ZB1 a ZB8) com diferentes requisitos de projeto',
    details: `A NBR 15220-3 divide o Brasil em 8 zonas bioclimáticas baseadas em temperatura, umidade e 
    radiação solar. Cada zona tem recomendações específicas de:
    - Tamanho de aberturas (janelas)
    - Tipo de vedação (paredes pesadas vs leves)
    - Necessidade de sombreamento
    - Estratégias de ventilação
    
    ZB1 e ZB2 = Climas frios (Sul)
    ZB3 e ZB4 = Climas temperados (Sudeste, Centro-Oeste)
    ZB5 a ZB8 = Climas quentes (Norte, Nordeste, Litoral)`,
    examples: [
      'ZB1 (Caxias do Sul): Paredes pesadas, aberturas pequenas, aquecimento passivo',
      'ZB8 (Manaus): Paredes leves, aberturas grandes, ventilação cruzada máxima'
    ],
    references: [
      { title: 'NBR 15220-3', url: 'https://www.abntcatalogo.com.br/norma.aspx?ID=003960' }
    ],
    relatedTopics: ['u-value', 'wwr', 'shading']
  },

  'u-value': {
    title: 'Transmitância Térmica (Valor U)',
    summary: 'Mede a capacidade de um material conduzir calor. Quanto menor, melhor o isolamento',
    details: `U-value (W/m².K) indica quanto calor passa através de uma parede, cobertura ou janela.

    Fórmula: U = 1 / R_total
    Onde R_total = resistências superficiais + soma das resistências de cada camada (R = espessura / condutividade).

    No VetorEco, qualquer verificação numérica de U precisa apontar para a tabela oficial aplicável.
    Para edificações residenciais pelo RTQ-R, os pré-requisitos de transmitância térmica (U) estão na Tabela 3.1 do Manual RTQ-R (2014).

    Como melhorar (reduzir U):
    - adicionar isolamento térmico
    - usar materiais de menor condutividade
    - ajustar a composição de camadas e registrar a decisão como memória técnica`,
    examples: [
      'Parede de tijolo maciço (25cm): U ≈ 2.2 W/(m².K)',
      'Mesma parede + 2cm EPS: U ≈ 0.8 W/(m².K) - redução de 64%!'
    ],
    references: [
      { title: 'Manual RTQ-R (2014) — Tabela 3.1 (pré-requisitos de U/CT/absortância)', url: 'https://www.pbeedifica.com.br/sites/default/files/projetos/etiquetagem/residencial/downloads/Manual_RTQR_102014.pdf' },
      { title: 'NBR 15220-2 (ABNT) — Métodos de cálculo (acesso via catálogo ABNT)', url: 'https://www.abntcatalogo.com.br' }
    ],
    relatedTopics: ['thermal-resistance', 'insulation-materials', 'absorptance']
  },

  'wwr': {
    title: 'WWR - Window-to-Wall Ratio',
    summary: 'Percentual de área envidraçada em relação à área total da fachada',
    details: `WWR = (Área de janelas / Área da fachada) × 100

    Influencia diretamente:
    - iluminação natural
    - ganho térmico
    - ventilação natural

    O VetorEco não usa "faixas típicas" de WWR sem uma tabela pública verificável.
    Use o cálculo como indicador e confirme requisitos/limites no método aplicável (INI/RTQ) antes de travar decisões.

    Dica prática: fachadas Leste/Oeste tendem a exigir maior cuidado com sombreamento e especificação de vidro.`,
    examples: [
      'Fachada de 50m² com 15m² de janelas: WWR = 30%',
      'WWR alto em fachadas críticas sem sombreamento pode aumentar risco de desconforto — documente a estratégia (brise/vidro)'
    ],
    relatedTopics: ['paft', 'shading', 'shgc']
  },

  'paft': {
    title: 'PAFT - Percentual de Abertura na Fachada Total',
    summary: 'Usado no RTQ-R (método prescritivo) - considera todas as aberturas vs área de piso',
    details: `PAFT = (Σ Área total de janelas / Área de piso) × 100
    
    Diferença entre PAFT e WWR:
    - WWR: por fachada individual (janelas / área daquela fachada)
    - PAFT: todas as janelas / área de piso do ambiente
    
    PAFT tem limites máximos por zona bioclimática no método prescritivo do RTQ-R.
    Se ultrapassar, precisa compensar com vidros de baixo fator solar ou sombreamento adequado.`,
    examples: [
      'Ambiente de 30m² com 12m² de janelas (todas as fachadas): PAFT = 40%'
    ],
    references: [
      { title: 'RTQ-R - Método Prescritivo', url: 'http://www.pbeedifica.com.br' }
    ],
    relatedTopics: ['wwr', 'shgc']
  },

  'shading': {
    title: 'Sombreamento e Proteções Solares',
    summary: 'Dispositivos que bloqueiam radiação solar direta, reduzindo ganho térmico',
    details: `Tipos de proteções solares:
    - Horizontais (marquises, beirais): eficientes para fachadas N/S
    - Verticais (brises verticais): eficientes para fachadas L/O
    - Combinadas: proteção total
    - Móveis: ajustáveis conforme época do ano
    
    AVS (Ângulo Vertical de Sombreamento):
    Indica o ângulo de proteção proporcionado pelo dispositivo.
    AVS > 30° proporciona bom sombreamento no verão.
    
    Benefícios:
    - Reduz ganho térmico em 50-70%
    - Permite janelas maiores sem desconforto
    - Melhora iluminação natural (difusa)`,
    examples: [
      'Marquise de 1m em janela de 1,5m de altura: AVS ≈ 33°',
      'Fachadas Oeste sem sombreamento em ZB8: temperatura interna pode superar 40°C!'
    ],
    relatedTopics: ['wwr', 'solar-orientation']
  },

  'lpd': {
    title: 'LPD - Lighting Power Density',
    summary: 'Densidade de potência de iluminação - mede eficiência do sistema de iluminação',
    details: `LPD (W/m²) = Potência total instalada (W) / Área (m²)

    No RTQ-C, o limite de densidade de potência de iluminação é chamado DPIL.
    A Tabela 4.1 do Manual RTQ-C (2016) traz os limites de DPIL por função da edificação e por nível (A/B/C/D).

    No VetorEco, você calcula o LPD e compara com o DPIL da função e nível pretendido — registrando o resultado como evidência/memória técnica.

    Como reduzir LPD/DPIL:
    - revisar especificação e distribuição de luminárias
    - aproveitar iluminação natural com controles e setorização`,
    examples: [
      'Escritório 100m² com 40 luminárias LED 18W: LPD = 7.2 W/m² ✓',
      'Mesmo ambiente com fluorescentes 36W: LPD = 14.4 W/m² ✗'
    ],
    references: [
      { title: 'Manual RTQ-C (2016) — Tabela 4.1 (DPIL por função e nível)', url: 'https://www.pbeedifica.com.br/sites/default/files/projetos/etiquetagem/comercial/downloads/manual_rtqc2016.pdf' }
    ],
    relatedTopics: ['lighting-controls', 'daylighting']
  },

  'shgc': {
    title: 'SHGC - Fator Solar dos Vidros',
    summary: 'Percentual de radiação solar que atravessa o vidro (0 a 1)',
    details: `SHGC (Solar Heat Gain Coefficient) ou FS (Fator Solar) indica a fração de energia solar que atravessa o vidro.

    Em geral:
    - quanto menor o SHGC/FS, menor o ganho térmico
    - pode haver impacto em iluminação natural e conforto visual

    No VetorEco, use SHGC/FS como parâmetro de decisão, documente a especificação do vidro e confirme critérios/limites no método aplicável (INI/RTQ) antes de concluir.`,
    examples: [
      'Registre no dossiê: ficha técnica do vidro (SHGC/FS, Tvis, composição) e justificativa por fachada'
    ],
    relatedTopics: ['wwr', 'shading', 'glazing']
  },

  'thermal-mass': {
    title: 'Inércia Térmica (Massa Térmica)',
    summary: 'Capacidade de um material armazenar e liberar calor lentamente',
    details: `Materiais pesados (concreto, tijolo, pedra) têm alta inércia térmica:
    - Absorvem calor durante o dia
    - Liberam calor durante a noite
    - Estabilizam temperatura interna (reduz oscilações)
    
    Quando usar:
    - Climas com grande amplitude térmica (ZB1, ZB2, ZB4, ZB7)
    - Combinado com ventilação noturna em climas quentes e secos
    
    Quando evitar:
    - Climas úmidos sem amplitude térmica (ZB8)
    - Preferir paredes leves que não acumulem calor`,
    examples: [
      'Exemplo prático: compare sistemas construtivos pesados vs. leves e registre a justificativa conforme a zona e estratégia bioclimática'
    ],
    relatedTopics: ['climate-zones', 'ventilation']
  },
};

/**
 * Retorna dica contextual baseada em um gatilho
 */
export function getContextualTip(context: string, data?: any): string | null {
  const tips: Record<string, string | ((d: any) => string)> = {
    'high-u-value': 'U-value alto indica isolamento térmico insuficiente. Adicione camadas isolantes (EPS, lã mineral) para melhorar.',
    'low-wwr-hot-climate': 'WWR baixo em clima quente pode prejudicar ventilação e iluminação natural. Considere aumentar aberturas.',
    'high-wwr-no-shading': 'WWR alto sem sombreamento causa ganho térmico excessivo. Projete brises, marquises ou beirais.',
    'dark-color-hot-climate': 'Cores com alta absortância (α) tendem a aumentar o ganho térmico. Verifique o impacto e confirme os limites aplicáveis na tabela oficial.',
    'critical-orientation': (d) => `Fachada ${d.orientation} recebe intensa insolação. Reforce sombreamento e use vidros de controle solar.`,
    'missing-climate-zone': 'Defina a zona bioclimática para validar requisitos normativos e receber orientações adequadas.',
    'insufficient-ventilation': 'Ventilação natural possui percentuais mínimos por zona no RTQ-R. Use a verificação do VetorEco e confirme na tabela oficial.',
    'high-lpd': 'LPD/DPIL acima do limite: revise luminárias/controles e confirme o limite conforme a Tabela 4.1 do RTQ-C.',
  };

  const tip = tips[context];
  if (!tip) return null;
  return typeof tip === 'function' ? tip(data) : tip;
}

/**
 * Retorna referência normativa para um tópico
 */
export function getNormativeReference(topic: string): { norm: string; description: string } | null {
  const references: Record<string, { norm: string; description: string }> = {
    'u-value-walls': { norm: 'RTQ-R/RTQ-C', description: 'Limites de transmitância térmica para paredes' },
    'u-value-roof': { norm: 'RTQ-R/RTQ-C', description: 'Limite de transmitância para coberturas (máx 2.3 W/m².K)' },
    'wwr': { norm: 'NBR 15220-3', description: 'Recomendações de aberturas por zona bioclimática' },
    'paft': { norm: 'RTQ-R - Método Prescritivo', description: 'Percentual de abertura na fachada total' },
    'lpd': { norm: 'RTQ-C', description: 'Densidade de potência de iluminação por tipo de ambiente' },
    'climate-zones': { norm: 'NBR 15220-3', description: 'Zoneamento bioclimático brasileiro' },
    'ventilation': { norm: 'RTQ-R', description: 'Requisitos de ventilação natural para ambientes de longa permanência' },
    'shading': { norm: 'NBR 15220', description: 'Sombreamento de aberturas' },
  };

  return references[topic] || null;
}

/**
 * Sugere próximas ações baseadas no progresso do projeto
 */
export function suggestNextActions(progress: {
  stage: string;
  completedRatio: number;
  hasClimateZone: boolean;
  hasEnvelopeData: boolean;
  hasCalculations: boolean;
}): string[] {
  const suggestions: string[] = [];

  if (!progress.hasClimateZone) {
    suggestions.push('🎯 URGENTE: Defina a zona bioclimática do projeto na aba de clima');
    return suggestions; // Bloqueante
  }

  if (progress.stage === 'study') {
    if (progress.completedRatio < 0.5) {
      suggestions.push('📍 Complete a análise de localização e entorno');
      suggestions.push('📏 Defina área e volumetria preliminar');
    } else {
      suggestions.push('✅ Estudo bem encaminhado! Passe para a aba Anteprojeto');
    }
  }

  if (progress.stage === 'anteproject') {
    if (!progress.hasEnvelopeData) {
      suggestions.push('🧱 Defina materiais e espessuras das paredes externas');
      suggestions.push('🏠 Especifique o sistema de cobertura');
    }
    if (!progress.hasCalculations) {
      suggestions.push('🧮 Use a calculadora de U-value para paredes e cobertura');
      suggestions.push('🪟 Calcule WWR para cada fachada');
    }
  }

  if (progress.stage === 'executive') {
    suggestions.push('📋 Elabore o memorial descritivo técnico');
    suggestions.push('📎 Reúna fichas técnicas de todos os materiais');
    suggestions.push('💡 Especifique sistema de iluminação e calcule LPD');
  }

  if (progress.stage === 'construction') {
    suggestions.push('📸 Registre evidências fotográficas do envelope construído');
    suggestions.push('✔️ Verifique conformidade com o projeto executivo');
  }

  return suggestions;
}
