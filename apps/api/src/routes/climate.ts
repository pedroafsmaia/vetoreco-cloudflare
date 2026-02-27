import { ok, err } from '../utils';
import { CLIMATE_ZONES, estimateClimateZone } from '../modules/climate';
import { clampStr, isValidUF, LIMITS } from '../input';

export function registerClimateRoutes(app: any) {
  app.get('/climate/zones', (c: any) => {
    const requestId = c.get('requestId');
    return c.json(ok(requestId, { zones: Object.values(CLIMATE_ZONES) }));
  });

  app.get('/climate/estimate', (c: any) => {
    const requestId = c.get('requestId');
    const city = clampStr(c.req.query('city'), LIMITS.city);
    const stateRaw = clampStr(c.req.query('state'), 2).toUpperCase();
    if (!city || !stateRaw) return c.json(err(requestId, 'INVALID_INPUT', 'Informe city e state.'), 400);
    if (!isValidUF(stateRaw)) return c.json(err(requestId, 'INVALID_INPUT', 'UF inválida. Use 2 letras (ex.: SP).'), 400);

    const estimate = estimateClimateZone(city, stateRaw);
    return c.json(ok(requestId, {
      city,
      state: stateRaw,
      zone: estimate.zone,
      method: estimate.method,
      confidence: estimate.confidence,
      disclaimer: 'Estimativa aproximada. Confirmar conforme norma oficial (NBR 15220-3 / mapa oficial).',
    }));
  });
}
