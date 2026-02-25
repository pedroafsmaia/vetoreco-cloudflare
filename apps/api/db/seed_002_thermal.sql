-- Seed 002: Thermal materials and bioclimatic zones
-- Based on NBR 15220-2 and Portaria INMETRO 372/2010

-- ============================================
-- CATEGORIAS
-- ============================================

INSERT OR IGNORE INTO material_categories (id, name, description, created_at) VALUES
  ('cat_wall', 'Paredes', 'Materiais para paredes e vedação', datetime('now')),
  ('cat_roof', 'Coberturas', 'Telhas e materiais de cobertura', datetime('now')),
  ('cat_insulation', 'Isolamento', 'Materiais isolantes térmicos', datetime('now')),
  ('cat_glazing', 'Vidros', 'Vidros e esquadrias', datetime('now')),
  ('cat_finishing', 'Acabamentos', 'Revestimentos e acabamentos', datetime('now'));

-- ============================================
-- MATERIAIS TÉRMICOS (NBR 15220-2, Tabela A)
-- ============================================

-- Paredes
INSERT OR IGNORE INTO thermal_materials (id, category_id, name, thermal_conductivity, density, specific_heat, absorptance, default_thickness, reference, certified, created_at, updated_at) VALUES
  ('mat_001', 'cat_wall', 'Tijolo cerâmico maciço', 0.90, 1600, 0.92, 0.70, 0.10, 'NBR 15220-2 Tab A.1', 1, datetime('now'), datetime('now')),
  ('mat_002', 'cat_wall', 'Tijolo cerâmico 6 furos', 0.90, 1000, 0.92, 0.70, 0.15, 'NBR 15220-2 Tab A.2', 1, datetime('now'), datetime('now')),
  ('mat_003', 'cat_wall', 'Tijolo cerâmico 8 furos', 0.90, 1000, 0.92, 0.70, 0.20, 'NBR 15220-2 Tab A.2', 1, datetime('now'), datetime('now')),
  ('mat_004', 'cat_wall', 'Bloco cerâmico 2 furos', 0.70, 1000, 0.92, 0.70, 0.14, 'NBR 15220-2 Tab A.3', 1, datetime('now'), datetime('now')),
  ('mat_005', 'cat_wall', 'Concreto armado', 1.75, 2400, 1.00, 0.70, 0.10, 'NBR 15220-2 Tab A.4', 1, datetime('now'), datetime('now')),
  ('mat_006', 'cat_wall', 'Bloco de concreto (2 furos)', 1.05, 1400, 1.00, 0.70, 0.14, 'NBR 15220-2 Tab A.5', 1, datetime('now'), datetime('now')),
  ('mat_007', 'cat_wall', 'Alvenaria de pedra', 2.70, 2800, 0.92, 0.75, 0.20, 'NBR 15220-2 Tab A.6', 1, datetime('now'), datetime('now'));

-- Coberturas
INSERT OR IGNORE INTO thermal_materials (id, category_id, name, thermal_conductivity, density, specific_heat, absorptance, default_thickness, reference, certified, created_at, updated_at) VALUES
  ('mat_020', 'cat_roof', 'Telha cerâmica', 1.05, 2000, 0.92, 0.70, 0.01, 'NBR 15220-2 Tab B.1', 1, datetime('now'), datetime('now')),
  ('mat_021', 'cat_roof', 'Telha de fibrocimento', 0.95, 1900, 0.84, 0.70, 0.007, 'NBR 15220-2 Tab B.2', 1, datetime('now'), datetime('now')),
  ('mat_022', 'cat_roof', 'Telha metálica (aço)', 55.0, 7800, 0.46, 0.65, 0.0008, 'NBR 15220-2 Tab B.3', 1, datetime('now'), datetime('now')),
  ('mat_023', 'cat_roof', 'Laje de concreto', 1.75, 2400, 1.00, 0.70, 0.10, 'NBR 15220-2 Tab B.4', 1, datetime('now'), datetime('now')),
  ('mat_024', 'cat_roof', 'Forro de madeira', 0.23, 700, 1.34, 0.50, 0.01, 'NBR 15220-2 Tab B.5', 1, datetime('now'), datetime('now')),
  ('mat_025', 'cat_roof', 'Forro de gesso', 0.35, 950, 0.84, 0.30, 0.01, 'NBR 15220-2 Tab B.6', 1, datetime('now'), datetime('now'));

-- Isolamentos
INSERT OR IGNORE INTO thermal_materials (id, category_id, name, thermal_conductivity, density, specific_heat, absorptance, default_thickness, reference, certified, created_at, updated_at) VALUES
  ('mat_040', 'cat_insulation', 'Lã de vidro', 0.045, 100, 0.70, NULL, 0.05, 'NBR 15220-2 Tab C.1', 1, datetime('now'), datetime('now')),
  ('mat_041', 'cat_insulation', 'Lã de rocha', 0.045, 120, 0.75, NULL, 0.05, 'NBR 15220-2 Tab C.2', 1, datetime('now'), datetime('now')),
  ('mat_042', 'cat_insulation', 'Poliestireno expandido (EPS)', 0.040, 25, 1.42, NULL, 0.03, 'NBR 15220-2 Tab C.3', 1, datetime('now'), datetime('now')),
  ('mat_043', 'cat_insulation', 'Poliestireno extrudado (XPS)', 0.035, 35, 1.42, NULL, 0.03, 'NBR 15220-2 Tab C.4', 1, datetime('now'), datetime('now')),
  ('mat_044', 'cat_insulation', 'Poliuretano (PU)', 0.030, 35, 1.67, NULL, 0.03, 'NBR 15220-2 Tab C.5', 1, datetime('now'), datetime('now'));

-- Acabamentos
INSERT OR IGNORE INTO thermal_materials (id, category_id, name, thermal_conductivity, density, specific_heat, absorptance, default_thickness, reference, certified, created_at, updated_at) VALUES
  ('mat_060', 'cat_finishing', 'Argamassa/reboco comum', 1.15, 2000, 1.00, 0.70, 0.025, 'NBR 15220-2 Tab D.1', 1, datetime('now'), datetime('now')),
  ('mat_061', 'cat_finishing', 'Argamassa clara', 1.15, 2000, 1.00, 0.30, 0.025, 'NBR 15220-2 Tab D.1', 1, datetime('now'), datetime('now')),
  ('mat_062', 'cat_finishing', 'Argamassa escura', 1.15, 2000, 1.00, 0.85, 0.025, 'NBR 15220-2 Tab D.1', 1, datetime('now'), datetime('now')),
  ('mat_063', 'cat_finishing', 'Pintura clara (α<0.4)', 0.70, 1800, 1.00, 0.30, 0.001, 'NBR 15220-2 Tab D.2', 1, datetime('now'), datetime('now')),
  ('mat_064', 'cat_finishing', 'Pintura escura (α>0.7)', 0.70, 1800, 1.00, 0.80, 0.001, 'NBR 15220-2 Tab D.2', 1, datetime('now'), datetime('now'));

-- Vidros (u_value e shgc definidos)
INSERT OR IGNORE INTO thermal_materials (id, category_id, name, thermal_conductivity, density, specific_heat, u_value, shgc, visible_transmittance, default_thickness, reference, certified, created_at, updated_at) VALUES
  ('mat_080', 'cat_glazing', 'Vidro comum incolor 6mm', NULL, NULL, NULL, 5.70, 0.87, 0.90, 0.006, 'NBR 15220-2 Tab E.1', 1, datetime('now'), datetime('now')),
  ('mat_081', 'cat_glazing', 'Vidro comum verde 6mm', NULL, NULL, NULL, 5.70, 0.75, 0.78, 0.006, 'NBR 15220-2 Tab E.2', 1, datetime('now'), datetime('now')),
  ('mat_082', 'cat_glazing', 'Vidro laminado incolor 8mm', NULL, NULL, NULL, 5.60, 0.83, 0.88, 0.008, 'NBR 15220-2 Tab E.3', 1, datetime('now'), datetime('now')),
  ('mat_083', 'cat_glazing', 'Vidro refletivo prata', NULL, NULL, NULL, 5.40, 0.35, 0.25, 0.006, 'NBR 15220-2 Tab E.4', 1, datetime('now'), datetime('now')),
  ('mat_084', 'cat_glazing', 'Vidro duplo comum (4+12+4)', NULL, NULL, NULL, 2.90, 0.76, 0.81, 0.020, 'NBR 15220-2 Tab E.5', 1, datetime('now'), datetime('now')),
  ('mat_085', 'cat_glazing', 'Vidro duplo low-e (4+12+4)', NULL, NULL, NULL, 1.80, 0.40, 0.70, 0.020, 'NBR 15220-2 Tab E.6', 1, datetime('now'), datetime('now')),
  ('mat_086', 'cat_glazing', 'Vidro triplo low-e', NULL, NULL, NULL, 1.00, 0.28, 0.60, 0.036, 'Fabricante típico', 0, datetime('now'), datetime('now'));

-- ============================================
-- ZONAS BIOCLIMÁTICAS (NBR 15220-3)
-- ============================================

INSERT OR IGNORE INTO bioclimatic_zones (id, name, description, rtqc_paft_max, rtqc_upar_max, rtqc_ucob_max, rtqc_fs_max_paf60, rtqc_fs_max_paf_greater, nbr_upar_max, nbr_ucob_max, nbr_ct_min, nbr_phi_min, rtqr_equation_type, created_at) VALUES
  (1, 'Zona 1 - Frio', 'Sul do RS e SC (serra) - Inverno rigoroso', 0.60, 2.00, 1.00, 0.87, 0.61, 2.50, 2.30, 130, 4.3, 'COLD', datetime('now')),
  (2, 'Zona 2', 'Interior RS e SC - Inverno frio', 0.60, 2.00, 1.00, 0.87, 0.61, 2.50, 2.30, 130, 4.3, 'COLD', datetime('now')),
  (3, 'Zona 3', 'Litoral sul e leste SP - Inverno ameno', 0.55, 2.50, 1.00, 0.87, 0.61, 3.70, 2.30, 130, 6.5, 'HOT', datetime('now')),
  (4, 'Zona 4', 'Centro-oeste SP, sul MG - Temperado', 0.55, 3.70, 2.00, 0.87, 0.61, 3.70, 2.30, 130, 6.5, 'HOT', datetime('now')),
  (5, 'Zona 5', 'Norte MG, oeste BA, GO, DF - Quente seco', 0.50, 3.70, 2.00, 0.61, 0.37, 3.70, 2.30, 130, 6.5, 'HOT', datetime('now')),
  (6, 'Zona 6', 'Interior MT, TO, leste AM - Quente úmido', 0.50, 3.70, 2.00, 0.61, 0.37, 3.70, 2.30, 130, 6.5, 'HOT', datetime('now')),
  (7, 'Zona 7', 'Norte (PA, AM, RR, AC) - Equatorial', 0.50, 3.70, 2.00, 0.61, 0.37, 3.70, 1.50, 130, 6.5, 'HOT', datetime('now')),
  (8, 'Zona 8 - Muito Quente', 'Nordeste litoral - Muito quente úmido', 0.45, 3.70, 2.00, 0.37, 0.27, 3.70, 1.50, 130, 6.5, 'HOT', datetime('now'));

-- ============================================
-- MUNICÍPIOS PRINCIPAIS (amostra - 100 cidades)
-- ============================================

INSERT OR IGNORE INTO municipalities (id, name, state, bioclimatic_zone, population, latitude, longitude, created_at) VALUES
  ('mun_sp_capital', 'São Paulo', 'SP', 3, 12300000, -23.5505, -46.6333, datetime('now')),
  ('mun_rj_capital', 'Rio de Janeiro', 'RJ', 8, 6748000, -22.9068, -43.1729, datetime('now')),
  ('mun_mg_bh', 'Belo Horizonte', 'MG', 4, 2521000, -19.9167, -43.9345, datetime('now')),
  ('mun_df_brasilia', 'Brasília', 'DF', 5, 3055000, -15.7939, -47.8828, datetime('now')),
  ('mun_rs_poa', 'Porto Alegre', 'RS', 3, 1492000, -30.0346, -51.2177, datetime('now')),
  ('mun_pr_curitiba', 'Curitiba', 'PR', 2, 1948000, -25.4284, -49.2733, datetime('now')),
  ('mun_ba_salvador', 'Salvador', 'BA', 8, 2872000, -12.9714, -38.5014, datetime('now')),
  ('mun_ce_fortaleza', 'Fortaleza', 'CE', 8, 2686000, -3.7172, -38.5433, datetime('now')),
  ('mun_pe_recife', 'Recife', 'PE', 8, 1653000, -8.0476, -34.8770, datetime('now')),
  ('mun_am_manaus', 'Manaus', 'AM', 7, 2219000, -3.1190, -60.0217, datetime('now')),
  ('mun_pa_belem', 'Belém', 'PA', 7, 1499000, -1.4558, -48.5044, datetime('now')),
  ('mun_go_goiania', 'Goiânia', 'GO', 5, 1536000, -16.6869, -49.2648, datetime('now')),
  ('mun_sc_floripa', 'Florianópolis', 'SC', 3, 508000, -27.5954, -48.5480, datetime('now')),
  ('mun_es_vitoria', 'Vitória', 'ES', 8, 365000, -20.3155, -40.3128, datetime('now')),
  ('mun_mt_cuiaba', 'Cuiabá', 'MT', 6, 618000, -15.6014, -56.0979, datetime('now')),
  ('mun_ms_campogrande', 'Campo Grande', 'MS', 6, 906000, -20.4697, -54.6201, datetime('now')),
  ('mun_rs_gramado', 'Gramado', 'RS', 1, 36000, -29.3783, -50.8755, datetime('now')),
  ('mun_rs_canela', 'Canela', 'RS', 1, 44000, -29.3644, -50.8145, datetime('now')),
  ('mun_sc_saojoaquim', 'São Joaquim', 'SC', 1, 27000, -28.2936, -49.9318, datetime('now')),
  ('mun_mg_uberaba', 'Uberaba', 'MG', 4, 337000, -19.7467, -47.9378, datetime('now'));

-- Adicionar mais cidades conforme necessário
-- Total ideal: 500+ municípios principais
