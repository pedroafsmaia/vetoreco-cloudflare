import React, { useEffect, useMemo, useState } from 'react';
import { req } from './api';

type Project = any;

const blankProject = {
  name: 'Novo Projeto',
  city: 'Araguari',
  state: 'MG',
  municipality_size: 'large',
  typology: 'comercial',
  phase: 'anteprojeto',
  protocol_year: new Date().getFullYear(),
  area_m2: '',
  is_federal_public: false,
  notes: '',
};

const blankInputs = {
  general: { zona_bioclimatica: '', area_util_m2: '', pavimentos: '' },
  envelope: { area_fachada_envidracada_m2: '', area_fachada_total_m2: '', possui_protecao_solar: false, cobertura_u: '', parede_u: '' },
  systems: { iluminacao_dpi_w_m2: '', hvac_cop: '', aquecimento_agua_tipo: '' },
  declaration: { use_autodeclaracao: false, responsavel_nome: '', responsavel_registro: '' },
};

const blankContext = {
  protocol_date: '',
  permit_issue_date: '',
  public_bid_date: '',
  population_band: 'large',
  entity_scope: 'privado',
  classification_method: 'INI',
  legacy_reason: '',
  evidence_ence_projeto_legacy: '',
  state_code: 'MG',
  autodeclaration_requested: false,
};

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [auth, setAuth] = useState({ mode: 'login' as 'login' | 'register', email: '', password: '' });
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [project, setProject] = useState<any>(blankProject);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [risk, setRisk] = useState<any>(null);
  const [framing, setFraming] = useState<any>(null);
  const [regContext, setRegContext] = useState<any>(blankContext);
  const [techInputs, setTechInputs] = useState<any>(blankInputs);
  const [techValidation, setTechValidation] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [latestRun, setLatestRun] = useState<any>(null);
  const [normativePackages, setNormativePackages] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const selected = useMemo(() => projects.find((p) => p.id === selectedId), [projects, selectedId]);

  const resetFeedback = () => { setMsg(''); setErr(''); };

  async function bootstrap() {
    try {
      const me = await req('/auth/me');
      setUser(me.user);
      await Promise.all([loadProjects(), loadNormatives()]);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => { bootstrap(); }, []);
  useEffect(() => { if (selectedId) loadProjectWorkspace(selectedId); }, [selectedId]);

  async function loadProjects() {
    const data = await req('/projects');
    setProjects(data.projects || []);
    if (!selectedId && data.projects?.length) setSelectedId(data.projects[0].id);
  }

  async function loadNormatives() {
    try {
      const data = await req('/normatives/packages');
      setNormativePackages(data.packages || []);
    } catch {
      // auth may not be ready yet
    }
  }

  async function loadProjectWorkspace(id: string) {
    setLoading(true); resetFeedback();
    try {
      const [p, cl, rk, rf, rc, ti, rl, lr] = await Promise.all([
        req(`/projects/${id}`),
        req(`/projects/${id}/checklist`),
        req(`/projects/${id}/risk`),
        req(`/projects/${id}/legal-framing`),
        req(`/projects/${id}/regulatory-context`),
        req(`/projects/${id}/technical-inputs`),
        req(`/projects/${id}/calculation/runs`),
        req(`/projects/${id}/calculation/latest`),
      ]);
      setProject({ ...p.project, area_m2: p.project.area_m2 ?? '', is_federal_public: !!p.project.is_federal_public });
      setChecklist(cl.items);
      setRisk(rk.risk);
      setFraming(rf.framing);
      setRegContext({ ...blankContext, ...rc.context, autodeclaration_requested: !!rc.context.autodeclaration_requested });
      setTechInputs({ ...blankInputs, ...ti.inputs, general: { ...blankInputs.general, ...(ti.inputs?.general || {}) }, envelope: { ...blankInputs.envelope, ...(ti.inputs?.envelope || {}) }, systems: { ...blankInputs.systems, ...(ti.inputs?.systems || {}) }, declaration: { ...blankInputs.declaration, ...(ti.inputs?.declaration || {}) } });
      setTechValidation(ti.validation);
      setRuns(rl.runs || []);
      setLatestRun(lr.latest || null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAuth() {
    setLoading(true); resetFeedback();
    try {
      await req(auth.mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: JSON.stringify({ email: auth.email, password: auth.password }) });
      if (auth.mode === 'register') {
        setMsg('Cadastro criado. Faça login.');
        setAuth((a) => ({ ...a, mode: 'login' }));
      } else {
        setMsg('Login realizado.');
        await bootstrap();
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function doLogout() {
    await req('/auth/logout', { method: 'POST' });
    location.reload();
  }

  async function createProject(demo = false) {
    setLoading(true); resetFeedback();
    try {
      const data = demo ? await req('/projects/demo', { method: 'POST' }) : await req('/projects', { method: 'POST', body: JSON.stringify(blankProject) });
      await loadProjects();
      setSelectedId(data.projectId || data.project.id);
      setMsg(demo ? 'Projeto demo criado.' : 'Projeto criado.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProject() {
    if (!selectedId) return;
    setLoading(true); resetFeedback();
    try {
      await req(`/projects/${selectedId}`, { method: 'PUT', body: JSON.stringify(project) });
      await req(`/projects/${selectedId}/checklist`, { method: 'PUT', body: JSON.stringify({ items: checklist.map((i) => ({ key: i.key, checked: !!i.checked })) }) });
      await req(`/projects/${selectedId}/regulatory-context`, { method: 'PUT', body: JSON.stringify(regContext) });
      const ti = await req(`/projects/${selectedId}/technical-inputs`, { method: 'PUT', body: JSON.stringify(techInputs) });
      setTechValidation(ti.validation);
      await loadProjects();
      await loadProjectWorkspace(selectedId);
      setMsg('Projeto salvo com sucesso.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runCalculation() {
    if (!selectedId) return;
    setLoading(true); resetFeedback();
    try {
      const data = await req(`/projects/${selectedId}/calculation/run`, { method: 'POST' });
      setLatestRun({ result: data.result, ...data });
      await loadProjectWorkspace(selectedId);
      setMsg('Pré-cálculo executado.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openDoc(kind: 'memorial' | 'dossier', format: 'html' | 'json') {
    if (!selectedId) return;
    setLoading(true); resetFeedback();
    try {
      if (format === 'json') {
        const data = await req(`/projects/${selectedId}/${kind}?format=json`);
        const win = window.open('', '_blank');
        win?.document.write(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
        return;
      }
      const res = await fetch(`/api/projects/${selectedId}/${kind}?format=html`, { credentials: 'include' });
      const html = await res.text();
      const win = window.open('', '_blank');
      win?.document.write(html);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="panel auth-panel">
          <h1>VetorEco</h1>
          <p className="muted">SaaS para fluxo técnico de eficiência energética (pré-avaliação + documentação)</p>
          <div className="row">
            <button className={auth.mode === 'login' ? 'primary' : ''} onClick={() => setAuth((a) => ({ ...a, mode: 'login' }))}>Login</button>
            <button className={auth.mode === 'register' ? 'primary' : ''} onClick={() => setAuth((a) => ({ ...a, mode: 'register' }))}>Cadastro</button>
          </div>
          <input placeholder="Email" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
          <input type="password" placeholder="Senha (mín. 8)" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
          <button className="primary" onClick={submitAuth} disabled={loading}>{loading ? 'Aguarde…' : auth.mode === 'login' ? 'Entrar' : 'Cadastrar'}</button>
          {msg && <p className="ok">{msg}</p>}
          {err && <p className="err">{err}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>VetorEco</h2>
        <p className="muted">{user.email}</p>
        <div className="stack">
          <button onClick={() => createProject(false)}>+ Novo projeto</button>
          <button onClick={() => createProject(true)}>+ Projeto demo</button>
          <button onClick={doLogout}>Sair</button>
        </div>
        <hr />
        <div className="project-list">
          {projects.map((p) => (
            <button key={p.id} className={selectedId === p.id ? 'active' : ''} onClick={() => setSelectedId(p.id)}>
              <strong>{p.name}</strong>
              <small>{p.city || '-'} / {p.state || '-'}</small>
              <small>{p.typology} · {p.phase}</small>
            </button>
          ))}
        </div>
      </aside>

      <main className="main">
        <div className="toolbar">
          <div>
            <h1>{selected?.name || 'Selecione um projeto'}</h1>
            {loading && <span className="muted">Carregando…</span>}
          </div>
          {selectedId && (
            <div className="row">
              <button className="primary" onClick={saveProject}>Salvar</button>
              <button onClick={runCalculation}>Rodar pré-cálculo</button>
            </div>
          )}
        </div>
        {msg && <p className="ok">{msg}</p>}
        {err && <p className="err">{err}</p>}

        {!selectedId ? (
          <div className="panel"><p className="muted">Crie um projeto para começar.</p></div>
        ) : (
          <div className="grid">
            <section className="panel">
              <h3>1) Projeto</h3>
              <div className="form-grid">
                <label>Nome<input value={project.name || ''} onChange={(e) => setProject({ ...project, name: e.target.value })} /></label>
                <label>Área m²<input value={project.area_m2 ?? ''} onChange={(e) => setProject({ ...project, area_m2: e.target.value })} /></label>
                <label>Cidade<input value={project.city || ''} onChange={(e) => setProject({ ...project, city: e.target.value })} /></label>
                <label>UF<input maxLength={2} value={project.state || ''} onChange={(e) => setProject({ ...project, state: e.target.value.toUpperCase() })} /></label>
                <label>Porte<select value={project.municipality_size} onChange={(e) => setProject({ ...project, municipality_size: e.target.value })}><option value="large">&gt;100 mil</option><option value="medium">50-100 mil</option><option value="small">&lt;50 mil</option></select></label>
                <label>Tipologia<select value={project.typology} onChange={(e) => setProject({ ...project, typology: e.target.value })}><option value="residencial">Residencial</option><option value="comercial">Comercial</option><option value="publica">Pública</option></select></label>
                <label>Fase<select value={project.phase} onChange={(e) => setProject({ ...project, phase: e.target.value })}><option value="estudo">Estudo</option><option value="anteprojeto">Anteprojeto</option><option value="executivo">Executivo</option><option value="obra">Obra</option></select></label>
                <label>Ano protocolo<input type="number" value={project.protocol_year} onChange={(e) => setProject({ ...project, protocol_year: Number(e.target.value) })} /></label>
              </div>
              {project.typology === 'publica' && (
                <label className="check-inline"><input type="checkbox" checked={!!project.is_federal_public} onChange={(e) => setProject({ ...project, is_federal_public: e.target.checked })} /> Edificação pública federal</label>
              )}
              <label>Observações<textarea value={project.notes || ''} onChange={(e) => setProject({ ...project, notes: e.target.value })} /></label>
            </section>

            <section className="panel">
              <h3>2) Enquadramento legal</h3>
              <div className="form-grid">
                <label>Data de protocolo<input type="date" value={regContext.protocol_date || ''} onChange={(e) => setRegContext({ ...regContext, protocol_date: e.target.value })} /></label>
                <label>Data do alvará<input type="date" value={regContext.permit_issue_date || ''} onChange={(e) => setRegContext({ ...regContext, permit_issue_date: e.target.value })} /></label>
                <label>Licitação pública<input type="date" value={regContext.public_bid_date || ''} onChange={(e) => setRegContext({ ...regContext, public_bid_date: e.target.value })} /></label>
                <label>Faixa populacional<select value={regContext.population_band} onChange={(e) => setRegContext({ ...regContext, population_band: e.target.value })}><option value="large">large</option><option value="medium">medium</option><option value="small">small</option></select></label>
                <label>Ente<select value={regContext.entity_scope} onChange={(e) => setRegContext({ ...regContext, entity_scope: e.target.value })}><option value="privado">Privado</option><option value="federal">Federal</option><option value="estadual">Estadual</option><option value="distrital">Distrital</option><option value="municipal">Municipal</option></select></label>
                <label>Método<select value={regContext.classification_method} onChange={(e) => setRegContext({ ...regContext, classification_method: e.target.value })}><option value="INI">INI</option><option value="RTQ_LEGADO">RTQ_LEGADO</option></select></label>
                <label>UF contexto<input maxLength={2} value={regContext.state_code || ''} onChange={(e) => setRegContext({ ...regContext, state_code: e.target.value.toUpperCase() })} /></label>
              </div>
              <label className="check-inline"><input type="checkbox" checked={!!regContext.autodeclaration_requested} onChange={(e) => setRegContext({ ...regContext, autodeclaration_requested: e.target.checked })} /> Solicitar autodeclaração (quando aplicável)</label>
              {regContext.classification_method === 'RTQ_LEGADO' && (
                <>
                  <label>Motivo RTQ_LEGADO<textarea value={regContext.legacy_reason || ''} onChange={(e) => setRegContext({ ...regContext, legacy_reason: e.target.value })} /></label>
                  <label>Evidência ENCE projeto legado (referência)<input value={regContext.evidence_ence_projeto_legacy || ''} onChange={(e) => setRegContext({ ...regContext, evidence_ence_projeto_legacy: e.target.value })} /></label>
                </>
              )}
              {framing && (
                <div className="box-muted">
                  <div className="row wrap">
                    <Badge>{framing.ruleMode}</Badge>
                    <Badge>{framing.packageCode} {framing.packageVersion}</Badge>
                    <Badge>Nível {framing.minPerformanceLevel}</Badge>
                  </div>
                  <p><b>Vigência:</b> {framing.effectiveDate} · <b>Caminho:</b> {framing.compliancePath} · <b>Aplicável agora:</b> {framing.applicable ? 'Sim' : 'Planejamento'}</p>
                  {framing.warnings?.length > 0 && <ul>{framing.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>}
                </div>
              )}
            </section>

            <section className="panel">
              <h3>3) Checklist técnico</h3>
              <div className="stack">
                {checklist.map((item) => (
                  <label key={item.key} className="checkrow">
                    <span>
                      <b>{item.label}</b>
                      <small>{item.category} · {item.stage} · {item.critical ? 'crítico' : 'complementar'}</small>
                    </span>
                    <input type="checkbox" checked={!!item.checked} onChange={(e) => setChecklist((old: any[]) => old.map((x) => x.key === item.key ? { ...x, checked: e.target.checked } : x))} />
                  </label>
                ))}
              </div>
              {risk && (
                <div className="row wrap mt8">
                  <Badge>Risco {risk.status}</Badge>
                  <Badge>Progresso {risk.progress}%</Badge>
                  <Badge>Críticos pendentes {risk.criticalMissing}</Badge>
                </div>
              )}
            </section>

            <section className="panel">
              <h3>4) Inputs técnicos</h3>
              <div className="form-grid three">
                <label>Zona bioclimática<input value={techInputs.general.zona_bioclimatica ?? ''} onChange={(e) => setTechInputs({ ...techInputs, general: { ...techInputs.general, zona_bioclimatica: e.target.value } })} /></label>
                <label>Área útil m²<input value={techInputs.general.area_util_m2 ?? ''} onChange={(e) => setTechInputs({ ...techInputs, general: { ...techInputs.general, area_util_m2: e.target.value } })} /></label>
                <label>Pavimentos<input value={techInputs.general.pavimentos ?? ''} onChange={(e) => setTechInputs({ ...techInputs, general: { ...techInputs.general, pavimentos: e.target.value } })} /></label>
                <label>Fachada total m²<input value={techInputs.envelope.area_fachada_total_m2 ?? ''} onChange={(e) => setTechInputs({ ...techInputs, envelope: { ...techInputs.envelope, area_fachada_total_m2: e.target.value } })} /></label>
                <label>Fachada envidraçada m²<input value={techInputs.envelope.area_fachada_envidracada_m2 ?? ''} onChange={(e) => setTechInputs({ ...techInputs, envelope: { ...techInputs.envelope, area_fachada_envidracada_m2: e.target.value } })} /></label>
                <label>Parede U<input value={techInputs.envelope.parede_u ?? ''} onChange={(e) => setTechInputs({ ...techInputs, envelope: { ...techInputs.envelope, parede_u: e.target.value } })} /></label>
                <label>Cobertura U<input value={techInputs.envelope.cobertura_u ?? ''} onChange={(e) => setTechInputs({ ...techInputs, envelope: { ...techInputs.envelope, cobertura_u: e.target.value } })} /></label>
                <label>Iluminação W/m²<input value={techInputs.systems.iluminacao_dpi_w_m2 ?? ''} onChange={(e) => setTechInputs({ ...techInputs, systems: { ...techInputs.systems, iluminacao_dpi_w_m2: e.target.value } })} /></label>
                <label>HVAC COP<input value={techInputs.systems.hvac_cop ?? ''} onChange={(e) => setTechInputs({ ...techInputs, systems: { ...techInputs.systems, hvac_cop: e.target.value } })} /></label>
                <label>Aquec. água<input value={techInputs.systems.aquecimento_agua_tipo ?? ''} onChange={(e) => setTechInputs({ ...techInputs, systems: { ...techInputs.systems, aquecimento_agua_tipo: e.target.value } })} /></label>
                <label>Resp. nome<input value={techInputs.declaration.responsavel_nome ?? ''} onChange={(e) => setTechInputs({ ...techInputs, declaration: { ...techInputs.declaration, responsavel_nome: e.target.value } })} /></label>
                <label>Resp. registro<input value={techInputs.declaration.responsavel_registro ?? ''} onChange={(e) => setTechInputs({ ...techInputs, declaration: { ...techInputs.declaration, responsavel_registro: e.target.value } })} /></label>
              </div>
              <label className="check-inline"><input type="checkbox" checked={!!techInputs.envelope.possui_protecao_solar} onChange={(e) => setTechInputs({ ...techInputs, envelope: { ...techInputs.envelope, possui_protecao_solar: e.target.checked } })} /> Possui proteção solar</label>
              <label className="check-inline"><input type="checkbox" checked={!!techInputs.declaration.use_autodeclaracao} onChange={(e) => setTechInputs({ ...techInputs, declaration: { ...techInputs.declaration, use_autodeclaracao: e.target.checked } })} /> Dados para autodeclaração</label>
              {techValidation && (
                <div className="box-muted">
                  <div className="row wrap"><Badge>Inputs {techValidation.valid ? 'válidos' : 'com erros'}</Badge><Badge>Cobertura {techValidation.coverage}%</Badge></div>
                  {techValidation.errors?.length > 0 && <ul>{techValidation.errors.map((x: string, i: number) => <li key={`e${i}`} className="err-inline">{x}</li>)}</ul>}
                  {techValidation.warnings?.length > 0 && <ul>{techValidation.warnings.map((x: string, i: number) => <li key={`w${i}`}>{x}</li>)}</ul>}
                </div>
              )}
            </section>

            <section className="panel">
              <h3>5) Pré-cálculo e resultados</h3>
              <div className="row wrap">
                <button onClick={runCalculation}>Executar agora</button>
                <button onClick={() => openDoc('memorial', 'html')}>Memorial HTML</button>
                <button onClick={() => openDoc('dossier', 'html')}>Dossiê HTML</button>
                <button onClick={() => openDoc('memorial', 'json')}>Memorial JSON</button>
              </div>
              {latestRun?.result && (
                <div className="box-muted mt8">
                  <div className="row wrap">
                    <Badge>Status {latestRun.result.summary?.status}</Badge>
                    <Badge>Classe {latestRun.result.summary?.preClassification}</Badge>
                    <Badge>Coverage {latestRun.result.summary?.coverage}%</Badge>
                    <Badge>{latestRun.result.normativePackage?.code} {latestRun.result.normativePackage?.version}</Badge>
                  </div>
                  {latestRun.result.warnings?.length > 0 && <ul>{latestRun.result.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>}
                </div>
              )}
              <div className="runs-table">
                <table>
                  <thead><tr><th>Data</th><th>Status</th><th>Pacote</th><th>Algoritmo</th></tr></thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id}><td>{new Date(r.created_at).toLocaleString('pt-BR')}</td><td>{r.status}</td><td>{r.normative_package_code} {r.normative_package_version}</td><td>{r.algorithm_version}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel full">
              <h3>Pacotes normativos carregados (somente leitura)</h3>
              <div className="row wrap">
                {normativePackages.map((p) => <Badge key={`${p.code}-${p.version}`}>{p.code} {p.version}{p.is_legacy ? ' · legado' : ''}</Badge>)}
              </div>
              <p className="muted small">Modo INI-first. RTQ_LEGADO disponível apenas para transição com evidência.</p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
