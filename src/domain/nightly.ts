/**
 * Recalcul nocturne / à la demande (SPEC §20) — orchestration.
 *
 * Un seul point d'entrée long (jusqu'à 900 s via le consumer) qui recalcule le
 * portefeuille : qualification de chaque objectif, détection des fantômes, et
 * ligne de couverture. Budget affiché (objectifs calculés, appels, jetons) pour
 * la sobriété (§23). Rien ne se supprime : chaque recalcul remplace les lignes.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { GraphGateway, JiraGateway, NightlyEngine, OrphanEngine, TheatreEngine } from '../ports.js';
import type { RecalcMessage } from '../ports.js';
import type { ObjectiveView } from '../types.js';
import { defaultSettings } from '../defaults.js';
import { computeCoverage } from './coverage.js';
import { effectiveLevel } from './source-level.js';
import type { EngineDeps } from './theatre-engine.js';

export interface NightlyDeps extends EngineDeps {
  jira: JiraGateway;
  graph: GraphGateway;
  theatre: TheatreEngine;
  orphans: OrphanEngine;
}

function currentPeriodId(settingsPeriodStart: string): string {
  const year = new Date(settingsPeriodStart).getUTCFullYear();
  const quarter = Math.floor(new Date(settingsPeriodStart).getUTCMonth() / 3) + 1;
  return `${year}-T${quarter}`;
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

async function refreshCoverage(deps: NightlyDeps, periodId: string, views: readonly ObjectiveView[]): Promise<number> {
  const now = deps.clock.now();
  const settings = (await deps.store.getSettings(deps.scope)) ?? defaultSettings(deps.scope);
  const availability = await deps.graph.availability();
  const links = await deps.store.listActiveLinksByPeriod(periodId);
  const linkedIssues = new Set(links.map((l) => l.issueId));
  const allIssues = await deps.jira.searchIssues('ORDER BY updated DESC', 500);
  const kr = countLevelA(views);
  const coverage = computeCoverage({
    scope: deps.scope,
    sourceActive: settings.sources.active,
    graphAvailability: availability,
    totalIssues: Math.max(allIssues.length, linkedIssues.size),
    linkedIssues: linkedIssues.size,
    totalKrs: kr.total,
    levelAKrs: kr.levelA,
    now,
  });
  await deps.store.saveCoverage(coverage);
  return allIssues.length;
}

/** Crée le moteur de recalcul nocturne (§20). */
export function createNightlyEngine(deps: NightlyDeps): NightlyEngine {
  return {
    async run(message: RecalcMessage): Promise<{ objectives: number; calls: number; tokens: number }> {
      const settings = (await deps.store.getSettings(deps.scope)) ?? defaultSettings(deps.scope);
      const periodId = currentPeriodId(settings.periodStart);

      if (message.objectiveId && !message.full) {
        const view = await deps.theatre.qualify(message.objectiveId);
        return { objectives: view ? 1 : 0, calls: 1, tokens: 0 };
      }

      const views = await deps.theatre.qualifyAll(periodId);
      await deps.orphans.detect(periodId);
      const issueCalls = await refreshCoverage(deps, periodId, views);
      deps.logger.log('info', 'recalcul nocturne terminé', { periodId, objectives: views.length });
      return { objectives: views.length, calls: views.length + issueCalls + 1, tokens: 0 };
    },
  };
}
