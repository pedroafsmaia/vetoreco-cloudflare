import React, { useState } from 'react';
import { api } from '../../api';
import { Card, Alert, Badge } from '../../ui';

interface ProfileTabProps {
  projectId: string;
  project: {
    ence_target?: string;
    profile_json?: string;
    city?: string;
    state?: string;
  };
  onSaved?: () => void;
}

interface Facade {
  name: string;
  azimuth_deg: number;
  facade_area_m2: number;
  window_area_m2: number;
}

interface Decisions {
  artificial_lighting: boolean;
  hot_water: boolean;
  hvac: boolean;
}

interface Profile {
  bioclimatic_zone: string;
  north_offset_deg: number;
  facades: Facade[];
  decisions: Decisions;
  responsible_name: string;
  responsible_registration: string;
  responsible_email: string;
}

const DEFAULT_PROFILE: Profile = {
  bioclimatic_zone: '',
  north_offset_deg: 0,
  facades: [],
  decisions: { artificial_lighting: false, hot_water: false, hvac: false },
  responsible_name: '',
  responsible_registration: '',
  responsible_email: '',
};

function parseProfile(json?: string): Profile {
  try {
    return json ? { ...DEFAULT_PROFILE, ...JSON.parse(json) } : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export default function ProfileTab({ projectId, project, onSaved }: ProfileTabProps) {
  const [enceTarget, setEnceTarget] = useState<string>(project.ence_target || '');
  const [profile, setProfile] = useState<Profile>(() => parseProfile(project.profile_json));
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [estimateMsg, setEstimateMsg] = useState('');
  const [estimateWarn, setEstimateWarn] = useState('');

  const facades: Facade[] = Array.isArray(profile.facades) ? profile.facades : [];
  const hasZB = !!String(profile.bioclimatic_zone || '').trim();
  const hasFacadesMinimum = facades.length > 0 && facades.every(f =>
    typeof f.azimuth_deg === 'number' && !Number.isNaN(f.azimuth_deg) && f.facade_area_m2 > 0,
  );
  const completeness = hasZB && hasFacadesMinimum ? 'Completo' : 'Incompleto';

  async function save() {
    setMsg('');
    setSaving(true);
    try {
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
        facades: facades.map(f => ({
          name: String(f.name || '').trim(),
          azimuth_deg: Number(f.azimuth_deg),
          facade_area_m2: Number(f.facade_area_m2),
          window_area_m2: Number(f.window_area_m2 || 0),
        })),
      });
      await api(`/projects/${projectId}`, { method: 'PUT', body: JSON.stringify({ ence_target: enceTarget || null, profile_json }) });
      setMsg('Salvo! Isso atualiza automaticamente itens do checklist que dependem desses dados.');
      onSaved?.();
    } finally {
      setSaving(false);
    }
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

  function updateFacade(idx: number, patch: Partial<Facade>) {
    const nf = [...facades];
    nf[idx] = { ...nf[idx], ...patch };
    setProfile({ ...profile, facades: nf });
  }

  return (
    <div className="grid2">
      <Card variant="sub">
        <h3>Perfil técnico mínimo (para ENCE)</h3>
        <p className="muted">Preencha estes dados para o VetorEco orientar o checklist e reduzir retrabalho na preparação do dossiê.</p>

        <div className="field">
          <label htmlFor="profile-ence-target">Meta (não é a ENCE oficial)</label>
          <select id="profile-ence-target" value={enceTarget} onChange={e => setEnceTarget(e.target.value)}>
            <option value="">(não definido)</option>
            <option value="minimo">Atender mínimo exigido</option>
            <option value="otimizar">Otimizar (folga)</option>
            <option value="alto">Alto desempenho</option>
          </select>
          <div className="muted">Usada para priorizar tarefas e alertas. A emissão oficial segue o processo institucional.</div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="profile-zb">Zona bioclimática (ZB)</label>
            <select id="profile-zb" value={profile.bioclimatic_zone || ''} onChange={e => setProfile({ ...profile, bioclimatic_zone: e.target.value })}>
              <option value="">(selecione)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={`ZB${n}`}>{`ZB${n}`}</option>)}
            </select>
            <div className="muted">Dica: consulte o mapa oficial (NBR 15220-3) para confirmar.</div>
            <button className="btn mt-sm" aria-label="Estimar zona bioclimática" onClick={estimateZB}>Estimar Zona Bioclimática (aproximado)</button>
            {estimateMsg && (
              <Alert variant="warning" title="Estimativa">
                <div className="muted">{estimateMsg}</div>
                <div className="muted"><b>Estimativa não substitui verificação normativa.</b></div>
              </Alert>
            )}
            {estimateWarn && <div className="error mt-sm">{estimateWarn}</div>}
          </div>
          <div className="field">
            <label htmlFor="profile-north-offset">Desvio do norte (°) (opcional)</label>
            <input id="profile-north-offset" value={profile.north_offset_deg ?? 0} onChange={e => setProfile({ ...profile, north_offset_deg: Number(e.target.value) })} />
            <div className="muted">Use se o desenho/modelo não estiver alinhado ao norte verdadeiro.</div>
          </div>
        </div>

        <div className="muted mt-sm"><b>Fachadas principais</b> (azimute e áreas aproximadas)</div>
        {facades.map((f, idx) => (
          <div className="row" key={idx}>
            <div className="field"><label htmlFor={`facade-name-${idx}`}>Nome</label><input id={`facade-name-${idx}`} value={f.name || ''} onChange={e => updateFacade(idx, { name: e.target.value })} placeholder="N, NE, Fachada 1" /></div>
            <div className="field"><label htmlFor={`facade-az-${idx}`}>Azimute (°)</label><input id={`facade-az-${idx}`} value={f.azimuth_deg ?? ''} onChange={e => updateFacade(idx, { azimuth_deg: Number(e.target.value) })} /></div>
            <div className="field"><label htmlFor={`facade-area-${idx}`}>Área fachada (m²)</label><input id={`facade-area-${idx}`} value={f.facade_area_m2 ?? ''} onChange={e => updateFacade(idx, { facade_area_m2: Number(e.target.value) })} /></div>
            <div className="field"><label htmlFor={`facade-win-${idx}`}>Área janelas (m²)</label><input id={`facade-win-${idx}`} value={f.window_area_m2 ?? 0} onChange={e => updateFacade(idx, { window_area_m2: Number(e.target.value) })} /></div>
          </div>
        ))}
        <button className="btn" aria-label="Adicionar fachada" onClick={() => setProfile({ ...profile, facades: [...facades, { name: '', azimuth_deg: 0, facade_area_m2: 0, window_area_m2: 0 }] })}>+ Adicionar fachada</button>

        <Card variant="sub" className="mt-md">
          <h4>Decisões de escopo (desbloqueiam itens do checklist)</h4>
          <div className="muted">Marque o que se aplica. Itens não marcados ficam como <b>não aplicáveis</b> e não bloqueiam a prontidão.</div>
          <div className="row mt-sm checkbox-group">
            <label className="checkbox-label" htmlFor="decision-lighting">
              <input type="checkbox" id="decision-lighting" checked={!!profile?.decisions?.artificial_lighting} onChange={e => setProfile({ ...profile, decisions: { ...(profile.decisions || {}), artificial_lighting: e.target.checked } })} />
              Iluminação artificial (LPD/DPIL)
            </label>
            <label className="checkbox-label" htmlFor="decision-hotwater">
              <input type="checkbox" id="decision-hotwater" checked={!!profile?.decisions?.hot_water} onChange={e => setProfile({ ...profile, decisions: { ...(profile.decisions || {}), hot_water: e.target.checked } })} />
              Água quente (sistema)
            </label>
            <label className="checkbox-label" htmlFor="decision-hvac">
              <input type="checkbox" id="decision-hvac" checked={!!profile?.decisions?.hvac} onChange={e => setProfile({ ...profile, decisions: { ...(profile.decisions || {}), hvac: e.target.checked } })} />
              HVAC / ar-condicionado
            </label>
          </div>
        </Card>

        <Card variant="sub" className="mt-md">
          <h4>Responsável técnico (opcional)</h4>
          <div className="row">
            <div className="field"><label htmlFor="resp-name">Nome</label><input id="resp-name" value={profile.responsible_name || ''} onChange={e => setProfile({ ...profile, responsible_name: e.target.value })} /></div>
            <div className="field"><label htmlFor="resp-reg">Registro (CAU/CREA)</label><input id="resp-reg" value={profile.responsible_registration || ''} onChange={e => setProfile({ ...profile, responsible_registration: e.target.value })} /></div>
          </div>
          <div className="field"><label htmlFor="resp-email">Email</label><input id="resp-email" value={profile.responsible_email || ''} onChange={e => setProfile({ ...profile, responsible_email: e.target.value })} /></div>
        </Card>

        {msg && <Alert variant="success">{msg}</Alert>}
        <div className="muted mt-sm">Status do perfil: <Badge variant={completeness === 'Completo' ? 'green' : 'yellow'}>{completeness}</Badge></div>
        <button className="btn primary mt-sm" aria-label="Salvar perfil técnico" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar perfil'}</button>
      </Card>

      <Card variant="sub">
        <h3>Por que isso é importante</h3>
        <ul className="muted">
          <li>Zona bioclimática e orientação impactam decisões de envoltória e aberturas.</li>
          <li>Sem áreas de fachada e janelas, você não consegue controlar WWR/PAF e justificar escolhas.</li>
          <li>Esses dados são usados pelo VetorEco para sinalizar riscos de retrabalho antes do processo oficial.</li>
        </ul>
        <p className="muted">Referências institucionais: <a href="https://pbeedifica.com.br/inirmanuais" target="_blank" rel="noreferrer">Manuais INI</a> • <a href="https://pbeedifica.com.br/sites/default/files/manuais/Manual%20RAC_novo%20formato_maio25.pdf" target="_blank" rel="noreferrer">Manual RAC</a></p>
      </Card>
    </div>
  );
}
