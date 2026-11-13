/**
 * Dossier de revue (SPEC §13) — domaine PUR.
 *
 * Pour chaque objectif, le dossier généré rassemble les faits : état et signaux,
 * série et niveaux de source, projection et écart de route, coût et méthode,
 * mouvement du travail, autres changements de la période, TROIS options
 * chiffrées (continuer / re-cibler / abandonner) et la décision prise. L'app
 * prépare le dossier ; la décision est humaine et enregistrée (§5).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type {
  Cost, Degree, KeyResult, KrPoint, Movement, Objective, ObjectiveLink, OtherChange,
  Projection, ReviewDecision, ReviewDossier, ReviewOption, TheatreSignal, TheatreState,
} from '../types';

export interface DossierInput {
  objective: Objective;
  keyResults: readonly KeyResult[];
  degree: Degree;
  theatreState: TheatreState | null;
  signals: readonly TheatreSignal[];
  series: readonly KrPoint[];
  projection: Projection | null;
  cost: Cost | null;
  movement: readonly Movement[];
  otherChanges: readonly OtherChange[];
  links: readonly ObjectiveLink[];
  decision: ReviewDecision | null;
  pageAri?: string | null;
}

/** La cible que le rythme rend crédible, d'après la fourchette de projection. */
function credibleTarget(projection: Projection | null): number | null {
  if (!projection || projection.ciLow === null || projection.ciHigh === null) return null;
  return Math.round(((projection.ciLow + projection.ciHigh) / 2) * 100) / 100;
}

function buildOptions(input: DossierInput): ReviewOption[] {
  const days = input.cost?.days ?? null;
  const target = credibleTarget(input.projection);
  const orphaned = input.links.filter((l) => l.state === 'active').map((l) => l.issueKey);
  return [
    {
      kind: 'continue',
      label: 'Continuer tel quel',
      detail: `Poursuivre au rythme actuel (${input.projection?.pct ?? null}% de la cible, coût cumulé ${days ?? '?'} j).`,
      costDays: days,
      suggestedTarget: null,
      orphanedIssueKeys: [],
    },
    {
      kind: 'retarget',
      label: 'Re-cibler',
      detail: target === null
        ? 'Re-cibler sur la valeur que le rythme rend crédible (fourchette insuffisante pour la chiffrer).'
        : `Re-cibler sur ${target} — la valeur que le rythme actuel rend crédible.`,
      costDays: days,
      suggestedTarget: target,
      orphanedIssueKeys: [],
    },
    {
      kind: 'abandon',
      label: 'Abandonner',
      detail: `Abandonner l’objectif ; ${orphaned.length} ticket(s) rattaché(s) deviendrai(en)t fantôme(s).`,
      costDays: days,
      suggestedTarget: null,
      orphanedIssueKeys: orphaned,
    },
  ];
}

/** Assemble le dossier de revue complet (§13). */
export function buildDossier(input: DossierInput): ReviewDossier {
  return {
    objectiveId: input.objective.id,
    theatreState: input.theatreState,
    degree: input.degree,
    signals: [...input.signals],
    series: [...input.series],
    projection: input.projection,
    cost: input.cost,
    movement: [...input.movement],
    otherChanges: [...input.otherChanges],
    options: buildOptions(input),
    decision: input.decision,
    pageAri: input.pageAri ?? null,
  };
}

/** Le dossier de portefeuille (§13) : parts et totaux, sans couleur globale. */
export interface PortfolioDossierInput {
  periodId: string;
  objectives: readonly Objective[];
  statesByObjective: ReadonlyMap<string, TheatreState | null>;
  totalDays: number;
  unattributedDays: number;
  workLinkedPct: number;
  ghostPct: number;
  krLevelAPct: number;
}

export interface PortfolioDossier {
  periodId: string;
  totalObjectives: number;
  byState: Record<string, number>;
  totalDays: number;
  unattributedDays: number;
  workLinkedPct: number;
  ghostPct: number;
  krLevelAPct: number;
}

export function buildPortfolioDossier(input: PortfolioDossierInput): PortfolioDossier {
  const byState: Record<string, number> = {};
  for (const objective of input.objectives) {
    const state = input.statesByObjective.get(objective.id) ?? null;
    const key = state ?? 'non-qualifie';
    byState[key] = (byState[key] ?? 0) + 1;
  }
  return {
    periodId: input.periodId,
    totalObjectives: input.objectives.length,
    byState,
    totalDays: input.totalDays,
    unattributedDays: input.unattributedDays,
    workLinkedPct: input.workLinkedPct,
    ghostPct: input.ghostPct,
    krLevelAPct: input.krLevelAPct,
  };
}
