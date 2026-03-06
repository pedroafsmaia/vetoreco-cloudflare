import React, { useState } from 'react';
import { api } from '../../api';
import { Card, Alert, Badge, ProgressBar } from '../../ui';

interface Task {
  id: string;
  title: string;
  description: string;
  stage: string;
  completed: boolean;
  critical: boolean;
  satisfied: boolean;
  active: boolean | undefined;
  notes?: string;
  evidence_count?: number;
  calc_count?: number;
  missing?: { projectData?: boolean; evidence?: boolean; calculation?: boolean };
  meta?: {
    references?: { title: string; url?: string; section?: string }[];
    evidenceHints?: string[];
    calculators?: string[];
    why?: string;
    how?: string;
    minData?: string[];
    commonMistakes?: string[];
    acceptanceCriteria?: string[];
    fileNamingHints?: string[];
  };
}

interface StageInfo {
  current: string;
  next?: string;
  blockers?: { id: string; title: string; missing?: string[] }[];
}

interface Readiness {
  upToCurrentStage?: { message?: string };
}

interface JourneyData {
  tasks: Task[];
  stage: StageInfo;
  readiness?: Readiness;
  nextActions?: Task[];
}

interface PrefillEvidence {
  task_id: string;
  stage: string;
  title: string;
}

interface PrefillCalc {
  task_id: string;
  type: string;
}

interface JourneyTabProps {
  projectId: string;
  journey: JourneyData;
  onChange: () => void;
  onAddEvidence: (prefill: PrefillEvidence) => void;
  onRunCalc: (prefill: PrefillCalc) => void;
  onStageChanged: () => void;
}

const STAGES = [
  { key: 'study', label: 'Estudo' },
  { key: 'anteproject', label: 'Anteprojeto' },
  { key: 'executive', label: 'Executivo' },
  { key: 'construction', label: 'Obra (Construído)' },
];

function stageLabel(s: string) {
  const map: Record<string, string> = {
    study: 'Estudo',
    anteproject: 'Anteprojeto',
    executive: 'Executivo',
    construction: 'Obra (Construído)',
  };
  return map[s] || s;
}

export default function JourneyTab({ projectId, journey, onChange, onAddEvidence, onRunCalc, onStageChanged }: JourneyTabProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [stageErr, setStageErr] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const grouped: Record<string, Task[]> = {};
  for (const t of journey.tasks) (grouped[t.stage] = grouped[t.stage] || []).push(t);
  const inactiveCount = (journey.tasks || []).filter(t => t.active === false).length;

  const totalTasks = journey.tasks.filter(t => t.active !== false).length;
  const doneTasks = journey.tasks.filter(t => t.active !== false && t.completed).length;
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  async function toggle(t: Task) {
    await api(`/projects/${projectId}/tasks/${t.id}`, { method: 'PUT', body: JSON.stringify({ completed: !t.completed }) });
    onChange();
  }

  async function markDone(taskId: string) {
    await api(`/projects/${projectId}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ completed: true }) });
    onChange();
  }

  async function saveNotes(t: Task, notes: string) {
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

      <div className="mb-md">
        <ProgressBar
          value={overallPct}
          variant={overallPct >= 80 ? 'green' : overallPct >= 40 ? 'yellow' : 'red'}
          label={`Progresso geral: ${overallPct}% (${doneTasks}/${totalTasks} tarefas)`}
          showLabel
        />
      </div>

      <Card variant="sub" className="mb-md">
        <h3>Etapa</h3>
        <div className="muted">Atual: <b>{stageLabel(journey.stage.current)}</b>{journey.stage.next ? <> → Próxima: <b>{stageLabel(journey.stage.next)}</b></> : null}</div>
        {journey.stage.blockers?.length ? (
          <Alert variant="warning" title="Bloqueadores críticos desta etapa">
            <ul>
              {journey.stage.blockers.map(b => (
                <li key={b.id}>
                  {b.title}
                  {b.missing?.length ? <span className="muted"> — faltando: {b.missing.join(', ')}</span> : null}
                </li>
              ))}
            </ul>
            <div className="row mt-sm">
              <button className="btn" disabled>Avançar</button>
              <button className="btn" onClick={() => advance(true)}>Avançar mesmo assim</button>
            </div>
          </Alert>
        ) : (
          <div className="row mt-sm">
            <button className="btn" onClick={() => advance(false)} disabled={!journey.stage.next}>Avançar etapa</button>
          </div>
        )}
        {stageErr && <div className="error mt-sm">{stageErr}</div>}
      </Card>

      <Card variant="sub" className="mb-md">
        <h3>Próximas ações</h3>
        {journey.nextActions?.length ? (
          <ul className="list">
            {journey.nextActions.map(t => (
              <li key={t.id} className="listItem">
                <div>
                  <div className="listTitle">{t.title} {t.critical ? <Badge variant="red">crítico</Badge> : null}</div>
                  <div className="muted">{t.description}</div>
                  {t.critical && !t.satisfied && (
                    <div className="muted mt-xs">
                      Pendência: {[
                        !t.completed ? 'marcar como feito' : null,
                        t.missing?.projectData ? 'dados mínimos' : null,
                        t.missing?.evidence ? 'evidência' : null,
                        t.missing?.calculation ? 'cálculo' : null,
                      ].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div className="muted">Evidências: {t.evidence_count || 0} • Cálculos: {t.calc_count || 0}</div>
                </div>
                <div className="row">
                  <button className="btn" onClick={() => markDone(t.id)}>Marcar feito</button>
                  <button className="btn" onClick={() => onAddEvidence({ task_id: t.id, stage: t.stage, title: `Evidência — ${t.title}` })}>Evidência</button>
                  {t.meta?.calculators?.length ? (
                    <button className="btn" onClick={() => onRunCalc({ task_id: t.id, type: t.meta!.calculators![0] })}>Calculadora</button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="muted">Nenhuma ação pendente imediata.</div>}
      </Card>

      {inactiveCount > 0 && (
        <Card variant="sub" className="mb-md">
          <h3>Itens não aplicáveis (dependem de decisões)</h3>
          <div className="muted">Há <b>{inactiveCount}</b> itens do checklist desativados por decisões do escopo (Perfil técnico → Decisões). Eles não bloqueiam a prontidão.</div>
          <button className="btn mt-sm" aria-label={showInactive ? 'Ocultar itens não aplicáveis' : 'Mostrar itens não aplicáveis'} onClick={() => setShowInactive(!showInactive)}>
            {showInactive ? 'Ocultar itens não aplicáveis' : 'Mostrar itens não aplicáveis'}
          </button>
        </Card>
      )}

      {STAGES.map(s => (
        <div key={s.key} className="stageBlock">
          <h3>{s.label}</h3>
          <ul className="list">
            {(grouped[s.key] || []).filter(t => t.active !== false || showInactive).map(t => {
              const isOpen = !!expanded[t.id];
              const refs = t.meta?.references || [];
              const hints = t.meta?.evidenceHints || [];
              const calcs = t.meta?.calculators || [];
              const needsAttention = t.critical && !t.satisfied;
              const inactive = t.active === false;
              return (
                <li key={t.id} className="taskItem">
                  <div className="taskLeft">
                    <input type="checkbox" checked={!!t.completed} disabled={inactive} onChange={() => toggle(t)} aria-label={`${t.title} — ${t.completed ? 'concluído' : 'pendente'}`} />
                    <div>
                      <div className="taskTitle">
                        {t.title}{' '}
                        {t.critical ? <Badge variant="red">crítico</Badge> : null}{' '}
                        {inactive ? <Badge variant="gray">não aplicável</Badge> : null}
                      </div>
                      <div className="muted">{t.description}</div>
                      <div className="muted mt-xs">
                        Evidências: <b>{t.evidence_count || 0}</b> • Cálculos: <b>{t.calc_count || 0}</b>
                        {needsAttention ? <Badge variant="yellow" className="ml-sm">pendente</Badge> : null}
                      </div>
                      {!inactive && needsAttention && (
                        <div className="muted mt-xs">
                          Faltando: {[
                            !t.completed ? 'marcar como feito' : null,
                            t.missing?.projectData ? 'dados mínimos' : null,
                            t.missing?.evidence ? 'evidência' : null,
                            t.missing?.calculation ? 'cálculo' : null,
                          ].filter(Boolean).join(', ')}
                        </div>
                      )}
                      <div className="row mt-sm task-actions">
                        <button className="btn" disabled={inactive} onClick={() => onAddEvidence({ task_id: t.id, stage: t.stage, title: `Evidência — ${t.title}` })}>Anexar evidência</button>
                        {calcs.map(ct => (
                          <button key={ct} className="btn" disabled={inactive} onClick={() => onRunCalc({ task_id: t.id, type: ct })}>Abrir {ct}</button>
                        ))}
                        <button
                          className="btn"
                          onClick={() => setExpanded({ ...expanded, [t.id]: !isOpen })}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? 'Menos' : 'Detalhes'}
                        </button>
                      </div>
                      {isOpen && (
                        <div className="detailsBox">
                          {t.meta?.why && <div><b>Por quê:</b> <span className="muted">{t.meta.why}</span></div>}
                          {t.meta?.how && <div className="mt-xs"><b>Como:</b> <span className="muted">{t.meta.how}</span></div>}
                          {Array.isArray(t.meta?.minData) && t.meta!.minData!.length > 0 && (
                            <div className="mt-xs">
                              <b>Dados mínimos:</b>
                              <ul className="muted">{t.meta!.minData!.map((h, i) => <li key={i}>{h}</li>)}</ul>
                            </div>
                          )}
                          {Array.isArray(t.meta?.commonMistakes) && t.meta!.commonMistakes!.length > 0 && (
                            <div className="mt-xs">
                              <b>Erros comuns:</b>
                              <ul className="muted">{t.meta!.commonMistakes!.map((h, i) => <li key={i}>{h}</li>)}</ul>
                            </div>
                          )}
                          {hints.length > 0 && (
                            <div className="mt-xs">
                              <b>Evidências recomendadas:</b>
                              <ul className="muted">{hints.map((h, i) => <li key={i}>{h}</li>)}</ul>
                            </div>
                          )}
                          {Array.isArray(t.meta?.acceptanceCriteria) && t.meta!.acceptanceCriteria!.length > 0 && (
                            <div className="mt-xs">
                              <b>Critérios de aceite:</b>
                              <ul className="muted">{t.meta!.acceptanceCriteria!.map((h, i) => <li key={i}>{h}</li>)}</ul>
                            </div>
                          )}
                          {Array.isArray(t.meta?.fileNamingHints) && t.meta!.fileNamingHints!.length > 0 && (
                            <div className="mt-xs">
                              <b>Sugestão de arquivos/anexos:</b>
                              <ul className="muted">{t.meta!.fileNamingHints!.map((h, i) => <li key={i}>{h}</li>)}</ul>
                            </div>
                          )}
                          {refs.length > 0 && (
                            <div className="mt-xs">
                              <b>Referências:</b>
                              <ul className="muted">
                                {refs.map((r, i) => (
                                  <li key={i}>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}{r.section ? ` — ${r.section}` : ''}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="taskNote">
                    <input defaultValue={t.notes || ''} placeholder="nota (opcional)" aria-label={`Nota para ${t.title}`} onBlur={e => saveNotes(t, e.target.value)} />
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
