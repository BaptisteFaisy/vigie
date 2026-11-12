/**
 * Les sept états de théâtre (SPEC §7) — domaine PUR.
 *
 * Chaque état résulte de signaux (faits mesurables). Rien n'est affirmé sans le
 * fait qui le fonde : l'écran affiche l'état ET les signaux qui le produisent.
 * Quand plusieurs états sont candidats, une PRÉCÉDENCE déterministe tranche
 * (documentée ci-dessous) — l'état le plus grave et le mieux fondé l'emporte.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { SignalId, SourceLevel, TheatreState } from '../types.js';

/** Faits qui, avec les signaux actifs, déterminent l'état (§7). */
export interface StateFacts {
  seriesMoves: boolean;
  bestSeriesLevel: SourceLevel | 'none';
  workMoves: boolean;
  hasRecentCheckin: boolean;
  /** Jours depuis la clôture de la période ; null si la période est ouverte. */
  periodClosedDays: number | null;
}

const has = (active: readonly SignalId[], signal: SignalId): boolean => active.includes(signal);

function isStrong(level: SourceLevel | 'none'): boolean {
  return level === 'A' || level === 'B';
}

/**
 * Qualifie l'état d'un objectif d'après ses signaux actifs et ses faits (§7).
 *
 * Précédence (du plus grave/ fondé au plus sain) :
 *   1 orphelin (S0) · 2 mort-vivant (S11) · 3 sous-calibré (S8|S9) ·
 *   4 décoratif (S1 + S7 ou sans mouvement) · 5 narratif (S5 + S2) ·
 *   6 travaillé-muet (travail bouge + S6|S4) · 7 vivant (série A/B + travail +
 *   pointage). Repli documenté en fin de fonction.
 */
export function qualifyState(active: readonly SignalId[], facts: StateFacts): TheatreState {
  if (has(active, 'S0')) return 'orphelin';
  if (has(active, 'S11')) return 'mort-vivant';
  if (has(active, 'S8') || has(active, 'S9')) return 'sous-calibre';
  if (has(active, 'S1') && (has(active, 'S7') || !facts.workMoves)) return 'decoratif';
  if (has(active, 'S5') && has(active, 'S2')) return 'narratif';
  // Extension documentée du §7 : travail gelé (S2) ET série plate (S4) = objectif
  // dormant, personne ne le tient. Le §7 ne nomme ce cas que pour une période
  // close (S11) ; on l'étend à période ouverte plutôt que de le noyer en repli.
  if (has(active, 'S2') && has(active, 'S4')) return 'mort-vivant';
  if (facts.workMoves && (has(active, 'S6') || has(active, 'S4'))) return 'travaille-muet';
  if (facts.seriesMoves && isStrong(facts.bestSeriesLevel) && facts.workMoves && facts.hasRecentCheckin) return 'vivant';

  // Repli : aucune combinaison du §7 ne s'applique. On choisit le plus proche des
  // faits — et le registre affiche toujours les signaux, donc rien n'est caché.
  if (facts.workMoves) return 'travaille-muet';    // le travail bouge, le nombre non
  if (facts.hasRecentCheckin) return 'narratif';   // du récit, pas de travail
  return 'mort-vivant';                            // plus personne ne le tient
}

/** Les états considérés comme « théâtre » (tout sauf vivant). */
export function isTheatre(state: TheatreState | null): boolean {
  return state !== null && state !== 'vivant';
}
