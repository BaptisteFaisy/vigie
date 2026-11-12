/**
 * Détection des signaux de théâtre (SPEC §7) — domaine PUR.
 *
 * Un signal est un FAIT mesurable, daté, avec son seuil réglable. Rien n'est
 * affirmé sans le fait qui le fonde. Les seuils viennent de `input.thresholds`
 (jamais en dur). Chaque famille de signaux vit dans son fichier ; celui-ci
 * définit l'entrée commune et agrège les faits en `TheatreSignal`.
 *
 * VG-21 : un fait décrit le travail (dates, comptes, clés, projets) — JAMAIS une
 * personne. S1 regroupe par acteur en interne mais n'écrit pas l'identité.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type {
  Checkin, KeyResult, KrPoint, Movement, ObjectiveLink, Scope, SignalFact,
  SignalId, SignalThresholds, TheatreSignal,
} from '../../types';
import { detectAttachmentSignals } from './attachment';
import { detectWorkSignals } from './work';
import { detectSeriesSignals } from './series';
import { detectLifecycleSignals } from './lifecycle';

/** Tout ce dont la détection des signaux a besoin (assemblé par le moteur L8). */
export interface SignalInput {
  objectiveId: string;
  objectiveOpen: boolean;
  /** Liens actifs de cet objectif. */
  links: readonly ObjectiveLink[];
  /** Mouvements des tickets rattachés. */
  movements: readonly Movement[];
  /** Tous les points de série des RC de cet objectif. */
  series: readonly KrPoint[];
  keyResults: readonly KeyResult[];
  checkins: readonly Checkin[];
  scope: Scope;
  period: { start: string; end: string };
  thresholds: SignalThresholds;
  now: string;
  /** Dernier mouvement (transition/commit) sur les tickets rattachés, ou null. */
  lastActivityAt: string | null;
  /** Cible de la période précédente (S9), si connue. */
  previousPeriodTarget?: number | null;
  /** Nombre d'objectifs auxquels chaque ticket est rattaché (S12). */
  objectivesPerIssue?: Readonly<Record<string, number>>;
  /** Composants par ticket, pour S7 (repli : projets seuls). */
  issueComponents?: Readonly<Record<string, readonly string[]>>;
}

const SIGNAL_ORDER: readonly SignalId[] = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'];

/** Agrège les faits d'un même signal en un `TheatreSignal`. */
function toSignals(objectiveId: string, facts: readonly SignalFact[], now: string): TheatreSignal[] {
  const bySignal = new Map<SignalId, SignalFact[]>();
  for (const fact of facts) {
    const list = bySignal.get(fact.signal) ?? [];
    list.push(fact);
    bySignal.set(fact.signal, list);
  }
  const signals: TheatreSignal[] = [];
  for (const signal of SIGNAL_ORDER) {
    const group = bySignal.get(signal);
    if (!group || group.length === 0) continue;
    const firedAt = group.reduce((max, f) => (f.at > max ? f.at : max), group[0].at) || now;
    signals.push({
      id: `${objectiveId}_${signal}_${firedAt}`,
      objectiveId,
      signal,
      facts: group,
      firedAt,
      dismissedReason: null,
      dismissedUntil: null,
    });
  }
  return signals;
}

/** Détecte tous les signaux actifs d'un objectif (§7). */
export function detectSignals(input: SignalInput): TheatreSignal[] {
  const facts: SignalFact[] = [
    ...detectAttachmentSignals(input),
    ...detectWorkSignals(input),
    ...detectSeriesSignals(input),
    ...detectLifecycleSignals(input),
  ];
  return toSignals(input.objectiveId, facts, input.now);
}

/** Les identifiants de signaux actifs (pour qualifier l'état). */
export function activeSignalIds(signals: readonly TheatreSignal[], now: string): SignalId[] {
  return signals
    .filter((s) => s.dismissedUntil === null || s.dismissedUntil < now)
    .map((s) => s.signal);
}
