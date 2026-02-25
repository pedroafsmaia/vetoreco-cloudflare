import { nowIso, randomId } from './utils';

export async function audit(c: any, action: string, details?: unknown, projectId?: string) {
  try {
    await c.env.DB.prepare(
      `INSERT INTO audit_logs (id,user_id,project_id,action,details_json,request_id,created_at) VALUES (?,?,?,?,?,?,?)`,
    )
      .bind(
        randomId(),
        c.get('userId') || null,
        projectId || null,
        action,
        details ? JSON.stringify(details) : null,
        c.get('requestId') || null,
        nowIso(),
      )
      .run();
  } catch (err) {
    console.error('audit_failed', err);
  }
}

export async function snapshotProject(c: any, projectId: string, snapshot: unknown, labelPrefix = 'auto') {
  await c.env.DB.prepare(`INSERT INTO project_versions (id,project_id,version_label,snapshot_json,created_at) VALUES (?,?,?,?,?)`)
    .bind(randomId(), projectId, `${labelPrefix}-${nowIso()}`, JSON.stringify(snapshot), nowIso())
    .run();
}

export async function getOwnedProject(c: any, projectId: string) {
  return c.env.DB.prepare(`SELECT * FROM projects WHERE id=? AND user_id=?`).bind(projectId, c.get('userId')).first<any>();
}
