/**
 * Niveau de source du nombre (SPEC §8) — domaine PUR.
 *
 * Trois niveaux : A (calculé par l'app), B (saisi avec référence vérifiable),
 * C (déclaré sans source). C'est la pièce centrale : un objectif dont tous les
 * RC sont de niveau C ne peut pas sortir de « déclaré » (§8). Un RC de niveau A
 * est recalculé, jamais recopié ; un passage A→C est une régression signalée.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { KeyResult, KrPoint, SourceLevel } from '../types';

/** Rang d'un niveau : A=2 (le plus fort), B=1, C=0. */
export function levelRank(level: SourceLevel): number {
  return level === 'A' ? 2 : level === 'B' ? 1 : 0;
}

/**
 * Niveau effectif d'un RC : celui de son dernier point de série s'il existe,
 * sinon le niveau déclaré sur le RC lui-même.
 */
export function effectiveLevel(kr: KeyResult, latest: KrPoint | null): SourceLevel {
  return latest ? latest.sourceLevel : kr.sourceLevel;
}

/**
 * Régression de source (§8) : tout passage d'un niveau plus fort vers C
 * (A→C ou B→C) est signalé. `previous` null = premier point, jamais une
 * régression.
 */
export function isSourceRegression(previous: SourceLevel | null, next: SourceLevel): boolean {
  if (previous === null) return false;
  return next === 'C' && levelRank(previous) > levelRank(next);
}

/**
 * Un RC est falsifiable s'il porte un nombre (baseline ou target) OU un type de
 * preuve déclaré. Sans les deux, il est non falsifiable → signal S6 (§7).
 */
export function isFalsifiable(kr: KeyResult): boolean {
  const hasNumber = kr.target !== null || kr.baseline !== null;
  return hasNumber || kr.proofType !== null;
}

/** Un RC binaire exige un type de preuve (§8) ; sinon il reste « déclaré ». */
export function binaryRequiresProof(kr: KeyResult): boolean {
  return kr.kind === 'binary' && kr.proofType === null;
}

/**
 * Le meilleur niveau parmi plusieurs RC (A > B > C). Utilisé pour décider si un
 * objectif peut atteindre le degré « avancé » (§6).
 */
export function bestKrLevel(keyResults: readonly KeyResult[], latestByKr: ReadonlyMap<string, KrPoint | null>): 'A' | 'B' | 'C' | 'none' {
  if (keyResults.length === 0) return 'none';
  let best: SourceLevel | 'none' = 'none';
  for (const kr of keyResults) {
    const level = effectiveLevel(kr, latestByKr.get(kr.id) ?? null);
    if (best === 'none' || levelRank(level) > levelRank(best as SourceLevel)) best = level;
  }
  return best;
}
