/**
 * NormPack (fontes normativas públicas) — VetorEco
 *
 * Regra: nenhum número normativo pode existir sem referência pública verificável.
 * Centralizamos aqui para evitar duplicidade e espalhamento de links/tabelas no código.
 */

export type NormativeSource = {
  /** Identificador estável da fonte (para rastreabilidade no dossiê e logs) */
  id: string;
  document: string;
  year: number;
  table: string;
  url: string;
};

export const NORMPACK_VERSION_ID = 'normpack-2026-02-27';

export const NORMATIVE_SOURCES = {
  RTQR_MANUAL_2014: {
    id: 'RTQ-R-Manual-2014',
    document: 'Manual para Aplicação do RTQ-R (v1) – PBE Edifica',
    year: 2014,
    table: 'Tabela 3.1 e Tabela 3.2',
    url: 'https://www.pbeedifica.com.br/sites/default/files/projetos/etiquetagem/residencial/downloads/Manual_RTQR_102014.pdf',
  },
  RTQC_MANUAL_2016: {
    id: 'RTQ-C-Manual-2016',
    document: 'Manual para Aplicação do RTQ-C – PBE Edifica',
    year: 2016,
    table: 'Tabela 4.1',
    url: 'https://www.pbeedifica.com.br/sites/default/files/projetos/etiquetagem/comercial/downloads/manual_rtqc2016.pdf',
  },
} as const satisfies Record<string, NormativeSource>;

export type NormativeSourceKey = keyof typeof NORMATIVE_SOURCES;

export function formatNormRef(source: NormativeSource, extra?: string) {
  const base = `${source.document} (${source.year}) — ${source.table} — ${source.url}`;
  return extra ? `${base} — ${extra}` : base;
}
