/**
 * Outils MCP de portefeuille (SPEC §18) : list-objectives, count-theatre,
 * list-goal-orphans, get-portfolio-brief. Lectures idempotentes (GET) : une
 * automatisation peut faire calculer le portefeuille à l'ouverture de la revue.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ActionHandler } from '../ports.js';
import type { ActionResult, ObjectiveView, PortfolioBrief } from '../types.js';
import { DEFAULT_PERIOD } from '../defaults.js';
import { fail, getStr, getOptStr, getOptInt } from './common.js';

type Handler = ActionHandler<Record<string, unknown>, unknown>;

function resolvePeriod(input: Record<string, unknown>): string {
  return getOptStr(input, 'period') ?? DEFAULT_PERIOD.id;
}

function summaryOf(view: ObjectiveView) {
  return {
    id: view.objective.id,
    title: view.objective.title,
    theatreState: view.theatreState,
    degree: view.degree,
    periodId: view.objective.periodId,
    teams: view.objective.scope.teams,
    projectionPct: view.projection?.pct ?? null,
    projectionConclusion: view.projection?.conclusion ?? null,
    costDays: view.cost?.days ?? null,
    signalCount: view.signals.length,
  };
}

function briefHead(brief: PortfolioBrief) {
  return {
    periodId: brief.periodId,
    byState: brief.byState,
    workLinkedPct: brief.workLinkedPct,
    ghostPct: brief.ghostPct,
    totalDays: brief.totalDays,
    unattributedDays: brief.unattributedDays,
    krLevelAPct: brief.krLevelAPct,
  };
}

export const listObjectives: Handler = async (input, ctx) => {
  const period = resolvePeriod(input);
  const state = getOptStr(input, 'state');
  const team = getOptStr(input, 'team');
  const limit = getOptInt(input, 'limit');
  const brief = await ctx.deps.portfolioEngine.brief(period);
  let views = brief.objectives;
  if (state) views = views.filter((v) => v.theatreState === state);
  if (team) views = views.filter((v) => v.objective.scope.teams.includes(team));
  if (limit !== undefined && limit >= 0) views = views.slice(0, limit);
  return { ok: true, value: { ...briefHead(brief), objectives: views.map(summaryOf) } } as ActionResult<unknown>;
};

export const countTheatre: Handler = async (input, ctx) => {
  const period = resolvePeriod(input);
  const count = await ctx.deps.portfolioEngine.theatreCount(period);
  return { ok: true, value: count } as ActionResult<unknown>;
};

export const listGoalOrphans: Handler = async (input, ctx) => {
  const projectKey = getOptStr(input, 'projectKey');
  const limit = getOptInt(input, 'limit');
  const orphans = await ctx.deps.store.listOrphans({ projectKey, limit });
  return { ok: true, value: { orphans, count: orphans.length } } as ActionResult<unknown>;
};

export const getPortfolioBrief: Handler = async (input, ctx) => {
  const period = getStr(input, 'period');
  if (!period) return fail('period est obligatoire');
  const brief = await ctx.deps.portfolioEngine.brief(period);
  return { ok: true, value: { ...briefHead(brief), objectives: brief.objectives.map(summaryOf) } } as ActionResult<unknown>;
};
