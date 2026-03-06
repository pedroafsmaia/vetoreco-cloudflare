import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { Card } from '../../ui';

interface Evidence {
  id: string;
  stage: string;
  title: string;
  url?: string;
  evidence_type?: string;
  content_text?: string;
  rac_section?: string;
  notes?: string;
  task_title?: string;
}

interface TaskRef {
  id: string;
  stage: string;
  title: string;
}

interface EvidencePrefill {
  stage?: string;
  title?: string;
  task_id?: string;
}

interface EvidencesTabProps {
  projectId: string;
  evidences: Evidence[];
  onChange: () => void;
  prefill?: EvidencePrefill | null;
  onPrefillUsed?: () => void;
  tasks?: TaskRef[];
}

export default function EvidencesTab({ projectId, evidences, onChange, prefill, onPrefillUsed, tasks }: EvidencesTabProps) {
  const [stage, setStage] = useState('study');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [evidenceType, setEvidenceType] = useState<'link' | 'file' | 'text'>('link');
  const [contentText, setContentText] = useState('');
  const [racSection, setRacSection] = useState('');
  const [notes, setNotes] = useState('');
  const [taskId, setTaskId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.stage) setStage(prefill.stage);
    if (prefill.title) setTitle(prefill.title);
    if (prefill.task_id) setTaskId(prefill.task_id);
    onPrefillUsed?.();
  }, [prefill]);

  async function add() {
    await api(`/projects/${projectId}/evidences`, {
      method: 'POST',
      body: JSON.stringify({
        stage,
        title,
        url: evidenceType === 'text' ? undefined : url,
        evidence_type: evidenceType,
        content_text: evidenceType === 'text' ? contentText : undefined,
        rac_section: racSection || undefined,
        notes: notes || undefined,
        task_id: taskId,
      }),
    });
    setTitle(''); setUrl(''); setNotes(''); setContentText(''); setRacSection('');
    onChange();
  }

  const stageGroups: Record<string, Evidence[]> = {};
  for (const e of evidences) {
    (stageGroups[e.stage] = stageGroups[e.stage] || []).push(e);
  }
  const stageOrder = ['study', 'anteproject', 'executive', 'construction'];
  const stageLabels: Record<string, string> = { study: 'Estudo', anteproject: 'Anteprojeto', executive: 'Executivo', construction: 'Obra' };

  return (
    <div className="grid2">
      <Card variant="sub">
        <h3>Adicionar evidência</h3>
        <div className="field">
          <label htmlFor="ev-type">Tipo</label>
          <select id="ev-type" value={evidenceType} onChange={e => setEvidenceType(e.target.value as any)}>
            <option value="link">Link</option>
            <option value="file">Arquivo (link para Drive/Dropbox etc.)</option>
            <option value="text">Texto (nota técnica)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="ev-stage">Etapa</label>
          <select id="ev-stage" value={stage} onChange={e => setStage(e.target.value)}>
            <option value="study">Estudo</option>
            <option value="anteproject">Anteprojeto</option>
            <option value="executive">Executivo</option>
            <option value="construction">Obra</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="ev-task">Vincular a tarefa (opcional)</label>
          <select id="ev-task" value={taskId || ''} onChange={e => setTaskId(e.target.value || undefined)}>
            <option value="">(sem vínculo)</option>
            {(tasks || []).map(t => (
              <option key={t.id} value={t.id}>({t.stage}) {t.title}</option>
            ))}
          </select>
        </div>
        <div className="field"><label htmlFor="ev-title">Título</label><input id="ev-title" value={title} onChange={e => setTitle(e.target.value)} /></div>
        {evidenceType !== 'text' ? (
          <div className="field"><label htmlFor="ev-url">URL</label><input id="ev-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
        ) : (
          <div className="field"><label htmlFor="ev-content">Conteúdo (texto)</label><textarea id="ev-content" value={contentText} onChange={e => setContentText(e.target.value)} rows={6} placeholder="Cole aqui uma nota técnica curta, decisão, premissa, registro de mudança…" /></div>
        )}
        <div className="field"><label htmlFor="ev-rac">Vínculo RAC (opcional)</label><input id="ev-rac" value={racSection} onChange={e => setRacSection(e.target.value)} placeholder="Ex.: Inspeção de Projeto / Documentos • Inspeção do Construído / Evidências" /></div>
        <div className="field"><label htmlFor="ev-notes">Notas (opcional)</label><input id="ev-notes" value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <button className="btn primary" aria-label="Adicionar evidência" onClick={add} disabled={!title || (evidenceType !== 'text' ? !url : !contentText.trim())}>Adicionar</button>
        <p className="muted">Uploads diretos ainda não estão no MVP — use links para arquivos (Drive/Dropbox) ou evidência textual.</p>
      </Card>

      <Card variant="sub">
        <h3>Evidências</h3>
        {evidences.length === 0 ? <div className="muted">Sem evidências ainda.</div> : (
          <>
            {stageOrder.map(s => {
              const items = stageGroups[s];
              if (!items?.length) return null;
              return (
                <div key={s} className="mb-md">
                  <h4>{stageLabels[s] || s}</h4>
                  <ul className="list">
                    {items.map(e => (
                      <li key={e.id} className="listItem">
                        <div>
                          <div className="listTitle">{e.title}</div>
                          <div className="muted">Tipo: <b>{e.evidence_type || 'link'}</b>{e.rac_section ? <> • RAC: {e.rac_section}</> : null}</div>
                          {e.task_title && <div className="muted">Ligado a: {e.task_title}</div>}
                          {e.evidence_type === 'text'
                            ? <div className="muted evidence-text-preview">{String(e.content_text || '').slice(0, 600)}{String(e.content_text || '').length > 600 ? '…' : ''}</div>
                            : <a className="muted" href={e.url} target="_blank" rel="noreferrer">{e.url}</a>
                          }
                          {e.notes && <div className="muted">Nota: {e.notes}</div>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </>
        )}
      </Card>
    </div>
  );
}
