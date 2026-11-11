/**
 * Écran de couverture (SPEC §19, VG-19) — domaine PUR.
 *
 * Ce que l'app voit et ne voit pas : la source active (graphe / registre local /
 * import), les droits manquants, la part du travail rattachée et la part de RC
 * mesurés (niveau A). Un droit manquant vide le résultat sans erreur (§20) : la
 * couverture distingue donc « pas de droit » de « pas de données », au lieu d'un
 * zéro silencieux.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Coverage, ObjectiveSource } from '../types.js';

export interface CoverageInput {
  scope: string;
  sourceActive: ObjectiveSource;
  graphAvailability: { available: boolean; missingRights: readonly string[] };
  totalIssues: number;
  linkedIssues: number;
  totalKrs: number;
  levelAKrs: number;
  now: string;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** Calcule la ligne de couverture d'un périmètre (§19). */
export function computeCoverage(input: CoverageInput): Coverage {
  const rightsMissing = input.graphAvailability.available ? [] : [...input.graphAvailability.missingRights];
  return {
    scope: input.scope,
    sourceActive: input.sourceActive,
    rightsMissing,
    workLinkedPct: pct(input.linkedIssues, input.totalIssues),
    krLevelAPct: pct(input.levelAKrs, input.totalKrs),
    computedAt: input.now,
  };
}
