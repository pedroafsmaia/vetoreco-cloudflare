import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { formatApiError } from '../../lib/errors';
import { Loading } from '../../components/Loading';
import { ErrorState } from '../../components/ErrorState';
import { Card, Badge, ProgressBar, StepNav } from '../../ui';

import ProfileTab from './ProfileTab';
import JourneyTab from './JourneyTab';
import CalcsTab from './CalcsTab';
import EvidencesTab from './EvidencesTab';
import DossierTab from './DossierTab';
import LibraryTab from './LibraryTab';
import GuideTab from './GuideTab';

type TabKey = 'journey' | 'profile' | 'calcs' | 'evidences' | 'dossier' | 'guide' | 'library';

interface ProjectPageProps {
  onProjectLoaded?: (name: string) => void;
}

const STAGE_STEPS = [
  { key: 'study', label: 'Estudo' },
  { key: 'anteproject', label: 'Anteprojeto' },
  { key: 'executive', label: 'Executivo' },
  { key: 'construction', label: 'Obra' },
];

const TAB_CONFIG: { key: TabKey; label: string }[] = [
  { key: 'journey', label: 'Jornada' },
  { key: 'profile', label: 'Perfil técnico' },
  { key: 'library', label: 'Biblioteca técnica' },
  { key: 'calcs', label: 'Calculadoras' },
  { key: 'evidences', label: 'Evidências' },
  { key: 'dossier', label: 'Dossiê' },
  { key: 'guide', label: 'Normas & processo' },
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

function badgeVariant(status: string): 'green' | 'red' | 'yellow' {
  if (status === 'green') return 'green';
  if (status === 'red') return 'red';
  return 'yellow';
}

function completedStages(current: string): string[] {
  const order = ['study', 'anteproject', 'executive', 'construction'];
  const idx = order.indexOf(current);
  return idx > 0 ? order.slice(0, idx) : [];
}

function ProjectPage({ onProjectLoaded }: ProjectPageProps) {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [journey, setJourney] = useState<any>(null);
  const [calcs, setCalcs] = useState<any[]>([]);
  const [evidences, setEvidences] = useState<any[]>([]);
  const [tab, setTab] = useState<TabKey>('journey');
  const [prefillEvidence, setPrefillEvidence] = useState<any | null>(null);
  const [prefillCalc, setPrefillCalc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');

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
      onProjectLoaded?.(p.data.project.name);
    } catch (e: any) {
      setErrMsg(formatApiError(e, 'Erro ao carregar o projeto.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [id]);

  if (loading) return <Loading />;
  if (errMsg) return <ErrorState message={errMsg} onRetry={refresh} />;
  if (!project || !journey) return <Loading />;

  const rp = journey.readiness?.enceProjeto || { status: 'yellow', progressPct: 0, criticalMissing: 0 };
  const rb = journey.readiness?.enceConstruido || { status: 'yellow', progressPct: 0, criticalMissing: 0 };

  return (
    <Card>
      <div className="projectHeader">
        <div>
          <h2 className="project-name">{project.name}</h2>
          <div className="muted">{project.city || '-'} / {project.state || '-'} • {project.typology} • etapa: {stageLabel(project.stage_current)}</div>
        </div>
        <div className="readiness">
          <div className="readinessRow">
            <Badge variant={badgeVariant(rp.status)}>PROJETO</Badge>
            <div className="muted">{rp.progressPct}% • críticos pendentes: {rp.criticalMissing}</div>
          </div>
          <div className="readinessRow">
            <Badge variant={badgeVariant(rb.status)}>CONSTRUÍDO</Badge>
            <div className="muted">{rb.progressPct}% • críticos pendentes: {rb.criticalMissing}</div>
          </div>
        </div>
      </div>

      <StepNav
        steps={STAGE_STEPS}
        currentStep={project.stage_current}
        completedSteps={completedStages(project.stage_current)}
      />

      <div className="readiness-bars mt-sm">
        <ProgressBar value={rp.progressPct} variant={badgeVariant(rp.status)} label={`Projeto: ${rp.progressPct}%`} showLabel />
        <ProgressBar value={rb.progressPct} variant={badgeVariant(rb.status)} label={`Construído: ${rb.progressPct}%`} showLabel />
      </div>

      <div className="tabs" role="tablist" aria-label="Abas do projeto">
        {TAB_CONFIG.map(t => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`tabpanel-${t.key}`}
            className={tab === t.key ? 'tab active' : 'tab'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'journey' && (
          <JourneyTab
            projectId={id!}
            journey={journey}
            onChange={refresh}
            onAddEvidence={(p: any) => { setPrefillEvidence(p); setTab('evidences'); }}
            onRunCalc={(p: any) => { setPrefillCalc(p); setTab('calcs'); }}
            onStageChanged={refresh}
          />
        )}
        {tab === 'profile' && (
          <ProfileTab projectId={id!} project={project} onSaved={refresh} />
        )}
        {tab === 'library' && <LibraryTab />}
        {tab === 'calcs' && <CalcsTab projectId={id!} calcs={calcs} onChange={refresh} prefill={prefillCalc} onPrefillUsed={() => setPrefillCalc(null)} />}
        {tab === 'evidences' && <EvidencesTab projectId={id!} evidences={evidences} onChange={refresh} prefill={prefillEvidence} onPrefillUsed={() => setPrefillEvidence(null)} tasks={journey.tasks} />}
        {tab === 'dossier' && <DossierTab projectId={id!} journey={journey} evidenceCount={evidences.length} calcCount={calcs.length} />}
        {tab === 'guide' && <GuideTab />}
      </div>
    </Card>
  );
}

export default ProjectPage;
