/**
 * Signal de cycle de vie (SPEC §7) : S11 — domaine PUR.
 *
 *   S11 Mort-vivant · période close depuis ≥ seuil jours, objectif toujours ouvert
 *
 * Un objectif mort-vivant porte une ancre sur la carte (§19) : la période est
 * finie, plus personne ne l'a touché, et il n'a jamais été refermé.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { SignalFact } from '../../types';
import type { SignalInput } from './index';
import { daysBetween } from '../movement';
import { factZombie } from './fact-text';

/** Jours depuis la clôture de la période ; négatif si la période est ouverte. */
export function periodClosedDays(input: SignalInput): number {
  return daysBetween(input.period.end, input.now);
}

function s11(input: SignalInput): SignalFact[] {
  if (!input.objectiveOpen) return [];
  const days = Math.floor(periodClosedDays(input));
  if (days < input.thresholds.S11) return [];
  const t = factZombie(days);
  return [{ signal: 'S11', value: days, threshold: input.thresholds.S11, at: input.now, detail: t.fr, detailEn: t.en }];
}

/** Tous les signaux de cycle de vie (S11). */
export function detectLifecycleSignals(input: SignalInput): SignalFact[] {
  return s11(input);
}
