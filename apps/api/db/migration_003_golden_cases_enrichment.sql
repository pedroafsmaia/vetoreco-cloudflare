-- Migration 003 - Enriquecimento da tabela golden_case_results
-- Adiciona metadados de curadoria para golden cases oficiais do PBE Edifica

ALTER TABLE golden_case_results ADD COLUMN source_url TEXT;
ALTER TABLE golden_case_results ADD COLUMN normative_code TEXT;
ALTER TABLE golden_case_results ADD COLUMN building_type TEXT;
ALTER TABLE golden_case_results ADD COLUMN bioclimatic_zone TEXT;
ALTER TABLE golden_case_results ADD COLUMN data_quality TEXT;
ALTER TABLE golden_case_results ADD COLUMN completeness_pct REAL;
