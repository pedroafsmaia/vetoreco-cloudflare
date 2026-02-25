export type ApiResponse<T = any> = { success: boolean; requestId: string; data?: T; error?: { code: string; message: string; details?: any } };

const API_BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) return (res as unknown) as T;
  const json = await res.json() as ApiResponse<T>;
  if (!res.ok || !json.success) throw new Error(json.error?.message || 'Erro na API');
  return json.data as T;
}

export const api = {
  register: (payload: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  organizations: () => request('/organizations'),
  createProject: (orgId: string, payload: any) => request('/projects', { method: 'POST', headers: { 'X-Organization-Id': orgId }, body: JSON.stringify(payload) }),
  listProjects: (orgId: string) => request('/projects', { headers: { 'X-Organization-Id': orgId } }),
  createDemo: (orgId: string) => request('/projects/demo', { method: 'POST', headers: { 'X-Organization-Id': orgId } }),
  getChecklist: (orgId: string, projectId: string) => request(`/projects/${projectId}/checklist`, { headers: { 'X-Organization-Id': orgId } }),
  saveChecklist: (orgId: string, projectId: string, items: any[]) => request(`/projects/${projectId}/checklist`, { method: 'PUT', headers: { 'X-Organization-Id': orgId }, body: JSON.stringify({ items }) }),
  getContext: (orgId: string, projectId: string) => request(`/projects/${projectId}/regulatory-context`, { headers: { 'X-Organization-Id': orgId } }),
  saveContext: (orgId: string, projectId: string, payload: any) => request(`/projects/${projectId}/regulatory-context`, { method: 'PUT', headers: { 'X-Organization-Id': orgId }, body: JSON.stringify(payload) }),
  getInputs: (orgId: string, projectId: string) => request(`/projects/${projectId}/technical-inputs`, { headers: { 'X-Organization-Id': orgId } }),
  saveInputs: (orgId: string, projectId: string, inputs: any) => request(`/projects/${projectId}/technical-inputs`, { method: 'PUT', headers: { 'X-Organization-Id': orgId }, body: JSON.stringify({ inputs }) }),
  runCalc: (orgId: string, projectId: string) => request(`/projects/${projectId}/calculation/run`, { method: 'POST', headers: { 'X-Organization-Id': orgId } }),
  latestCalc: (orgId: string, projectId: string) => request(`/projects/${projectId}/calculation/latest`, { headers: { 'X-Organization-Id': orgId } }),
  getThermalQuick: (orgId: string, projectId: string) => request(`/projects/${projectId}/thermal/quick`, { headers: { 'X-Organization-Id': orgId } }),
  saveThermalQuick: (orgId: string, projectId: string, thermal: any) => request(`/projects/${projectId}/thermal/quick`, { method: 'PUT', headers: { 'X-Organization-Id': orgId }, body: JSON.stringify({ thermal }) }),
  runThermalCalc: (orgId: string, projectId: string, payload?: any) => request(`/projects/${projectId}/thermal/calculate`, { method: 'POST', headers: { 'X-Organization-Id': orgId }, body: JSON.stringify(payload || {}) }),
  latestThermalCalc: (orgId: string, projectId: string) => request(`/projects/${projectId}/thermal/latest`, { headers: { 'X-Organization-Id': orgId } }),
  thermalZones: () => request(`/thermal/catalog/zones`),
  thermalMunicipalities: (q: string, state?: string) => request(`/thermal/catalog/municipalities?q=${encodeURIComponent(q)}${state ? `&state=${encodeURIComponent(state)}` : ''}`),
  legalFraming: (orgId: string, projectId: string) => request(`/projects/${projectId}/legal-framing`, { headers: { 'X-Organization-Id': orgId } }),
  memorial: (orgId: string, projectId: string) => request(`/projects/${projectId}/memorial`, { headers: { 'X-Organization-Id': orgId } }),
  dossier: (orgId: string, projectId: string) => request(`/projects/${projectId}/dossier`, { headers: { 'X-Organization-Id': orgId } }),
  memorialPdfUrl: (projectId: string, orgId: string) => `${API_BASE}/projects/${projectId}/memorial.pdf?orgId=${encodeURIComponent(orgId)}`
};
