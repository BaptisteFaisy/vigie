/**
 * Coût de l'intention (SPEC §11) — domaine PUR.
 *
 * Ce que l'objectif a consommé, en jours, et ce que ça a produit. Trois sources
 * de jours déjà résolues en amont (`movement.resolveDays`) ; ici on pondère par
 * la FRACTION de rattachement : un ticket lié à trois objectifs compte pour un
 * tiers dans chacun, et le total du portefeuille ne double jamais (§25 item 8).
 * Ce n'est pas un outil de contrôle des personnes : c'est le prix d'une
 * intention, comparable d'un objectif à l'autre.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Cost, DaysSource, Movement, ObjectiveLink, Projection } from '../types';
import { COST_SOURCE_ORDER } from '../defaults';

export interface CostInput {
  objectiveId: string;
  periodId: string;
  /** Mouvements des tickets rattachés à CET objectif. */
  movements: readonly Movement[];
  /** Liens de CET objectif (avec leurs fractions). */
  links: readonly ObjectiveLink[];
  /** Points de RC gagnés sur la période (pour le ratio jours/point). */
  pointsGained: number | null;
  /** Fourchette des points gagnés, pour un ratio avec fourchette (§11). */
  pointsRange?: { low: number; high: number } | null;
  projection?: Projection | null;
  now: string;
}

const rankOf = (source: DaysSource): number => {
  const index = (COST_SOURCE_ORDER as readonly string[]).indexOf(source);
  return index === -1 ? -1 : index;
};

/** La fraction d'un ticket pour cet objectif (1 par défaut si lien absent). */
function fractionFor(links: readonly ObjectiveLink[], issueId: string): number {
  const link = links.find((l) => l.issueId === issueId && l.state === 'active');
  if (!link) return 1;
  return link.fraction > 0 && link.fraction <= 1 ? link.fraction : 1;
}

/** La méthode retenue = source qui a contribué le plus de jours (sinon la meilleure par préférence). */
function resolveMethod(movements: readonly Movement[], links: readonly ObjectiveLink[]): DaysSource {
  const daysBySource = new Map<DaysSource, number>();
  for (const m of movements) {
    const days = m.daysSpent * fractionFor(links, m.issueId);
    daysBySource.set(m.daysSource, (daysBySource.get(m.daysSource) ?? 0) + days);
  }
  let best: DaysSource = 'none';
  let bestDays = 0;
  for (const [source, days] of daysBySource) {
    if (days > bestDays || (days === bestDays && rankOf(source) >= 0 && rankOf(source) < rankOf(best))) {
      best = source;
      bestDays = days;
    }
  }
  return bestDays > 0 ? best : 'none';
}

/** Nombre d'objectifs avec lesquels le travail de cet objectif est partagé (max des 1/fraction). */
function sharedWith(links: readonly ObjectiveLink[]): number {
  let max = 1;
  for (const link of links) {
    if (link.state !== 'active') continue;
    if (link.fraction > 0 && link.fraction < 1) max = Math.max(max, Math.round(1 / link.fraction));
  }
  return max;
}

function ratioRange(days: number, pointsGained: number | null, pointsRange?: { low: number; high: number } | null): { ratio: number | null; low: number | null; high: number | null } {
  if (pointsGained === null || pointsGained <= 0) return { ratio: null, low: null, high: null };
  const ratio = days / pointsGained;
  if (!pointsRange || pointsRange.low <= 0) return { ratio, low: ratio, high: ratio };
  return { ratio, low: days / pointsRange.high, high: days / pointsRange.low };
}

/** Calcule le coût de l'intention d'un objectif (§11). */
export function computeCost(input: CostInput): Cost {
  let days = 0;
  for (const m of input.movements) days += m.daysSpent * fractionFor(input.links, m.issueId);
  days = Math.round(days * 100) / 100;
  const ratios = ratioRange(days, input.pointsGained, input.pointsRange ?? null);
  return {
    id: `cost_${input.objectiveId}_${input.periodId}`,
    objectiveId: input.objectiveId,
    periodId: input.periodId,
    days,
    method: resolveMethod(input.movements, input.links),
    sharedWithCount: sharedWith(input.links),
    unattributedDays: 0,
    ratioPerPoint: ratios.ratio === null ? null : Math.round(ratios.ratio * 100) / 100,
    ratioCiLow: ratios.low === null ? null : Math.round(ratios.low * 100) / 100,
    ratioCiHigh: ratios.high === null ? null : Math.round(ratios.high * 100) / 100,
    computedAt: input.now,
  };
}

/** Somme des coûts déjà fractionnés : le total du portefeuille ne double jamais (§25 item 8). */
export function portfolioTotal(costs: readonly Cost[]): number {
  return Math.round(costs.reduce((sum, c) => sum + c.days, 0) * 100) / 100;
}

/** Part non attribuée du portefeuille : jours saisis − jours rattachés (jamais négatif). */
export function portfolioUnattributed(totalLoggedDays: number, attributedDays: number): number {
  return Math.max(0, Math.round((totalLoggedDays - attributedDays) * 100) / 100);
}
