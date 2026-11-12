/**
 * Recalcul nocturne / à la demande (SPEC §20) — orchestration.
 *
 * Un seul point d'entrée long (jusqu'à 900 s via le consumer) qui, dans l'ordre :
 *   1. RECALCULE les résultats clés de niveau A (§8) et écrit un point de série ;
 *   2. qualifie chaque objectif (signaux, état, degré, projection, coût) ;
 *   3. VÉRIFIE les décisions de revue de la période (§13, recette item 13) ;
 *   4. détecte les fantômes (verso) ;
 *   5. rafraîchit la ligne de couverture (§19).
 *
 * Budget affiché (objectifs calculés, appels, jetons) pour la sobriété (§23).
 * Rien ne se supprime : chaque recalcul écrit de nouvelles lignes.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { GraphGateway, JiraGateway, NightlyEngine, OrphanEngine, PortfolioGateway, TheatreEngine } from '../ports';
import type { RecalcMessage } from '../ports';
import type { ObjectiveView } from '../types';
import { defaultSettings } from '../defaults';
import { computeCoverage } from './coverage';
import { effectiveLevel } from './source-level';
import { recomputeLevelA } from './recompute';
import { isFollowed } from './decisions';
import { isoWeekToDate } from './movement';
import type { EngineDeps } from './theatre-engine';

export interface NightlyDeps extends EngineDeps {
  jira: JiraGateway;
  graph: GraphGateway;
  portfolio: PortfolioGateway;
  theatre: TheatreEngine;
  orphans: OrphanEngine;
}

export function currentPeriodId(periodStart: string): string {
  const date = new Date(periodStart);
  return `${date.getUTCFullYear()}-T${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

/**
 * Période courante effective : celle qui porte le plus d'objectifs ouverts.
 * Les identifiants de période peuvent être préfixés (`demo-2026-T4`) ou libres ;
 * les dériver de la seule date des réglages casserait le recalcul. À défaut
 * d'objectifs, on retombe sur le trimestre déduit des réglages.
 */
export async function resolvePeriodId(store: NightlyDeps['store'], fallback: string): Promise<string> {
  const objectives = await store.listObjectives({});
  if (objectives.length === 0) return fallback;
  const open = objectives.filter((o) => o.state === 'open');
  const pool = open.length > 0 ? open : objectives;
  const counts = new Map<string, number>();
  for (const objective of pool) counts.set(objective.periodId, (counts.get(objective.periodId) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Étape 1 — recalcule les RC de niveau A (§8) : jamais recopiés. `periodId` null = tous. */
export async function recomputeLevelAValues(deps: NightlyDeps, periodId: string | null): Promise<number> {
  const now = deps.clock.now();
  const settings = (await deps.store.getSettings(deps.scope)) ?? defaultSettings(deps.scope);
  const epoch = await deps.store.currentEpoch(now);
  const objectives = await deps.store.listObjectives(periodId ? { periodId } : {});
  let calls = 0;
  for (const objective of objectives) {
    const keyResults = await deps.store.listKeyResultsByObjective(objective.id);
    const links = (await deps.store.listLinksByObjective(objective.id)).filter((l) => l.state !== 'detached');
    const movements = await deps.store.listMovementsByObjective(objective.id);
    for (const kr of keyResults) {
      if (kr.sourceLevel !== 'A' || !kr.computedBy) continue;
      const recomputed = await recomputeLevelA({
        kr, links, movements, projectKey: objective.scope.projectKeys[0] ?? null,
        since: settings.periodStart, jira: deps.jira, portfolio: deps.portfolio,
      });
      calls += 1;
      if (!recomputed) continue;
      await deps.store.savePoint({
        id: `${kr.id}_recomputed_${Date.parse(now) || 0}`, krId: kr.id, value: recomputed.value, measuredAt: now,
        source: { kind: 'computed', computedBy: recomputed.computedBy, note: recomputed.reference },
        sourceLevel: 'A', epochId: epoch?.id ?? null,
      });
      await deps.store.saveKeyResult({ ...kr, current: recomputed.value });
    }
  }
  return calls;
}

/** Étape 3 — vérifie les décisions enregistrées (§13). */
export async function verifyDecisions(deps: NightlyDeps, periodId: string): Promise<number> {
  const decisions = await deps.store.listDecisionsToVerify(periodId);
  const now = deps.clock.now();
  let verified = 0;
  for (const decision of decisions) {
    const objective = await deps.store.getObjective(decision.objectiveId);
    if (!objective) continue;
    const movements = await deps.store.listMovementsByObjective(objective.id);
    const hasMovementAfter = movements.some((m) => isoWeekToDate(m.week) > decision.at && (m.transitions + m.commits > 0 || m.closed));
    let hasPointAfter = false;
    for (const kr of await deps.store.listKeyResultsByObjective(objective.id)) {
      const points = await deps.store.listPointsByKr(kr.id, decision.at);
      if (points.some((p) => p.measuredAt > decision.at)) { hasPointAfter = true; break; }
    }
    const followed = isFollowed({ decision, objectiveState: objective.state, hasMovementAfter, hasPointAfter });
    await deps.store.saveDecision({ ...decision, followed, verifiedAt: now });
    verified += 1;
  }
  return verified;
}

function countLevelA(views: readonly ObjectiveView[]): { total: number; levelA: number } {
  let total = 0;
  let levelA = 0;
  for (const view of views) {
    for (const kr of view.keyResults) {
      total += 1;
      const latest = view.series.filter((p) => p.krId === kr.id).sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1)).pop() ?? null;
      if (effectiveLevel(kr, latest) === 'A') levelA += 1;
    }
  }
  return { total, levelA };
}

/** Étape 5 — rafraîchit la couverture (§19). */
async function refreshCoverage(deps: NightlyDeps, periodId: string, views: readonly ObjectiveView[]): Promise<number> {
  const settings = (await deps.store.getSettings(deps.scope)) ?? defaultSettings(deps.scope);
  const availability = await deps.graph.availability();
  const links = await deps.store.listActiveLinksByPeriod(periodId);
  const linkedIssues = new Set(links.map((l) => l.issueId));
  const allIssues = await deps.jira.searchIssues('ORDER BY updated DESC', 500);
  const kr = countLevelA(views);
  await deps.store.saveCoverage(computeCoverage({
    scope: deps.scope, sourceActive: settings.sources.active, graphAvailability: availability,
    totalIssues: Math.max(allIssues.length, linkedIssues.size), linkedIssues: linkedIssues.size,
    totalKrs: kr.total, levelAKrs: kr.levelA, now: deps.clock.now(),
  }));
  return allIssues.length;
}

/** Crée le moteur de recalcul nocturne (§20). */
export function createNightlyEngine(deps: NightlyDeps): NightlyEngine {
  return {
    async run(message: RecalcMessage): Promise<{ objectives: number; calls: number; tokens: number }> {
      const settings = (await deps.store.getSettings(deps.scope)) ?? defaultSettings(deps.scope);
      const periodId = await resolvePeriodId(deps.store, currentPeriodId(settings.periodStart));

      if (message.objectiveId && !message.full) {
        const view = await deps.theatre.qualify(message.objectiveId);
        return { objectives: view ? 1 : 0, calls: 1, tokens: 0 };
      }

      const recomputeCalls = await recomputeLevelAValues(deps, null);
      const views = await deps.theatre.qualifyAll(periodId);
      const verified = await verifyDecisions(deps, periodId);
      await deps.orphans.detect(periodId);
      const issueCalls = await refreshCoverage(deps, periodId, views);
      deps.logger.log('info', 'recalcul nocturne terminé', { periodId, objectives: views.length, decisions: verified });
      return { objectives: views.length, calls: views.length + issueCalls + recomputeCalls + 1, tokens: 0 };
    },
  };
}
