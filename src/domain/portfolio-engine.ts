/**
 * Moteur de portefeuille (SPEC §13, §19) — orchestration.
 *
 * Agrège les objectifs qualifiés en un `PortfolioBrief` (première page d'une
 * revue de direction) et un `TheatreCount` (compteur de théâtre du gadget).
 * Aucune couleur globale : on compte par état, on somme des jours déjà
 * fractionnés (jamais de double comptage), et on montre la part fantôme.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { PortfolioEngine, TheatreEngine } from '../ports';
import type { ObjectiveView, PortfolioBrief, SignalId, TheatreCount, TheatreState } from '../types';
import { THEATRE_STATES } from '../defaults';
import { portfolioTotal } from './cost';
import { effectiveLevel } from './source-level';
import type { EngineDeps } from './theatre-engine';

function emptyByState(): Record<TheatreState, number> {
  const out = {} as Record<TheatreState, number>;
  for (const state of THEATRE_STATES) out[state] = 0;
  return out;
}

function countByState(views: readonly ObjectiveView[]): Record<TheatreState, number> {
  const byState = emptyByState();
  for (const view of views) if (view.theatreState) byState[view.theatreState] += 1;
  return byState;
}

function levelAShare(views: readonly ObjectiveView[]): number {
  let total = 0;
  let levelA = 0;
  for (const view of views) {
    for (const kr of view.keyResults) {
      total += 1;
      const latest = view.series.filter((p) => p.krId === kr.id).sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1)).pop() ?? null;
      if (effectiveLevel(kr, latest) === 'A') levelA += 1;
    }
  }
  return total === 0 ? 0 : Math.round((levelA / total) * 1000) / 10;
}

function pct(part: number, total: number): number {
  return total <= 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

/** Crée le moteur de portefeuille à partir du moteur de théâtre. */
export function createPortfolioEngine(deps: EngineDeps, theatre: TheatreEngine): PortfolioEngine {
  return {
    async brief(periodId: string): Promise<PortfolioBrief> {
      const views = await theatre.qualifyAll(periodId);
      const links = await deps.store.listActiveLinksByPeriod(periodId);
      const linkedIssues = new Set(links.map((l) => l.issueId));
      const orphans = await deps.store.listOrphans({});
      const ghostDays = orphans.reduce((sum, o) => sum + o.daysSpent, 0);
      const costs = views.map((v) => v.cost).filter((c): c is NonNullable<typeof c> => c !== null);
      const total = linkedIssues.size + orphans.length;
      return {
        periodId,
        byState: countByState(views),
        workLinkedPct: pct(linkedIssues.size, total),
        ghostPct: pct(orphans.length, total),
        totalDays: portfolioTotal(costs),
        unattributedDays: Math.round(ghostDays * 100) / 100,
        krLevelAPct: levelAShare(views),
        objectives: views,
      };
    },

    async theatreCount(periodId: string): Promise<TheatreCount> {
      const views = await theatre.qualifyAll(periodId);
      const counts = new Map<SignalId, number>();
      for (const view of views) {
        for (const signal of view.signals) counts.set(signal.signal, (counts.get(signal.signal) ?? 0) + 1);
      }
      const dominantSignals = [...counts.entries()]
        .map(([signal, count]) => ({ signal, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      return { periodId, byState: countByState(views), dominantSignals };
    },
  };
}
