import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { formatApiError } from '../../lib/errors';
import { Loading } from '../../components/Loading';
import { ErrorState } from '../../components/ErrorState';
import { PrivacyNotice } from '../../components/PrivacyNotice';

function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name:'', city:'', state:'MG', typology:'residential', stage_current:'study', area_m2:'' });
  const [loading, setLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<string>('');
  const [errMsg, setErrMsg] = useState<string>('');

  async function refresh() {
    setErrMsg('');
    setLoading(true);
    try {
      const res: any = await api('/projects');
      setProjects(res.data.projects);
    } catch (e: any) {
      setErrMsg(formatApiError(e, 'Erro ao carregar projetos.'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ refresh(); }, []);

  async function create() {
    setMsg('');
    setErrMsg('');
    try {
      const payload = { ...form, area_m2: form.area_m2 ? Number(form.area_m2) : null };
      await api('/projects', { method:'POST', body: JSON.stringify(payload) });
      setForm({ ...form, name:'', area_m2:'' });
      setMsg('Projeto criado.');
      refresh();
    } catch (e: any) {
      setErrMsg(formatApiError(e, 'Erro ao criar projeto.'));
    }
  }

  return (
    <div className="grid2">
      <div className="card">
        <h2>Novo projeto</h2>
        <div className="field"><label>Nome</label><input value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} /></div>
        <div className="row">
          <div className="field"><label>Cidade</label><input value={form.city} onChange={(e)=>setForm({...form, city:e.target.value})} /></div>
          <div className="field"><label>UF</label><input value={form.state} maxLength={2} onChange={(e)=>setForm({...form, state:e.target.value.toUpperCase()})} /></div>
        </div>
        <div className="row">
          <div className="field">
            <label>Tipologia</label>
            <select value={form.typology} onChange={(e)=>setForm({...form, typology:e.target.value})}>
              <option value="residential">Residencial</option>
              <option value="commercial">Comercial/Serviços</option>
              <option value="public">Pública</option>
            </select>
          </div>
          <div className="field">
            <label>Etapa</label>
            <select value={form.stage_current} onChange={(e)=>setForm({...form, stage_current:e.target.value})}>
              <option value="study">Estudo</option>
              <option value="anteproject">Anteprojeto</option>
              <option value="executive">Executivo</option>
              <option value="construction">Obra</option>
            </select>
          </div>
        </div>
        <div className="field"><label>Área (m²)</label><input value={form.area_m2} onChange={(e)=>setForm({...form, area_m2:e.target.value})} /></div>

        {errMsg && <div className="error" style={{marginBottom:10}}>{errMsg}</div>}
        {msg && <div className="success" style={{marginBottom:10}}>{msg}</div>}

        <button className="btn primary" onClick={create} disabled={!form.name.trim()}>Criar</button>
        <p className="muted" style={{marginTop:10}}>O VetorEco cria um checklist por etapa para evitar retrabalho.</p>
      </div>

      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{margin:0}}>Projetos</h2>
          <button className="btn" onClick={refresh} disabled={loading}>Recarregar</button>
        </div>

        {loading ? <div className="muted" style={{marginTop:10}}>Carregando…</div> : (
          projects.length === 0 ? <div className="muted" style={{marginTop:10}}>Nenhum projeto ainda.</div> : (
            <ul className="list" style={{marginTop:10}}>
              {projects.map((p)=>(
                <li key={p.id} className="listItem">
                  <div>
                    <div className="listTitle">{p.name}</div>
                    <div className="muted">{p.city || '-'} / {p.state || '-'} • {p.typology} • etapa: {p.stage_current}</div>
                  </div>
                  <Link className="btn" to={`/projects/${p.id}`}>Abrir</Link>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}


export default ProjectsPage;
