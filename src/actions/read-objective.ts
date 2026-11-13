/**
 * Outils MCP de lecture d'un objectif (SPEC §18) : get-objective, get-projection,
 * get-goal-cost, get-concordance, get-review-dossier, get-kr-series.
 *
 * Tous passent par le moteur de théâtre (le point de calcul unique) ou le store,
 * et renvoient des sorties `redact`-ées (VG-21). Aucun n'accepte de nom de
 * personne en filtre. Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ActionDeps, ActionHandler } from '../ports';
import type { ActionResult, ObjectiveView, ReviewDossier } from '../types';
import { fail, getStr, getOptStr } from './common';
import { buildDossier } from '../domain/dossier';

type Handler = ActionHandler<Record<string, unknown>, unknown>;

async function qualified(ctx: ActionDeps, objectiveId: string): Promise<ObjectiveView | null> {
  return ctx.deps.theatre.qualify(objectiveId);
}

function summaryOf(view: ObjectiveView) {
  return {
    id: view.objective.id,
    title: view.objective.title,
    state: view.objective.state,
    theatreState: view.theatreState,
    periodId: view.objective.periodId,
  };
}

export const getObjective: Handler = async (input, ctx) => {
  const objectiveId = getStr(input, 'objectiveId');
  if (!objectiveId) return fail('objectiveId est obligatoire');
  const view = await qualified(ctx, objectiveId);
  if (!view) return fail('Objectif introuvable', objectiveId);
  const decision = await ctx.deps.store.latestDecisionForObjective(objectiveId);
  return {
    ok: true,
    value: {
      objective: summaryOf(view),
      degree: view.degree,
      degreeBasis: view.degreeBasis,
      signals: view.signals,
      series: view.series,
      projection: view.projection,
      cost: view.cost,
      decision,
    },
  } as ActionResult<unknown>;
};

export const getProjection: Handler = async (input, ctx) => {
  const objectiveId = getStr(input, 'objectiveId');
  if (!objectiveId) return fail('objectiveId est obligatoire');
  const view = await qualified(ctx, objectiveId);
  if (!view) return fail('Objectif introuvable', objectiveId);
  const projection = view.projection ?? (await ctx.deps.store.latestProjectionForKr(view.keyResults[0]?.id ?? ''));
  return { ok: true, value: { objectiveId, projection: projection ?? null } } as ActionResult<unknown>;
};

export const getGoalCost: Handler = async (input, ctx) => {
  const objectiveId = getStr(input, 'objectiveId');
  if (!objectiveId) return fail('objectiveId est obligatoire');
  const view = await qualified(ctx, objectiveId);
  if (!view) return fail('Objectif introuvable', objectiveId);
  return { ok: true, value: { objectiveId, cost: view.cost } } as ActionResult<unknown>;
};

export const getConcordance: Handler = async (input, ctx) => {
  const krId = getStr(input, 'krId');
  if (!krId) return fail('krId est obligatoire');
  const concordance = await ctx.deps.store.latestConcordanceForKr(krId);
  return { ok: true, value: { krId, concordance: concordance ?? null } } as ActionResult<unknown>;
};

export const getKrSeries: Handler = async (input, ctx) => {
  const krId = getStr(input, 'krId');
  if (!krId) return fail('krId est obligatoire');
  const from = getOptStr(input, 'from');
  const to = getOptStr(input, 'to');
  const points = await ctx.deps.store.listPointsByKr(krId, from, to);
  return { ok: true, value: { krId, points } } as ActionResult<unknown>;
};

export const getReviewDossier: Handler = async (input, ctx) => {
  const objectiveId = getStr(input, 'objectiveId');
  if (!objectiveId) return fail('objectiveId est obligatoire');
  const view = await qualified(ctx, objectiveId);
  if (!view) return fail('Objectif introuvable', objectiveId);
  const decision = await ctx.deps.store.latestDecisionForObjective(objectiveId);
  const record = await ctx.deps.store.getDossierRecord(objectiveId);
  const dossier: ReviewDossier = buildDossier({
    objective: view.objective, keyResults: view.keyResults, degree: view.degree,
    theatreState: view.theatreState, signals: view.signals, series: view.series,
    projection: view.projection, cost: view.cost, movement: view.movement,
    otherChanges: view.concordance?.otherChanges ?? [], links: view.links,
    decision, pageAri: record?.pageAri ?? null,
  });
  return { ok: true, value: dossier } as ActionResult<unknown>;
};
