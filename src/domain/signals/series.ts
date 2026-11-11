/**
 * Signaux de série / mesure (SPEC §7) : S3, S4, S6, S8, S9 — domaine PUR.
 *
 *   S3 Nombre sans source   · ≥ seuil RC de niveau C
 *   S4 Série plate          · aucune variation sur ≥ seuil semaines
 *   S6 Non falsifiable      · RC sans nombre ni type de preuve
 *   S8 Atteinte précoce     · cible atteinte avant seuil (fraction) de la période
 *   S9 Cible répétée        · cible identique à la période précédente
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { KeyResult, KrPoint, SignalFact } from '../../types.js';
import type { SignalInput } from './index.js';
import { seriesIsFlat, sortedPoints } from '../series.js';
import { effectiveLevel, isFalsifiable } from '../source-level.js';

function latestByKr(series: readonly KrPoint[]): Map<string, KrPoint | null> {
  const map = new Map<string, KrPoint | null>();
  for (const point of sortedPoints(series)) map.set(point.krId, point);
  return map;
}

function s3(input: SignalInput): SignalFact[] {
  const latest = latestByKr(input.series);
  const levelC = input.keyResults.filter((kr) => effectiveLevel(kr, latest.get(kr.id) ?? null) === 'C');
  if (levelC.length <= input.thresholds.S3) return [];
  return [{
    signal: 'S3', value: levelC.length, threshold: input.thresholds.S3, at: input.now,
    detail: `${levelC.length} résultat(s) clé(s) sans source (niveau C) : un nombre tapé à la main.`,
  }];
}

function s4(input: SignalInput): SignalFact[] {
  if (input.series.length < 2) return [];
  if (!seriesIsFlat(input.series, input.thresholds.S4, input.now)) return [];
  return [{
    signal: 'S4', value: input.thresholds.S4, threshold: input.thresholds.S4, at: input.now,
    detail: `Aucune variation de la série sur ${input.thresholds.S4} semaines de mesures.`,
  }];
}

function s6(input: SignalInput): SignalFact[] {
  const nonFalsifiable = input.keyResults.filter((kr) => !isFalsifiable(kr));
  if (nonFalsifiable.length <= input.thresholds.S6) return [];
  return [{
    signal: 'S6', value: nonFalsifiable.length, threshold: input.thresholds.S6, at: input.now,
    detail: `${nonFalsifiable.length} résultat(s) clé(s) non falsifiable(s) : ni nombre ni type de preuve déclaré.`,
  }];
}

function reachedAt(kr: KeyResult, points: readonly KrPoint[]): string | null {
  if (kr.target === null) return null;
  for (const point of sortedPoints(points)) {
    const reached = kr.direction === 'up' ? point.value >= kr.target : point.value <= kr.target;
    if (reached) return point.measuredAt;
  }
  return null;
}

function s8(input: SignalInput): SignalFact[] {
  const span = new Date(input.period.end).getTime() - new Date(input.period.start).getTime();
  if (span <= 0) return [];
  const facts: SignalFact[] = [];
  for (const kr of input.keyResults) {
    const points = input.series.filter((p) => p.krId === kr.id);
    const at = reachedAt(kr, points);
    if (!at) continue;
    const progress = (new Date(at).getTime() - new Date(input.period.start).getTime()) / span;
    if (progress <= input.thresholds.S8) {
      facts.push({
        signal: 'S8', value: Math.round(progress * 100) / 100, threshold: input.thresholds.S8, at,
        detail: `Cible atteinte à ${(progress * 100).toFixed(0)} % de la période (${at.slice(0, 10)}) — avant ${(input.thresholds.S8 * 100).toFixed(0)} %.`,
      });
    }
  }
  return facts;
}

function s9(input: SignalInput): SignalFact[] {
  const previous = input.previousPeriodTarget ?? null;
  if (previous === null) return [];
  const repeated = input.keyResults.filter((kr) => kr.target !== null && kr.target === previous);
  if (repeated.length === 0) return [];
  return [{
    signal: 'S9', value: repeated.length, threshold: input.thresholds.S9, at: input.now,
    detail: `${repeated.length} cible(s) identique(s) à celle de la période précédente (${previous}).`,
  }];
}

/** Tous les signaux de série (S3, S4, S6, S8, S9). */
export function detectSeriesSignals(input: SignalInput): SignalFact[] {
  return [...s3(input), ...s4(input), ...s6(input), ...s8(input), ...s9(input)];
}
