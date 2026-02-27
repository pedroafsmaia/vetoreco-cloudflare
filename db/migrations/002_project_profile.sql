-- Add project profile fields for ENCE guidance (bioclimatic zone, facades, target)
-- Use if you are upgrading an existing database created with schema.sql prior to this change.

PRAGMA foreign_keys = ON;

ALTER TABLE projects ADD COLUMN ence_target TEXT;
ALTER TABLE projects ADD COLUMN profile_json TEXT;
