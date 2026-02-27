import type { Typology } from '../types';
import type { TaskTemplate } from '../domain/templates';

import { PACK_OVERVIEW as iniOverview, templatesFor as iniTemplates, PACK_ID as iniPackId } from './packs/ini_2025_05';

export type KnowledgeOverview = typeof iniOverview;

/**
 * MVP: pacote ativo é fixo (INI + RAC maio/2025).
 * Futuro: selecionar por data/versão.
 */
export function getActivePackId() {
  return iniPackId;
}

export function getKnowledgeOverview() {
  return iniOverview;
}

export function getTemplatesForTypology(typology: Typology): TaskTemplate[] {
  return iniTemplates(typology);
}
