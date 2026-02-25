PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  is_super_admin INTEGER NOT NULL DEFAULT 0,
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
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(organization_id, user_id),
  FOREIGN KEY(organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  municipality_size TEXT NOT NULL,
  typology TEXT NOT NULL,
  phase TEXT NOT NULL,
  protocol_year INTEGER NOT NULL,
  area_m2 REAL,
  is_federal_public INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  label TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_checklist_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, item_id),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_regulatory_context (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  classification_method TEXT NOT NULL,
  protocol_date TEXT,
  permit_protocol_date TEXT,
  public_tender_date TEXT,
  municipality_population_band TEXT,
  public_entity_level TEXT NOT NULL DEFAULT 'na',
  is_public_building INTEGER NOT NULL DEFAULT 0,
  requests_autodeclaration INTEGER NOT NULL DEFAULT 0,
  legacy_reason TEXT,
  legacy_ence_project_evidence TEXT,
  notes TEXT,
  updated_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(updated_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS technical_inputs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  updated_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(updated_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS normative_packages (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  mode TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS normative_rules (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  criteria_json TEXT NOT NULL,
  outcome_json TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(package_id, rule_key),
  FOREIGN KEY(package_id) REFERENCES normative_packages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calculation_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  normative_package_id TEXT,
  algorithm_version TEXT NOT NULL,
  status TEXT NOT NULL,
  input_snapshot_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(normative_package_id) REFERENCES normative_packages(id) ON DELETE SET NULL,
  FOREIGN KEY(created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS golden_case_results (
  id TEXT PRIMARY KEY,
  case_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  normative_package_id TEXT,
  input_json TEXT NOT NULL,
  expected_output_json TEXT NOT NULL,
  tolerance_json TEXT,
  notes TEXT,
  updated_by_user_id TEXT NOT NULL,
  source_url TEXT,
  normative_code TEXT,
  building_type TEXT,
  bioclimatic_zone TEXT,
  data_quality TEXT,
  completeness_pct REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (normative_package_id) REFERENCES normative_packages(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  project_id TEXT,
  action TEXT NOT NULL,
  details_json TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL
);

-- Tabelas auxiliares para evolução do motor canônico (P1/P2)
CREATE TABLE IF NOT EXISTS calculation_profiles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  formula_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calculation_coefficients (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  coeff_key TEXT NOT NULL,
  coeff_value REAL NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(profile_id, coeff_key),
  FOREIGN KEY(profile_id) REFERENCES calculation_profiles(id) ON DELETE CASCADE
);
