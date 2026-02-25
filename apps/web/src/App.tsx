import { useEffect, useMemo, useState } from 'react';
import { api } from './api';

type AuthMode = 'login' | 'register';

function useAsync<T>(fn: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fn().then((v) => alive && setData(v)).catch((e) => alive && setError(e.message || 'Erro')).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error, setData };
}

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', workspaceName: '' });
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string>('');
  const [sessionTick, setSessionTick] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const me = useAsync(() => api.me(), [sessionTick]);
  const activeOrgId = (me.data as any)?.activeOrganizationId as string | undefined;
  const organizations = ((me.data as any)?.organizations || []) as any[];
  const [orgId, setOrgId] = useState<string>('');
  useEffect(() => { if (activeOrgId) setOrgId((v) => v || activeOrgId); }, [activeOrgId]);

  const projects = useAsync(() => (orgId ? api.listProjects(orgId) : Promise.resolve({ projects: [] } as any)), [orgId, sessionTick]);
  const projectList = ((projects.data as any)?.projects || []) as any[];
  useEffect(() => {
    if (!selectedProjectId && projectList[0]?.id) setSelectedProjectId(projectList[0].id);
    if (selectedProjectId && !projectList.some((p: any) => p.id === selectedProjectId)) setSelectedProjectId(projectList[0]?.id || '');
  }, [projectList, selectedProjectId]);

  const checklist = useAsync(
    () => (orgId && selectedProjectId ? api.getChecklist(orgId, selectedProjectId) : Promise.resolve(null)),
    [orgId, selectedProjectId, sessionTick]
  );
  const regulatory = useAsync(
    () => (orgId && selectedProjectId ? api.getContext(orgId, selectedProjectId) : Promise.resolve(null)),
    [orgId, selectedProjectId, sessionTick]
  );
  const technical = useAsync(
    () => (orgId && selectedProjectId ? api.getInputs(orgId, selectedProjectId) : Promise.resolve(null)),
    [orgId, selectedProjectId, sessionTick]
  );
  const latestCalc = useAsync(
    () => (orgId && selectedProjectId ? api.latestCalc(orgId, selectedProjectId) : Promise.resolve(null)),
    [orgId, selectedProjectId, sessionTick]
  );
  const legal = useAsync(
    () => (orgId && selectedProjectId ? api.legalFraming(orgId, selectedProjectId) : Promise.resolve(null)),
    [orgId, selectedProjectId, sessionTick]
  );
  const memorial = useAsync(
    () => (orgId && selectedProjectId ? api.memorial(orgId, selectedProjectId) : Promise.resolve(null)),
    [orgId, selectedProjectId, sessionTick]
  );

  const thermalQuick = useAsync(
    () => (orgId && selectedProjectId ? api.getThermalQuick(orgId, selectedProjectId) : Promise.resolve(null)),
    [orgId, selectedProjectId, sessionTick]
  );
  const thermalLatest = useAsync(
    () => (orgId && selectedProjectId ? api.latestThermalCalc(orgId, selectedProjectId) : Promise.resolve(null)),
    [orgId, selectedProjectId, sessionTick]
  );
  const thermalZones = useAsync(() => api.thermalZones().catch(() => ({ zones: [] } as any)), [sessionTick]);

  const selectedProject = useMemo(() => projectList.find((p: any) => p.id === selectedProjectId), [projectList, selectedProjectId]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFlash('');
    try {
      if (authMode === 'register') await api.register(authForm);
      await api.login({ email: authForm.email, password: authForm.password });
      setSessionTick((x) => x + 1);
      setFlash('Autenticado com sucesso.');
    } catch (err: any) {
      setFlash(err.message || 'Falha de autenticação');
    } finally { setBusy(false); }
  }

  async function handleCreateProject() {
    if (!orgId) return;
    setBusy(true); setFlash('');
    try {
      const res: any = await api.createProject(orgId, {
        name: `Projeto ${new Date().toLocaleDateString('pt-BR')}`,
        city: 'Araguari',
        state: 'MG',
        municipality_size: 'medium',
        typology: 'residencial',
        phase: 'anteprojeto',
        protocol_year: new Date().getFullYear() + 1,
        area_m2: 180
      });
      setSelectedProjectId(res.project.id);
      setSessionTick((x) => x + 1);
      setFlash('Projeto criado.');
    } catch (e: any) { setFlash(e.message); } finally { setBusy(false); }
  }

  async function handleCreateDemo() {
    if (!orgId) return;
    setBusy(true); setFlash('');
    try {
      const res: any = await api.createDemo(orgId);
      setSelectedProjectId(res.project.id);
      setSessionTick((x) => x + 1);
      setFlash('Projeto demo criado.');
    } catch (e: any) { setFlash(e.message); } finally { setBusy(false); }
  }

  async function saveChecklist(itemId: string, checked: boolean) {
    const data: any = checklist.data;
    const items = (data?.items || []).map((i: any) => i.id === itemId ? { item_id: i.id, checked } : { item_id: i.id, checked: i.checked });
    await api.saveChecklist(orgId, selectedProjectId, items);
    setSessionTick((x) => x + 1);
  }

  async function saveRegulatoryContext(partial: any) {
    const current = (regulatory.data as any)?.context || {};
    await api.saveContext(orgId, selectedProjectId, { ...current, ...partial });
    setSessionTick((x) => x + 1);
  }

  async function saveTechnicalInputs() {
    const form = (document.getElementById('tech-form') as HTMLFormElement);
    const fd = new FormData(form);
    const num = (k: string) => {
      const v = fd.get(k); return v === null || v === '' ? undefined : Number(v);
    };
    const payload = {
      general: { climateZone: fd.get('climateZone') || undefined, floors: num('floors'), conditionedAreaM2: num('conditionedAreaM2') },
      envelope: { wallUValue: num('wallUValue'), roofUValue: num('roofUValue'), windowToWallRatio: num('windowToWallRatio'), shadingFactor: num('shadingFactor') },
      systems: { lightingLPD: num('lightingLPD'), hvacType: fd.get('hvacType') || undefined, hvacCop: num('hvacCop'), waterHeatingType: fd.get('waterHeatingType') || undefined },
      autodeclaration: { requested: fd.get('autoRequested') === 'on', justification: fd.get('autoJustification') || undefined }
    };
    await api.saveInputs(orgId, selectedProjectId, payload);
    setSessionTick((x) => x + 1);
    setFlash('Inputs técnicos salvos.');
  }

  async function runCalculation() {
    await api.runCalc(orgId, selectedProjectId);
    setSessionTick((x) => x + 1);
    setFlash('Pré-cálculo executado.');
  }

  async function saveThermalQuick() {
    const form = (document.getElementById('thermal-form') as HTMLFormElement | null);
    if (!form) return;
    const fd = new FormData(form);
    const num = (k: string) => {
      const v = fd.get(k); return v === null || v === '' ? undefined : Number(v);
    };
    const str = (k: string) => {
      const v = fd.get(k); const txt = typeof v === 'string' ? v.trim() : ''; return txt || undefined;
    };
    const thermal = {
      metadata: {
        bioclimaticZone: num('t_zone'),
        totalBuiltArea: num('t_totalBuiltArea'),
        conditionedArea: num('t_conditionedArea'),
        municipalityName: str('t_municipalityName'),
        municipalityState: str('t_municipalityState')
      },
      wall: {
        name: 'Parede principal',
        totalArea: num('t_wallArea'),
        uValue: num('t_wallU'),
        thermalCapacity: num('t_wallCT'),
        timeLag: num('t_wallTimeLag'),
        solarFactor: num('t_wallSF'),
        absorptance: num('t_wallAbs')
      },
      roof: {
        name: 'Cobertura principal',
        totalArea: num('t_roofArea'),
        uValue: num('t_roofU'),
        thermalCapacity: num('t_roofCT'),
        timeLag: num('t_roofTimeLag'),
        solarFactor: num('t_roofSF'),
        absorptance: num('t_roofAbs'),
        hasAttic: fd.get('t_hasAttic') === 'on',
        atticVentilated: fd.get('t_atticVent') === 'on'
      },
      windows: [{
        roomName: 'Fachada principal',
        width: num('t_windowWidth') || 1,
        height: num('t_windowHeight') || 1,
        quantity: num('t_windowQty') || 1,
        uValue: num('t_windowU'),
        shgc: num('t_windowSHGC'),
        hasShading: fd.get('t_windowShade') === 'on',
        shadingDepth: num('t_windowShadeDepth')
      }],
      lighting: [{
        zoneName: 'Zona principal',
        area: num('t_lightArea') || num('t_conditionedArea') || 1,
        totalPower: num('t_lightPower') || 0,
        hasDaylightControl: fd.get('t_lightDaylight') === 'on',
        hasOccupancySensor: fd.get('t_lightOcc') === 'on'
      }],
      hvac: [{
        systemName: 'Sistema principal',
        systemType: String(fd.get('t_hvacType') || 'split'),
        conditionedArea: num('t_hvacArea') || num('t_conditionedArea') || 0,
        cop: num('t_hvacCop'),
        inmetroCertified: fd.get('t_hvacCertified') === 'on',
        hasIndividualControl: fd.get('t_hvacControl') === 'on'
      }]
    };
    await api.saveThermalQuick(orgId, selectedProjectId, thermal);
    setSessionTick((x) => x + 1);
    setFlash('Dados térmicos salvos.');
  }

  async function runThermalCalculation() {
    await saveThermalQuick();
    await api.runThermalCalc(orgId, selectedProjectId, { mode: 'auto' });
    setSessionTick((x) => x + 1);
    setFlash('Cálculo térmico executado (RTQ/NBR).');
  }

  async function logout() {
    await api.logout();
    setSessionTick((x) => x + 1);
    setSelectedProjectId('');
  }

  const isLogged = !!(me.data as any)?.user;

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>VetorEco</h1>
          <p>MVP Cloudflare para triagem de eficiência energética (PBE Edifica)</p>
        </div>
        {isLogged && <button onClick={logout}>Sair</button>}
      </header>

      {flash && <div className="flash">{flash}</div>}

      {!isLogged ? (
        <div className="card auth">
          <div className="tabs">
            <button className={authMode==='login'?'active':''} onClick={() => setAuthMode('login')}>Entrar</button>
            <button className={authMode==='register'?'active':''} onClick={() => setAuthMode('register')}>Cadastrar</button>
          </div>
          <form onSubmit={handleAuthSubmit} className="grid">
            <label>Email <input type="email" value={authForm.email} onChange={(e)=>setAuthForm({...authForm,email:e.target.value})} required /></label>
            <label>Senha <input type="password" value={authForm.password} onChange={(e)=>setAuthForm({...authForm,password:e.target.value})} required minLength={8} /></label>
            {authMode === 'register' && (
              <label>Nome do escritório/workspace <input value={authForm.workspaceName} onChange={(e)=>setAuthForm({...authForm,workspaceName:e.target.value})} /></label>
            )}
            <button disabled={busy}>{busy ? 'Processando...' : authMode === 'login' ? 'Entrar' : 'Cadastrar e entrar'}</button>
          </form>
        </div>
      ) : (
        <div className="layout">
          <aside className="sidebar card">
            <h3>Workspace</h3>
            <select value={orgId} onChange={(e)=>setOrgId(e.target.value)}>
              {organizations.map((o: any) => <option key={o.id} value={o.id}>{o.name} ({o.role})</option>)}
            </select>
            <div className="stack">
              <button onClick={handleCreateProject}>Novo projeto</button>
              <button onClick={handleCreateDemo}>Criar demo</button>
            </div>
            <h3>Projetos</h3>
            <div className="list">
              {projects.loading && <small>Carregando...</small>}
              {projectList.map((p: any) => (
                <button key={p.id} className={p.id===selectedProjectId?'projectItem active':'projectItem'} onClick={() => setSelectedProjectId(p.id)}>
                  <strong>{p.name}</strong>
                  <span>{p.typology} • {p.phase}</span>
                </button>
              ))}
              {!projectList.length && <small>Nenhum projeto</small>}
            </div>
          </aside>

          <main className="content">
            {!selectedProject ? <div className="card">Selecione um projeto.</div> : (
              <>
                <div className="card">
                  <h2>{selectedProject.name}</h2>
                  <div className="chips">
                    <span>{selectedProject.city}/{selectedProject.state}</span>
                    <span>{selectedProject.typology}</span>
                    <span>{selectedProject.phase}</span>
                    <span>Protocolo {selectedProject.protocol_year}</span>
                  </div>
                </div>

                <section className="grid2">
                  <div className="card">
                    <h3>Contexto regulatório</h3>
                    <div className="row">
                      <label>Método
                        <select value={(regulatory.data as any)?.context?.classification_method || 'INI'} onChange={(e) => saveRegulatoryContext({ classification_method: e.target.value })}>
                          <option value="INI">INI</option>
                          <option value="RTQ_LEGADO">RTQ_LEGADO</option>
                        </select>
                      </label>
                      <label>Autodeclaração
                        <input type="checkbox" checked={!!(regulatory.data as any)?.context?.requests_autodeclaration} onChange={(e)=>saveRegulatoryContext({ requests_autodeclaration: e.target.checked })} />
                      </label>
                    </div>
                    <div className="row">
                      <label>Faixa municipal
                        <select value={(regulatory.data as any)?.context?.municipality_population_band || selectedProject.municipality_size} onChange={(e)=>saveRegulatoryContext({ municipality_population_band: e.target.value })}>
                          <option value="small">small</option>
                          <option value="medium">medium</option>
                          <option value="large">large</option>
                        </select>
                      </label>
                      <label>Data protocolo
                        <input type="date" value={(regulatory.data as any)?.context?.protocol_date?.slice(0,10) || ''} onChange={(e)=>saveRegulatoryContext({ protocol_date: e.target.value })} />
                      </label>
                    </div>
                    <div className="muted">
                      {(legal.data as any)?.framing ? (
                        <>
                          <div><b>Meta mínima:</b> {(legal.data as any).framing.minLevel}</div>
                          <div><b>Caminho:</b> {(legal.data as any).framing.compliancePath}</div>
                          <div><b>Pacote:</b> {(legal.data as any).framing.normativePackage?.code || 'fallback'}</div>
                        </>
                      ) : 'Carregando enquadramento...'}
                    </div>
                  </div>

                  <div className="card">
                    <h3>Checklist de triagem</h3>
                    <div className="checklist">
                      {((checklist.data as any)?.items || []).map((item: any) => (
                        <label key={item.id} className={item.critical ? 'critical' : ''}>
                          <input type="checkbox" checked={!!item.checked} onChange={(e)=>saveChecklist(item.id, e.target.checked)} />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                    {(checklist.data as any)?.summary && (
                      <div className="muted">
                        <b>Status:</b> {(checklist.data as any).summary.status} • {(checklist.data as any).summary.coverage.percent}%<br/>
                        {(checklist.data as any).summary.message}
                      </div>
                    )}
                  </div>
                </section>

                <div className="card">
                  <h3>Inputs técnicos</h3>
                  <form id="tech-form" className="grid3" onSubmit={(e)=>{e.preventDefault(); saveTechnicalInputs();}}>
                    <label>Zona bioclimática <input name="climateZone" defaultValue={(technical.data as any)?.inputs?.general?.climateZone || ''} /></label>
                    <label>Pavimentos <input name="floors" type="number" step="1" defaultValue={(technical.data as any)?.inputs?.general?.floors ?? ''} /></label>
                    <label>Área condicionada m² <input name="conditionedAreaM2" type="number" step="0.01" defaultValue={(technical.data as any)?.inputs?.general?.conditionedAreaM2 ?? ''} /></label>

                    <label>U parede <input name="wallUValue" type="number" step="0.01" defaultValue={(technical.data as any)?.inputs?.envelope?.wallUValue ?? ''} /></label>
                    <label>U cobertura <input name="roofUValue" type="number" step="0.01" defaultValue={(technical.data as any)?.inputs?.envelope?.roofUValue ?? ''} /></label>
                    <label>WWR % <input name="windowToWallRatio" type="number" step="0.1" defaultValue={(technical.data as any)?.inputs?.envelope?.windowToWallRatio ?? ''} /></label>

                    <label>Fator sombreamento <input name="shadingFactor" type="number" step="0.01" defaultValue={(technical.data as any)?.inputs?.envelope?.shadingFactor ?? ''} /></label>
                    <label>LPD <input name="lightingLPD" type="number" step="0.01" defaultValue={(technical.data as any)?.inputs?.systems?.lightingLPD ?? ''} /></label>
                    <label>HVAC tipo <input name="hvacType" defaultValue={(technical.data as any)?.inputs?.systems?.hvacType || ''} /></label>

                    <label>COP HVAC <input name="hvacCop" type="number" step="0.01" defaultValue={(technical.data as any)?.inputs?.systems?.hvacCop ?? ''} /></label>
                    <label>Aquecimento água <input name="waterHeatingType" defaultValue={(technical.data as any)?.inputs?.systems?.waterHeatingType || ''} /></label>
                    <label className="inline">
                      <input name="autoRequested" type="checkbox" defaultChecked={!!(technical.data as any)?.inputs?.autodeclaration?.requested} />
                      Autodeclaração
                    </label>
                    <label className="colspan3">Justificativa autodeclaração <input name="autoJustification" defaultValue={(technical.data as any)?.inputs?.autodeclaration?.justification || ''} /></label>

                    <div className="actions colspan3">
                      <button type="submit">Salvar inputs</button>
                      <button type="button" onClick={runCalculation}>Rodar pré-cálculo</button>
                      <a className="linkBtn" href={api.memorialPdfUrl(selectedProjectId, orgId)} target="_blank" rel="noreferrer">Abrir PDF do memorial</a>
                    </div>
                  </form>
                  {(technical.data as any)?.validation?.warnings?.length > 0 && (
                    <div className="muted">
                      Avisos: {(technical.data as any).validation.warnings.map((w: any) => w.message).join(' • ')}
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3>Motor térmico rápido (RTQ-R / RTQ-C / NBR 15575)</h3>
                  <form id="thermal-form" className="grid3" onSubmit={(e)=>{e.preventDefault(); runThermalCalculation();}}>
                    <label>Zona bioclimática
                      <select name="t_zone" defaultValue={(thermalQuick.data as any)?.thermal?.metadata?.bioclimaticZone ?? ''}>
                        <option value="">Auto (por município)</option>
                        {(((thermalZones.data as any)?.zones) || []).map((z: any) => <option key={z.id} value={z.id}>{z.id} - {z.name}</option>)}
                      </select>
                    </label>
                    <label>Município <input name="t_municipalityName" defaultValue={(thermalQuick.data as any)?.thermal?.metadata?.municipalityName || selectedProject?.city || ''} /></label>
                    <label>UF <input name="t_municipalityState" defaultValue={(thermalQuick.data as any)?.thermal?.metadata?.municipalityState || selectedProject?.state || ''} /></label>

                    <label>Área total m² <input name="t_totalBuiltArea" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.metadata?.totalBuiltArea ?? selectedProject?.area_m2 ?? ''} /></label>
                    <label>Área condicionada m² <input name="t_conditionedArea" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.metadata?.conditionedArea ?? (technical.data as any)?.inputs?.general?.conditionedAreaM2 ?? ''} /></label>
                    <label>Tipo HVAC
                      <select name="t_hvacType" defaultValue={(thermalQuick.data as any)?.thermal?.hvac?.[0]?.systemType || 'split'}>
                        <option value="split">Split</option><option value="vrf">VRF</option><option value="chiller">Chiller</option><option value="other">Outro</option>
                      </select>
                    </label>

                    <label>U parede <input name="t_wallU" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.wall?.uValue ?? ''} /></label>
                    <label>CT parede <input name="t_wallCT" type="number" step="0.1" defaultValue={(thermalQuick.data as any)?.thermal?.wall?.thermalCapacity ?? ''} /></label>
                    <label>Atraso parede (h) <input name="t_wallTimeLag" type="number" step="0.1" defaultValue={(thermalQuick.data as any)?.thermal?.wall?.timeLag ?? ''} /></label>
                    <label>Área parede m² <input name="t_wallArea" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.wall?.totalArea ?? ''} /></label>
                    <label>Absorvância parede <input name="t_wallAbs" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.wall?.absorptance ?? 0.6} /></label>
                    <label>FS parede <input name="t_wallSF" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.wall?.solarFactor ?? 0.6} /></label>

                    <label>U cobertura <input name="t_roofU" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.roof?.uValue ?? ''} /></label>
                    <label>CT cobertura <input name="t_roofCT" type="number" step="0.1" defaultValue={(thermalQuick.data as any)?.thermal?.roof?.thermalCapacity ?? ''} /></label>
                    <label>Atraso cobertura <input name="t_roofTimeLag" type="number" step="0.1" defaultValue={(thermalQuick.data as any)?.thermal?.roof?.timeLag ?? ''} /></label>
                    <label>Área cobertura m² <input name="t_roofArea" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.roof?.totalArea ?? ''} /></label>
                    <label>Absorvância cobertura <input name="t_roofAbs" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.roof?.absorptance ?? 0.6} /></label>
                    <label>FS cobertura <input name="t_roofSF" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.roof?.solarFactor ?? 0.6} /></label>

                    <label>Largura janela (m) <input name="t_windowWidth" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.windows?.[0]?.width ?? ''} /></label>
                    <label>Altura janela (m) <input name="t_windowHeight" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.windows?.[0]?.height ?? ''} /></label>
                    <label>Qtd janelas <input name="t_windowQty" type="number" step="1" defaultValue={(thermalQuick.data as any)?.thermal?.windows?.[0]?.quantity ?? 1} /></label>
                    <label>U vidro <input name="t_windowU" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.windows?.[0]?.uValue ?? 5.7} /></label>
                    <label>SHGC vidro <input name="t_windowSHGC" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.windows?.[0]?.shgc ?? 0.8} /></label>
                    <label>Prof. brise (m) <input name="t_windowShadeDepth" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.windows?.[0]?.shadingDepth ?? ''} /></label>

                    <label>Potência iluminação (W) <input name="t_lightPower" type="number" step="0.1" defaultValue={(thermalQuick.data as any)?.thermal?.lighting?.[0]?.totalPower ?? ''} /></label>
                    <label>Área iluminação (m²) <input name="t_lightArea" type="number" step="0.1" defaultValue={(thermalQuick.data as any)?.thermal?.lighting?.[0]?.area ?? ''} /></label>
                    <label>COP HVAC <input name="t_hvacCop" type="number" step="0.01" defaultValue={(thermalQuick.data as any)?.thermal?.hvac?.[0]?.cop ?? 2.8} /></label>
                    <label>Área HVAC (m²) <input name="t_hvacArea" type="number" step="0.1" defaultValue={(thermalQuick.data as any)?.thermal?.hvac?.[0]?.conditionedArea ?? ''} /></label>

                    <label className="inline"><input name="t_windowShade" type="checkbox" defaultChecked={!!(thermalQuick.data as any)?.thermal?.windows?.[0]?.hasShading} /> Sombreamento</label>
                    <label className="inline"><input name="t_lightDaylight" type="checkbox" defaultChecked={!!(thermalQuick.data as any)?.thermal?.lighting?.[0]?.hasDaylightControl} /> Controle daylight</label>
                    <label className="inline"><input name="t_lightOcc" type="checkbox" defaultChecked={!!(thermalQuick.data as any)?.thermal?.lighting?.[0]?.hasOccupancySensor} /> Sensor presença</label>
                    <label className="inline"><input name="t_hvacCertified" type="checkbox" defaultChecked={!!(thermalQuick.data as any)?.thermal?.hvac?.[0]?.inmetroCertified} /> HVAC INMETRO</label>
                    <label className="inline"><input name="t_hvacControl" type="checkbox" defaultChecked={!!(thermalQuick.data as any)?.thermal?.hvac?.[0]?.hasIndividualControl} /> Controle individual</label>
                    <label className="inline"><input name="t_hasAttic" type="checkbox" defaultChecked={!!(thermalQuick.data as any)?.thermal?.roof?.hasAttic} /> Ático</label>
                    <label className="inline"><input name="t_atticVent" type="checkbox" defaultChecked={!!(thermalQuick.data as any)?.thermal?.roof?.atticVentilated} /> Ático ventilado</label>

                    <div className="actions colspan3">
                      <button type="button" onClick={saveThermalQuick}>Salvar térmico</button>
                      <button type="submit">Rodar RTQ/NBR</button>
                    </div>
                  </form>
                  {(thermalLatest.data as any)?.calculation && (
                    <div className="muted">
                      <b>Último térmico:</b> {(thermalLatest.data as any).calculation.calculation_method} • Zona {(thermalLatest.data as any).calculation.bioclimatic_zone} • RTQ-R {(thermalLatest.data as any).calculation.rtqr_rating || '-'} • RTQ-C {(thermalLatest.data as any).calculation.rtqc_rating || '-'} • NBR {((thermalLatest.data as any).calculation.nbr_compliant ? 'ok' : 'pendente')}
                    </div>
                  )}
                </div>

                <section className="grid2">
                  <div className="card">
                    <h3>Pré-cálculo</h3>
                    {(latestCalc.data as any)?.output ? (
                      <div className="muted">
                        <div><b>Status:</b> {(latestCalc.data as any).output.status}</div>
                        <div><b>Score:</b> {(latestCalc.data as any).output.score}</div>
                        <div><b>Classe:</b> {(latestCalc.data as any).output.grade}</div>
                        <div><b>Avisos:</b> {((latestCalc.data as any).output.warnings || []).length}</div>
                        {(latestCalc.data as any).output.thermalSummary && (
                          <div><b>Térmico:</b> {((latestCalc.data as any).output.thermalSummary.overallCompliant ? 'Conforme' : 'Pendências')} • {((latestCalc.data as any).output.thermalSummary.method || '').toString()}</div>
                        )}
                      </div>
                    ) : <div className="muted">Sem execução ainda.</div>}
                  </div>

                  <div className="card">
                    <h3>Memorial (HTML/JSON-first)</h3>
                    <div className="muted">
                      {(memorial.data as any)?.json?.sections?.slice(0,2).map((s: any) => (
                        <div key={s.title}><b>{s.title}:</b> {s.lines?.[0]}</div>
                      ))}
                    </div>
                    <div className="actions">
                      <button onClick={async () => {
                        const d: any = await api.dossier(orgId, selectedProjectId);
                        alert(`Dossiê gerado com ${d.json.sections.length} seções.`);
                      }}>Gerar dossiê (JSON)</button>
                    </div>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      )}

      {(me.loading || projects.loading) && <div className="loading">Carregando…</div>}
      {(me.error && !isLogged) && <div className="card muted">Faça login ou cadastro para iniciar.</div>}
    </div>
  );
}
