-- Migration 002: Thermal calculations infrastructure
-- Adds tables for materials, zones, and thermal calculations

PRAGMA foreign_keys = ON;

-- ============================================
-- CATEGORIAS DE MATERIAIS
-- ============================================

CREATE TABLE IF NOT EXISTS material_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);

-- ============================================
-- MATERIAIS TÉRMICOS
-- ============================================

CREATE TABLE IF NOT EXISTS thermal_materials (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- Propriedades térmicas (NBR 15220-2)
  thermal_conductivity REAL,           -- λ (W/m·K)
  density REAL,                       -- ρ (kg/m³)
  specific_heat REAL,                 -- c (kJ/kg·K)
  
  -- Propriedades óticas
  absorptance REAL,                     -- α (0-1)
  emissivity REAL,                      -- ε (0-1)
  
  -- Para vidros
  u_value REAL,                         -- U vidro (W/m²·K)
  shgc REAL,                            -- Fator solar (0-1)
  visible_transmittance REAL,           -- Tv (0-1)
  
  -- Espessura padrão
  default_thickness REAL,               -- metros
  
  -- Metadados
  reference TEXT,                       -- NBR, fabricante
  certified BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (category_id) REFERENCES material_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_materials_category ON thermal_materials(category_id);

-- ============================================
-- ZONAS BIOCLIMÁTICAS (NBR 15220-3)
-- ============================================

CREATE TABLE IF NOT EXISTS bioclimatic_zones (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Limites RTQ-C (Portaria INMETRO 372/2010)
  rtqc_paft_max REAL NOT NULL,          -- PAFt máximo
  rtqc_upar_max REAL NOT NULL,          -- U parede máximo (W/m²·K)
  rtqc_ucob_max REAL NOT NULL,          -- U cobertura máximo
  rtqc_fs_max_paf60 REAL NOT NULL,      -- FS máx se PAF≤60%
  rtqc_fs_max_paf_greater REAL NOT NULL, -- FS máx se PAF>60%
  
  -- Limites NBR 15575
  nbr_upar_max REAL NOT NULL,
  nbr_ucob_max REAL NOT NULL,
  nbr_ct_min REAL NOT NULL,             -- Capacidade térmica mín
  nbr_phi_min REAL NOT NULL,            -- Atraso térmico mín (h)
  
  -- Equação RTQ-R (JSON)
  rtqr_equation_type TEXT NOT NULL,     -- 'COLD' ou 'HOT'
  
  created_at TEXT NOT NULL
);

-- ============================================
-- MUNICÍPIOS COM ZONA BIOCLIMÁTICA
-- ============================================

CREATE TABLE IF NOT EXISTS municipalities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  bioclimatic_zone INTEGER NOT NULL,
  population INTEGER,
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL,
  
  UNIQUE(name, state),
  FOREIGN KEY (bioclimatic_zone) REFERENCES bioclimatic_zones(id)
);

CREATE INDEX IF NOT EXISTS idx_municipalities_state ON municipalities(state);
CREATE INDEX IF NOT EXISTS idx_municipalities_zone ON municipalities(bioclimatic_zone);

-- ============================================
-- TIPOS DE PAREDE DO PROJETO
-- ============================================

CREATE TABLE IF NOT EXISTS project_wall_types (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  orientation TEXT,  -- N, S, L, O, NE, NO, SE, SO
  
  -- Camadas (JSON array)
  layers_json TEXT NOT NULL,
  
  -- Resultados calculados
  u_value REAL,
  thermal_capacity REAL,
  time_lag REAL,
  solar_factor REAL,
  
  -- Área
  total_area REAL,
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wall_types_project ON project_wall_types(project_id);

-- ============================================
-- TIPOS DE COBERTURA DO PROJETO
-- ============================================

CREATE TABLE IF NOT EXISTS project_roof_types (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  
  layers_json TEXT NOT NULL,
  u_value REAL,
  thermal_capacity REAL,
  time_lag REAL,
  solar_factor REAL,
  total_area REAL,
  
  has_attic BOOLEAN DEFAULT 0,
  attic_ventilated BOOLEAN DEFAULT 0,
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================
-- ABERTURAS (JANELAS) DO PROJETO
-- ============================================

CREATE TABLE IF NOT EXISTS project_windows (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  orientation TEXT,
  
  -- Dimensões
  width REAL NOT NULL,
  height REAL NOT NULL,
  quantity INTEGER DEFAULT 1,
  
  -- Vidro
  glazing_material_id TEXT,
  u_value REAL,
  shgc REAL,
  
  -- Proteção solar
  has_shading BOOLEAN DEFAULT 0,
  shading_type TEXT,
  shading_depth REAL,
  
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (glazing_material_id) REFERENCES thermal_materials(id)
);

-- ============================================
-- SISTEMAS DE ILUMINAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS project_lighting_zones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  area REAL NOT NULL,
  
  total_power REAL NOT NULL,
  lamp_type TEXT,
  luminous_efficacy REAL,
  
  has_daylight_control BOOLEAN DEFAULT 0,
  has_occupancy_sensor BOOLEAN DEFAULT 0,
  has_dimming BOOLEAN DEFAULT 0,
  
  power_density REAL,  -- Calculado
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================
-- SISTEMAS DE HVAC
-- ============================================

CREATE TABLE IF NOT EXISTS project_hvac_systems (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  system_name TEXT NOT NULL,
  
  system_type TEXT NOT NULL,
  conditioned_area REAL NOT NULL,
  
  equipment_brand TEXT,
  equipment_model TEXT,
  capacity_btu REAL,
  cop REAL,
  eer REAL,
  
  inmetro_certified BOOLEAN DEFAULT 0,
  inmetro_label TEXT,
  
  has_individual_control BOOLEAN DEFAULT 0,
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================
-- RESULTADOS DE CÁLCULOS TÉRMICOS
-- ============================================

CREATE TABLE IF NOT EXISTS project_thermal_calculations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  calculation_date TEXT NOT NULL,
  
  bioclimatic_zone INTEGER NOT NULL,
  project_type TEXT NOT NULL,
  total_area REAL NOT NULL,
  conditioned_area REAL,
  
  -- Envoltória - Agregados
  avg_wall_u REAL,
  avg_roof_u REAL,
  avg_window_u REAL,
  paft REAL,
  avg_shgc REAL,
  avg_wall_absorptance REAL,
  avg_roof_absorptance REAL,
  
  -- RTQ-R
  rtqr_eq_num_env REAL,
  rtqr_rating TEXT,
  
  -- RTQ-C
  rtqc_envelope_score REAL,
  rtqc_lighting_score REAL,
  rtqc_hvac_score REAL,
  rtqc_total_score REAL,
  rtqc_rating TEXT,
  
  -- NBR 15575
  nbr_compliant BOOLEAN,
  nbr_violations_json TEXT,
  
  calculation_method TEXT,
  valid BOOLEAN DEFAULT 1,
  notes TEXT,
  
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (bioclimatic_zone) REFERENCES bioclimatic_zones(id)
);

CREATE INDEX IF NOT EXISTS idx_thermal_calc_project ON project_thermal_calculations(project_id);

-- ============================================
-- VERIFICAÇÕES DE CONFORMIDADE
-- ============================================

CREATE TABLE IF NOT EXISTS project_compliance_checks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  calculation_id TEXT NOT NULL,
  check_date TEXT NOT NULL,
  
  checks_json TEXT NOT NULL,
  overall_compliant BOOLEAN,
  critical_issues INTEGER DEFAULT 0,
  warnings INTEGER DEFAULT 0,
  
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (calculation_id) REFERENCES project_thermal_calculations(id) ON DELETE CASCADE
);

-- ============================================
-- ADICIONAR COLUNA EM PROJECTS
-- ============================================

ALTER TABLE projects ADD COLUMN bioclimatic_zone INTEGER;
ALTER TABLE projects ADD COLUMN total_built_area REAL;
ALTER TABLE projects ADD COLUMN conditioned_area REAL;
