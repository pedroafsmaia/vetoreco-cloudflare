import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatApiError } from '../../lib/errors';
import { Card, Alert } from '../../ui';

export default function GuideTab() {
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

  if (errMsg) return <Alert variant="error">{errMsg}</Alert>;
  if (!data) return <div className="muted">Carregando…</div>;

  return (
    <Card variant="sub">
      <h3>Base normativa e processo</h3>
      <div className="muted"><b>Pacote ativo:</b> {data.id} — {data.title} ({data.updated_at})</div>
      {Array.isArray(data.disclaimers) && data.disclaimers.length > 0 && (
        <Alert variant="warning" title="Importante">
          <ul>
            {data.disclaimers.map((d: string, i: number) => <li key={i}>{d}</li>)}
          </ul>
        </Alert>
      )}

      {Array.isArray(data.process) && data.process.length > 0 && (
        <div className="mt-sm">
          <b>Como o VetorEco te guia</b>
          <ul className="muted">
            {data.process.map((p: any, i: number) => (
              <li key={i}><b>{p.step}</b> — {p.title}: {p.text}</li>
            ))}
          </ul>
        </div>
      )}

      {data.submission_pack_examples && (
        <div className="mt-sm">
          <b>Exemplo de estrutura de anexos (sugestão)</b>
          {Array.isArray(data.submission_pack_examples?.project) && data.submission_pack_examples.project.length > 0 && (
            <div className="muted mt-xs">
              <b>Pacote ENCE de Projeto</b>
              <ul>
                {data.submission_pack_examples.project.map((p: string, i: number) => <li key={i}><code>{p}</code></li>)}
              </ul>
            </div>
          )}
          {Array.isArray(data.submission_pack_examples?.built) && data.submission_pack_examples.built.length > 0 && (
            <div className="muted mt-xs">
              <b>Pacote ENCE do Construído</b>
              <ul>
                {data.submission_pack_examples.built.map((p: string, i: number) => <li key={i}><code>{p}</code></li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {data.memorial_templates && (
        <div className="mt-sm">
          <b>Template de memorial (rascunho guiado)</b>
          <div className="muted">Use como base para preencher o memorial do projeto e anexar evidências. O template não substitui o processo oficial.</div>
          <div className="muted mt-xs">
            <b>Seções (Projeto)</b>
            <ul>
              {(data.memorial_templates?.project?.sections || []).map((s: any, i: number) => <li key={i}><b>{s.title}</b>: {s.hints?.join(' • ')}</li>)}
            </ul>
          </div>
          <div className="muted mt-xs">
            <b>Seções (Construído)</b>
            <ul>
              {(data.memorial_templates?.built?.sections || []).map((s: any, i: number) => <li key={i}><b>{s.title}</b>: {s.hints?.join(' • ')}</li>)}
            </ul>
          </div>
        </div>
      )}

      {Array.isArray(data.sources) && data.sources.length > 0 && (
        <div className="mt-sm">
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
      )}
    </Card>
  );
}
