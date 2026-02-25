PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  municipality_size TEXT NOT NULL,
  typology TEXT NOT NULL,
  phase TEXT NOT NULL,
  protocol_year INTEGER NOT NULL,
  area_m2 REAL,
  is_federal_public INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  technical_inputs_json TEXT NOT NULL DEFAULT '{}',
  technical_inputs_updated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

CREATE TABLE IF NOT EXISTS project_regulatory_context (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  protocol_date TEXT,
  permit_issue_date TEXT,
  public_bid_date TEXT,
  population_band TEXT,
  entity_scope TEXT,
  classification_method TEXT NOT NULL DEFAULT 'INI',
  legacy_reason TEXT,
  evidence_ence_projeto_legacy TEXT,
  state_code TEXT,
  autodeclaration_requested INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_checklist_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, item_key),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_checklist_project_id ON project_checklist_items(project_id);

CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_label TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_versions_project_id ON project_versions(project_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  project_id TEXT,
  action TEXT NOT NULL,
  details_json TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- Normative/versioning tables
CREATE TABLE IF NOT EXISTS normative_packages (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  is_legacy INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(code, version)
);

CREATE TABLE IF NOT EXISTS normative_rules (
  id TEXT PRIMARY KEY,
  package_code TEXT NOT NULL,
  package_version TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  rule_value_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(package_code, package_version, rule_key)
);
CREATE INDEX IF NOT EXISTS idx_normative_rules_pkg ON normative_rules(package_code, package_version);

CREATE TABLE IF NOT EXISTS calculation_profiles (
  id TEXT PRIMARY KEY,
  profile_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  typology TEXT NOT NULL,
  method TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calculation_coefficients (
  id TEXT PRIMARY KEY,
  profile_key TEXT NOT NULL,
  coeff_key TEXT NOT NULL,
  coeff_value REAL,
  coeff_json TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(profile_key, coeff_key)
);
CREATE INDEX IF NOT EXISTS idx_coeff_profile ON calculation_coefficients(profile_key);

CREATE TABLE IF NOT EXISTS calculation_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  normative_package_code TEXT NOT NULL,
  normative_package_version TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  status TEXT NOT NULL,
  input_snapshot_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  warnings_json TEXT NOT NULL,
  errors_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_calc_runs_project ON calculation_runs(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS golden_case_results (
  id TEXT PRIMARY KEY,
  case_key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  input_json TEXT NOT NULL,
  expected_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Optional baseline profiles/coefs (MVP pre-calculation heuristics)
INSERT OR IGNORE INTO calculation_profiles (id, profile_key, label, typology, method, is_active, created_at)
VALUES
  ('seed-prof-com','precalc_comercial_v1','Pré-cálculo comercial','comercial','INI',1,datetime('now')),
  ('seed-prof-res','precalc_residencial_v1','Pré-cálculo residencial','residencial','INI',1,datetime('now')),
  ('seed-prof-pub','precalc_publica_v1','Pré-cálculo pública','publica','INI',1,datetime('now'));

INSERT OR IGNORE INTO calculation_coefficients (id, profile_key, coeff_key, coeff_value, coeff_json, created_at)
VALUES
  ('seed-coef-1','precalc_comercial_v1','glazing_ratio_good',0.40,NULL,datetime('now')),
  ('seed-coef-2','precalc_comercial_v1','lighting_dpi_good',10.0,NULL,datetime('now')),
  ('seed-coef-3','precalc_comercial_v1','hvac_cop_good',3.2,NULL,datetime('now')),
  ('seed-coef-4','precalc_residencial_v1','u_wall_target',2.5,NULL,datetime('now')),
  ('seed-coef-5','precalc_publica_v1','min_level_goal_A',1.0,NULL,datetime('now'));

INSERT OR IGNORE INTO golden_case_results (id, case_key, description, input_json, expected_json, created_at)
VALUES
  ('seed-golden-1','commercial_large_2028_ini','Comercial >100k, vigência aplicável em 2028','{"typology":"comercial","population_band":"large","protocol_date":"2028-02-01"}','{"method":"INI","minLevel":"C","applicable":true}',datetime('now')),
  ('seed-golden-2','federal_public_2027_ini','Pública federal em 2027','{"typology":"publica","entity_scope":"federal","protocol_date":"2027-02-01"}','{"method":"INI","minLevel":"A","applicable":true}',datetime('now'));
