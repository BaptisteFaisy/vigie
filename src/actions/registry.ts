/**
 * Registre des 15 outils MCP (SPEC §18).
 *
 * Un seul endroit applique `redact` à toute sortie : la garantie VG-21 (aucune
 * donnée de personne renvoyée) est structurelle, pas laissée à chaque outil.
 * `runAction` est appelé par le handler `dispatch` (manifest) pour chaque
 * `action` et chaque outil `rovo:mcp`.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ActionDeps, ActionHandler, ActionRegistry } from '../ports';
import type { ActionKey, ActionResult } from '../types';
import { redact } from './common';
import { getObjective, getProjection, getGoalCost, getConcordance, getKrSeries, getReviewDossier } from './read-objective';
import { listObjectives, countTheatre, listGoalOrphans, getPortfolioBrief } from './read-portfolio';
import { linkWork, recordKrNumber, recordCheckin, recordDecision, openPostmortem } from './write';

type Raw = ActionHandler<Record<string, unknown>, unknown>;

const RAW: Record<ActionKey, Raw> = {
  'get-objective': getObjective,
  'list-objectives': listObjectives,
  'count-theatre': countTheatre,
  'get-kr-series': getKrSeries,
  'get-projection': getProjection,
  'get-goal-cost': getGoalCost,
  'list-goal-orphans': listGoalOrphans,
  'get-concordance': getConcordance,
  'get-review-dossier': getReviewDossier,
  'get-portfolio-brief': getPortfolioBrief,
  'link-work': linkWork,
  'record-kr-number': recordKrNumber,
  'record-checkin': recordCheckin,
  'record-decision': recordDecision,
  'open-postmortem': openPostmortem,
};

/** Enveloppe un outil : toute valeur renvoyée est `redact`-ée (VG-21). */
function wrap(handler: Raw): Raw {
  return async (input, ctx) => {
    const result = await handler(input, ctx);
    return result.ok ? { ok: true, value: redact(result.value) } : result;
  };
}

export const ACTION_KEYS: readonly ActionKey[] = Object.keys(RAW) as ActionKey[];

export const ACTION_REGISTRY: ActionRegistry = Object.fromEntries(
  Object.entries(RAW).map(([key, handler]) => [key, wrap(handler)]),
) as ActionRegistry;

/** Point d'entrée unique du dispatch (actions + rovo:mcp). */
export async function runAction(key: ActionKey, input: Record<string, unknown>, ctx: ActionDeps): Promise<ActionResult<unknown>> {
  const handler = ACTION_REGISTRY[key];
  if (!handler) return { ok: false, error: `Outil MCP inconnu : ${key}` };
  return handler(input, ctx);
}
