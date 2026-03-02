import type { Stage, Typology } from '../../../types';
import type { NormRef, TaskTemplate } from '../../../domain/templates';

export const PACK_ID = 'ini_2025_05' as const;
export const PACK_TITLE = 'PBE Edifica (INI + RAC) — Manuais maio/2025' as const;
export const PACK_UPDATED_AT = '2025-05-01' as const;

/**
 * Referências oficiais (links) — não reproduzimos o conteúdo integral.
 * O objetivo é ancorar o guia nos manuais e no processo oficial.
 */
export function commonSources(): NormRef[] {
  return [
    { title: 'PBE Edifica — Como obter a Etiqueta (ENCE)', url: 'https://pbeedifica.com.br/como-obter' },
    { title: 'PBE Edifica — Manuais INI-C (maio/2025)', url: 'https://pbeedifica.com.br/inicmanuais' },
    { title: 'PBE Edifica — Manuais INI-R (maio/2025)', url: 'https://pbeedifica.com.br/inirmanuais' },
    { title: 'PBE Edifica — Manual do RAC (maio/2025)', url: 'https://pbeedifica.com.br/sites/default/files/manuais/Manual%20RAC_novo%20formato_maio25.pdf' },
    { title: 'INI-C — Manual de Definições (maio/2025)', url: 'https://pbeedifica.com.br/sites/default/files/manuais/Manual%20INI-C_Defini%C3%A7%C3%B5es_maio25.pdf' },
    { title: 'INI-R — Manual de Definições (maio/2025)', url: 'https://pbeedifica.com.br/sites/default/files/manuais/Manual%20INI-R_Defini%C3%A7%C3%B5es_maio25.pdf' },
    { title: 'MME — Resolução CGIEE nº 4/2025 (índices mínimos e cronograma)', url: 'https://www.gov.br/mme/pt-br/assuntos/ee/indices-minimos-de-ee/eficiencia-energetica-das-edificacoes/resolucao-no4-2025' },
  ];
}

function ref(label: string, url: string, section?: string): NormRef {
  return { title: label, url, section };
}

const RAC_PDF = 'https://pbeedifica.com.br/sites/default/files/manuais/Manual%20RAC_novo%20formato_maio25.pdf';
const INIC_MANUAIS = 'https://pbeedifica.com.br/inicmanuais';
const INIR_MANUAIS = 'https://pbeedifica.com.br/inirmanuais';
const ENCE_HOWTO = 'https://pbeedifica.com.br/como-obter';
const CGIEE_4_2025 = 'https://www.gov.br/mme/pt-br/assuntos/ee/indices-minimos-de-ee/eficiencia-energetica-das-edificacoes/resolucao-no4-2025';

/**
 * Checklist base (comum) — foca em reduzir retrabalho no processo oficial.
 * Cada item indica dados mínimos, evidências e referências.
 */
export const COMMON: TaskTemplate[] = [
  {
    stage: 'study',
    order: 1,
    key: 'process_overview',
    title: 'Entender o processo ENCE (Projeto e Construído) e o que será verificado',
    description: 'Veja o fluxo oficial e o que costuma ser exigido na inspeção de projeto e do construído. Isso orienta decisões e evita retrabalho.',
    critical: false,
    meta: {
      why: 'Sem entender o fluxo (projeto x construído) é comum faltar evidência, faltar informação em desenho e precisar refazer documentação perto do habite-se.',
      how: 'Use este guia para estruturar o projeto por etapas e anexar evidências desde cedo. No final, exporte o dossiê de submissão/revisão.',
      references: [
        ref('PBE Edifica — Como obter a ENCE (fluxo oficial)', ENCE_HOWTO),
        ref('Manual do RAC (maio/2025) — inspeção de projeto e inspeção do construído', RAC_PDF, 'Processo de avaliação da conformidade / inspeções'),
      ],
    },
  },
  {
    stage: 'study',
    order: 5,
    key: 'context_obrigatoriedade',
    title: 'Contexto de obrigatoriedade: por que a ENCE impacta o habite-se',
    description: 'Registre o contexto regulatório (cronograma e níveis mínimos) para orientar escopo e prazos do cliente.',
    critical: false,
    meta: {
      why: 'Quando a exigência passa a valer, atrasos por documentação e adequações de última hora ficam mais caros. Entender o cronograma orienta o planejamento do projeto.',
      how: 'Consulte a resolução e anote no projeto a data prevista de protocolo e a estratégia para manter o desempenho até o construído.',
      evidenceHints: ['Ata/nota de alinhamento com cliente sobre meta e prazos', 'Registro da data prevista de protocolo'],
      references: [
        ref('MME — Resolução CGIEE nº 4/2025', CGIEE_4_2025, 'Tabela 1: cronograma e níveis mínimos'),
      ],
    },
  },
  {
    stage: 'study',
    order: 10,
    key: 'define_typology',
    title: 'Definir tipologia, uso e escopo do projeto',
    description: 'Defina a tipologia (residencial/comercial/pública), o uso predominante e o escopo (novo, ampliação, reforma) para aplicar o checklist correto.',
    critical: true,
    meta: {
      why: 'Sem tipologia/uso definidos, o pacote de dados/evidências fica incompleto e o processo oficial exige retrabalho.',
      how: 'Defina uso predominante, principais ambientes e se haverá sistemas relevantes (água quente, HVAC, etc.).',
      minData: ['Uso predominante (ex.: multifamiliar, hotel, escritórios)', 'Programa básico de ambientes', 'Escopo (novo/reforma/ampliação)'],
      evidenceHints: ['Programa de necessidades', 'Quadro de áreas (rascunho)', 'Memorial inicial de uso/ocupação'],
      evidenceRequired: true,
      references: [ref('Manuais INI (aplicação por tipologia)', INIR_MANUAIS), ref('Manuais INI-C', INIC_MANUAIS)],
    },
  },
  {
    stage: 'study',
    order: 15,
    key: 'project_profile_minimum',
    title: 'Preencher dados mínimos do projeto (ZB, fachadas e orientação)',
    description: 'Informe zona bioclimática e geometria básica das fachadas para orientar decisões de envoltória e aberturas.',
    critical: true,
    meta: {
      why: 'Decidir fachada e aberturas sem ZB e sem separar fachadas por orientação costuma gerar ajuste tardio e retrabalho de documentação.',
      how: 'No VetorEco, preencha: zona bioclimática (ZB) e fachadas principais (azimute, área de fachada, área de janelas).',
      minData: ['Zona bioclimática (ZB) do município', 'Orientação/azimute das fachadas', 'Área de fachada e janelas por fachada'],
      commonMistakes: ['Não separar por fachada (N/S/L/O)', 'Não registrar áreas em m²', 'Deixar orientação para o final'],
      evidenceHints: ['Implantação com norte', 'Elevações/estudo de fachadas', 'Quadro de áreas (rascunho)'],
      evidenceRequired: true,
      projectFieldsRequired: ['profile.bioclimatic_zone', 'profile.facades_minimum'],
      autoSatisfyOnProjectData: true,
      references: [ref('INI-R — Definições (ZB, termos e conceitos)', 'https://pbeedifica.com.br/sites/default/files/manuais/Manual%20INI-R_Defini%C3%A7%C3%B5es_maio25.pdf')],
    },
  },
  {
    stage: 'study',
    order: 18,
    key: 'site_climate',
    title: 'Registrar cidade/UF, clima e entorno (orientação solar e sombras)',
    description: 'Registre informações do local (entorno, sombras, ventos) para orientar decisões e justificar escolhas no dossiê.',
    critical: true,
    meta: {
      why: 'O retrabalho costuma acontecer quando o entorno (sombras, ruído, vistas) obriga mudanças tardias em fachada/aberturas sem registro.',
      how: 'Anexe fotos do entorno, implantação com norte e registre restrições relevantes. Use o Perfil Técnico para consolidar fachadas e orientação.',
      minData: ['Cidade/UF', 'Implantação com norte', 'Observações de entorno (sombras, obstruções, ruído, vistas)'],
      commonMistakes: ['Não registrar o entorno', 'Não guardar evidência de sombreamento externo', 'Não identificar fachadas por orientação'],
      evidenceHints: ['Fotos do entorno', 'Implantação com norte', 'Notas de orientação solar'],
      evidenceRequired: true,
      projectFieldsRequired: ['profile.bioclimatic_zone', 'profile.facades_minimum'],
      autoSatisfyOnProjectData: true,
      references: [ref('Manual do RAC — documentação e rastreabilidade', RAC_PDF)],
    },
  },

  {
    stage: 'study',
    order: 20,
    key: 'set_ence_goal',
    title: 'Definir meta de desempenho e estratégia (Projeto → Construído)',
    description: 'Defina a meta (mínimo/otimizar) e combine como manter as decisões até a obra.',
    critical: true,
    meta: {
      why: 'Sem meta registrada, é comum mudar soluções no executivo sem atualizar evidências, gerando retrabalho e inconsistências no construído.',
      how: 'Registre a meta e decisões-chave (envoltória, aberturas, iluminação e sistemas) e como isso será controlado na obra.',
      evidenceHints: ['Registro da meta e decisões-chave', 'Resumo para cliente/obra'],
      evidenceRequired: true,
      projectFieldsRequired: ['ence_target'],
      autoSatisfyOnProjectData: true,
      references: [ref('Manual do RAC — rastreabilidade e inspeções', RAC_PDF)],
    },
  },
  {
    stage: 'anteproject',
    order: 10,
    key: 'envelope_concept',
    title: 'Conceito de envoltória (paredes/cobertura) e memória de decisão',
    description: 'Defina a solução de envoltória e registre a justificativa (para não refazer no executivo).',
    critical: true,
    meta: {
      why: 'A envoltória é uma das decisões que mais causam retrabalho se ficar indefinida no anteprojeto.',
      how: 'Escolha soluções (camadas) e use a calculadora de U-value para registrar a memória de cálculo de apoio. Anexe pré-especificações/fichas.',
      minData: ['Composição por camadas e espessuras', 'Condutividade dos materiais (ficha técnica) ou referência justificada'],
      commonMistakes: ['Especificar sem ficha', 'Trocar solução sem atualizar dossiê', 'Não registrar U calculado'],
      evidenceHints: ['Diagrama de camadas', 'Pré-especificação de paredes/cobertura', 'Fichas técnicas (quando disponíveis)'],
      calculators: ['u_value'],
      calcRequired: true,
      evidenceRequired: true,
      references: [ref('INI — Manuais (critérios de avaliação por tipologia)', INIR_MANUAIS), ref('RAC — inspeção de projeto', RAC_PDF)],
    },
  },
  {
    stage: 'anteproject',
    order: 20,
    key: 'glazing_strategy',
    title: 'Estratégia de aberturas por fachada e sombreamento',
    description: 'Controle a área de janelas por fachada e registre a estratégia de sombreamento.',
    critical: true,
    meta: {
      why: 'Fachadas sem controle de aberturas e sombreamento costumam exigir revisões tardias (especialmente no executivo).',
      how: 'Use WWR/PAF por fachada e registre AVS (sombreamento) como memória de decisão. Anexe elevações e quadro preliminar de esquadrias.',
      minData: ['Área de fachada e área de janelas por fachada', 'Geometria básica do sombreamento (projeção e vão)'],
      commonMistakes: ['Somar janelas sem separar fachadas', 'Não registrar sombreamento na fase correta', 'Não anexar quadro preliminar'],
      evidenceHints: ['Elevações com aberturas', 'Croquis de brises/marquises', 'Quadro preliminar de esquadrias'],
      calculators: ['wwr_facades', 'avs'],
      calcRequired: true,
      evidenceRequired: true,
      references: [ref('RAC — rastreabilidade das decisões de projeto', RAC_PDF)],
    },
  },

  {
    stage: 'anteproject',
    order: 30,
    key: 'lighting_lpd_strategy',
    title: 'Iluminação: estratégia e registro de densidade de potência (LPD/DPIL) quando aplicável',
    description: 'Quando houver iluminação artificial, registre o conceito, parâmetros e uma checagem de LPD/DPIL para evitar ajustes tardios no executivo.',
    critical: true,
    meta: {
      decisionRequires: ['decisions.artificial_lighting'],
      why: 'Sem registrar critérios e densidades por uso, é comum especificar luminárias no fim e exceder limites de referência, gerando retrabalho no executivo.',
      how: 'Defina o conceito de iluminação por ambientes, estime LPD e compare com a tabela DPIL. Anexe quadro preliminar de luminárias e memorial de iluminação.',
      evidenceHints: ['Memorial de iluminação (preliminar)', 'Quadro preliminar de luminárias', 'Planta de iluminação (anteprojeto)'],
      evidenceRequired: true,
      calculators: ['lpd'],
      calcRequired: true,
      racHints: ['RAC: rastreabilidade de decisões e documentos de suporte (memoriais e quadros).'],
      references: [ref('RTQ-C (2016) — Tabela 4.1 (DPIL)', 'https://www.pbeedifica.com.br/sites/default/files/projetos/etiquetagem/comercial/downloads/manual_rtqc2016.pdf', 'Tabela 4.1')],
    },
  },

  {
    stage: 'executive',
    order: 8,
    key: 'systems_hot_water',
    title: 'Sistemas: água quente (quando houver) — documentação e fichas',
    description: 'Se o projeto incluir aquecimento de água, registre a solução, fichas técnicas e evidências para manter rastreabilidade até o construído.',
    critical: true,
    meta: {
      decisionRequires: ['decisions.hot_water'],
      why: 'Sistemas definidos tarde (ou sem ficha) são fonte comum de inconsistência entre executivo e obra.',
      how: 'Defina a solução (central/individual), registre especificações e anexe fichas técnicas. Vincule mudanças ao dossiê.',
      evidenceHints: ['Memorial de instalações (água quente)', 'Fichas técnicas de aquecedores/boilers', 'Detalhes e prumadas'],
      evidenceRequired: true,
      racHints: ['RAC: evidências do executado e rastreabilidade de mudanças.'],
      references: [ref('Manual do RAC (maio/2025) — rastreabilidade e inspeções', RAC_PDF)],
    },
  },

  {
    stage: 'executive',
    order: 9,
    key: 'systems_hvac',
    title: 'Sistemas: HVAC/ar-condicionado (quando houver) — documentação e fichas',
    description: 'Se houver climatização artificial, registre escopo, especificações e evidências para reduzir retrabalho na inspeção.',
    critical: true,
    meta: {
      decisionRequires: ['decisions.hvac'],
      why: 'HVAC costuma concentrar mudanças de última hora e precisa de documentação consistente para o processo oficial.',
      how: 'Registre premissas (cargas, setpoints), especificações e anexos (memorial, plantas e fichas).',
      evidenceHints: ['Memorial HVAC', 'Plantas/diagramas de climatização', 'Fichas técnicas de equipamentos'],
      evidenceRequired: true,
      racHints: ['RAC: evidências do projeto e do construído para sistemas.'],
      references: [ref('Manual do RAC (maio/2025) — inspeções', RAC_PDF)],
    },
  },
  {
    stage: 'executive',
    order: 10,
    key: 'spec_materials_systems',
    title: 'Especificar materiais e sistemas e anexar fichas técnicas',
    description: 'Consolidar especificações finais (materiais, esquadrias, iluminação, sistemas) e anexar evidências rastreáveis.',
    critical: true,
    meta: {
      why: 'A maior causa de retrabalho na submissão é a falta de fichas técnicas e especificação final coerente.',
      how: 'Anexe fichas técnicas (vidros, esquadrias, isolantes, luminárias) e memorial descritivo atualizado. Vincule aos itens críticos.',
      minData: ['Fichas técnicas corretas', 'Caderno de especificações', 'Memorial descritivo atualizado'],
      commonMistakes: ['Ficha errada/sem rastreabilidade', 'Mudança de última hora sem atualizar', 'Evidências não vinculadas ao item'],
      evidenceHints: ['Caderno de especificações', 'Fichas técnicas', 'Memorial descritivo'],
      evidenceRequired: true,
      references: [ref('Manual do RAC (maio/2025) — documentação típica na inspeção de projeto', RAC_PDF)],
    },
  },
  {
    stage: 'executive',
    order: 15,
    key: 'drawings_package',
    title: 'Consolidar pacote de desenhos e quadro de áreas (para inspeção de projeto)',
    description: 'Organize plantas/cortes/fachadas e quadro de áreas com norte e identificação de fachadas.',
    critical: true,
    meta: {
      why: 'Desenhos sem norte, sem quadro de áreas e sem identificação de fachadas geram pedido de complementação e retrabalho.',
      how: 'Exporte PDFs finais (plantas/cortes/fachadas) + quadro de áreas. Confirme consistência com o perfil técnico (fachadas).',
      minData: ['Plantas/cortes/fachadas em PDF', 'Quadro de áreas final', 'Norte e identificação de fachadas'],
      evidenceHints: ['PDF do conjunto de desenhos', 'Quadro de áreas final', 'Implantação com norte'],
      evidenceRequired: true,
      acceptanceCriteria: ['PDFs finais gerados (plantas/cortes/fachadas)', 'Quadro de áreas final anexado', 'Norte e identificação de fachadas presentes'],
      fileNamingHints: ['02_Projeto/Plantas_PDF.pdf', '02_Projeto/Cortes_PDF.pdf', '02_Projeto/Fachadas_PDF.pdf', '02_Projeto/Quadro_Areas.pdf'],
      references: [ref('Manual do RAC — inspeção de projeto (documentação)', RAC_PDF, 'Inspeção de Projeto')],
    },
  },
  {
    stage: 'executive',
    order: 20,
    key: 'precheck_submission',
    title: 'Pré-checagem do pacote (pronto para solicitar ENCE de Projeto)',
    description: 'Verifique se itens críticos, evidências e memórias de cálculo estão completos antes de iniciar o processo oficial.',
    critical: true,
    meta: {
      why: 'A dor de cabeça aparece quando o processo oficial pede complementação. Esta checagem reduz ida e volta.',
      how: 'Revise itens críticos (envoltória, aberturas, iluminação/sistemas). Garanta evidências vinculadas e cálculos auxiliares salvos (quando aplicável).',
      evidenceHints: ['Dossiê exportado (PDF/HTML)', 'Lista de anexos/evidências', 'Histórico de cálculos auxiliares'],
      evidenceRequired: true,
      references: [ref('PBE Edifica — Como obter ENCE', ENCE_HOWTO), ref('Manual do RAC — processo oficial', RAC_PDF)],
    },
  },
  {
    stage: 'construction',
    order: 10,
    key: 'as_built_evidence',
    title: 'Registrar evidências do construído (obra)',
    description: 'Coletar fotos, notas e fichas finais do executado para suportar a ENCE do construído.',
    critical: true,
    meta: {
      why: 'O maior retrabalho no construído é não conseguir comprovar o que foi executado.',
      how: 'Organize evidências por item crítico (esquadrias, isolamentos, iluminação, sistemas). Registre mudanças e justificativas.',
      evidenceHints: ['Fotos em obra', 'Notas fiscais', 'Fichas técnicas finais', 'Relatório de mudanças'],
      evidenceRequired: true,
      acceptanceCriteria: ['As-built anexado', 'Fotos e fichas finais anexadas', 'Mudanças registradas e justificadas'],
      fileNamingHints: ['05_Construido/AsBuilt/Plantas_AsBuilt.pdf', '05_Construido/Evidencias/Fotos_Envoltoria.zip', '05_Construido/Evidencias/Fichas_Finais.pdf'],
      references: [ref('Manual do RAC — inspeção do construído', RAC_PDF, 'Inspeção do Construído')],
    },
  },
  {
    stage: 'construction',
    order: 20,
    key: 'built_precheck',
    title: 'Pré-checagem do construído (pronto para solicitar ENCE da edificação)',
    description: 'Confirme consistência do executado com o projeto e evidências completas para evitar retrabalho na inspeção do construído.',
    critical: true,
    meta: {
      why: 'Divergências sem registro e evidências faltantes geram atrasos e retrabalho na fase final.',
      how: 'Revise mudanças relevantes, anexos e consistência com o dossiê de projeto. Exporte o dossiê do construído.',
      evidenceHints: ['As-built (PDF)', 'Relatório de mudanças', 'Pacote final de evidências'],
      evidenceRequired: true,
      references: [ref('Manual do RAC — inspeção do construído', RAC_PDF)],
    },
  },
];

export const RES_EXTRA: TaskTemplate[] = [
  {
    stage: 'anteproject',
    order: 30,
    key: 'hot_water_system',
    title: 'Definir sistema de água quente (se aplicável)',
    description: 'Registrar tipo de aquecimento, premissas e evidências para evitar retrabalho no executivo.',
    critical: true,
    meta: {
      why: 'Decisão tardia de água quente gera mudanças em prumadas, áreas técnicas e documentação.',
      how: 'Defina tipo (elétrico, gás, solar etc.) e registre premissas (ocupação, perfil de uso).',
      minData: ['Tipo de sistema', 'Premissas de uso (ocupação)', 'Requisitos de instalação (espaço/infra)'],
      evidenceHints: ['Memorial do sistema', 'Fichas técnicas', 'Diagrama/infra necessária'],
      acceptanceCriteria: ['Tipo de sistema escolhido e registrado', 'Premissas de uso documentadas', 'Evidências anexadas (fichas/memorial)'],
      fileNamingHints: ['04_Sistemas/AguaQuente/Memorial_AguaQuente.pdf', '04_Sistemas/AguaQuente/FichaTecnica_Equipamento.pdf'],
      evidenceRequired: true,
      references: [ref('Manuais INI-R — requisitos por tipologia', INIR_MANUAIS)],
    },
  },
  {
    stage: 'anteproject',
    order: 35,
    key: 'natural_ventilation_strategy_res',
    title: 'Estratégia de ventilação e aberturas (residencial)',
    description: 'Definir diretrizes de ventilação (cruzada, posicionamento de aberturas) e registrar justificativas e evidências.',
    critical: true,
    meta: {
      why: 'Ajustes tardios em aberturas e layouts geram retrabalho em fachada e em documentação (implantação, fachadas, quadros).',
      how: 'Use o perfil de fachadas e a calculadora de WWR por fachada para registrar as áreas de aberturas e a lógica de ventilação.',
      minData: ['Fachadas e orientação', 'Aberturas principais por ambiente', 'Diretriz de ventilação (cruzada quando possível)'],
      calculators: ['wwr_facades'],
      calcRequired: true,
      evidenceHints: ['Estudo de fachadas com aberturas', 'Esquemas de ventilação/fluxos', 'Quadro preliminar de aberturas'],
      acceptanceCriteria: ['WWR/PAF por fachada registrado', 'Esquema/nota de ventilação anexado'],
      fileNamingHints: ['03_Envoltoria/Aberturas/Quadro_Aberturas.pdf', '03_Envoltoria/Aberturas/Estudo_Ventilacao.pdf'],
      evidenceRequired: true,
      references: [ref('INI-R — aplicação e definições', INIR_MANUAIS)],
    },
  },
  {
    stage: 'executive',
    order: 35,
    key: 'envelope_layers_res',
    title: 'Composições de envoltória (paredes/coberturas) definidas e registradas',
    description: 'Definir camadas e materiais da envoltória e registrar memória de cálculo de apoio (U/R) para reduzir retrabalho.',
    critical: true,
    meta: {
      why: 'Sem composição definida, o projeto executivo muda no fim (materiais/espessuras) e a documentação fica inconsistente.',
      how: 'Registre as camadas (material + espessura) e use a calculadora U-value como memória de cálculo de apoio.',
      minData: ['Materiais e espessuras das camadas', 'Identificação da solução por elemento (parede/cobertura)'],
      calculators: ['u_value'],
      calcRequired: true,
      evidenceHints: ['Caderno/planilha de composições', 'Fichas técnicas', 'Memória de cálculo (U/R)'],
      acceptanceCriteria: ['Soluções de parede/cobertura documentadas', 'Memória U/R registrada no VetorEco', 'Evidências anexadas'],
      fileNamingHints: ['03_Envoltoria/Opaque/Composicoes_ParedeCobertura.pdf', '03_Envoltoria/Opaque/Fichas_Tecnicas.pdf'],
      evidenceRequired: true,
      references: [ref('Catálogo de propriedades térmicas (RAC)', 'https://www.pbeedifica.com.br/sites/default/files/Manual%20RAC_Cat%C3%A1logo%20de%20propriedades_DEZ-22.pdf')],
    },
  },
  {
    stage: 'executive',
    order: 40,
    key: 'common_areas_lighting_res',
    title: 'Iluminação de áreas comuns (se aplicável) — premissas e evidências',
    description: 'Registrar potência instalada e estratégia de controle em áreas comuns para evitar ajustes no final.',
    critical: false,
    meta: {
      why: 'Áreas comuns são esquecidas; a potência e os controles aparecem tarde e geram retrabalho em especificação e quadros.',
      how: 'Liste ambientes/áreas comuns, estime potência e registre controles. Use LPD por ambiente quando aplicável.',
      calculators: ['lpd_spaces'],
      calcRequired: false,
      evidenceHints: ['Quadro preliminar de luminárias (áreas comuns)', 'Estratégia de controle (sensores/setorização)'],
      acceptanceCriteria: ['Premissas registradas e evidências anexadas (quando aplicável)'],
      fileNamingHints: ['04_Sistemas/Iluminacao/Quadro_Luminarias_AreasComuns.pdf'],
      evidenceRequired: false,
      references: [ref('Manuais INI — sistemas e documentação', INIR_MANUAIS)],
    },
  },
  {
    stage: 'construction',
    order: 35,
    key: 'hot_water_asbuilt_res',
    title: 'Construído: evidências finais do sistema de água quente (se aplicável)',
    description: 'Registrar fichas finais, fotos e notas fiscais dos equipamentos instalados.',
    critical: false,
    meta: {
      why: 'Mudanças de marca/modelo sem registro atrapalham a inspeção do construído e geram pedido de complementação.',
      how: 'Anexe ficha técnica final, fotos e notas fiscais/ordens de compra quando disponíveis.',
      evidenceHints: ['Ficha técnica final', 'Fotos do equipamento instalado', 'NF/ordem de compra'],
      acceptanceCriteria: [
        'Evidências anexadas e vinculadas ao item',
        'As-built anexado',
        'Fotos e fichas finais anexadas',
        'Mudanças registradas e justificadas',
      ],
      fileNamingHints: [
        '05_Construido/AguaQuente/Ficha_Final.pdf',
        '05_Construido/AguaQuente/Fotos_Instalacao.jpg',
        '05_Construido/AsBuilt/Plantas_AsBuilt.pdf',
        '05_Construido/Evidencias/Fotos_Envoltoria.zip',
        '05_Construido/Evidencias/Fichas_Finais.pdf',
      ],
      evidenceRequired: true,
      references: [ref('Manual do RAC — inspeção do construído', RAC_PDF, 'Inspeção do Construído')],
    },
  },
];


export const COM_EXTRA: TaskTemplate[] = [
  {
    stage: 'anteproject',
    order: 30,
    key: 'lighting_concept',
    title: 'Conceito de iluminação (LPD) e controles',
    description: 'Planejar potência instalada por ambiente e estratégia de controles para reduzir retrabalho no executivo.',
    critical: true,
    meta: {
      why: 'Iluminação costuma ser resolvida no fim; sem premissas e memória de cálculo, a documentação vira retrabalho.',
      how: 'Liste ambientes, áreas e potência estimada. Use LPD por ambiente (W/m²) e registre controles (sensores, setorização).',
      minData: ['Lista de ambientes e áreas', 'Potência estimada por ambiente', 'Estratégia de controles'],
      commonMistakes: ['Somar potência total sem separar ambientes', 'Não registrar controles', 'Calcular LPD só no final'],
      evidenceHints: ['Quadro preliminar de luminárias', 'Estratégia de controle', 'Potência por ambiente'],
      calculators: ['lpd_spaces'],
      calcRequired: true,
      acceptanceCriteria: ['LPD por ambiente registrado', 'Estratégia de controles documentada', 'Evidências anexadas'],
      fileNamingHints: ['04_Sistemas/Iluminacao/Quadro_Luminarias_Preliminar.xlsx', '04_Sistemas/Iluminacao/Controles_Iluminacao.pdf'],
      evidenceRequired: true,
      references: [ref('Manuais INI-C — iluminação e sistemas (aplicação)', INIC_MANUAIS)],
    },
  },
  {
    stage: 'anteproject',
    order: 35,
    key: 'wwr_control_facades_com',
    title: 'Controlar PAF/WWR por fachada (aberturas e estratégia de sombreamento)',
    description: 'Registrar áreas de fachada e janelas por orientação e decidir diretrizes de sombreamento/vidros.',
    critical: true,
    meta: {
      why: 'Aberturas por fachada influenciam decisões de vidro e sombreamento; ajustes tardios geram retrabalho de fachada e especificação.',
      how: 'Use o Perfil Técnico (fachadas) e registre WWR por fachada. Documente diretrizes de vidro e proteções.',
      minData: ['Áreas de fachada e janelas por fachada', 'Diretriz de vidro (fator solar/controle)', 'Diretriz de sombreamento'],
      calculators: ['wwr_facades', 'avs'],
      calcRequired: true,
      evidenceHints: ['Quadro de aberturas por fachada', 'Estudo de sombreamento', 'Especificação preliminar de vidro'],
      acceptanceCriteria: ['WWR por fachada registrado', 'Diretrizes de vidro e sombreamento documentadas', 'Evidências anexadas'],
      fileNamingHints: ['03_Envoltoria/Aberturas/WWR_PorFachada.xlsx', '03_Envoltoria/Aberturas/Estudo_Sombreamento.pdf'],
      evidenceRequired: true,
      references: [ref('Manuais INI-C — envoltória e aberturas (aplicação)', INIC_MANUAIS)],
    },
  },
  {
    stage: 'executive',
    order: 30,
    key: 'hvac_spec',
    title: 'Especificar HVAC (se aplicável) e controles',
    description: 'Registrar especificação do sistema de climatização e controles para manter consistência e evidências.',
    critical: false,
    meta: {
      why: 'Quando houver HVAC, mudanças tardias impactam documentação e desempenho.',
      how: 'Anexe memorial de climatização, fichas técnicas e setpoints/controles previstos.',
      evidenceHints: ['Memorial de climatização', 'Fichas técnicas', 'Esquema do sistema'],
      acceptanceCriteria: ['Sistema e controles descritos', 'Fichas técnicas anexadas (quando aplicável)'],
      fileNamingHints: ['04_Sistemas/HVAC/Memorial_HVAC.pdf', '04_Sistemas/HVAC/Fichas_Tecnicas.pdf'],
      evidenceRequired: true,
      references: [ref('Manuais INI-C — sistemas (aplicação)', INIC_MANUAIS)],
    },
  },
];


const PUB_EXTRA: TaskTemplate[] = [
  {
    stage: 'study',
    order: 30,
    key: 'public_requirements_procurement',
    title: 'Obra pública: incluir requisitos de eficiência e ENCE no termo de referência/edital (quando aplicável)',
    description: 'Registrar requisitos e evidências no escopo para evitar retrabalho e aditivos.',
    critical: true,
    meta: {
      why: 'Sem requisitos claros, decisões de sistemas e especificações mudam durante a contratação/obra, gerando retrabalho e risco de não atingir o objetivo.',
      how: 'Inclua requisitos de desempenho, dados mínimos e itens de evidência no termo de referência. Registre a estratégia de manutenção da meta até o construído.',
      evidenceHints: ['Termo de referência/edital com requisitos', 'Ata/registro de alinhamento', 'Critérios de aceite por disciplina'],
      acceptanceCriteria: ['Requisitos registrados no documento de contratação', 'Estratégia de evidências definida'],
      fileNamingHints: ['01_Admin/Edital_TermoReferencia_Eficiencia.pdf', '01_Admin/Criterios_Aceite_Eficiencia.pdf'],
      evidenceRequired: true,
      references: [ref('Manual do RAC — processo e documentação', RAC_PDF), ref('CGIEE 4/2025 — contexto regulatório', CGIEE_4_2025)],
    },
  },
  {
    stage: 'executive',
    order: 35,
    key: 'commissioning_plan_public',
    title: 'Plano de comissionamento e verificação (público)',
    description: 'Planejar como será verificado o desempenho e registrar evidências previstas (controles, operação, medições).',
    critical: false,
    meta: {
      why: 'Sem comissionamento/registro, ajustes de operação e controles ficam fora do dossiê e dificultam a inspeção do construído.',
      how: 'Documente controles, setpoints e como serão verificados. Anexe manual de operação quando aplicável.',
      evidenceHints: ['Plano de comissionamento', 'Lista de controles e setpoints', 'Manual de operação (quando disponível)'],
      acceptanceCriteria: ['Plano anexado e vinculado ao projeto', 'Controles e setpoints documentados'],
      fileNamingHints: ['04_Sistemas/Comissionamento/Plano_Comissionamento.pdf', '04_Sistemas/Comissionamento/Controles_Setpoints.pdf'],
      evidenceRequired: false,
      references: [ref('Manuais INI-C — sistemas e documentação', INIC_MANUAIS)],
    },
  },
  {
    stage: 'construction',
    order: 40,
    key: 'built_commissioning_records',
    title: 'Construído: registros de comissionamento/ajustes e evidências finais',
    description: 'Guardar registros de testes, ajustes e evidências finais de sistemas/controles.',
    critical: false,
    meta: {
      why: 'Sem registros finais, o construído pode exigir complementação e retrabalho de última hora.',
      how: 'Anexe relatórios de testes e registros de comissionamento, além de fichas técnicas finais.',
      evidenceHints: ['Relatórios de testes', 'Registros de comissionamento', 'Fichas finais'],
      acceptanceCriteria: ['Registros anexados e organizados por sistema'],
      fileNamingHints: ['05_Construido/Comissionamento/Relatorio_Testes.pdf', '05_Construido/Comissionamento/Registro_Ajustes.pdf'],
      evidenceRequired: false,
      references: [ref('Manual do RAC — inspeção do construído', RAC_PDF, 'Inspeção do Construído')],
    },
  },
];


export function templatesFor(typology: Typology): TaskTemplate[] {
  if (typology === 'residential') return [...COMMON, ...RES_EXTRA];
  if (typology === 'commercial') return [...COMMON, ...COM_EXTRA];
  return [...COMMON, ...PUB_EXTRA];
}

/**
 * Sugestão de estrutura de anexos (exemplo). Ajuste conforme seu fluxo.
 * Objetivo: reduzir retrabalho na hora de pedir a ENCE (Projeto e Construído).
 */
export const SUBMISSION_PACK_EXAMPLES = {
  project: [
    '01_Admin/Carta_Solicitacao_ENCE.pdf',
    '02_Projeto/Implantacao_Norte.pdf',
    '02_Projeto/Plantas_PDF.pdf',
    '02_Projeto/Cortes_PDF.pdf',
    '02_Projeto/Fachadas_PDF.pdf',
    '02_Projeto/Quadro_Areas.pdf',
    '03_Envoltoria/Opaque/Composicoes_ParedeCobertura.pdf',
    '03_Envoltoria/Aberturas/Quadro_Aberturas.pdf',
    '03_Envoltoria/Aberturas/Especificacao_Vidros.pdf',
    '04_Sistemas/Iluminacao/Quadro_Luminarias.xlsx',
    '04_Sistemas/HVAC/Memorial_HVAC.pdf (se aplicável)',
    '04_Sistemas/AguaQuente/Memorial_AguaQuente.pdf (se aplicável)',
    '06_Dossie/Dossie_Preparacao_Projeto.pdf',
  ],
  built: [
    '05_Construido/AsBuilt/Plantas_AsBuilt.pdf',
    '05_Construido/Evidencias/Fotos_Envoltoria.zip',
    '05_Construido/Evidencias/Fichas_Finais.pdf',
    '05_Construido/Evidencias/NFs_OrdemCompra.pdf (quando disponível)',
    '05_Construido/Registro_Mudancas_vs_Projeto.pdf',
    '06_Dossie/Dossie_Preparacao_Construido.pdf',
  ],
};

/**
 * Template de memorial guiado (rascunho). Use para orientar o preenchimento e anexação de evidências.
 * Não substitui o processo oficial.
 */
export const MEMORIAL_TEMPLATES = {
  project: {
    sections: [
      { title: '1) Identificação do projeto', hints: ['Nome, endereço, cidade/UF', 'Tipologia e uso predominante', 'Data prevista de protocolo'] },
      { title: '2) Enquadramento e objetivo', hints: ['Meta (mínimo/otimizar)', 'Justificativa e premissas', 'Como manter decisões até o construído'] },
      { title: '3) Caracterização climática e implantação', hints: ['Zona bioclimática', 'Norte/implantação', 'Entorno e sombras relevantes'] },
      { title: '4) Envoltória (opacos e aberturas)', hints: ['Composições de parede/cobertura', 'WWR/PAF por fachada', 'Vidros e sombreamento'] },
      { title: '5) Sistemas (quando aplicável)', hints: ['Iluminação (LPD, controles)', 'HVAC (memorial, controles)', 'Água quente (memorial e fichas)'] },
      { title: '6) Evidências anexas', hints: ['Lista de PDFs/planilhas anexados', 'Memórias de cálculo (U, WWR, LPD)', 'Rastreabilidade (datas/versões)'] },
      { title: '7) Pendências e próximos passos', hints: ['Itens críticos pendentes', 'Plano de ação para fechar antes da solicitação'] },
    ],
  },
  built: {
    sections: [
      { title: '1) As-built e alterações', hints: ['Plantas/cortes/fachadas as-built', 'Registro de mudanças vs projeto', 'Justificativas'] },
      { title: '2) Evidências do executado', hints: ['Fotos (envoltória, sistemas)', 'Fichas técnicas finais', 'NFs/ordens (quando disponíveis)'] },
      { title: '3) Operação/controles (quando aplicável)', hints: ['Setpoints/controles finais', 'Registros de testes/comissionamento (se houver)'] },
      { title: '4) Checklist e conclusão', hints: ['Itens críticos do construído satisfeitos', 'Pendências finais', 'Dossiê pronto para solicitação'] },
    ],
  },
};



export const PACK_OVERVIEW = {
  id: PACK_ID,
  title: PACK_TITLE,
  updated_at: PACK_UPDATED_AT,
  sources: commonSources(),
  disclaimers: [
    'O VetorEco é um guia de preparação: ele não calcula nem emite a ENCE oficial.',
    'A emissão oficial ocorre no processo do PBE Edifica (inspeção de projeto e/ou do construído) conforme o RAC.',
    'Este pack referencia manuais publicados em maio/2025. Verifique atualizações no portal do PBE Edifica.',
  ],
  process: [
    { step: '1', title: 'Projeto (Estudo → Anteprojeto → Executivo)', text: 'Decidir soluções e reunir evidências para solicitar a ENCE de Projeto.' },
    { step: '2', title: 'Construído (Obra)', text: 'Registrar o executado (as-built, fotos, fichas finais) para solicitar a ENCE do Construído.' },
  ],
  submission_pack_examples: SUBMISSION_PACK_EXAMPLES,
  memorial_templates: MEMORIAL_TEMPLATES,
};
