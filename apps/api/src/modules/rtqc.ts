/**
 * RTQ-C (Manual 2016) — DPIL (LPD) por função da edificação
 *
 * Fonte pública verificável:
 * Manual RTQ-C 2016 — Tabela 4.1 (Método da área da edificação)
 * https://www.pbeedifica.com.br/sites/default/files/projetos/etiquetagem/comercial/downloads/manual_rtqc2016.pdf
 */

import type { NormativeSource } from '../normative_sources';
import { NORMATIVE_SOURCES } from '../normative_sources';

export type DPILLevel = 'A' | 'B' | 'C' | 'D';

export type DPILRow = {
  key: string;
  funcao: string;
  dpil_W_m2: Record<DPILLevel, number>;
  reference: {
    table: string;
    source: NormativeSource;
  };
};

const SRC = NORMATIVE_SOURCES.RTQC_MANUAL_2016;

// Tabela 4.1 (RTQ-C 2016) — valores em W/m²
export const DPIL_TABLE_4_1: DPILRow[] = [
  { key: 'academia', funcao: 'Academia', dpil_W_m2: { A: 9.5, B: 10.9, C: 12.4, D: 13.8 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'armazem', funcao: 'Armazém', dpil_W_m2: { A: 7.1, B: 8.2, C: 9.2, D: 10.3 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'biblioteca', funcao: 'Biblioteca', dpil_W_m2: { A: 12.7, B: 14.6, C: 16.5, D: 18.4 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'bombeiros', funcao: 'Bombeiros', dpil_W_m2: { A: 7.6, B: 8.7, C: 9.9, D: 11.0 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'centro_de_convencoes', funcao: 'Centro de Convenções', dpil_W_m2: { A: 11.6, B: 13.3, C: 15.1, D: 16.8 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'cinema', funcao: 'Cinema', dpil_W_m2: { A: 8.9, B: 10.2, C: 11.6, D: 12.9 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'comercio', funcao: 'Comércio', dpil_W_m2: { A: 15.1, B: 17.4, C: 19.6, D: 21.9 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'correios', funcao: 'Correios', dpil_W_m2: { A: 9.4, B: 10.8, C: 12.2, D: 13.6 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'venda_locacao_veiculos', funcao: 'Venda e Locação de Veículos', dpil_W_m2: { A: 8.8, B: 10.1, C: 11.4, D: 12.8 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'escola_universidade', funcao: 'Escola/Universidade', dpil_W_m2: { A: 10.7, B: 12.3, C: 13.9, D: 15.5 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'escritorio', funcao: 'Escritório', dpil_W_m2: { A: 9.7, B: 11.2, C: 12.6, D: 14.1 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'estadio_de_esportes', funcao: 'Estádio de esportes', dpil_W_m2: { A: 8.4, B: 9.7, C: 10.9, D: 12.2 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'garagem_ed_garagem', funcao: 'Garagem – Ed. Garagem', dpil_W_m2: { A: 2.7, B: 3.1, C: 3.5, D: 3.9 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'ginasio', funcao: 'Ginásio', dpil_W_m2: { A: 10.8, B: 12.4, C: 14.0, D: 15.7 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'hospedagem_dormitorio', funcao: 'Hospedagem, Dormitório', dpil_W_m2: { A: 6.6, B: 7.6, C: 8.6, D: 9.6 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'hospital', funcao: 'Hospital', dpil_W_m2: { A: 13.0, B: 15.0, C: 16.9, D: 18.9 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'hotel', funcao: 'Hotel', dpil_W_m2: { A: 10.8, B: 12.4, C: 14.0, D: 15.7 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'igreja_templo', funcao: 'Igreja/Templo', dpil_W_m2: { A: 11.3, B: 13.0, C: 14.7, D: 16.4 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'restaurante', funcao: 'Restaurante', dpil_W_m2: { A: 9.6, B: 11.0, C: 12.5, D: 13.9 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'restaurante_bar_lazer', funcao: 'Restaurante: Bar/Lazer', dpil_W_m2: { A: 10.7, B: 12.3, C: 13.9, D: 15.5 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'restaurante_fast_food', funcao: 'Restaurante: Fast-food', dpil_W_m2: { A: 9.7, B: 11.2, C: 12.6, D: 14.1 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'museu', funcao: 'Museu', dpil_W_m2: { A: 11.4, B: 13.1, C: 14.8, D: 16.5 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'oficina', funcao: 'Oficina', dpil_W_m2: { A: 12.9, B: 14.8, C: 16.8, D: 18.7 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'penitenciaria', funcao: 'Penitenciária', dpil_W_m2: { A: 10.4, B: 12.0, C: 13.5, D: 15.1 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'posto_de_saude_clinica', funcao: 'Posto de Saúde/Clínica', dpil_W_m2: { A: 9.4, B: 10.8, C: 12.2, D: 13.6 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'posto_policial', funcao: 'Posto Policial', dpil_W_m2: { A: 10.3, B: 11.8, C: 13.4, D: 14.9 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'prefeitura_inst_gov', funcao: 'Prefeitura – Inst. Gov.', dpil_W_m2: { A: 9.9, B: 11.4, C: 12.9, D: 14.4 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'teatro', funcao: 'Teatro', dpil_W_m2: { A: 15.0, B: 17.3, C: 19.5, D: 21.8 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'transportes', funcao: 'Transportes', dpil_W_m2: { A: 8.3, B: 9.5, C: 10.8, D: 12.0 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
  { key: 'tribunal', funcao: 'Tribunal', dpil_W_m2: { A: 11.3, B: 13.0, C: 14.7, D: 16.4 }, reference: { table: 'RTQ-C Tabela 4.1', source: SRC } },
];

export function getDPILTable() {
  const flat_rows = DPIL_TABLE_4_1.flatMap((r) => (['A','B','C','D'] as DPILLevel[]).map((nivel) => ({
    funcao: r.funcao,
    nivel,
    dpil_limite: r.dpil_W_m2[nivel],
    reference: {
      table: 'RTQ-C Tabela 4.1',
      document: SRC.document,
      year: SRC.year,
      url: SRC.url,
    }
  })));

  return {
    rows: DPIL_TABLE_4_1,
    flat_rows,
    reference: {
      document: SRC.document,
      year: SRC.year,
      table: SRC.table,
      url: SRC.url,
      note: 'Valores conforme RTQ-C (2016) — Tabela 4.1 (método da área da edificação).',
    },
  };
}

export function findDPILLimit(functionKey: string, level: DPILLevel): number | null {
  const row = DPIL_TABLE_4_1.find((r) => r.key === functionKey);
  if (!row) return null;
  return row.dpil_W_m2[level];
}
