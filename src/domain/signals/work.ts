/**
 * Signaux de travail (SPEC §7) : S2, S5, S10 — domaine PUR.
 *
 *   S2  Travail gelé     · aucune transition ni commit depuis ≥ seuil jours
 *   S5  Récit sans travail · ≥ seuil pointages pendant une période sans mouvement
 *   S10 Silence          · aucun pointage depuis ≥ seuil jours alors que le travail bouge
 *
 * Ces signaux portent sur le TRAVAIL, jamais sur la qualité de la prose d'un
 * pointage (§5). Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { SignalFact } from '../../types.js';
import type { SignalInput } from './index.js';
import { daysBetween } from '../movement.js';

/** Dernière activité connue : dernier mouvement, sinon dernier rattachement. */
function lastActivity(input: SignalInput): string | null {
  if (input.lastActivityAt) return input.lastActivityAt;
  const active = input.links.filter((l) => l.state !== 'detached');
  if (active.length === 0) return null;
  return active.reduce((max, l) => (l.linkedAt > max ? l.linkedAt : max), active[0].linkedAt);
}

function lastCheckinAt(input: SignalInput): string | null {
  if (input.checkins.length === 0) return null;
  return input.checkins.reduce((max, c) => (c.at > max ? c.at : max), input.checkins[0].at);
}

function s2(input: SignalInput, ref: string | null): SignalFact[] {
  if (input.links.filter((l) => l.state !== 'detached').length === 0) return []; // S0 s'en charge
  if (!ref) return [];
  const days = Math.floor(daysBetween(ref, input.now));
  if (days < input.thresholds.S2) return [];
  return [{
    signal: 'S2', value: days, threshold: input.thresholds.S2, at: input.now,
    detail: `Aucune transition ni commit sur les tickets rattachés depuis ${days} jours.`,
  }];
}

function s5(input: SignalInput, ref: string | null, frozen: boolean): SignalFact[] {
  if (!frozen || !ref) return [];
  const duringFreeze = input.checkins.filter((c) => c.at >= ref).length;
  if (duringFreeze < input.thresholds.S5) return [];
  return [{
    signal: 'S5', value: duringFreeze, threshold: input.thresholds.S5, at: input.now,
    detail: `${duringFreeze} pointages enregistrés pendant une période sans mouvement du travail.`,
  }];
}

function s10(input: SignalInput, frozen: boolean): SignalFact[] {
  if (frozen) return []; // le travail ne bouge pas : ce n'est pas du « silence »
  const last = lastCheckinAt(input);
  const days = last === null ? Number.POSITIVE_INFINITY : Math.floor(daysBetween(last, input.now));
  if (days < input.thresholds.S10) return [];
  const value = last === null ? input.thresholds.S10 : days;
  const detail = last === null
    ? `Aucun pointage enregistré alors que le travail bouge (seuil ${input.thresholds.S10} jours).`
    : `Aucun pointage depuis ${days} jours alors que le travail bouge.`;
  return [{ signal: 'S10', value, threshold: input.thresholds.S10, at: input.now, detail }];
}

/** Tous les signaux de travail (S2, S5, S10). */
export function detectWorkSignals(input: SignalInput): SignalFact[] {
  const ref = lastActivity(input);
  const frozen = s2(input, ref).length > 0;
  return [...s2(input, ref), ...s5(input, ref, frozen), ...s10(input, frozen)];
}
