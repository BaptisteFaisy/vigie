/**
 * Outils MCP d'écriture (SPEC §18) : link-work, record-kr-number,
 * record-checkin, record-decision, open-postmortem.
 *
 * Gestes encadrés (§9, §12, §13, §15) : un rattachement porte une raison et une
 * fraction ; un pointage affiche les faits À CÔTÉ de l'interprétation, sans
 * jamais la censurer ; une décision est enregistrée puis vérifiée ; un
 * post-mortem est une page Confluence modifiable. VG-21 : `byRef`/`linkedByRef`
 * sont stockés pour l'audit mais `redact`-és à la sortie (voir registry.ts).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ActionHandler } from '../ports.js';
import type { ActionResult, Checkin, KeyResult, KrPoint, ObjectiveLink, ObjectiveView, ReviewDecision, SourceLevel } from '../types.js';
import { fail, getStr, getNum, getOptNum, parseIssueKeys, isSourceLevel, isDecision } from './common.js';
import { buildCheckinFacts, interpretationContradictsFacts } from '../domain/checkin.js';
import { buildPostmortem } from '../domain/postmortem.js';
import { effectiveLevel } from '../domain/source-level.js';
import { recentPoints } from '../domain/theatre-engine.js';

type Handler = ActionHandler<Record<string, unknown>, unknown>;

function sourceOf(level: SourceLevel, ref: string): KrPoint['source'] {
  if (level === 'A') return { kind: 'computed', computedBy: 'jira', note: ref };
  if (level === 'B') return { kind: 'reference', url: ref };
  return { kind: 'declared', note: ref };
}

export const linkWork: Handler = async (input, ctx) => {
  const objectiveId = getStr(input, 'objectiveId');
  const rawKeys = getStr(input, 'issueKeys');
  if (!objectiveId || !rawKeys) return fail('objectiveId et issueKeys sont obligatoires');
  const reason = getStr(input, 'reason');
  const explicit = getOptNum(input, 'fraction');
  const keys = parseIssueKeys(rawKeys);
  const now = ctx.deps.clock.now();
  const linked: string[] = [];
  for (const issueKey of keys) {
    const issue = await ctx.deps.jira.getIssue(issueKey);
    const issueId = issue?.id ?? issueKey;
    const existing = await ctx.deps.store.countObjectivesForIssue(issueId);
    const fraction = explicit ?? 1 / (existing + 1);
    const link: ObjectiveLink = {
      id: ctx.deps.ids.next('lnk'), objectiveId, issueId, issueKey, fraction,
      reason: reason ?? null, linkedByRef: ctx.actor.ref, linkedAt: now, verifiedAt: null,
      state: reason ? 'active' : 'unmotivated',
    };
    await ctx.deps.store.saveLink(link);
    linked.push(issueKey);
  }
  return { ok: true, value: { objectiveId, linked, count: linked.length, motivated: Boolean(reason) } } as ActionResult<unknown>;
};

export const recordKrNumber: Handler = async (input, ctx) => {
  const krId = getStr(input, 'krId');
  const value = getNum(input, 'value');
  const sourceRef = getStr(input, 'sourceRef');
  const levelRaw = getStr(input, 'sourceLevel');
  if (!krId || value === null || !sourceRef || !levelRaw) return fail('krId, value, sourceRef et sourceLevel sont obligatoires');
  if (!isSourceLevel(levelRaw)) return fail('sourceLevel doit valoir A, B ou C', levelRaw);
  const kr = await ctx.deps.store.getKeyResult(krId);
  if (!kr) return fail('Résultat clé introuvable', krId);
  const now = ctx.deps.clock.now();
  const epoch = await ctx.deps.store.currentEpoch(now);
  const point: KrPoint = {
    id: ctx.deps.ids.next('pt'), krId, value, measuredAt: now,
    source: sourceOf(levelRaw, sourceRef), sourceLevel: levelRaw, epochId: epoch?.id ?? null,
  };
  await ctx.deps.store.savePoint(point);
  const updated: KeyResult = { ...kr, current: value, sourceLevel: levelRaw };
  await ctx.deps.store.saveKeyResult(updated);
  return { ok: true, value: { krId, value, sourceLevel: levelRaw, measuredAt: now } } as ActionResult<unknown>;
};

export const recordCheckin: Handler = async (input, ctx) => {
  const objectiveId = getStr(input, 'objectiveId');
  const interpretation = getStr(input, 'interpretation');
  if (!objectiveId || !interpretation) return fail('objectiveId et interpretation sont obligatoires');
  const view: ObjectiveView | null = await ctx.deps.theatre.qualify(objectiveId);
  if (!view) return fail('Objectif introuvable', objectiveId);
  const now = ctx.deps.clock.now();
  const facts = buildCheckinFacts({
    degree: view.degree, theatreState: view.theatreState,
    activeSignals: view.signals.map((s) => s.signal),
    weekMovement: view.movement.length > 0 ? view.movement[view.movement.length - 1] : null,
    newPoints: recentPoints(view.series, now),
    projectionPct: view.projection?.pct ?? null,
    projectionConclusion: view.projection?.conclusion ?? null,
    costDays: view.cost?.days ?? null,
  });
  const checkin: Checkin = { id: ctx.deps.ids.next('chk'), objectiveId, at: now, facts, interpretation, byRef: ctx.actor.ref };
  await ctx.deps.store.saveCheckin(checkin);
  return {
    ok: true,
    value: { objectiveId, at: now, facts, interpretation, contradictsFacts: interpretationContradictsFacts(interpretation, facts) },
  } as ActionResult<unknown>;
};

export const recordDecision: Handler = async (input, ctx) => {
  const objectiveId = getStr(input, 'objectiveId');
  const decisionRaw = getStr(input, 'decision');
  const reason = getStr(input, 'reason');
  if (!objectiveId || !decisionRaw || !reason) return fail('objectiveId, decision et reason sont obligatoires');
  if (!isDecision(decisionRaw)) return fail('decision doit valoir continue, retarget ou abandon', decisionRaw);
  const decision: ReviewDecision = {
    id: ctx.deps.ids.next('dec'), objectiveId, decision: decisionRaw, reason,
    at: ctx.deps.clock.now(), byRef: ctx.actor.ref, followed: null, verifiedAt: null,
  };
  await ctx.deps.store.saveDecision(decision);
  return { ok: true, value: { objectiveId, decision: decisionRaw, at: decision.at } } as ActionResult<unknown>;
};

function postmortemHtml(view: ObjectiveView, learned: readonly string[]): string {
  const rows = learned.map((l) => `<li>${l}</li>`).join('');
  return `<h1>Post-mortem — ${view.objective.title}</h1><p>État : ${view.theatreState ?? 'n/a'} · Degré : ${view.degree}</p><ul>${rows}</ul>`;
}

export const openPostmortem: Handler = async (input, ctx) => {
  const objectiveId = getStr(input, 'objectiveId');
  if (!objectiveId) return fail('objectiveId est obligatoire');
  const view = await ctx.deps.theatre.qualify(objectiveId);
  if (!view) return fail('Objectif introuvable', objectiveId);
  const now = ctx.deps.clock.now();
  const kr = view.keyResults[0] ?? null;
  const latest = kr ? (view.series.filter((p) => p.krId === kr.id).sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1)).pop() ?? null) : null;
  const decision = await ctx.deps.store.latestDecisionForObjective(objectiveId);
  const pm = buildPostmortem({
    objective: view.objective, baseline: kr?.baseline ?? null, finalValue: latest?.value ?? kr?.current ?? null,
    finalLevel: kr ? effectiveLevel(kr, latest) : 'none', direction: kr?.direction ?? 'up',
    links: view.links, landedIssueKeys: view.movement.filter((m) => m.closed).map((m) => m.issueKey),
    cost: view.cost, signalsFired: view.signals.map((s) => s.signal), decision, now,
  });
  const page = await ctx.deps.confluence.createPage(ctx.scope, `Post-mortem — ${view.objective.title}`, postmortemHtml(view, pm.learned));
  await ctx.deps.store.savePostmortem({ ...pm, pageAri: page?.ari ?? null });
  return { ok: true, value: { objectiveId, pageAri: page?.ari ?? null, url: page?.url ?? null, moved: pm.moved, landed: pm.landed, learned: pm.learned } } as ActionResult<unknown>;
};
