-- Add typed evidences (link/file/text) + RAC linkage fields.
-- Safe to run once. If columns already exist, ignore errors.

ALTER TABLE project_evidences ADD COLUMN evidence_type TEXT NOT NULL DEFAULT 'link';
ALTER TABLE project_evidences ADD COLUMN content_text TEXT;
ALTER TABLE project_evidences ADD COLUMN rac_section TEXT;
ALTER TABLE project_evidences ADD COLUMN meta_json TEXT;
