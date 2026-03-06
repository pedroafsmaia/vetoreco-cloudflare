import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatApiError } from '../../lib/errors';
import { Card, Modal } from '../../ui';

type CalcType = 'u_value' | 'wwr' | 'wwr_facades' | 'avs' | 'lpd' | 'lpd_spaces';
type DpilLevel = 'A' | 'B' | 'C' | 'D';

interface Calculation {
  id: string;
  calc_type: string;
  task_title?: string;
  created_at: string;
}

interface CalcPrefill {
  type?: CalcType;
  task_id?: string;
}

interface CalcsTabProps {
  projectId: string;
  calcs: Calculation[];
  onChange: () => void;
  prefill?: CalcPrefill | null;
  onPrefillUsed?: () => void;
}

export default function CalcsTab({ projectId, calcs, onChange, prefill, onPrefillUsed }: CalcsTabProps) {
  const [type, setType] = useState<CalcType>('u_value');
  const [inputs, setInputs] = useState<any>({ orientation: 'vertical', include_surface_resistance: true, layers: [{ name: 'Alvenaria', thickness_m: 0.14, conductivity_W_mK: 1.4 }] });
  const [result, setResult] = useState<any>(null);
  const [errMsg, setErrMsg] = useState('');
  const [taskId, setTaskId] = useState<string | undefined>(undefined);

  const [dpil, setDpil] = useState<any>(null);
  const [dpilFunc, setDpilFunc] = useState('');
  const [dpilLevel, setDpilLevel] = useState<DpilLevel>('A');
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    setErrMsg(''); setResult(null);
    if (type === 'wwr') setInputs({ window_area_m2: 8, facade_area_m2: 40 });
    if (type === 'wwr_facades') setInputs({ facades: [
      { name: 'N', azimuth_deg: 0, facade_area_m2: 40, window_area_m2: 8 },
      { name: 'S', azimuth_deg: 180, facade_area_m2: 40, window_area_m2: 6 },
    ] });
    if (type === 'avs') setInputs({ overhang_depth_m: 0.6, vertical_gap_m: 1.2 });
    if (type === 'lpd') setInputs({ total_lighting_watts: 800, area_m2: 40 });
    if (type === 'lpd_spaces') setInputs({ spaces: [
      { name: 'Sala', area_m2: 20, watts: 300 },
      { name: 'Quarto', area_m2: 12, watts: 120 },
    ] });
    if (type === 'u_value') setInputs({ orientation: 'vertical', include_surface_resistance: true, layers: [{ name: 'Alvenaria', thickness_m: 0.14, conductivity_W_mK: 1.4 }] });
  }, [type]);

  useEffect(() => {
    if (dpil) return;
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
      const res: any = await api(`/projects/${projectId}/calculations/run`, { method: 'POST', body: JSON.stringify({ type, inputs, task_id: taskId }) });
      setResult(res.data.result);
      onChange();
    } catch (e: any) {
      setErrMsg(formatApiError(e, 'Erro no cálculo.'));
    }
  }

  function confirmResetCalc() {
    setResult(null);
    setErrMsg('');
    setTaskId(undefined);
    setType('u_value');
    setShowResetModal(false);
  }

  const currentLPD = (() => {
    if (!result) return null;
    if (type === 'lpd') return typeof result.lpd_W_m2 === 'number' ? result.lpd_W_m2 : null;
    if (type === 'lpd_spaces') return typeof result.total?.lpd_W_m2 === 'number' ? result.total.lpd_W_m2 : null;
    return null;
  })();

  const dpilRow = (() => {
    const rows = dpil?.rows || [];
    return rows.find((r: any) => r.key === dpilFunc) || null;
  })();
  const dpilLimit = dpilRow ? dpilRow.dpil_W_m2?.[dpilLevel] : null;

  return (
    <div className="grid2">
      <Card variant="sub">
        <h3>Executar calculadora</h3>
        <div className="field">
          <label htmlFor="calc-type">Tipo</label>
          <select id="calc-type" value={type} onChange={e => setType(e.target.value as CalcType)}>
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
                <label htmlFor="uval-orient">Orientação</label>
                <select id="uval-orient" value={inputs.orientation} onChange={e => setInputs({ ...inputs, orientation: e.target.value })}>
                  <option value="vertical">Parede</option>
                  <option value="roof">Cobertura</option>
                  <option value="floor">Piso</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="uval-surface">Incluir resistências superficiais</label>
                <select id="uval-surface" value={String(inputs.include_surface_resistance)} onChange={e => setInputs({ ...inputs, include_surface_resistance: e.target.value === 'true' })}>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>

            <div className="muted">Camadas (m e W/mK)</div>
            {(inputs.layers || []).map((l: any, idx: number) => (
              <div className="row" key={idx}>
                <div className="field"><label htmlFor={`layer-name-${idx}`}>Nome</label><input id={`layer-name-${idx}`} value={l.name || ''} onChange={e => { const nl = [...inputs.layers]; nl[idx] = { ...nl[idx], name: e.target.value }; setInputs({ ...inputs, layers: nl }); }} /></div>
                <div className="field"><label htmlFor={`layer-thick-${idx}`}>Espessura (m)</label><input id={`layer-thick-${idx}`} value={l.thickness_m} onChange={e => { const nl = [...inputs.layers]; nl[idx] = { ...nl[idx], thickness_m: Number(e.target.value) }; setInputs({ ...inputs, layers: nl }); }} /></div>
                <div className="field"><label htmlFor={`layer-cond-${idx}`}>Condutividade (W/mK)</label><input id={`layer-cond-${idx}`} value={l.conductivity_W_mK} onChange={e => { const nl = [...inputs.layers]; nl[idx] = { ...nl[idx], conductivity_W_mK: Number(e.target.value) }; setInputs({ ...inputs, layers: nl }); }} /></div>
              </div>
            ))}
            <button className="btn" aria-label="Adicionar camada" onClick={() => setInputs({ ...inputs, layers: [...inputs.layers, { name: '', thickness_m: 0.02, conductivity_W_mK: 0.04 }] })}>+ Adicionar camada</button>
          </>
        )}

        {type === 'wwr' && (
          <div className="row">
            <div className="field"><label htmlFor="wwr-win">Área janelas (m²)</label><input id="wwr-win" value={inputs.window_area_m2} onChange={e => setInputs({ ...inputs, window_area_m2: Number(e.target.value) })} /></div>
            <div className="field"><label htmlFor="wwr-fac">Área fachada (m²)</label><input id="wwr-fac" value={inputs.facade_area_m2} onChange={e => setInputs({ ...inputs, facade_area_m2: Number(e.target.value) })} /></div>
          </div>
        )}

        {type === 'wwr_facades' && (
          <>
            <div className="muted">Fachadas (m² e azimute em graus)</div>
            {(inputs.facades || []).map((f: any, idx: number) => (
              <div className="row" key={idx}>
                <div className="field"><label htmlFor={`wwrf-name-${idx}`}>Nome</label><input id={`wwrf-name-${idx}`} value={f.name || ''} onChange={e => { const nf = [...inputs.facades]; nf[idx] = { ...nf[idx], name: e.target.value }; setInputs({ ...inputs, facades: nf }); }} /></div>
                <div className="field"><label htmlFor={`wwrf-az-${idx}`}>Azimute (°)</label><input id={`wwrf-az-${idx}`} value={f.azimuth_deg ?? ''} onChange={e => { const nf = [...inputs.facades]; nf[idx] = { ...nf[idx], azimuth_deg: Number(e.target.value) }; setInputs({ ...inputs, facades: nf }); }} /></div>
                <div className="field"><label htmlFor={`wwrf-fac-${idx}`}>Área fachada (m²)</label><input id={`wwrf-fac-${idx}`} value={f.facade_area_m2} onChange={e => { const nf = [...inputs.facades]; nf[idx] = { ...nf[idx], facade_area_m2: Number(e.target.value) }; setInputs({ ...inputs, facades: nf }); }} /></div>
                <div className="field"><label htmlFor={`wwrf-win-${idx}`}>Área janelas (m²)</label><input id={`wwrf-win-${idx}`} value={f.window_area_m2} onChange={e => { const nf = [...inputs.facades]; nf[idx] = { ...nf[idx], window_area_m2: Number(e.target.value) }; setInputs({ ...inputs, facades: nf }); }} /></div>
              </div>
            ))}
            <button className="btn" aria-label="Adicionar fachada" onClick={() => setInputs({ ...inputs, facades: [...inputs.facades, { name: '', azimuth_deg: 0, facade_area_m2: 20, window_area_m2: 4 }] })}>+ Adicionar fachada</button>
          </>
        )}

        {type === 'avs' && (
          <div className="row">
            <div className="field"><label htmlFor="avs-depth">Profundidade do beiral/brise (m)</label><input id="avs-depth" value={inputs.overhang_depth_m} onChange={e => setInputs({ ...inputs, overhang_depth_m: Number(e.target.value) })} /></div>
            <div className="field"><label htmlFor="avs-gap">Vão vertical (m)</label><input id="avs-gap" value={inputs.vertical_gap_m} onChange={e => setInputs({ ...inputs, vertical_gap_m: Number(e.target.value) })} /></div>
          </div>
        )}

        {type === 'lpd' && (
          <div className="row">
            <div className="field"><label htmlFor="lpd-watts">Potência total (W)</label><input id="lpd-watts" value={inputs.total_lighting_watts} onChange={e => setInputs({ ...inputs, total_lighting_watts: Number(e.target.value) })} /></div>
            <div className="field"><label htmlFor="lpd-area">Área (m²)</label><input id="lpd-area" value={inputs.area_m2} onChange={e => setInputs({ ...inputs, area_m2: Number(e.target.value) })} /></div>
          </div>
        )}

        {type === 'lpd_spaces' && (
          <>
            <div className="muted">Ambientes</div>
            {(inputs.spaces || []).map((s: any, idx: number) => (
              <div className="row" key={idx}>
                <div className="field"><label htmlFor={`space-name-${idx}`}>Nome</label><input id={`space-name-${idx}`} value={s.name || ''} onChange={e => { const ns = [...inputs.spaces]; ns[idx] = { ...ns[idx], name: e.target.value }; setInputs({ ...inputs, spaces: ns }); }} /></div>
                <div className="field"><label htmlFor={`space-area-${idx}`}>Área (m²)</label><input id={`space-area-${idx}`} value={s.area_m2} onChange={e => { const ns = [...inputs.spaces]; ns[idx] = { ...ns[idx], area_m2: Number(e.target.value) }; setInputs({ ...inputs, spaces: ns }); }} /></div>
                <div className="field"><label htmlFor={`space-watts-${idx}`}>Potência (W)</label><input id={`space-watts-${idx}`} value={s.watts} onChange={e => { const ns = [...inputs.spaces]; ns[idx] = { ...ns[idx], watts: Number(e.target.value) }; setInputs({ ...inputs, spaces: ns }); }} /></div>
              </div>
            ))}
            <button className="btn" aria-label="Adicionar ambiente" onClick={() => setInputs({ ...inputs, spaces: [...inputs.spaces, { name: '', area_m2: 10, watts: 100 }] })}>+ Adicionar ambiente</button>
          </>
        )}

        {(type === 'lpd' || type === 'lpd_spaces') && (
          <Card variant="sub" className="mt-md">
            <h4>Comparar com DPIL (RTQ-C)</h4>
            <div className="muted">Selecione a função e o nível pretendido para comparar o LPD calculado com o limite DPIL.</div>
            <div className="row mt-sm">
              <div className="field">
                <label htmlFor="dpil-func">Função</label>
                <select id="dpil-func" value={dpilFunc} onChange={e => setDpilFunc(e.target.value)}>
                  <option value="">(carregando…)</option>
                  {(dpil?.rows || []).map((r: any) => <option key={r.key} value={r.key}>{r.funcao}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="dpil-level">Nível</label>
                <select id="dpil-level" value={dpilLevel} onChange={e => setDpilLevel(e.target.value as DpilLevel)}>
                  {(['A', 'B', 'C', 'D'] as const).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            {dpilLimit != null ? (
              <div className="muted mt-sm">
                <b>Limite DPIL:</b> {dpilLimit} W/m² — {dpil?.reference?.table || 'RTQ-C Tabela 4.1'}
                {dpil?.reference?.url ? <> • <a href={dpil.reference.url} target="_blank" rel="noreferrer">fonte</a></> : null}
              </div>
            ) : (
              <div className="muted mt-sm">Limite DPIL indisponível (não carregado ou função inválida).</div>
            )}

            {currentLPD != null && dpilLimit != null && (
              <div className={currentLPD <= dpilLimit ? 'ok' : 'warnBox'} style={{ marginTop: 10 }}>
                <b>{currentLPD <= dpilLimit ? 'OK' : 'Acima do limite'}</b>
                <div className="muted">LPD calculado: {currentLPD} W/m² • Limite: {dpilLimit} W/m²</div>
                {dpilRow?.reference && <div className="muted mt-xs">Referência: {dpilRow.reference}</div>}
              </div>
            )}
          </Card>
        )}

        {errMsg && <div className="error">{errMsg}</div>}
        {taskId ? <div className="muted">Vinculado a uma tarefa do checklist.</div> : <div className="muted">Dica: abra a calculadora a partir de uma tarefa para vincular automaticamente.</div>}
        <div className="row mt-sm">
          <button className="btn primary" aria-label="Salvar cálculo" onClick={run}>Salvar cálculo</button>
          <button className="btn" aria-label="Reiniciar cálculo" onClick={() => setShowResetModal(true)}>Reiniciar</button>
        </div>

        {result && (
          <div className="resultBox">
            <div className="muted">Resultado</div>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </Card>

      <Modal open={showResetModal} onClose={() => setShowResetModal(false)} title="Reiniciar cálculo" size="sm">
        <p>Tem certeza que deseja reiniciar o cálculo? Os dados do formulário e o resultado atual serão limpos.</p>
        <div className="row mt-sm">
          <button className="btn primary" onClick={confirmResetCalc}>Confirmar</button>
          <button className="btn" onClick={() => setShowResetModal(false)}>Cancelar</button>
        </div>
      </Modal>

      <Card variant="sub">
        <h3>Histórico</h3>
        {calcs.length === 0 ? <div className="muted">Sem cálculos ainda.</div> : (
          <ul className="list">
            {calcs.map(c => (
              <li key={c.id} className="listItem">
                <div>
                  <div className="listTitle">{c.calc_type}</div>
                  <div className="muted">{c.task_title ? `Ligado a: ${c.task_title} • ` : ''}{c.created_at}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
