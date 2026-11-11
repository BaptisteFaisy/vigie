/**
 * Concordance travail ↔ nombre (SPEC §6, degré 4) — domaine PUR.
 *
 * « Concordant » signifie que rien, dans ce qu'on observe, ne contredit
 * l'attribution : le travail rattaché a bougé, le nombre a bougé dans le sens
 * attendu, et le travail précède le nombre dans la fenêtre. Ce N'EST PAS une
 * preuve de causalité — l'app liste systématiquement les autres changements de
 * la fenêtre (releases, incidents, autres objectifs) pour montrer ce qu'elle ne
 * peut pas exclure.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Concordance, Degree, Direction, KrPoint, Movement, OtherChange } from '../types.js';
import { CONCORDANCE_DEFAULTS } from '../defaults.js';
import { pointsWithin, seriesMoved, sortedPoints } from './series.js';
import { isoWeek } from './movement.js';

export interface ConcordanceInput {
  krId: string;
  series: readonly KrPoint[];
  movements: readonly Movement[];
  direction: Direction;
  otherChanges: readonly OtherChange[];
  windowWeeks?: number;
  now: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function hasActivity(m: Movement): boolean {
  return m.transitions + m.commits > 0 || m.closed;
}

/** Date du dernier changement de valeur dans la série, ou null. */
function lastChangeAt(points: readonly KrPoint[]): string | null {
  const sorted = sortedPoints(points);
  for (let i = sorted.length - 1; i >= 1; i -= 1) {
    if (sorted[i].value !== sorted[i - 1].value) return sorted[i].measuredAt;
  }
  return null;
}

function resolveDegree(workMoved: boolean, numberMoved: boolean, precedes: boolean): Degree {
  if (numberMoved && workMoved && precedes) return 'concordant';
  if (numberMoved) return 'avance';
  if (workMoved) return 'travaille';
  return 'declare';
}

/** Calcule la concordance d'un RC sur la fenêtre (§6). */
export function computeConcordance(input: ConcordanceInput): Concordance {
  const weeks = input.windowWeeks ?? CONCORDANCE_DEFAULTS.windowWeeks;
  const windowFrom = new Date(new Date(input.now).getTime() - weeks * WEEK_MS).toISOString();
  const windowTo = input.now;

  const series = pointsWithin(input.series, windowFrom, windowTo);
  const fromWeek = isoWeek(windowFrom);
  const movements = input.movements.filter((m) => m.week >= fromWeek);

  const workMoved = movements.some(hasActivity);
  const numberMoved = seriesMoved(series, input.direction);
  const changedAt = lastChangeAt(series);
  const changedWeek = changedAt ? isoWeek(changedAt) : null;
  const precedes = changedWeek !== null && movements.some((m) => hasActivity(m) && m.week <= changedWeek);

  return {
    id: `conc_${input.krId}_${Date.parse(input.now) || 0}`,
    krId: input.krId,
    windowFrom,
    windowTo,
    workMoved,
    numberMoved,
    otherChanges: [...input.otherChanges],
    degree: resolveDegree(workMoved, numberMoved, precedes),
    computedAt: input.now,
  };
}
