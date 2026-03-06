import React from 'react';
import { Card, Alert, Badge } from '../../ui';
import type { BadgeProps } from '../../ui';

function statusToVariant(status: string): BadgeProps['variant'] {
  if (status === 'green') return 'green';
  if (status === 'red') return 'red';
  return 'yellow';
}

interface JourneyReadiness {
  enceProjeto?: { status: string; progressPct: number; criticalMissing: number };
  enceConstruido?: { status: string; progressPct: number; criticalMissing: number };
}

interface DossierTabProps {
  projectId: string;
  journey?: {
    readiness?: JourneyReadiness;
    stage?: { blockers?: { id: string; title: string }[] };
  };
  evidenceCount?: number;
  calcCount?: number;
}

export default function DossierTab({ projectId, journey, evidenceCount = 0, calcCount = 0 }: DossierTabProps) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';

  const rp = journey?.readiness?.enceProjeto || { status: 'yellow', progressPct: 0, criticalMissing: 0 };
  const rb = journey?.readiness?.enceConstruido || { status: 'yellow', progressPct: 0, criticalMissing: 0 };
  const blockers = journey?.stage?.blockers || [];
  const totalCritical = rp.criticalMissing + rb.criticalMissing;
  const isReady = totalCritical === 0 && blockers.length === 0;

  return (
    <div className="grid2">
      <Card variant="sub">
        <h3>Dossiê de preparação</h3>
        <p className="muted">Gere um dossiê com checklist, evidências e cálculos para reduzir retrabalho antes do processo oficial.</p>

        <Card variant="sub" className="mt-md">
          <h4>Verificação de prontidão</h4>
          {isReady ? (
            <Alert variant="success" title="Pronto para gerar">
              Nenhum bloqueador crítico identificado. Revise o dossiê gerado antes de usar.
            </Alert>
          ) : (
            <Alert variant="warning" title="Itens pendentes">
              <ul>
                {totalCritical > 0 && <li><b>{totalCritical}</b> itens críticos ainda pendentes (Projeto: {rp.criticalMissing}, Construído: {rb.criticalMissing})</li>}
                {blockers.length > 0 && <li><b>{blockers.length}</b> bloqueadores de etapa</li>}
                {evidenceCount === 0 && <li>Nenhuma evidência registrada</li>}
                {calcCount === 0 && <li>Nenhum cálculo salvo</li>}
              </ul>
              <div className="muted">O dossiê pode ser gerado mesmo com itens pendentes, mas estará incompleto.</div>
            </Alert>
          )}
          <div className="muted mt-sm">
            Resumo: <Badge variant={statusToVariant(rp.status)}>Projeto {rp.progressPct}%</Badge>{' '}
            <Badge variant={statusToVariant(rb.status)}>Construído {rb.progressPct}%</Badge>{' '}
            • Evidências: <b>{evidenceCount}</b> • Cálculos: <b>{calcCount}</b>
          </div>
        </Card>

        <div className="row mt-md">
          <a className="btn" href={`${apiUrl}/projects/${projectId}/dossier?format=html`} target="_blank" rel="noreferrer" aria-label="Abrir dossiê em HTML">Abrir HTML</a>
          <a className="btn" href={`${apiUrl}/projects/${projectId}/dossier.pdf`} target="_blank" rel="noreferrer" aria-label="Abrir dossiê em PDF">Abrir PDF</a>
        </div>
      </Card>

      <Card variant="sub">
        <h3>Como usar</h3>
        <ol className="muted">
          <li>Complete os itens críticos por etapa</li>
          <li>Registre evidências (links) e notas</li>
          <li>Salve cálculos auxiliares (U, WWR, LPD)</li>
          <li>Gere o dossiê para revisão/organização</li>
        </ol>
      </Card>
    </div>
  );
}
