INSERT OR IGNORE INTO normative_packages (id,code,title,mode,effective_from,effective_to,is_active,metadata_json,created_at,updated_at)
VALUES
('pkg-ini-2026','INI-2026','Pacote INI 2026 (MVP)','INI','2026-01-01',NULL,1,'{"source":"seed","jurisdiction":"BR"}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pkg-rtq-legacy','RTQ-LEGACY','Pacote RTQ Legado (Transição)','RTQ','2024-01-01','2027-12-31',1,'{"source":"seed","legacy":true}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO normative_rules (id,package_id,rule_key,title,sort_order,criteria_json,outcome_json,effective_from,effective_to,is_active,notes,created_at,updated_at)
VALUES
('r1','pkg-ini-2026','PUBLICA_FEDERAL_A','Pública federal com meta A',10,'{"typologies":["publica"],"federalOnly":true}','{"minLevel":"A","decision":"Edificação pública federal exige meta A."}','2026-01-01',NULL,1,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('r2','pkg-ini-2026','COMERCIAL_C','Comercial meta mínima C (MVP)',20,'{"typologies":["comercial"]}','{"minLevel":"C","decision":"Tipologia comercial com meta mínima C no motor MVP."}','2026-01-01',NULL,1,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('r3','pkg-ini-2026','RESID_A','Residencial meta mínima A (MVP)',30,'{"typologies":["residencial"]}','{"minLevel":"A","decision":"Tipologia residencial com meta mínima A no motor MVP."}','2026-01-01',NULL,1,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('r4','pkg-rtq-legacy','LEGADO_C','RTQ legado com meta C',10,'{"classificationMethods":["RTQ_LEGADO"]}','{"minLevel":"C","decision":"Fluxo legado RTQ aplica meta C no MVP."}','2024-01-01','2027-12-31',1,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO calculation_profiles (id,code,title,formula_json,created_at,updated_at)
VALUES ('prof-precalc','VE_PRECALC_DEFAULT','Perfil de pré-cálculo VetorEco','{"version":"0.4.2","weights":{"checklist":0.35,"technical":0.55,"legalBonus":10}}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO calculation_coefficients (id,profile_id,coeff_key,coeff_value,metadata_json,created_at,updated_at)
VALUES
('coef1','prof-precalc','wwr_warning_threshold',50,'{"unit":"percent"}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('coef2','prof-precalc','wwr_max_threshold',80,'{"unit":"percent"}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
