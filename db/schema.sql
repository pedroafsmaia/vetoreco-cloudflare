PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  typology TEXT NOT NULL,
  stage_current TEXT NOT NULL,
  area_m2 REAL,
  -- Meta do arquiteto (ex.: "mínimo", "otimizar", "alto") — não é a ENCE oficial.
  ence_target TEXT,
  -- Perfil técnico mínimo para orientar checklist/calculadoras (ZB, orientação, fachadas etc.).
  -- Guardado como JSON para evoluir sem migrações frequentes.
  profile_json TEXT,
  -- Pacote de conhecimento (normas/processo) usado para gerar o checklist.
  knowledge_pack_id TEXT NOT NULL DEFAULT 'ini_2025_05',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

CREATE TABLE IF NOT EXISTS project_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  task_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  meta_json TEXT,
  critical INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON project_tasks(project_id);

CREATE TABLE IF NOT EXISTS project_evidences (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT,
  stage TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  -- Tipos de evidência: link | file | text
  evidence_type TEXT NOT NULL DEFAULT 'link',
  -- Conteúdo quando evidence_type = 'text'
  content_text TEXT,
  -- Sugestão de onde isso se encaixa no RAC (ex.: "Inspeção de Projeto / Documentos")
  rac_section TEXT,
  meta_json TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(task_id) REFERENCES project_tasks(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_evidences_project_id ON project_evidences(project_id);
CREATE INDEX IF NOT EXISTS idx_evidences_task_id ON project_evidences(task_id);

CREATE TABLE IF NOT EXISTS project_calculations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT,
  calc_type TEXT NOT NULL,
  inputs_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(task_id) REFERENCES project_tasks(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_calcs_project_id ON project_calculations(project_id);
CREATE INDEX IF NOT EXISTS idx_calcs_task_id ON project_calculations(task_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  action TEXT NOT NULL,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);

-- Cache de dossiês (PDF) em R2 para reduzir CPU e custo de geração
CREATE TABLE IF NOT EXISTS project_dossier_cache (
  project_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  pdf_size INTEGER,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dossier_cache_user_id ON project_dossier_cache(user_id);
