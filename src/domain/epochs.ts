/**
 * Époques et réorganisations (SPEC §16, VG-22) — domaine PUR.
 *
 * Une époque est une période où l'organisation n'a pas changé (mêmes équipes,
 * même périmètre). Une réorganisation ouvre une époque. Les séries et les
 * projections ne mélangent JAMAIS deux époques : c'est la garantie qu'un
 * chiffre d'avant la réorg ne fausse pas la tendance d'après.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Epoch, KrPoint } from '../types.js';

/** L'époque contenant une date (ends_at null = époque ouverte). */
export function epochOf(iso: string, epochs: readonly Epoch[]): Epoch | null {
  return epochs.find((e) => e.startsAt <= iso && (e.endsAt === null || e.endsAt > iso)) ?? null;
}

/** L'époque courante à un instant donné (alias lisible de `epochOf`). */
export function currentEpochAt(iso: string, epochs: readonly Epoch[]): Epoch | null {
  return epochOf(iso, epochs);
}

/** Id de l'époque d'une date, ou `null` si aucune époque ne la couvre. */
export function epochIdOf(iso: string, epochs: readonly Epoch[]): string | null {
  return epochOf(iso, epochs)?.id ?? null;
}

/** Filtre des éléments portant un `epochId` sur une époque donnée. */
export function filterByEpoch<T extends { epochId: string | null }>(items: readonly T[], epochId: string | null): T[] {
  return items.filter((item) => item.epochId === epochId);
}

/** Les points de série d'une époque précise — jamais mélangés (§16). */
export function pointsInEpoch(points: readonly KrPoint[], epochId: string | null): KrPoint[] {
  return points.filter((p) => p.epochId === epochId);
}

/**
 * Détecte une réorganisation : un déplacement massif de tickets (>= `threshold`)
 * entre deux projets/composants sur une courte fenêtre ouvre une nouvelle
 * époque (§16, ouverture « détectée »). Renvoie la date du basculement ou null.
 */
export function detectReorg(
  moves: readonly { at: string }[],
  threshold: number,
  windowDays: number,
): string | null {
  if (moves.length < threshold) return null;
  const sorted = [...moves].sort((a, b) => (a.at < b.at ? -1 : 1));
  for (let i = 0; i + threshold <= sorted.length; i += 1) {
    const from = new Date(sorted[i].at).getTime();
    const to = new Date(sorted[i + threshold - 1].at).getTime();
    if ((to - from) / (24 * 60 * 60 * 1000) <= windowDays) return sorted[i + threshold - 1].at;
  }
  return null;
}
