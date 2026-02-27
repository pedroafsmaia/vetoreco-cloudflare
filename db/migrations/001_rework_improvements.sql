-- VetorEco rework improvements
-- Use only if you are upgrading an existing database created with an earlier rework schema.
-- NOTE: SQLite/D1 has limitations for altering foreign keys; this migration adds columns and indexes only.

PRAGMA foreign_keys = ON;

-- project_tasks: ordering + metadata
ALTER TABLE project_tasks ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE project_tasks ADD COLUMN meta_json TEXT;

-- project_evidences: optional task linkage
ALTER TABLE project_evidences ADD COLUMN task_id TEXT;
CREATE INDEX IF NOT EXISTS idx_evidences_task_id ON project_evidences(task_id);

-- project_calculations: optional task linkage
ALTER TABLE project_calculations ADD COLUMN task_id TEXT;
CREATE INDEX IF NOT EXISTS idx_calcs_task_id ON project_calculations(task_id);
