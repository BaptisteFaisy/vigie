/**
 * Moteur du verso (SPEC §7 verso, VG-12) — orchestration.
 *
 * Lit le travail qui bouge dans Jira, écarte ce qui est déjà rattaché, et
 * produit les fantômes avec un objectif plausible proposé (heuristique de
 * périmètre : composant puis projet) et une confiance. Sous le seuil, la
 * proposition reste « pas assez de recul » — jamais une devinette affirmée.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { JiraGateway, OrphanEngine } from '../ports.js';
import type { IssueRef } from '../ports.js';
import type { Objective, Orphan } from '../types.js';
import { resolveDays } from './movement.js';
import { detectOrphans } from './orphans.js';
import type { OrphanCandidate, OrphanSuggestion } from './orphans.js';
import type { EngineDeps } from './theatre-engine.js';

const GHOST_JQL = 'updated >= -30d ORDER BY updated DESC';
const GHOST_LIMIT = 200;

interface Match { objectiveId: string; confidence: number; reason: string }

/** Objectif plausible par périmètre : un composant partagé vaut mieux qu'un projet. */
function suggestObjective(issue: IssueRef, objectives: readonly Objective[]): Match | null {
  let best: Match | null = null;
  for (const objective of objectives) {
    const componentHit = issue.components.some((c) => objective.scope.components.includes(c));
    const projectHit = objective.scope.projectKeys.includes(issue.projectKey);
    if (componentHit) {
      const match = { objectiveId: objective.id, confidence: 0.75, reason: `Composant partagé avec « ${objective.title} ».` };
      if (!best || match.confidence > best.confidence) best = match;
    } else if (projectHit && (!best || best.confidence < 0.6)) {
      best = { objectiveId: objective.id, confidence: 0.6, reason: `Même projet (${issue.projectKey}) que « ${objective.title} ».` };
    }
  }
  return best;
}

/** Crée le moteur du verso. */
export function createOrphanEngine(deps: EngineDeps & { jira: JiraGateway }): OrphanEngine {
  return {
    async detect(periodId: string): Promise<Orphan[]> {
      const now = deps.clock.now();
      const objectives = await deps.store.listObjectives({ periodId });
      const links = await deps.store.listActiveLinksByPeriod(periodId);
      const issues = await deps.jira.searchIssues(GHOST_JQL, GHOST_LIMIT);

      const candidates: OrphanCandidate[] = issues.map((issue) => ({
        issueId: issue.id,
        issueKey: issue.key,
        projectKey: issue.projectKey,
        daysSpent: resolveDays({ spentSeconds: issue.spentSeconds, estimateSeconds: issue.estimateSeconds }).days,
        moved: true,
      }));

      const suggestions: OrphanSuggestion[] = [];
      for (const issue of issues) {
        const match = suggestObjective(issue, objectives);
        if (match) suggestions.push({ issueKey: issue.key, ...match });
      }

      const orphans = detectOrphans({ candidates, activeLinks: links, suggestions, now });
      for (const orphan of orphans) await deps.store.saveOrphan(orphan);
      return orphans;
    },
  };
}
