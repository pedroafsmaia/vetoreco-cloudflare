import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { formatApiError } from '../../lib/errors';
import { Card, Badge, ProgressBar, Modal, Spinner, EmptyState, Alert } from '../../ui';

const STAGE_META: Record<string, { label: string; progress: number }> = {
  study: { label: 'Estudo', progress: 25 },
  anteproject: { label: 'Anteprojeto', progress: 50 },
  executive: { label: 'Executivo', progress: 75 },
  construction: { label: 'Obra', progress: 100 },
};

const TYPOLOGY_META: Record<string, { label: string; variant: 'green' | 'blue' | 'yellow' }> = {
  residential: { label: 'Residencial', variant: 'green' },
  commercial: { label: 'Comercial', variant: 'blue' },
  public: { label: 'Pública', variant: 'yellow' },
};

function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [form, setForm] = useState({
    name: '',
    city: '',
    state: 'MG',
    typology: 'residential',
    stage_current: 'study',
    area_m2: '',
  });

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

  useEffect(() => { refresh(); }, []);

  function openModal() {
    setFormErr('');
    setFormSuccess('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormErr('');
    setFormSuccess('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');
    setFormSuccess('');
    setCreating(true);
    try {
      const payload = { ...form, area_m2: form.area_m2 ? Number(form.area_m2) : null };
      await api('/projects', { method: 'POST', body: JSON.stringify(payload) });
      setForm({ name: '', city: '', state: 'MG', typology: 'residential', stage_current: 'study', area_m2: '' });
      setFormSuccess('Projeto criado com sucesso.');
      refresh();
      setTimeout(closeModal, 1200);
    } catch (err: any) {
      setFormErr(formatApiError(err, 'Erro ao criar projeto.'));
    } finally {
      setCreating(false);
    }
  }

  const stageMeta = (key: string) => STAGE_META[key] ?? { label: key, progress: 0 };
  const typologyMeta = (key: string) => TYPOLOGY_META[key] ?? { label: key, variant: 'gray' as const };

  return (
    <section className="container fade-in" aria-labelledby="dashboard-title">
      {/* Dashboard header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 id="dashboard-title" className="title">Dashboard</h1>
          <p className="subtitle">Gerencie seus projetos e acompanhe o progresso de cada etapa.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openModal}>
          + Novo projeto
        </button>
      </header>

      {/* Error alert */}
      {errMsg && (
        <Alert variant="error" onDismiss={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      {/* Loading state */}
      {loading && <Spinner label="Carregando projetos…" />}

      {/* Empty state */}
      {!loading && !errMsg && projects.length === 0 && (
        <EmptyState
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto para começar a usar o VetorEco."
          action={{ label: 'Criar projeto', onClick: openModal }}
        />
      )}

      {/* Project cards grid */}
      {!loading && projects.length > 0 && (
        <div className="stats-grid" aria-label="Lista de projetos">
          {projects.map((p) => {
            const stage = stageMeta(p.stage_current);
            const typo = typologyMeta(p.typology);
            return (
              <Card variant="interactive" key={p.id} className="flex flex-col">
                <div>
                  <div className="card-header">
                    <h2 className="card-title truncate">{p.name}</h2>
                    <Badge variant={typo.variant}>{typo.label}</Badge>
                  </div>

                  <p className="card-description muted">
                    {p.city || '—'}/{p.state || '—'}
                    {p.area_m2 ? ` · ${p.area_m2} m²` : ''}
                  </p>

                  <div className="card-subtitle">
                    <Badge variant="gray">{stage.label}</Badge>
                  </div>

                  <ProgressBar value={stage.progress} label={`${stage.progress}%`} showLabel />

                  <div className="flex justify-between items-center">
                    <Link className="btn btn-primary btn-sm" to={`/projects/${p.id}`}>
                      Abrir
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create project modal */}
      <Modal open={modalOpen} onClose={closeModal} title="Novo projeto" size="md">
        <form onSubmit={handleCreate} aria-label="Formulário de criação de projeto">
          <div className="form-field">
            <label className="form-label" htmlFor="proj-name">Nome do projeto</label>
            <input
              id="proj-name"
              className="form-input"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="row">
            <div className="form-field">
              <label className="form-label" htmlFor="proj-city">Cidade</label>
              <input
                id="proj-city"
                className="form-input"
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="proj-state">UF</label>
              <input
                id="proj-state"
                className="form-input"
                type="text"
                maxLength={2}
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="row">
            <div className="form-field">
              <label className="form-label" htmlFor="proj-typology">Tipologia</label>
              <select
                id="proj-typology"
                className="form-select"
                value={form.typology}
                onChange={(e) => setForm({ ...form, typology: e.target.value })}
              >
                <option value="residential">Residencial</option>
                <option value="commercial">Comercial/Serviços</option>
                <option value="public">Pública</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="proj-stage">Etapa atual</label>
              <select
                id="proj-stage"
                className="form-select"
                value={form.stage_current}
                onChange={(e) => setForm({ ...form, stage_current: e.target.value })}
              >
                <option value="study">Estudo</option>
                <option value="anteproject">Anteprojeto</option>
                <option value="executive">Executivo</option>
                <option value="construction">Obra</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="proj-area">Área (m²)</label>
            <input
              id="proj-area"
              className="form-input"
              type="number"
              min="0"
              value={form.area_m2}
              onChange={(e) => setForm({ ...form, area_m2: e.target.value })}
            />
            <span className="form-hint">Opcional — área total construída.</span>
          </div>

          {formErr && <Alert variant="error">{formErr}</Alert>}
          {formSuccess && <Alert variant="success">{formSuccess}</Alert>}

          <div className="flex justify-between items-center">
            <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!form.name.trim() || creating}>
              {creating ? 'Criando…' : 'Criar projeto'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default ProjectsPage;
