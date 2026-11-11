/**
 * Post-mortem d'objectif (SPEC §15) — domaine PUR.
 *
 * À la clôture, le bilan écrit : la cible, la valeur finale et sa source, le
 * travail rattaché et ce qui a atterri, le coût réel, les signaux déclenchés,
 * la décision de revue et son effet, et ce qui est appris — repris comme
 * baseline de la période suivante. Les objectifs abandonnés ont le MÊME
 * post-mortem que les réussis : c'est là que se range la mémoire des abandons.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type {
  Cost, Direction, Objective, ObjectiveLink, Postmortem, ReviewDecision, SignalId, SourceLevel,
} from '../types.js';

export interface PostmortemInput {
  objective: Objective;
  baseline: number | null;
  finalValue: number | null;
  finalLevel: SourceLevel | 'none';
  direction: Direction;
  links: readonly ObjectiveLink[];
  landedIssueKeys: readonly string[];
  cost: Cost | null;
  signalsFired: readonly SignalId[];
  decision: ReviewDecision | null;
  learned?: readonly string[];
  now: string;
  pageAri?: string | null;
}

function deriveLearned(input: PostmortemInput, moved: boolean, landed: boolean): string[] {
  const learned: string[] = [];
  if (input.decision?.decision === 'abandon') learned.push('Objectif abandonné : son travail rattaché devient fantôme et retourne au verso.');
  if (input.signalsFired.includes('S8')) learned.push('Cible atteinte trop tôt : proposer une baseline plus haute à la période suivante.');
  if (input.signalsFired.includes('S9')) learned.push('Cible reconduite à l’identique : la cible n’a pas été réévaluée.');
  if (!moved) learned.push('Le nombre n’a pas bougé dans le sens attendu malgré le travail rattaché.');
  else if (landed) learned.push('Le nombre a bougé et le travail rattaché a atterri.');
  if (input.cost) learned.push(`Coût réel : ${input.cost.days} jours (méthode ${input.cost.method}, partagé avec ${input.cost.sharedWithCount} objectif(s)).`);
  learned.push(`Valeur finale de source niveau ${input.finalLevel} — ${input.finalLevel === 'C' ? 'déclarée, à fiabiliser' : 'mesurée'}.`);
  return learned;
}

/** Construit le post-mortem d'un objectif (§15). */
export function buildPostmortem(input: PostmortemInput): Postmortem {
  const moved = input.baseline !== null && input.finalValue !== null && input.finalValue !== input.baseline;
  const landed = input.landedIssueKeys.length > 0;
  return {
    id: `pm_${input.objective.id}_${Date.parse(input.now) || 0}`,
    objectiveId: input.objective.id,
    pageAri: input.pageAri ?? null,
    issuedAt: input.now,
    moved,
    landed,
    learned: input.learned && input.learned.length > 0 ? [...input.learned] : deriveLearned(input, moved, landed),
  };
}
