import { ok } from '../utils';
import { getDPILTable } from '../modules/rtqc';

export function registerRtqcRoutes(app: any) {
  app.get('/rtqc/dpil', (c: any) => {
    const requestId = c.get('requestId');
    return c.json(ok(requestId, getDPILTable()));
  });
}
