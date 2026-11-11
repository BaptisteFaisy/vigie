/**
 * Le verso : les fantômes (SPEC §7 verso, VG-12) — domaine PUR.
 *
 * La même lecture dans l'autre sens : les tickets qui avancent, consomment des
 * jours, et ne servent AUCUN objectif déclaré. C'est l'écran le plus utile du
 * produit — il révèle la stratégie réellement exécutée face à la déclarée.
 *
 * Pour chacun, l'app propose un objectif plausible avec une confiance, et dit
 * « pas assez de recul » quand elle est sous le seuil : une proposition n'est
 * jamais une devinette affirmée. Aucune donnée de personne (VG-21).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ObjectiveLink, Orphan } from '../types.js';
import { ORPHAN_DEFAULTS } from '../defaults.js';

export interface OrphanCandidate {
  issueId: string;
  issueKey: string;
  projectKey: string | null;
  daysSpent: number;
  moved: boolean;
}

/** Un objectif plausible proposé pour un fantôme (produit par le moteur/LLM). */
export interface OrphanSuggestion {
  issueKey: string;
  objectiveId: string;
  confidence: number;
  reason: string;
}

export interface OrphanInput {
  candidates: readonly OrphanCandidate[];
  /** Liens actifs du portefeuille : servent à savoir ce qui est déjà rattaché. */
  activeLinks: readonly ObjectiveLink[];
  suggestions?: readonly OrphanSuggestion[];
  minConfidence?: number;
  now: string;
}

function buildOrphan(candidate: OrphanCandidate, suggestion: OrphanSuggestion | undefined, minConfidence: number, now: string): Orphan {
  const confidence = suggestion?.confidence ?? 0;
  const reliable = suggestion !== undefined && confidence >= minConfidence;
  const reason = reliable
    ? suggestion.reason
    : suggestion
      ? `Objectif plausible sous le seuil de confiance (${Math.round(confidence * 100)} %) — pas assez de recul.`
      : 'Aucun objectif plausible trouvé — pas assez de recul.';
  return {
    issueId: candidate.issueId,
    issueKey: candidate.issueKey,
    projectKey: candidate.projectKey,
    detectedAt: now,
    suggestedObjectiveId: reliable ? suggestion.objectiveId : null,
    confidence,
    reason,
    daysSpent: candidate.daysSpent,
    resolvedAt: null,
  };
}

/** Détecte les fantômes et propose un objectif plausible (§7 verso). */
export function detectOrphans(input: OrphanInput): Orphan[] {
  const minConfidence = input.minConfidence ?? ORPHAN_DEFAULTS.minConfidence;
  const linked = new Set(input.activeLinks.filter((l) => l.state === 'active').map((l) => l.issueId));
  const byKey = new Map((input.suggestions ?? []).map((s) => [s.issueKey, s] as const));
  return input.candidates
    .filter((c) => c.moved && !linked.has(c.issueId))
    .map((c) => buildOrphan(c, byKey.get(c.issueKey), minConfidence, input.now))
    .sort((a, b) => b.daysSpent - a.daysSpent);
}

/** Part du travail (en jours) qui est fantôme, pour l'écran de couverture/verso. */
export function ghostSharePct(ghostDays: number, totalDays: number): number {
  if (totalDays <= 0) return 0;
  return Math.round((ghostDays / totalDays) * 1000) / 10;
}
