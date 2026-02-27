-- Add knowledge_pack_id to projects to keep traceability of which normative/process pack generated the checklist.
-- Safe to run once. If you already have the column, ignore errors.

ALTER TABLE projects ADD COLUMN knowledge_pack_id TEXT NOT NULL DEFAULT 'ini_2025_05';
