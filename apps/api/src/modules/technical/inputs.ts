import { assert } from '../../utils';

export type TechnicalInputs = {
  general: {
    zona_bioclimatica?: number | null;
    area_util_m2?: number | null;
    pavimentos?: number | null;
  };
  envelope: {
    area_fachada_envidracada_m2?: number | null;
    area_fachada_total_m2?: number | null;
    possui_protecao_solar?: boolean | null;
    cobertura_u?: number | null;
    parede_u?: number | null;
  };
  systems: {
    iluminacao_dpi_w_m2?: number | null;
    hvac_cop?: number | null;
    aquecimento_agua_tipo?: string | null;
  };
  declaration: {
    use_autodeclaracao?: boolean;
    responsavel_nome?: string | null;
    responsavel_registro?: string | null;
  };
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  coverage: number;
  missingRequired: string[];
};

function num(input: any): number | null {
  if (input === '' || input === undefined || input === null) return null;
  const n = Number(input);
  return Number.isFinite(n) ? n : null;
}

export function normalizeTechnicalInputs(raw: any): TechnicalInputs {
  return {
    general: {
      zona_bioclimatica: num(raw?.general?.zona_bioclimatica),
      area_util_m2: num(raw?.general?.area_util_m2),
      pavimentos: num(raw?.general?.pavimentos),
    },
    envelope: {
      area_fachada_envidracada_m2: num(raw?.envelope?.area_fachada_envidracada_m2),
      area_fachada_total_m2: num(raw?.envelope?.area_fachada_total_m2),
      possui_protecao_solar: raw?.envelope?.possui_protecao_solar ?? null,
      cobertura_u: num(raw?.envelope?.cobertura_u),
      parede_u: num(raw?.envelope?.parede_u),
    },
    systems: {
      iluminacao_dpi_w_m2: num(raw?.systems?.iluminacao_dpi_w_m2),
      hvac_cop: num(raw?.systems?.hvac_cop),
      aquecimento_agua_tipo: raw?.systems?.aquecimento_agua_tipo ?? null,
    },
    declaration: {
      use_autodeclaracao: Boolean(raw?.declaration?.use_autodeclaracao),
      responsavel_nome: raw?.declaration?.responsavel_nome ?? null,
      responsavel_registro: raw?.declaration?.responsavel_registro ?? null,
    },
  };
}

export function validateTechnicalInputs(inputs: TechnicalInputs, typology: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingRequired: string[] = [];

  const requiredFields: Array<[string, any]> = [
    ['general.zona_bioclimatica', inputs.general.zona_bioclimatica],
    ['general.area_util_m2', inputs.general.area_util_m2],
    ['envelope.area_fachada_total_m2', inputs.envelope.area_fachada_total_m2],
    ['envelope.area_fachada_envidracada_m2', inputs.envelope.area_fachada_envidracada_m2],
    ['envelope.parede_u', inputs.envelope.parede_u],
    ['envelope.cobertura_u', inputs.envelope.cobertura_u],
  ];

  if (typology !== 'residencial') {
    requiredFields.push(['systems.iluminacao_dpi_w_m2', inputs.systems.iluminacao_dpi_w_m2]);
    requiredFields.push(['systems.hvac_cop', inputs.systems.hvac_cop]);
  } else {
    requiredFields.push(['systems.aquecimento_agua_tipo', inputs.systems.aquecimento_agua_tipo]);
  }

  for (const [path, value] of requiredFields) {
    const filled = value !== null && value !== undefined && value !== '';
    if (!filled) missingRequired.push(path);
  }

  const totalChecks = requiredFields.length;
  const coverage = Math.round(((totalChecks - missingRequired.length) / totalChecks) * 100);

  if (inputs.general.zona_bioclimatica !== null) {
    if (inputs.general.zona_bioclimatica! < 1 || inputs.general.zona_bioclimatica! > 8) {
      errors.push('Zona bioclimática deve estar entre 1 e 8.');
    }
  }

  const aVidro = inputs.envelope.area_fachada_envidracada_m2;
  const aTotal = inputs.envelope.area_fachada_total_m2;
  if (aVidro !== null && aTotal !== null) {
    if (aTotal <= 0) errors.push('Área de fachada total deve ser maior que zero.');
    if (aVidro < 0) errors.push('Área envidraçada não pode ser negativa.');
    if (aVidro > aTotal) errors.push('Área envidraçada não pode ser maior que área total de fachada.');
    if (aTotal > 0 && aVidro / aTotal > 0.65) warnings.push('Alta razão de área envidraçada; revisar proteção solar e cargas térmicas.');
  }

  if (inputs.systems.hvac_cop !== null && inputs.systems.hvac_cop < 1) {
    errors.push('COP do HVAC deve ser maior que 1.');
  }

  if (inputs.declaration.use_autodeclaracao) {
    if (!inputs.declaration.responsavel_nome) warnings.push('Autodeclaração marcada sem nome do responsável.');
    if (!inputs.declaration.responsavel_registro) warnings.push('Autodeclaração marcada sem registro profissional.');
  }

  if (missingRequired.length > 0) {
    warnings.push(`Cobertura parcial de inputs (${coverage}%).`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    coverage,
    missingRequired,
  };
}

export function assertTechnicalInputsValid(inputs: TechnicalInputs, typology: string) {
  const result = validateTechnicalInputs(inputs, typology);
  assert(result.valid, 400, 'INVALID_TECHNICAL_INPUTS', 'Erros de validação nos inputs técnicos', result);
  return result;
}
