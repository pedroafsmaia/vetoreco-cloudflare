import type { Stage } from '../types';

export type NormRef = {
  title: string;
  url?: string;
  section?: string;
};

export type TaskMeta = {
  /** Por que isso existe / qual risco evita */
  why?: string;
  /** Como obter (passos práticos) */
  how?: string;
  /** Evidências recomendadas para anexar */
  evidenceHints?: string[];
  /** Se true, o item só conta como "preparado" quando houver ao menos 1 evidência vinculada */
  evidenceRequired?: boolean;
  /** Calculadoras úteis para este item */
  calculators?: Array<'u_value' | 'wwr' | 'wwr_facades' | 'avs' | 'lpd' | 'lpd_spaces'>;
  /** Se true, o item só conta como "preparado" quando houver ao menos 1 cálculo vinculado */
  calcRequired?: boolean;
  /** Dados mínimos do projeto exigidos para este item (ex.: zona bioclimática, fachadas). */
  projectFieldsRequired?: Array<'ence_target' | 'profile.bioclimatic_zone' | 'profile.facades_minimum'>;
  /** Se true, o item pode ser automaticamente marcado como feito quando os dados mínimos existirem. */
  autoSatisfyOnProjectData?: boolean;
  /** Dados mínimos que o usuário deve ter em mãos */
  minData?: string[];
  /** Erros comuns que geram retrabalho */
  commonMistakes?: string[];
  /** Referências institucionais/normativas (sem reproduzir conteúdo) */
  references?: NormRef[];

  /**
   * Gatilhos de decisão (INI-first): se informado, o item só é considerado "ativo" quando
   * TODOS os caminhos abaixo forem verdadeiros no profile_json (ex.: "decisions.artificial_lighting").
   * Itens inativos não entram em prontidão/bloqueadores e podem ser destravados no frontend.
   */
  decisionRequires?: string[];

  /** Dicas de onde este item costuma aparecer como evidência no RAC (sem copiar o manual). */
  racHints?: string[];

  /** Critérios de aceite: quando considerar este item concluído */
  acceptanceCriteria?: string[];
  /** Sugestões de nomenclatura/estrutura de arquivos para anexos */
  fileNamingHints?: string[];
};

export type TaskTemplate = {
  stage: Stage;
  order: number;
  key: string;
  title: string;
  description: string;
  critical: boolean;
  meta?: TaskMeta;
};