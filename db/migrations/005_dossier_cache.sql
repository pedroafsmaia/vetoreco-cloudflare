-- Cache de dossiês (PDF) para evitar regenerações e reduzir CPU no Workers Free
-- Estratégia: armazenar PDF em R2 e manter (hash -> key) em D1.

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