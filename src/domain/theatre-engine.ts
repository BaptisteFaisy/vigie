/**
 * Moteur de théâtre (SPEC §6-§11) — orchestration.
 *
 * Qualifie UN objectif de bout en bout : lit le travail et les séries via le
 * store, détecte les signaux (§7), qualifie l'état, calcule le degré (§6), la
 * projection (§10), le coût (§11) et la concordance, persiste le tout, et rend
 * une `ObjectiveView`. C'est LE point de calcul unique : le MCP, l'agent, les
 * écrans et le recalcul nocturne lisent la même ligne (jamais de recalcul
 * divergent). N'importe aucun `@forge/*` : tout passe par les ports.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Clock, IdGenerator, Logger, TheatreEngine, VigieStore } from '../ports.js';
import type {
  Concordance, Cost, KeyResult, KrPoint, Movement, Objective,
  ObjectiveLink, ObjectiveView, Projection, Settings, SignalId, SourceLevel,
  TheatreSignal, TheatreState, Checkin, DegreeBasis,
} from '../types.js';
import { defaultSettings } from '../defaults.js';
import { detectSignals, activeSignalIds } from './signals/index.js';
import type { SignalInput } from './signals/index.js';
import { qualifyState } from './theatre-state.js';
import { computeDegree } from './degrees.js';
import { computeProjection } from './projection.js';
import { computeCost } from './cost.js';
import { computeConcordance } from './concordance.js';
import { bestLevel, seriesMoved, deltaOver, pointsInWindow } from './series.js';
import { epochOf, pointsInEpoch } from './epochs.js';
import { daysBetween, isoWeekToDate } from './movement.js';

/** Dépendances d'un moteur (sous-ensemble de AppDeps, sans les autres moteurs). */
export interface EngineDeps {
  store: VigieStore;
  clock: Clock;
  ids: IdGenerator;
  logger: Logger;
  scope: string;
}

interface Ctx {
  objective: Objective;
  keyResults: KeyResult[];
  links: ObjectiveLink[];
  movements: Movement[];
  checkins: Checkin[];
  series: KrPoint[];
  epochSeries: KrPoint[];
  settings: Settings;
  now: string;
  period: { start: string; end: string };
  epochId: string | null;
  lastActivityAt: string | null;
  workMoves: boolean;
}

const RECENT_WORK_WEEKS = 3;

/** Bornes d'un trimestre `…YYYY-Tn…` ; null si le format est inconnu. */
function quarterBounds(periodId: string): { start: string; end: string } | null {
  const match = /(\d{4})-T([1-4])/.exec(periodId);
  if (!match) return null;
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  return {
    start: new Date(Date.UTC(year, (quarter - 1) * 3, 1)).toISOString(),
    end: new Date(Date.UTC(year, quarter * 3, 0, 23, 59, 59)).toISOString(),
  };
}

async function loadContext(deps: EngineDeps, objective: Objective): Promise<Ctx> {
  const store = deps.store;
  const now = deps.clock.now();
  const settings = (await store.getSettings(deps.scope)) ?? defaultSettings(deps.scope);
  const keyResults = await store.listKeyResultsByObjective(objective.id);
  const links = (await store.listLinksByObjective(objective.id)).filter((l) => l.state !== 'detached');
  const movements = await store.listMovementsByObjective(objective.id);
  const checkins = await store.listCheckinsByObjective(objective.id);
  const epochs = await store.listEpochs();
  const epochId = epochOf(now, epochs)?.id ?? settings.currentEpochId;

  const series: KrPoint[] = [];
  for (const kr of keyResults) series.push(...(await store.listPointsByKr(kr.id)));
  const epochSeries = epochId ? pointsInEpoch(series, epochId) : series;

  const active = movements.filter((m) => m.transitions + m.commits > 0 || m.closed);
  const dates = active.map((m) => isoWeekToDate(m.week)).sort();
  const lastActivityAt = dates.length > 0 ? dates[dates.length - 1] : null;
  const recentFrom = new Date(new Date(now).getTime() - RECENT_WORK_WEEKS * 7 * 86_400_000).toISOString();
  const workMoves = active.some((m) => isoWeekToDate(m.week) >= recentFrom);
  const period = quarterBounds(objective.periodId) ?? { start: settings.periodStart, end: settings.periodEnd };

  return { objective, keyResults, links, movements, checkins, series, epochSeries, settings, now, period, epochId, lastActivityAt, workMoves };
}

async function detectForObjective(deps: EngineDeps, ctx: Ctx): Promise<{ signals: TheatreSignal[]; active: SignalId[] }> {
  const objectivesPerIssue: Record<string, number> = {};
  for (const link of ctx.links) objectivesPerIssue[link.issueId] = await deps.store.countObjectivesForIssue(link.issueId);
  const input: SignalInput = {
    objectiveId: ctx.objective.id,
    objectiveOpen: ctx.objective.state === 'open' || ctx.objective.state === 'draft',
    links: ctx.links,
    movements: ctx.movements,
    series: ctx.series,
    keyResults: ctx.keyResults,
    checkins: ctx.checkins,
    scope: ctx.objective.scope,
    period: ctx.period,
    thresholds: ctx.settings.thresholds,
    now: ctx.now,
    lastActivityAt: ctx.lastActivityAt,
    objectivesPerIssue,
  };
  const signals = detectSignals(input);
  await deps.store.replaceSignalsForObjective(ctx.objective.id, signals);
  return { signals, active: activeSignalIds(signals, ctx.now) };
}

function primaryKr(ctx: Ctx): KeyResult | null {
  return ctx.keyResults.length > 0 ? ctx.keyResults[0] : null;
}

function anySeriesAdvanced(ctx: Ctx): boolean {
  return ctx.keyResults.some((kr) => seriesMoved(ctx.epochSeries.filter((p) => p.krId === kr.id), kr.direction));
}

function pointsGainedOf(ctx: Ctx, kr: KeyResult | null): number | null {
  if (!kr) return null;
  const delta = deltaOver(ctx.epochSeries.filter((p) => p.krId === kr.id), 9999, ctx.now);
  return Math.abs(delta) > 0 ? Math.abs(delta) : null;
}

function stateOf(ctx: Ctx, active: SignalId[], seriesMoves: boolean, level: SourceLevel | 'none'): TheatreState {
  const periodClosedDays = ctx.now > ctx.period.end ? Math.floor(daysBetween(ctx.period.end, ctx.now)) : null;
  const hasRecentCheckin = ctx.checkins.some((c) => daysBetween(c.at, ctx.now) <= ctx.settings.thresholds.S10);
  return qualifyState(active, { seriesMoves, bestSeriesLevel: level, workMoves: ctx.workMoves, hasRecentCheckin, periodClosedDays });
}

async function persistAnalysis(deps: EngineDeps, ctx: Ctx, projection: Projection | null, cost: Cost, concordance: Concordance | null, state: TheatreState): Promise<void> {
  if (projection) await deps.store.saveProjection(projection);
  if (concordance) await deps.store.saveConcordance(concordance);
  await deps.store.saveCost(cost);
  await deps.store.saveObjective({ ...ctx.objective, theatreState: state });
}

/** Crée le moteur de théâtre (§6-§11). */
export function createTheatreEngine(deps: EngineDeps): TheatreEngine {
  return {
    async qualify(objectiveId: string): Promise<ObjectiveView | null> {
      const objective = await deps.store.getObjective(objectiveId);
      if (!objective) return null;
      const ctx = await loadContext(deps, objective);
      const { signals, active } = await detectForObjective(deps, ctx);

      const kr = primaryKr(ctx);
      const level = bestLevel(ctx.epochSeries);
      const seriesAdvanced = anySeriesAdvanced(ctx);
      const state = stateOf(ctx, active, seriesAdvanced, level);

      const krSeries = kr ? ctx.epochSeries.filter((p) => p.krId === kr.id) : [];
      const concordance = kr
        ? computeConcordance({ krId: kr.id, series: krSeries, movements: ctx.movements, direction: kr.direction, otherChanges: [], now: ctx.now })
        : null;
      const degreeBasis: DegreeBasis = computeDegree({
        hasCheckin: ctx.checkins.length > 0, workMoved: ctx.workMoves, seriesAdvanced, bestSeriesLevel: level, concordance,
      });
      const projection = kr && kr.target !== null
        ? computeProjection({ krId: kr.id, series: krSeries, target: kr.target, baseline: kr.baseline, direction: kr.direction, attachedIssueCount: ctx.links.length, epochId: ctx.epochId, periodEnd: ctx.period.end, now: ctx.now })
        : null;
      const cost = computeCost({ objectiveId: objective.id, periodId: objective.periodId, movements: ctx.movements, links: ctx.links, pointsGained: pointsGainedOf(ctx, kr), projection, now: ctx.now });

      await persistAnalysis(deps, ctx, projection, cost, concordance, state);
      const updated: Objective = { ...objective, theatreState: state };
      return {
        objective: updated, keyResults: ctx.keyResults, degree: degreeBasis.degree, degreeBasis,
        theatreState: state, signals, series: ctx.series, projection, cost, concordance,
        links: ctx.links, movement: ctx.movements,
      };
    },

    async qualifyAll(periodId: string): Promise<ObjectiveView[]> {
      const objectives = await deps.store.listObjectives({ periodId });
      const views: ObjectiveView[] = [];
      for (const objective of objectives) {
        const view = await this.qualify(objective.id);
        if (view) views.push(view);
      }
      return views;
    },
  };
}

/** Fenêtre de mouvement récent, réutilisée par le moteur de portefeuille. */
export function recentMovementWindow(now: string, weeks = RECENT_WORK_WEEKS): string {
  return new Date(new Date(now).getTime() - weeks * 7 * 86_400_000).toISOString();
}

/** Points de la fenêtre récente (utilisé par le pointage inversé). */
export function recentPoints(series: readonly KrPoint[], now: string): KrPoint[] {
  return pointsInWindow(series, RECENT_WORK_WEEKS, now);
}
