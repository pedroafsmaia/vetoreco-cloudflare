import type { Hono } from 'hono';
import { ok, err } from '../utils';
import { EDUCATIONAL_LIBRARY } from '../modules/educational';

export function registerEducationRoutes(app: any) {
  app.get('/education/topics', (c: any) => {
    const requestId = c.get('requestId');
    const topics = Object.entries(EDUCATIONAL_LIBRARY).map(([key, v]: any) => ({
      key,
      title: v.title,
      summary: v.summary,
      references: v.references || [],
      relatedTopics: v.relatedTopics || [],
    }));
    return c.json(ok(requestId, { topics }));
  });

  app.get('/education/topics/:key', (c: any) => {
    const requestId = c.get('requestId');
    const key = c.req.param('key');
    const topic = (EDUCATIONAL_LIBRARY as any)[key];
    if (!topic) return c.json(err(requestId, 'NOT_FOUND', 'Tópico não encontrado.'), 404);
    return c.json(ok(requestId, { key, topic }));
  });
}
