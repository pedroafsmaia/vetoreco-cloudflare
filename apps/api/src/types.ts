export type MunicipalityBand = 'small' | 'medium' | 'large';
export type Typology = 'residencial' | 'comercial' | 'publica';
export type PublicEntityLevel = 'na' | 'municipal' | 'estadual' | 'distrital' | 'federal';
export type ClassificationMethod = 'INI' | 'RTQ_LEGADO';

export type Bindings = {
  DB: D1Database;
  APP_ORIGIN: string;
  ENABLE_PDF?: string;
};

export type Variables = {
  requestId: string;
  repo: import('./repo').Repo;
  userId: string;
  sessionId: string;
  isSuperAdmin: boolean;
  organizationId: string;
};

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  is_super_admin: number;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  last_seen_at: string;
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

export type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
};

export type ProjectRow = {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  city: string;
  state: string;
  municipality_size: MunicipalityBand;
  typology: Typology;
  phase: string;
  protocol_year: number;
  area_m2: number | null;
  is_federal_public: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ChecklistItemRow = {
  item_id: string;
  checked: number;
};

export type RegulatoryContextRow = {
  id: string;
  project_id: string;
  classification_method: ClassificationMethod;
  protocol_date: string | null;
  permit_protocol_date: string | null;
  public_tender_date: string | null;
  municipality_population_band: MunicipalityBand | null;
  public_entity_level: PublicEntityLevel;
  is_public_building: number;
  requests_autodeclaration: number;
  legacy_reason: string | null;
  legacy_ence_project_evidence: string | null;
  notes: string | null;
  updated_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type TechnicalInputs = {
  general: {
    climateZone?: string;
    floors?: number;
    conditionedAreaM2?: number;
    useHoursPerDay?: number;
  };
  envelope: {
    wallUValue?: number;
    roofUValue?: number;
    windowToWallRatio?: number;
    shadingFactor?: number;
  };
  systems: {
    lightingLPD?: number;
    hvacType?: string;
    hvacCop?: number;
    waterHeatingType?: string;
  };
  autodeclaration: {
    requested?: boolean;
    justification?: string;
  };
};

export type TechnicalInputsRow = {
  id: string;
  project_id: string;
  payload_json: string;
  updated_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type NormativePackageRow = {
  id: string;
  code: string;
  title: string;
  mode: 'INI' | 'RTQ';
  effective_from: string;
  effective_to: string | null;
  is_active: number;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
};

export type NormativeRuleRow = {
  id: string;
  package_id: string;
  rule_key: string;
  title: string;
  sort_order: number;
  criteria_json: string;
  outcome_json: string;
  effective_from: string;
  effective_to: string | null;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CalculationRunRecord = {
  id: string;
  project_id: string;
  normative_package_id: string | null;
  algorithm_version: string;
  status: string;
  input_snapshot_json: string;
  output_json: string;
  created_by_user_id: string;
  created_at: string;
};

export type GoldenCaseRow = {
  id: string;
  case_key: string;
  label: string;
  normative_package_id: string | null;
  input_json: string;
  expected_output_json: string;
  tolerance_json: string | null;
  notes: string | null;
  updated_by_user_id: string;
  source_url?: string | null;
  normative_code?: string | null;
  building_type?: string | null;
  bioclimatic_zone?: string | null;
  data_quality?: string | null;
  completeness_pct?: number | null;
  created_at: string;
  updated_at: string;
};

export type LegalFramingResult = {
  applicable: boolean;
  minLevel: 'A' | 'C' | 'NZEB' | 'PLANEJAR';
  compliancePath: 'FORMAL' | 'AUTODECLARACAO';
  classificationMethod: ClassificationMethod;
  modeBadge: 'INI' | 'RTQ_LEGADO';
  effectiveDate: string | null;
  decisionTrail: string[];
  warnings: string[];
  disclaimers: string[];
  normativePackage: NormativePackageRow | null;
};

export type ChecklistTemplateItem = {
  id: string;
  label: string;
  category: string;
  stage: string;
  critical: boolean;
  required: boolean;
  typologies: Typology[];
  order: number;
};

export type ChecklistSummary = {
  items: ChecklistTemplateItem[];
  coverage: { done: number; total: number; percent: number };
  criticalMissing: number;
  status: 'VERDE' | 'AMARELO' | 'VERMELHO';
  message: string;
};

export type TechnicalValidationResult = {
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
  coverage: { filled: number; total: number; percent: number };
};

export type CalculationOutput = {
  algorithmVersion: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  checklistCoveragePercent: number;
  legal: {
    applicable: boolean;
    minLevel: string;
    compliancePath: string;
    method: string;
  };
  blocks: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  disclaimers: string[];
};

export type ApiSuccess<T> = {
  success: true;
  requestId: string;
  data: T;
};

export type ApiError = {
  success: false;
  requestId: string;
  error: { code: string; message: string; details?: unknown };
};
