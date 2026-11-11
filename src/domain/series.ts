/**
 * Mathématiques de série (SPEC §8) — domaine PUR.
 *
 * Une série est la suite des valeurs mesurées d'un résultat clé, chacune avec
 * sa date et son niveau de source. Ces fonctions ne jugent rien : elles
 * mesurent le mouvement, la platitude et la variation, pour que les signaux
 * (L1) et la projection (L2) s'appuient sur des faits.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Direction, KrPoint } from '../types.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Tri chronologique stable (par `measuredAt`). */
export function sortedPoints(points: readonly KrPoint[]): KrPoint[] {
  return [...points].sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : a.measuredAt > b.measuredAt ? 1 : 0));
}

/** Dernière valeur mesurée, ou `null` si la série est vide. */
export function lastValue(points: readonly KrPoint[]): number | null {
  const sorted = sortedPoints(points);
  return sorted.length === 0 ? null : sorted[sorted.length - 1].value;
}

/** Première valeur mesurée, ou `null`. */
export function firstValue(points: readonly KrPoint[]): number | null {
  const sorted = sortedPoints(points);
  return sorted.length === 0 ? null : sorted[0].value;
}

/** Points dont la date est dans `[from, to]` (bornes incluses). */
export function pointsWithin(points: readonly KrPoint[], from: string, to: string): KrPoint[] {
  return sortedPoints(points).filter((p) => p.measuredAt >= from && p.measuredAt <= to);
}

/** Points des `weeks` dernières semaines avant `now`. */
export function pointsInWindow(points: readonly KrPoint[], weeks: number, now: string): KrPoint[] {
  const from = new Date(new Date(now).getTime() - weeks * WEEK_MS).toISOString();
  return pointsWithin(points, from, now);
}

/**
 * La série a-t-elle bougé dans le sens attendu ? (§6, degré « avancé »)
 * Compare la dernière à la première valeur, au-delà de `tolerance`.
 */
export function seriesMoved(points: readonly KrPoint[], direction: Direction, tolerance = 0): boolean {
  const sorted = sortedPoints(points);
  if (sorted.length < 2) return false;
  const delta = sorted[sorted.length - 1].value - sorted[0].value;
  return direction === 'up' ? delta > tolerance : delta < -tolerance;
}

/** Amplitude (max − min) des valeurs d'une série ; 0 si vide. */
export function range(points: readonly KrPoint[]): number {
  if (points.length === 0) return 0;
  const values = points.map((p) => p.value);
  return Math.max(...values) - Math.min(...values);
}

/**
 * Série plate (S4) : aucune variation sur `weeksThreshold` semaines de mesures.
 * Il faut au moins 2 points dans la fenêtre et une amplitude nulle.
 */
export function seriesIsFlat(points: readonly KrPoint[], weeksThreshold: number, now: string, tolerance = 0): boolean {
  const window = pointsInWindow(points, weeksThreshold, now);
  if (window.length < 2) return false;
  return range(window) <= tolerance;
}

/** Variation (dernière − première) sur les `weeks` dernières semaines. */
export function deltaOver(points: readonly KrPoint[], weeks: number, now: string): number {
  const window = pointsInWindow(points, weeks, now);
  if (window.length < 2) return 0;
  return window[window.length - 1].value - window[0].value;
}

/** Le niveau de source le plus fort présent dans une série (A > B > C). */
export function bestLevel(points: readonly KrPoint[]): 'A' | 'B' | 'C' | 'none' {
  if (points.length === 0) return 'none';
  const levels = new Set(points.map((p) => p.sourceLevel));
  if (levels.has('A')) return 'A';
  if (levels.has('B')) return 'B';
  return 'C';
}
