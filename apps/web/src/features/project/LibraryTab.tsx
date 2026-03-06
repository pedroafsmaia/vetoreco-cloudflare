import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatApiError } from '../../lib/errors';
import { Card } from '../../ui';

interface Topic {
  key: string;
  title: string;
}

interface TopicDetail {
  title: string;
  summary: string;
  details: string;
  examples?: string[];
  references?: { title: string; url?: string }[];
}

export default function LibraryTab() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [selected, setSelected] = useState<TopicDetail | null>(null);
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
      <Card variant="sub">
        <h3>Biblioteca técnica</h3>
        <div className="muted">Conteúdo educativo + links oficiais. Sem números sem fonte pública.</div>
        {errMsg && <div className="error mt-sm">{errMsg}</div>}
        <div className="field mt-sm">
          <label htmlFor="lib-topic">Tópicos</label>
          <select id="lib-topic" value={selectedKey} onChange={e => setSelectedKey(e.target.value)}>
            <option value="">(selecione)</option>
            {topics.map(t => <option key={t.key} value={t.key}>{t.title}</option>)}
          </select>
        </div>
        {selectedKey && (
          <div className="muted mt-sm">
            Dica: use este conteúdo para justificar decisões e anexar evidências no dossiê.
          </div>
        )}
      </Card>

      <Card variant="sub">
        {!selected ? (
          <div className="muted">Selecione um tópico para ver detalhes.</div>
        ) : (
          <>
            <h3>{selected.title}</h3>
            <div className="muted">{selected.summary}</div>
            <div className="mt-sm topic-details">{selected.details}</div>
            {Array.isArray(selected.examples) && selected.examples.length > 0 && (
              <div className="mt-md">
                <b>Exemplos</b>
                <ul className="muted">
                  {selected.examples.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(selected.references) && selected.references.length > 0 && (
              <div className="mt-md">
                <b>Referências</b>
                <ul className="muted">
                  {selected.references.map((r, i) => (
                    <li key={i}>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
