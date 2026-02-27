import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { formatApiError } from '../../lib/errors';
import { Loading } from '../../components/Loading';
import { ErrorState } from '../../components/ErrorState';
import { PrivacyNotice } from '../../components/PrivacyNotice';

function ProfileTab({ projectId, project, onSaved }: any) {
  const [enceTarget, setEnceTarget] = useState<string>(project.ence_target || '');
  const [profile, setProfile] = useState<any>(() => {
    try { return project.profile_json ? JSON.parse(project.profile_json) : { bioclimatic_zone: '', north_offset_deg: 0, facades: [], decisions: { artificial_lighting: false, hot_water: false, hvac: false }, responsible_name:'', responsible_registration:'', responsible_email:'' }; } catch { return { bioclimatic_zone: '', north_offset_deg: 0, facades: [], decisions: { artificial_lighting: false, hot_water: false, hvac: false }, responsible_name:'', responsible_registration:'', responsible_email:'' }; }
  });
  const [msg, setMsg] = useState<string>('');
  const [estimateMsg, setEstimateMsg] = useState<string>('');
  const [estimateWarn, setEstimateWarn] = useState<string>('');

  const facades = Array.isArray(profile.facades) ? profile.facades : [];
  const hasZB = !!String(profile.bioclimatic_zone || '').trim();
  const hasFacadesMinimum = facades.length > 0 && facades.every((f:any)=> typeof f.azimuth_deg === 'number' && !Number.isNaN(f.azimuth_deg) && (f.facade_area_m2 > 0));
  const completeness = (hasZB && hasFacadesMinimum) ? 'Completo' : 'Incompleto';

  async function save() {
    setMsg('');
    const profile_json = JSON.stringify({
      bioclimatic_zone: String(profile.bioclimatic_zone || '').trim(),
      north_offset_deg: Number(profile.north_offset_deg || 0),
      decisions: {
        artificial_lighting: !!profile?.decisions?.artificial_lighting,
        hot_water: !!profile?.decisions?.hot_water,
        hvac: !!profile?.decisions?.hvac,
      },
      responsible_name: String(profile.responsible_name || '').trim() || undefined,
      responsible_registration: String(profile.responsible_registration || '').trim() || undefined,
      responsible_email: String(profile.responsible_email || '').trim() || undefined,
      facades: (Array.isArray(profile.facades) ? profile.facades : []).map((f:any)=>({
        name: String(f.name || '').trim(),
        azimuth_deg: Number(f.azimuth_deg),
        facade_area_m2: Number(f.facade_area_m2),
        window_area_m2: Number(f.window_area_m2 || 0),
      })),
    });
    await api(`/projects/${projectId}`, { method:'PUT', body: JSON.stringify({ ence_target: enceTarget || null, profile_json }) });
    setMsg('Salvo! Isso atualiza automaticamente itens do checklist que dependem desses dados.');
    onSaved?.();
  }

  async function estimateZB() {
    setEstimateMsg('');
    setEstimateWarn('');
    const city = String(project.city || '').trim();
    const state = String(project.state || '').trim();
    if (!city || !state) {
      setEstimateWarn('Para estimar, preencha Cidade/UF no projeto.');
      return;
    }
    try {
      const res: any = await api(`/climate/estimate?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`);
      const zone = res.data.zone;
      if (!zone) {
        setEstimateWarn('Não foi possível estimar a zona para esta localização. Confirme no mapa oficial.');
        return;
      }
      setProfile({ ...profile, bioclimatic_zone: zone });
      const method = res.data.method === 'by_city' ? 'por cidade (lista principal)' : res.data.method === 'by_state' ? 'por estado (aproximação)' : 'desconhecido';
      const conf = res.data.confidence === 'high' ? 'alta' : res.data.confidence === 'medium' ? 'média' : 'baixa';
      setEstimateMsg(`ZB estimada: ${zone}. Método: ${method}. Confiança: ${conf}. ${res.data.disclaimer || 'Estimativa aproximada.'}`);
    } catch (e: any) {
      setEstimateWarn(e?.error?.message || 'Falha ao estimar zona.');
    }
  }

  return (
    <div className="grid2">
      <div className="card sub">
        <h3>Perfil técnico mínimo (para ENCE)</h3>
        <p className="muted">Preencha estes dados para o VetorEco orientar o checklist e reduzir retrabalho na preparação do dossiê.</p>

        <div className="field">
          <label>Meta (não é a ENCE oficial)</label>
          <select value={enceTarget} onChange={(e)=>setEnceTarget(e.target.value)}>
            <option value="">(não definido)</option>
            <option value="minimo">Atender mínimo exigido</option>
            <option value="otimizar">Otimizar (folga)</option>
            <option value="alto">Alto desempenho</option>
          </select>
          <div className="muted">Usada para priorizar tarefas e alertas. A emissão oficial segue o processo institucional.</div>
        </div>

        <div className="row">
          <div className="field">
            <label>Zona bioclimática (ZB)</label>
            <select value={profile.bioclimatic_zone || ''} onChange={(e)=>setProfile({ ...profile, bioclimatic_zone: e.target.value })}>
              <option value="">(selecione)</option>
              {[1,2,3,4,5,6,7,8].map((n)=> <option key={n} value={`ZB${n}`}>{`ZB${n}`}</option>)}
            </select>
            <div className="muted">Dica: consulte o mapa oficial (NBR 15220-3) para confirmar.</div>
            <button className="btn" style={{ marginTop: 8 }} onClick={estimateZB}>Estimar Zona Bioclimática (aproximado)</button>
            {estimateMsg ? <div className="warnBox" style={{ marginTop: 8 }}><b>Estimativa</b><div className="muted">{estimateMsg}</div><div className="muted"><b>Estimativa não substitui verificação normativa.</b></div></div> : null}
            {estimateWarn ? <div className="error" style={{ marginTop: 8 }}>{estimateWarn}</div> : null}
          </div>
          <div className="field">
            <label>Desvio do norte (°) (opcional)</label>
            <input value={profile.north_offset_deg ?? 0} onChange={(e)=>setProfile({ ...profile, north_offset_deg: Number(e.target.value) })} />
            <div className="muted">Use se o desenho/modelo não estiver alinhado ao norte verdadeiro.</div>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 8 }}><b>Fachadas principais</b> (azimute e áreas aproximadas)</div>
        {facades.map((f:any, idx:number)=> (
          <div className="row" key={idx}>
            <div className="field"><label>Nome</label><input value={f.name||''} onChange={(e)=>{ const nf=[...facades]; nf[idx]={...nf[idx], name:e.target.value}; setProfile({ ...profile, facades:nf }); }} placeholder="N, NE, Fachada 1" /></div>
            <div className="field"><label>Azimute (°)</label><input value={f.azimuth_deg ?? ''} onChange={(e)=>{ const nf=[...facades]; nf[idx]={...nf[idx], azimuth_deg:Number(e.target.value)}; setProfile({ ...profile, facades:nf }); }} /></div>
            <div className="field"><label>Área fachada (m²)</label><input value={f.facade_area_m2 ?? ''} onChange={(e)=>{ const nf=[...facades]; nf[idx]={...nf[idx], facade_area_m2:Number(e.target.value)}; setProfile({ ...profile, facades:nf }); }} /></div>
            <div className="field"><label>Área janelas (m²)</label><input value={f.window_area_m2 ?? 0} onChange={(e)=>{ const nf=[...facades]; nf[idx]={...nf[idx], window_area_m2:Number(e.target.value)}; setProfile({ ...profile, facades:nf }); }} /></div>
          </div>
        ))}
        <button className="btn" onClick={()=>setProfile({ ...profile, facades:[...facades, { name:'', azimuth_deg:0, facade_area_m2:0, window_area_m2:0 }] })}>+ Adicionar fachada</button>

        <div className="card sub" style={{ marginTop: 12 }}>
          <h4 style={{ marginTop: 0 }}>Decisões de escopo (desbloqueiam itens do checklist)</h4>
          <div className="muted">Marque o que se aplica. Itens não marcados ficam como <b>não aplicáveis</b> e não bloqueiam a prontidão.</div>
          <div className="row" style={{ marginTop: 8, gap: 16, flexWrap: 'wrap' }}>
            <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={!!profile?.decisions?.artificial_lighting} onChange={(e)=>setProfile({ ...profile, decisions: { ...(profile.decisions||{}), artificial_lighting: e.target.checked } })} />
              Iluminação artificial (LPD/DPIL)
            </label>
            <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={!!profile?.decisions?.hot_water} onChange={(e)=>setProfile({ ...profile, decisions: { ...(profile.decisions||{}), hot_water: e.target.checked } })} />
              Água quente (sistema)
            </label>
            <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={!!profile?.decisions?.hvac} onChange={(e)=>setProfile({ ...profile, decisions: { ...(profile.decisions||{}), hvac: e.target.checked } })} />
              HVAC / ar-condicionado
            </label>
          </div>
        </div>

        <div className="card sub" style={{ marginTop: 12 }}>
          <h4 style={{ marginTop: 0 }}>Responsável técnico (opcional)</h4>
          <div className="row">
            <div className="field"><label>Nome</label><input value={profile.responsible_name || ''} onChange={(e)=>setProfile({ ...profile, responsible_name: e.target.value })} /></div>
            <div className="field"><label>Registro (CAU/CREA)</label><input value={profile.responsible_registration || ''} onChange={(e)=>setProfile({ ...profile, responsible_registration: e.target.value })} /></div>
          </div>
          <div className="field"><label>Email</label><input value={profile.responsible_email || ''} onChange={(e)=>setProfile({ ...profile, responsible_email: e.target.value })} /></div>
        </div>

        {msg ? <div className="ok" style={{ marginTop: 8 }}>{msg}</div> : null}
        <div className="muted" style={{ marginTop: 8 }}>Status do perfil: <b>{completeness}</b></div>
        <button className="btn primary" style={{ marginTop: 10 }} onClick={save}>Salvar perfil</button>
      </div>

      <div className="card sub">
        <h3>Por que isso é importante</h3>
        <ul className="muted">
          <li>Zona bioclimática e orientação impactam decisões de envoltória e aberturas.</li>
          <li>Sem áreas de fachada e janelas, você não consegue controlar WWR/PAF e justificar escolhas.</li>
          <li>Esses dados são usados pelo VetorEco para sinalizar riscos de retrabalho antes do processo oficial.</li>
        </ul>
        <p className="muted">Referências institucionais: <a href="https://pbeedifica.com.br/inirmanuais" target="_blank" rel="noreferrer">Manuais INI</a> • <a href="https://pbeedifica.com.br/sites/default/files/manuais/Manual%20RAC_novo%20formato_maio25.pdf" target="_blank" rel="noreferrer">Manual RAC</a></p>
      </div>
    </div>
  );
}

function JourneyTab({ projectId, journey, onChange, onAddEvidence, onRunCalc, onStageChanged }: any) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [stageErr, setStageErr] = useState<string>('');
  const [showInactive, setShowInactive] = useState<boolean>(false);

  const stageLabel = (s: string) => ({
    study: 'Estudo',
    anteproject: 'Anteprojeto',
    executive: 'Executivo',
    construction: 'Obra (Construído)'
  } as any)[s] || s;

  const grouped: Record<string, any[]> = {};
  for (const t of journey.tasks) (grouped[t.stage] = grouped[t.stage] || []).push(t);
  const inactiveCount = (journey.tasks || []).filter((t: any) => t.active === false).length;

  const stages = [
    { key: 'study', label: 'Estudo' },
    { key: 'anteproject', label: 'Anteprojeto' },
    { key: 'executive', label: 'Executivo' },
    { key: 'construction', label: 'Obra (Construído)' },
  ];

  async function toggle(t: any) {
    await api(`/projects/${projectId}/tasks/${t.id}`, { method: 'PUT', body: JSON.stringify({ completed: !t.completed }) });
    onChange();
  }

  async function markDone(taskId: string) {
    await api(`/projects/${projectId}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ completed: true }) });
    onChange();
  }

  async function saveNotes(t: any, notes: string) {
    await api(`/projects/${projectId}/tasks/${t.id}`, { method: 'PUT', body: JSON.stringify({ notes }) });
    onChange();
  }

  async function advance(force = false) {
    setStageErr('');
    try {
      await api(`/projects/${projectId}/stage/advance`, { method: 'POST', body: JSON.stringify({ force }) });
      onStageChanged();
    } catch (e: any) {
      setStageErr(e?.error?.message || 'Não foi possível avançar etapa.');
    }
  }

  const msg = journey.readiness?.upToCurrentStage?.message || 'Siga a jornada para reduzir retrabalho.';

  return (
    <div>
      <p className="muted">{msg}</p>

      <div className="card sub" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Etapa</h3>
        <div className="muted">Atual: <b>{stageLabel(journey.stage.current)}</b>{journey.stage.next ? <> → Próxima: <b>{stageLabel(journey.stage.next)}</b></> : null}</div>
        {journey.stage.blockers?.length ? (
          <div className="warnBox">
            <div><b>Bloqueadores críticos desta etapa:</b></div>
            <ul>
            {journey.stage.blockers.map((b: any) => (
              <li key={b.id}>
                {b.title}
                {b.missing?.length ? <span className="muted"> — faltando: {b.missing.join(', ')}</span> : null}
              </li>
            ))}
            </ul>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn" disabled>Avançar</button>
              <button className="btn" onClick={() => advance(true)}>Avançar mesmo assim</button>
            </div>
          </div>
        ) : (
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => advance(false)} disabled={!journey.stage.next}>Avançar etapa</button>
          </div>
        )}
        {stageErr ? <div className="error" style={{ marginTop: 8 }}>{stageErr}</div> : null}
      </div>

      <div className="card sub" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Próximas ações</h3>
        {journey.nextActions?.length ? (
          <ul className="list">
            {journey.nextActions.map((t: any) => (
              <li key={t.id} className="listItem">
                <div>
                  <div className="listTitle">{t.title} {t.critical ? <span className="pill">crítico</span> : null}</div>
                  <div className="muted">{t.description}</div>
                  {(t.critical && !t.satisfied) && (
                    <div className="muted" style={{ marginTop: 6 }}>
                      Pendência: {[
                        (!t.completed ? 'marcar como feito' : null),
                        (t.missing?.projectData ? 'dados mínimos' : null),
                        (t.missing?.evidence ? 'evidência' : null),
                        (t.missing?.calculation ? 'cálculo' : null),
                      ].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div className="muted">Evidências: {t.evidence_count || 0} • Cálculos: {t.calc_count || 0}</div>
                </div>
                <div className="row">
                  <button className="btn" onClick={() => markDone(t.id)}>Marcar feito</button>
                  <button className="btn" onClick={() => onAddEvidence({ task_id: t.id, stage: t.stage, title: `Evidência — ${t.title}` })}>Evidência</button>
                  {t.meta?.calculators?.length ? (
                    <button className="btn" onClick={() => onRunCalc({ task_id: t.id, type: t.meta.calculators[0] })}>Calculadora</button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="muted">Nenhuma ação pendente imediata.</div>}
      </div>

      {inactiveCount > 0 ? (
        <div className="card sub" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Itens não aplicáveis (dependem de decisões)</h3>
          <div className="muted">Há <b>{inactiveCount}</b> itens do checklist desativados por decisões do escopo (Perfil técnico → Decisões). Eles não bloqueiam a prontidão.</div>
          <button className="btn" style={{ marginTop: 8 }} onClick={() => setShowInactive(!showInactive)}>
            {showInactive ? 'Ocultar itens não aplicáveis' : 'Mostrar itens não aplicáveis'}
          </button>
        </div>
      ) : null}

      {stages.map((s) => (
        <div key={s.key} className="stageBlock">
          <h3>{s.label}</h3>
          <ul className="list">
            {(grouped[s.key] || []).filter((t:any)=> (t.active !== false) || showInactive).map((t: any) => {
              const isOpen = !!expanded[t.id];
              const refs = t.meta?.references || [];
              const hints = t.meta?.evidenceHints || [];
              const calcs = t.meta?.calculators || [];
              const needsAttention = t.critical && !t.satisfied;
              const inactive = t.active === false;
              return (
                <li key={t.id} className="taskItem">
                  <div className="taskLeft">
                    <input type="checkbox" checked={!!t.completed} disabled={inactive} onChange={() => toggle(t)} />
                    <div>
                      <div className="taskTitle">{t.title} {t.critical ? <span className="pill">crítico</span> : null} {inactive ? <span className="pill" style={{ marginLeft: 8 }}>não aplicável</span> : null}</div>
                      <div className="muted">{t.description}</div>
                      <div className="muted" style={{ marginTop: 6 }}>
                        Evidências: <b>{t.evidence_count || 0}</b> • Cálculos: <b>{t.calc_count || 0}</b>
                        {needsAttention ? <span className="pill" style={{ marginLeft: 8 }}>pendente</span> : null}
                      </div>
                      {(!inactive && needsAttention) ? (
                        <div className="muted" style={{ marginTop: 4 }}>
                          Faltando: {[
                            (!t.completed ? 'marcar como feito' : null),
                            (t.missing?.projectData ? 'dados mínimos' : null),
                            (t.missing?.evidence ? 'evidência' : null),
                            (t.missing?.calculation ? 'cálculo' : null),
                          ].filter(Boolean).join(', ')}
                        </div>
                      ) : null}
                      <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                        <button className="btn" disabled={inactive} onClick={() => onAddEvidence({ task_id: t.id, stage: t.stage, title: `Evidência — ${t.title}` })}>Anexar evidência</button>
                        {calcs.map((ct: any) => (
                          <button key={ct} className="btn" disabled={inactive} onClick={() => onRunCalc({ task_id: t.id, type: ct })}>Abrir {ct}</button>
                        ))}
                        <button className="btn" onClick={() => setExpanded({ ...expanded, [t.id]: !isOpen })}>{isOpen ? 'Menos' : 'Detalhes'}</button>
                      </div>
                      {isOpen ? (
                        <div className="detailsBox">
                          {t.meta?.why ? <div><b>Por quê:</b> <span className="muted">{t.meta.why}</span></div> : null}
                          {t.meta?.how ? <div style={{ marginTop: 6 }}><b>Como:</b> <span className="muted">{t.meta.how}</span></div> : null}
                          {Array.isArray(t.meta?.minData) && t.meta.minData.length ? (
                            <div style={{ marginTop: 6 }}>
                              <b>Dados mínimos:</b>
                              <ul className="muted">
                                {t.meta.minData.map((h: string, i: number) => <li key={i}>{h}</li>)}
                              </ul>
                            </div>
                          ) : null}
                          {Array.isArray(t.meta?.commonMistakes) && t.meta.commonMistakes.length ? (
                            <div style={{ marginTop: 6 }}>
                              <b>Erros comuns:</b>
                              <ul className="muted">
                                {t.meta.commonMistakes.map((h: string, i: number) => <li key={i}>{h}</li>)}
                              </ul>
                            </div>
                          ) : null}
                          {hints.length ? (
                            <div style={{ marginTop: 6 }}>
                              <b>Evidências recomendadas:</b>
                              <ul className="muted">
                                {hints.map((h: string, i: number) => <li key={i}>{h}</li>)}
                              </ul>
                            </div>
                          ) : null}
                          {Array.isArray(t.meta?.acceptanceCriteria) && t.meta.acceptanceCriteria.length ? (
                            <div style={{ marginTop: 6 }}>
                              <b>Critérios de aceite:</b>
                              <ul className="muted">
                                {t.meta.acceptanceCriteria.map((h: string, i: number) => <li key={i}>{h}</li>)}
                              </ul>
                            </div>
                          ) : null}
                          {Array.isArray(t.meta?.fileNamingHints) && t.meta.fileNamingHints.length ? (
                            <div style={{ marginTop: 6 }}>
                              <b>Sugestão de arquivos/anexos:</b>
                              <ul className="muted">
                                {t.meta.fileNamingHints.map((h: string, i: number) => <li key={i}>{h}</li>)}
                              </ul>
                            </div>
                          ) : null}
                          {refs.length ? (
                            <div style={{ marginTop: 6 }}>
                              <b>Referências:</b>
                              <ul className="muted">
                                {refs.map((r: any, i: number) => (
                                  <li key={i}>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}{r.section ? ` — ${r.section}` : ''}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="taskNote">
                    <input defaultValue={t.notes || ''} placeholder="nota (opcional)" onBlur={(e) => saveNotes(t, e.target.value)} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CalcsTab({ projectId, calcs, onChange, prefill, onPrefillUsed }: any) {
  const [type, setType] = useState<'u_value'|'wwr'|'wwr_facades'|'avs'|'lpd'|'lpd_spaces'>('u_value');
  const [inputs, setInputs] = useState<any>({ orientation:'vertical', include_surface_resistance:true, layers:[{name:'Alvenaria', thickness_m:0.14, conductivity_W_mK:1.4}] });
  const [result, setResult] = useState<any>(null);
  const [errMsg, setErrMsg] = useState('');
  const [taskId, setTaskId] = useState<string|undefined>(undefined);

  const [dpil, setDpil] = useState<any>(null);
  const [dpilFunc, setDpilFunc] = useState<string>('');
  const [dpilLevel, setDpilLevel] = useState<'A'|'B'|'C'|'D'>('A');

  useEffect(()=>{
    setErrMsg(''); setResult(null);
    if (type === 'wwr') setInputs({ window_area_m2: 8, facade_area_m2: 40 });
    if (type === 'wwr_facades') setInputs({ facades: [
      { name: 'N', azimuth_deg: 0, facade_area_m2: 40, window_area_m2: 8 },
      { name: 'S', azimuth_deg: 180, facade_area_m2: 40, window_area_m2: 6 },
    ]});
    if (type === 'avs') setInputs({ overhang_depth_m: 0.6, vertical_gap_m: 1.2 });
    if (type === 'lpd') setInputs({ total_lighting_watts: 800, area_m2: 40 });
    if (type === 'lpd_spaces') setInputs({ spaces: [
      { name: 'Sala', area_m2: 20, watts: 300 },
      { name: 'Quarto', area_m2: 12, watts: 120 },
    ]});
    if (type === 'u_value') setInputs({ orientation:'vertical', include_surface_resistance:true, layers:[{name:'Alvenaria', thickness_m:0.14, conductivity_W_mK:1.4}] });
  }, [type]);

  useEffect(() => {
    if (dpil) return;
    // Carregar DPIL uma vez (usado na comparação LPD)
    (async () => {
      try {
        const res: any = await api('/rtqc/dpil');
        setDpil(res.data);
        const first = (res.data?.rows || [])[0];
        if (first?.key) setDpilFunc(first.key);
      } catch {
        // silencioso — comparação é opcional
      }
    })();
  }, [dpil]);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.type) setType(prefill.type);
    if (prefill.task_id) setTaskId(prefill.task_id);
    onPrefillUsed?.();
  }, [prefill]);

  async function run() {
    setErrMsg(''); setResult(null);
    try {
      const res:any = await api(`/projects/${projectId}/calculations/run`, { method:'POST', body: JSON.stringify({ type, inputs, task_id: taskId }) });
      setResult(res.data.result);
      onChange();
    } catch (e:any) {
      setErrMsg(formatApiError(e, 'Erro no cálculo.'));
    }
  }

  const currentLPD = (() => {
    if (!result) return null;
    if (type === 'lpd') return typeof result.lpd_W_m2 === 'number' ? result.lpd_W_m2 : null;
    if (type === 'lpd_spaces') return typeof result.total?.lpd_W_m2 === 'number' ? result.total.lpd_W_m2 : null;
    return null;
  })();

  const dpilRow = (() => {
    const rows = dpil?.rows || [];
    return rows.find((r:any) => r.key === dpilFunc) || null;
  })();
  const dpilLimit = dpilRow ? dpilRow.dpil_W_m2?.[dpilLevel] : null;

  return (
    <div className="grid2">
      <div className="card sub">
        <h3>Executar calculadora</h3>
        <div className="field">
          <label>Tipo</label>
          <select value={type} onChange={(e)=>setType(e.target.value as any)}>
            <option value="u_value">U-value (camadas)</option>
            <option value="wwr_facades">% aberturas por fachada (WWR/PAF)</option>
            <option value="avs">AVS (sombreamento)</option>
            <option value="lpd_spaces">LPD por ambiente</option>
            <option value="wwr">(simples) WWR total</option>
            <option value="lpd">(simples) LPD total</option>
          </select>
        </div>

        {type === 'u_value' && (
          <>
            <div className="row">
              <div className="field">
                <label>Orientação</label>
                <select value={inputs.orientation} onChange={(e)=>setInputs({...inputs, orientation:e.target.value})}>
                  <option value="vertical">Parede</option>
                  <option value="roof">Cobertura</option>
                  <option value="floor">Piso</option>
                </select>
              </div>
              <div className="field">
                <label>Incluir resistências superficiais</label>
                <select value={String(inputs.include_surface_resistance)} onChange={(e)=>setInputs({...inputs, include_surface_resistance: e.target.value==='true'})}>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>

            <div className="muted">Camadas (m e W/mK)</div>
            {(inputs.layers || []).map((l:any, idx:number)=>(
              <div className="row" key={idx}>
                <div className="field"><label>Nome</label><input value={l.name||''} onChange={(e)=>{ const nl=[...inputs.layers]; nl[idx]={...nl[idx], name:e.target.value}; setInputs({...inputs, layers:nl}); }} /></div>
                <div className="field"><label>Espessura (m)</label><input value={l.thickness_m} onChange={(e)=>{ const nl=[...inputs.layers]; nl[idx]={...nl[idx], thickness_m:Number(e.target.value)}; setInputs({...inputs, layers:nl}); }} /></div>
                <div className="field"><label>Condutividade (W/mK)</label><input value={l.conductivity_W_mK} onChange={(e)=>{ const nl=[...inputs.layers]; nl[idx]={...nl[idx], conductivity_W_mK:Number(e.target.value)}; setInputs({...inputs, layers:nl}); }} /></div>
              </div>
            ))}
            <button className="btn" onClick={()=>setInputs({...inputs, layers:[...inputs.layers, {name:'', thickness_m:0.02, conductivity_W_mK:0.04}]})}>+ Adicionar camada</button>
          </>
        )}

        {type === 'wwr' && (
          <div className="row">
            <div className="field"><label>Área janelas (m²)</label><input value={inputs.window_area_m2} onChange={(e)=>setInputs({...inputs, window_area_m2:Number(e.target.value)})} /></div>
            <div className="field"><label>Área fachada (m²)</label><input value={inputs.facade_area_m2} onChange={(e)=>setInputs({...inputs, facade_area_m2:Number(e.target.value)})} /></div>
          </div>
        )}

        {type === 'wwr_facades' && (
          <>
            <div className="muted">Fachadas (m² e azimute em graus)</div>
            {(inputs.facades || []).map((f:any, idx:number)=> (
              <div className="row" key={idx}>
                <div className="field"><label>Nome</label><input value={f.name||''} onChange={(e)=>{ const nf=[...inputs.facades]; nf[idx]={...nf[idx], name:e.target.value}; setInputs({...inputs, facades:nf}); }} /></div>
                <div className="field"><label>Azimute (°)</label><input value={f.azimuth_deg ?? ''} onChange={(e)=>{ const nf=[...inputs.facades]; nf[idx]={...nf[idx], azimuth_deg:Number(e.target.value)}; setInputs({...inputs, facades:nf}); }} /></div>
                <div className="field"><label>Área fachada (m²)</label><input value={f.facade_area_m2} onChange={(e)=>{ const nf=[...inputs.facades]; nf[idx]={...nf[idx], facade_area_m2:Number(e.target.value)}; setInputs({...inputs, facades:nf}); }} /></div>
                <div className="field"><label>Área janelas (m²)</label><input value={f.window_area_m2} onChange={(e)=>{ const nf=[...inputs.facades]; nf[idx]={...nf[idx], window_area_m2:Number(e.target.value)}; setInputs({...inputs, facades:nf}); }} /></div>
              </div>
            ))}
            <button className="btn" onClick={()=>setInputs({...inputs, facades:[...inputs.facades, {name:'', azimuth_deg:0, facade_area_m2:20, window_area_m2:4}]})}>+ Adicionar fachada</button>
          </>
        )}

        {type === 'avs' && (
          <div className="row">
            <div className="field"><label>Profundidade do beiral/brise (m)</label><input value={inputs.overhang_depth_m} onChange={(e)=>setInputs({...inputs, overhang_depth_m:Number(e.target.value)})} /></div>
            <div className="field"><label>Vão vertical (m)</label><input value={inputs.vertical_gap_m} onChange={(e)=>setInputs({...inputs, vertical_gap_m:Number(e.target.value)})} /></div>
          </div>
        )}

        {type === 'lpd' && (
          <div className="row">
            <div className="field"><label>Potência total (W)</label><input value={inputs.total_lighting_watts} onChange={(e)=>setInputs({...inputs, total_lighting_watts:Number(e.target.value)})} /></div>
            <div className="field"><label>Área (m²)</label><input value={inputs.area_m2} onChange={(e)=>setInputs({...inputs, area_m2:Number(e.target.value)})} /></div>
          </div>
        )}

        {type === 'lpd_spaces' && (
          <>
            <div className="muted">Ambientes</div>
            {(inputs.spaces || []).map((s:any, idx:number)=> (
              <div className="row" key={idx}>
                <div className="field"><label>Nome</label><input value={s.name||''} onChange={(e)=>{ const ns=[...inputs.spaces]; ns[idx]={...ns[idx], name:e.target.value}; setInputs({...inputs, spaces:ns}); }} /></div>
                <div className="field"><label>Área (m²)</label><input value={s.area_m2} onChange={(e)=>{ const ns=[...inputs.spaces]; ns[idx]={...ns[idx], area_m2:Number(e.target.value)}; setInputs({...inputs, spaces:ns}); }} /></div>
                <div className="field"><label>Potência (W)</label><input value={s.watts} onChange={(e)=>{ const ns=[...inputs.spaces]; ns[idx]={...ns[idx], watts:Number(e.target.value)}; setInputs({...inputs, spaces:ns}); }} /></div>
              </div>
            ))}
            <button className="btn" onClick={()=>setInputs({...inputs, spaces:[...inputs.spaces, {name:'', area_m2:10, watts:100}]})}>+ Adicionar ambiente</button>
          </>
        )}

        {(type === 'lpd' || type === 'lpd_spaces') && (
          <div className="card sub" style={{ marginTop: 12 }}>
            <h4 style={{ marginTop: 0 }}>Comparar com DPIL (RTQ-C)</h4>
            <div className="muted">Selecione a função e o nível pretendido para comparar o LPD calculado com o limite DPIL.</div>
            <div className="row" style={{ marginTop: 8 }}>
              <div className="field">
                <label>Função</label>
                <select value={dpilFunc} onChange={(e)=>setDpilFunc(e.target.value)}>
                  <option value="">(carregando…)</option>
                  {(dpil?.rows || []).map((r:any)=> <option key={r.key} value={r.key}>{r.funcao}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Nível</label>
                <select value={dpilLevel} onChange={(e)=>setDpilLevel(e.target.value as any)}>
                  {(['A','B','C','D'] as const).map((l)=> <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            {dpilLimit != null ? (
              <div className="muted" style={{ marginTop: 8 }}>
                <b>Limite DPIL:</b> {dpilLimit} W/m² — {dpil?.reference?.table || 'RTQ-C Tabela 4.1'}
                {dpil?.reference?.url ? <> • <a href={dpil.reference.url} target="_blank" rel="noreferrer">fonte</a></> : null}
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>Limite DPIL indisponível (não carregado ou função inválida).</div>
            )}

            {currentLPD != null && dpilLimit != null ? (
              <div className={currentLPD <= dpilLimit ? 'ok' : 'warnBox'} style={{ marginTop: 10 }}>
                <b>{currentLPD <= dpilLimit ? 'OK' : 'Acima do limite'}</b>
                <div className="muted">LPD calculado: {currentLPD} W/m² • Limite: {dpilLimit} W/m²</div>
                {dpilRow?.reference ? <div className="muted" style={{ marginTop: 6 }}>Referência: {dpilRow.reference}</div> : null}
              </div>
            ) : null}
          </div>
        )}

        {errMsg && <div className="error">{errMsg}</div>}
        {taskId ? <div className="muted">Vinculado a uma tarefa do checklist.</div> : <div className="muted">Dica: abra a calculadora a partir de uma tarefa para vincular automaticamente.</div>}
        <button className="btn primary" onClick={run}>Salvar cálculo</button>

        {result && (
          <div className="resultBox">
            <div className="muted">Resultado</div>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="card sub">
        <h3>Histórico</h3>
        {calcs.length === 0 ? <div className="muted">Sem cálculos ainda.</div> : (
          <ul className="list">
            {calcs.map((c:any)=>(
              <li key={c.id} className="listItem">
                <div>
                  <div className="listTitle">{c.calc_type}</div>
                  <div className="muted">{c.task_title ? `Ligado a: ${c.task_title} • ` : ''}{c.created_at}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EvidencesTab({ projectId, evidences, onChange, prefill, onPrefillUsed, tasks }: any) {
  const [stage, setStage] = useState('study');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [evidenceType, setEvidenceType] = useState<'link'|'file'|'text'>('link');
  const [contentText, setContentText] = useState('');
  const [racSection, setRacSection] = useState('');
  const [notes, setNotes] = useState('');
  const [taskId, setTaskId] = useState<string|undefined>(undefined);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.stage) setStage(prefill.stage);
    if (prefill.title) setTitle(prefill.title);
    if (prefill.task_id) setTaskId(prefill.task_id);
    onPrefillUsed?.();
  }, [prefill]);

  async function add() {
    await api(`/projects/${projectId}/evidences`, {
      method:'POST',
      body: JSON.stringify({
        stage,
        title,
        url: evidenceType === 'text' ? undefined : url,
        evidence_type: evidenceType,
        content_text: evidenceType === 'text' ? contentText : undefined,
        rac_section: racSection || undefined,
        notes: notes || undefined,
        task_id: taskId,
      })
    });
    setTitle(''); setUrl(''); setNotes(''); setContentText(''); setRacSection('');
    onChange();
  }

  return (
    <div className="grid2">
      <div className="card sub">
        <h3>Adicionar evidência</h3>
        <div className="field">
          <label>Tipo</label>
          <select value={evidenceType} onChange={(e)=>setEvidenceType(e.target.value as any)}>
            <option value="link">Link</option>
            <option value="file">Arquivo (link para Drive/Dropbox etc.)</option>
            <option value="text">Texto (nota técnica)</option>
          </select>
        </div>
        <div className="field">
          <label>Etapa</label>
          <select value={stage} onChange={(e)=>setStage(e.target.value)}>
            <option value="study">Estudo</option>
            <option value="anteproject">Anteprojeto</option>
            <option value="executive">Executivo</option>
            <option value="construction">Obra</option>
          </select>
        </div>
        <div className="field">
          <label>Vincular a tarefa (opcional)</label>
          <select value={taskId || ''} onChange={(e)=>setTaskId(e.target.value || undefined)}>
            <option value="">(sem vínculo)</option>
            {(tasks || []).map((t:any)=>(
              <option key={t.id} value={t.id}>({t.stage}) {t.title}</option>
            ))}
          </select>
        </div>
        <div className="field"><label>Título</label><input value={title} onChange={(e)=>setTitle(e.target.value)} /></div>
        {evidenceType !== 'text' ? (
          <div className="field"><label>URL</label><input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://..." /></div>
        ) : (
          <div className="field"><label>Conteúdo (texto)</label><textarea value={contentText} onChange={(e)=>setContentText(e.target.value)} rows={6} placeholder="Cole aqui uma nota técnica curta, decisão, premissa, registro de mudança…" /></div>
        )}
        <div className="field"><label>Vínculo RAC (opcional)</label><input value={racSection} onChange={(e)=>setRacSection(e.target.value)} placeholder="Ex.: Inspeção de Projeto / Documentos • Inspeção do Construído / Evidências" /></div>
        <div className="field"><label>Notas (opcional)</label><input value={notes} onChange={(e)=>setNotes(e.target.value)} /></div>
        <button className="btn primary" onClick={add} disabled={!title || (evidenceType !== 'text' ? !url : !contentText.trim())}>Adicionar</button>
        <p className="muted">Uploads diretos ainda não estão no MVP — use links para arquivos (Drive/Dropbox) ou evidência textual.</p>
      </div>

      <div className="card sub">
        <h3>Evidências</h3>
        {evidences.length === 0 ? <div className="muted">Sem evidências ainda.</div> : (
          <ul className="list">
            {evidences.map((e:any)=>(
              <li key={e.id} className="listItem">
                <div>
                  <div className="listTitle">({e.stage}) {e.title}</div>
                  <div className="muted">Tipo: <b>{e.evidence_type || 'link'}</b>{e.rac_section ? <> • RAC: {e.rac_section}</> : null}</div>
                  {e.task_title ? <div className="muted">Ligado a: {e.task_title}</div> : null}
                  {e.evidence_type === 'text'
                    ? <div className="muted" style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{String(e.content_text || '').slice(0, 600)}{String(e.content_text || '').length > 600 ? '…' : ''}</div>
                    : <a className="muted" href={e.url} target="_blank" rel="noreferrer">{e.url}</a>
                  }
                  {e.notes ? <div className="muted">Nota: {e.notes}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DossierTab({ projectId }: any) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
  return (
    <div className="grid2">
      <div className="card sub">
        <h3>Dossiê de preparação</h3>
        <p className="muted">Gere um dossiê com checklist, evidências e cálculos para reduzir retrabalho antes do processo oficial.</p>
        <div className="row">
          <a className="btn" href={`${apiUrl}/projects/${projectId}/dossier?format=html`} target="_blank" rel="noreferrer">Abrir HTML</a>
          <a className="btn" href={`${apiUrl}/projects/${projectId}/dossier.pdf`} target="_blank" rel="noreferrer">Abrir PDF</a>
        </div>
      </div>
      <div className="card sub">
        <h3>Como usar</h3>
        <ol className="muted">
          <li>Complete os itens críticos por etapa</li>
          <li>Registre evidências (links) e notas</li>
          <li>Salve cálculos auxiliares (U, WWR, LPD)</li>
          <li>Gere o dossiê para revisão/organização</li>
        </ol>
      </div>
    </div>
  );
}

function LibraryTab() {
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [selected, setSelected] = useState<any>(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    (async () => {
      setErrMsg('');
      try {
        const res: any = await api('/education/topics');
        setTopics(res.data.topics || []);
      } catch (e: any) {
        setErrMsg(formatApiError(e, 'Não foi possível carregar a biblioteca técnica.'));
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedKey) {
      setSelected(null);
      return;
    }
    (async () => {
      setErrMsg('');
      try {
        const res: any = await api(`/education/topics/${encodeURIComponent(selectedKey)}`);
        setSelected(res.data.topic);
      } catch (e: any) {
        setErrMsg(formatApiError(e, 'Não foi possível abrir o tópico.'));
      }
    })();
  }, [selectedKey]);

  return (
    <div className="grid2">
      <div className="card sub">
        <h3>Biblioteca técnica</h3>
        <div className="muted">Conteúdo educativo + links oficiais. Sem números sem fonte pública.</div>
        {errMsg ? <div className="error" style={{ marginTop: 10 }}>{errMsg}</div> : null}
        <div className="field" style={{ marginTop: 10 }}>
          <label>Tópicos</label>
          <select value={selectedKey} onChange={(e)=>setSelectedKey(e.target.value)}>
            <option value="">(selecione)</option>
            {topics.map((t:any)=> <option key={t.key} value={t.key}>{t.title}</option>)}
          </select>
        </div>
        {selectedKey ? (
          <div className="muted" style={{ marginTop: 8 }}>
            Dica: use este conteúdo para justificar decisões e anexar evidências no dossiê.
          </div>
        ) : null}
      </div>

      <div className="card sub">
        {!selected ? (
          <div className="muted">Selecione um tópico para ver detalhes.</div>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>{selected.title}</h3>
            <div className="muted">{selected.summary}</div>
            <div style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{selected.details}</div>
            {Array.isArray(selected.examples) && selected.examples.length ? (
              <div style={{ marginTop: 12 }}>
                <b>Exemplos</b>
                <ul className="muted">
                  {selected.examples.map((x:string, i:number)=> <li key={i}>{x}</li>)}
                </ul>
              </div>
            ) : null}
            {Array.isArray(selected.references) && selected.references.length ? (
              <div style={{ marginTop: 12 }}>
                <b>Referências</b>
                <ul className="muted">
                  {selected.references.map((r:any, i:number)=> (
                    <li key={i}>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function GuideTab() {
  const [data, setData] = useState<any>(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api('/knowledge/overview');
        setData(res.data.pack);
      } catch (e: any) {
        setErrMsg(formatApiError(e, 'Não foi possível carregar as referências.'));
      }
    })();
  }, []);

  if (errMsg) return <div className="error">{errMsg}</div>;
  if (!data) return <div className="muted">Carregando…</div>;

  return (
    <div className="card sub">
      <h3 style={{ marginTop: 0 }}>Base normativa e processo</h3>
      <div className="muted"><b>Pacote ativo:</b> {data.id} — {data.title} ({data.updated_at})</div>
      {Array.isArray(data.disclaimers) && data.disclaimers.length ? (
        <div className="warnBox" style={{ marginTop: 10 }}>
          <b>Importante</b>
          <ul>
            {data.disclaimers.map((d: string, i: number) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      ) : null}

      {Array.isArray(data.process) && data.process.length ? (
        <div style={{ marginTop: 10 }}>
          <b>Como o VetorEco te guia</b>
          <ul className="muted">
            {data.process.map((p: any, i: number) => (
              <li key={i}><b>{p.step}</b> — {p.title}: {p.text}</li>
            ))}
          </ul>
        </div>
      ) : null}

      
      {data.submission_pack_examples ? (
        <div style={{ marginTop: 10 }}>
          <b>Exemplo de estrutura de anexos (sugestão)</b>
          {Array.isArray(data.submission_pack_examples?.project) && data.submission_pack_examples.project.length ? (
            <div className="muted" style={{ marginTop: 6 }}>
              <b>Pacote ENCE de Projeto</b>
              <ul>
                {data.submission_pack_examples.project.map((p: string, i: number) => <li key={i}><code>{p}</code></li>)}
              </ul>
            </div>
          ) : null}
          {Array.isArray(data.submission_pack_examples?.built) && data.submission_pack_examples.built.length ? (
            <div className="muted" style={{ marginTop: 6 }}>
              <b>Pacote ENCE do Construído</b>
              <ul>
                {data.submission_pack_examples.built.map((p: string, i: number) => <li key={i}><code>{p}</code></li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {data.memorial_templates ? (
        <div style={{ marginTop: 10 }}>
          <b>Template de memorial (rascunho guiado)</b>
          <div className="muted">Use como base para preencher o memorial do projeto e anexar evidências. O template não substitui o processo oficial.</div>
          <div className="muted" style={{ marginTop: 6 }}>
            <b>Seções (Projeto)</b>
            <ul>
              {(data.memorial_templates?.project?.sections || []).map((s: any, i: number) => <li key={i}><b>{s.title}</b>: {s.hints?.join(' • ')}</li>)}
            </ul>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            <b>Seções (Construído)</b>
            <ul>
              {(data.memorial_templates?.built?.sections || []).map((s: any, i: number) => <li key={i}><b>{s.title}</b>: {s.hints?.join(' • ')}</li>)}
            </ul>
          </div>
        </div>
      ) : null}

      {Array.isArray(data.sources) && data.sources.length ? (
        <div style={{ marginTop: 10 }}>
          <b>Fontes oficiais (links)</b>
          <ul className="muted">
            {data.sources.map((s: any, i: number) => (
              <li key={i}>
                {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
                {s.section ? ` — ${s.section}` : ''}
              </li>
            ))}
          </ul>
          <div className="muted">
            Dica: use estes links para conferir atualizações e detalhes, e anexe no VetorEco as evidências pedidas pelo checklist.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [journey, setJourney] = useState<any>(null);
  const [calcs, setCalcs] = useState<any[]>([]);
  const [evidences, setEvidences] = useState<any[]>([]);
  const [tab, setTab] = useState<'journey'|'profile'|'calcs'|'evidences'|'dossier'|'guide'|'library'>('journey');
  const [prefillEvidence, setPrefillEvidence] = useState<any|null>(null);
  const [prefillCalc, setPrefillCalc] = useState<any|null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errMsg, setErrMsg] = useState<string>('');

  async function refresh() {
    setErrMsg('');
    setLoading(true);
    try {
      const p: any = await api(`/projects/${id}`);
      const j: any = await api(`/projects/${id}/journey`);
      const c: any = await api(`/projects/${id}/calculations`);
      const e: any = await api(`/projects/${id}/evidences`);
      setProject(p.data.project);
      setJourney(j.data);
      setCalcs(c.data.calculations);
      setEvidences(e.data.evidences);
    } catch (e: any) {
      setErrMsg(formatApiError(e, 'Erro ao carregar o projeto.'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ refresh(); }, [id]);

  if (loading) return <div className="card">Carregando…</div>;
  if (errMsg) return (
    <div className="card">
      <h2>Não foi possível carregar</h2>
      <div className="error" style={{marginBottom:10}}>{errMsg}</div>
      <button className="btn primary" onClick={refresh}>Tentar novamente</button>
    </div>
  );
  if (!project || !journey) return <div className="card">Carregando…</div>;

  const stageLabel = (s: string) => ({
    study: 'Estudo',
    anteproject: 'Anteprojeto',
    executive: 'Executivo',
    construction: 'Obra (Construído)'
  } as any)[s] || s;

  const rp = journey.readiness?.enceProjeto || { status: 'yellow', progressPct: 0, criticalMissing: 0 };
  const rb = journey.readiness?.enceConstruido || { status: 'yellow', progressPct: 0, criticalMissing: 0 };
  const badgeClass = (s: string) => s === 'green' ? 'badge green' : s === 'red' ? 'badge red' : 'badge yellow';

  return (
    <div className="card">
      <div className="projectHeader">
        <div>
          <h2 style={{margin:0}}>{project.name}</h2>
          <div className="muted">{project.city || '-'} / {project.state || '-'} • {project.typology} • etapa: {stageLabel(project.stage_current)}</div>
        </div>
        <div className="readiness">
          <div className="readinessRow">
            <div className={badgeClass(rp.status)}>PROJETO</div>
            <div className="muted">{rp.progressPct}% • críticos pendentes: {rp.criticalMissing}</div>
          </div>
          <div className="readinessRow">
            <div className={badgeClass(rb.status)}>CONSTRUÍDO</div>
            <div className="muted">{rb.progressPct}% • críticos pendentes: {rb.criticalMissing}</div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={tab==='journey'?'tab active':'tab'} onClick={()=>setTab('journey')}>Jornada</button>
        <button className={tab==='profile'?'tab active':'tab'} onClick={()=>setTab('profile')}>Perfil técnico</button>
        <button className={tab==='library'?'tab active':'tab'} onClick={()=>setTab('library')}>Biblioteca técnica</button>
        <button className={tab==='calcs'?'tab active':'tab'} onClick={()=>setTab('calcs')}>Calculadoras</button>
        <button className={tab==='evidences'?'tab active':'tab'} onClick={()=>setTab('evidences')}>Evidências</button>
        <button className={tab==='dossier'?'tab active':'tab'} onClick={()=>setTab('dossier')}>Dossiê</button>
        <button className={tab==='guide'?'tab active':'tab'} onClick={()=>setTab('guide')}>Normas & processo</button>
      </div>

      {tab === 'journey' && (
        <JourneyTab
          projectId={id!}
          journey={journey}
          onChange={refresh}
          onAddEvidence={(p: any) => { setPrefillEvidence(p); setTab('evidences'); }}
          onRunCalc={(p: any) => { setPrefillCalc(p); setTab('calcs'); }}
          onStageChanged={() => refresh()}
        />
      )}
      {tab === 'profile' && (
        <ProfileTab projectId={id!} project={project} onSaved={refresh} />
      )}
      {tab === 'library' && <LibraryTab />}
      {tab === 'calcs' && <CalcsTab projectId={id!} calcs={calcs} onChange={refresh} prefill={prefillCalc} onPrefillUsed={()=>setPrefillCalc(null)} />}
      {tab === 'evidences' && <EvidencesTab projectId={id!} evidences={evidences} onChange={refresh} prefill={prefillEvidence} onPrefillUsed={()=>setPrefillEvidence(null)} tasks={journey.tasks} />}
      {tab === 'dossier' && <DossierTab projectId={id!} />}
      {tab === 'guide' && <GuideTab />}
    </div>
  );
}


export default ProjectPage;
