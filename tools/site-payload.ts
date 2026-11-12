/**
 * Mise en forme du payload du site — PARTAGÉE entre le générateur Node
 * (`tools/site-data.ts`, écrit `site/data/demo.json`) et le bundle navigateur
 * (`tools/site-browser.ts`, `Vigie.snapshot()`). Une seule implémentation : les
 * deux rendus ne peuvent pas diverger.
 *
 * VG-21 : aucun `*_ref` ni identité n'est exporté.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { VigieStore } from '../src/ports';
import type { ObjectiveView, Orphan, ReviewDecision } from '../src/types';
import { computeCoverage } from '../src/domain/coverage';
import { sourceGap } from '../src/domain/recompute';
import { interpretationContradictsFacts } from '../src/domain/checkin';

/** La démo simule un site SANS droits sur le graphe : l'écran de couverture le dit (§19). */
export const DEMO_MISSING_RIGHTS = ['read:graph:work-item', 'read:graph:project'];

export interface SiteObjective {
  id: string;
  title: string;
  periodId: string;
  stateCode: string | null;
  degreeCode: string;
  degreeFacts: string[];
  keyResults: { id: string; title: string; unit: string | null; direction: string; baseline: number | null; target: number | null; current: number | null; sourceLevel: string; computedBy: string | null }[];
  signals: { code: string; firedAt: string; facts: { value: number; threshold: number; at: string; detail: string; detailEn: string }[] }[];
  projection: { pct: number | null; ciLow: number | null; ciHigh: number | null; conclusion: string; n: number; weeksUsed: number; method: string; assumptions: string[]; assumptionsEn: string[]; levers: { text: string; textEn: string }[] } | null;
  cost: { days: number; method: string; sharedWithCount: number; ratioPerPoint: number | null; ratioCiLow: number | null; ratioCiHigh: number | null } | null;
  concordance: { workMoved: boolean; numberMoved: boolean; degree: string; windowFrom: string; windowTo: string; otherChanges: { kind: string; label: string; at: string }[] } | null;
  series: { at: string; value: number; level: string }[];
  links: { issueKey: string; fraction: number; reason: string | null; state: string }[];
  checkins: { at: string; interpretation: string; facts: unknown; contradicts: boolean }[];
  sourceGap: { recomputed: number; copied: number; gap: number; copiedLevel: string } | null;
  decision: { decision: string; reason: string; followed: boolean | null } | null;
}

function firstSourceGap(view: ObjectiveView): SiteObjective['sourceGap'] {
  for (const kr of view.keyResults) {
    if (!kr.computedBy) continue;
    const gap = sourceGap(view.series.filter((p) => p.krId === kr.id));
    if (gap) return { recomputed: gap.recomputed, copied: gap.copied, gap: gap.gap, copiedLevel: gap.copiedLevel };
  }
  return null;
}

export function toSiteObjective(view: ObjectiveView, decision: ReviewDecision | null, checkins: SiteObjective['checkins']): SiteObjective {
  const kr = view.keyResults[0] ?? null;
  return {
    id: view.objective.id,
    title: view.objective.title,
    periodId: view.objective.periodId,
    stateCode: view.theatreState,
    degreeCode: view.degree,
    degreeFacts: [...view.degreeBasis.facts],
    keyResults: view.keyResults.map((k) => ({
      id: k.id, title: k.title, unit: k.unit, direction: k.direction, baseline: k.baseline,
      target: k.target, current: k.current, sourceLevel: k.sourceLevel, computedBy: k.computedBy ?? null,
    })),
    signals: view.signals.map((s) => ({ code: s.signal, firedAt: s.firedAt, facts: s.facts.map((f) => ({ value: f.value, threshold: f.threshold, at: f.at, detail: f.detail, detailEn: f.detailEn })) })),
    projection: view.projection ? {
      pct: view.projection.pct, ciLow: view.projection.ciLow, ciHigh: view.projection.ciHigh, conclusion: view.projection.conclusion,
      n: view.projection.n, weeksUsed: view.projection.weeksUsed, method: view.projection.method,
      assumptions: [...view.projection.assumptions], assumptionsEn: [...view.projection.assumptionsEn],
      levers: view.projection.levers.map((l) => ({ text: l.text, textEn: l.textEn })),
    } : null,
    cost: view.cost ? {
      days: view.cost.days, method: view.cost.method, sharedWithCount: view.cost.sharedWithCount,
      ratioPerPoint: view.cost.ratioPerPoint, ratioCiLow: view.cost.ratioCiLow, ratioCiHigh: view.cost.ratioCiHigh,
    } : null,
    concordance: view.concordance ? {
      workMoved: view.concordance.workMoved, numberMoved: view.concordance.numberMoved, degree: view.concordance.degree,
      windowFrom: view.concordance.windowFrom, windowTo: view.concordance.windowTo,
      otherChanges: view.concordance.otherChanges.map((c) => ({ kind: c.kind, label: c.label, at: c.at })),
    } : null,
    series: (kr ? view.series.filter((p) => p.krId === kr.id) : []).map((p) => ({ at: p.measuredAt, value: p.value, level: p.sourceLevel })),
    links: view.links.map((l) => ({ issueKey: l.issueKey, fraction: l.fraction, reason: l.reason, state: l.state })),
    checkins,
    sourceGap: firstSourceGap(view),
    decision: decision ? { decision: decision.decision, reason: decision.reason, followed: decision.followed } : null,
  };
}

export function toSiteGhost(o: Orphan, titleOf: (id: string | null) => string | null) {
  return {
    issueKey: o.issueKey, projectKey: o.projectKey, daysSpent: o.daysSpent, confidence: o.confidence,
    suggestedObjectiveId: o.suggestedObjectiveId, suggestedTitle: titleOf(o.suggestedObjectiveId), reason: o.reason,
  };
}

export interface PayloadArgs {
  store: VigieStore;
  views: ObjectiveView[];
  summary: { objectives: number; issues: number; ghosts: number; epochs: number };
  period: string;
  now: string;
  scope: string;
  missingRights: string[];
  budget: { objectives: number; calls: number; tokens: number };
  epochs: { id: string; label: string; startsAt: string; endsAt: string | null }[];
  /** Provenance des données : trimestre synthétique (§27) ou import réel. */
  source?: { kind: 'synthetic' | 'github' | 'jira'; label: string; fetchedAt?: string };
}

/** Construit le payload complet du site depuis l'état réel des moteurs. */
export async function buildSitePayload(args: PayloadArgs) {
  const { store, views, period, now, scope } = args;
  const ghosts = await store.listOrphans({});
  const titles = new Map(views.map((v) => [v.objective.id, v.objective.title] as const));
  const linkedIssues = new Set<string>();
  for (const view of views) for (const link of view.links) linkedIssues.add(link.issueId);
  const settings = await store.getSettings(scope);

  const siteObjectives: SiteObjective[] = [];
  for (const view of views) {
    const decision = await store.latestDecisionForObjective(view.objective.id);
    const rawCheckins = await store.listCheckinsByObjective(view.objective.id);
    const checkins = rawCheckins.map((c) => ({
      at: c.at, interpretation: c.interpretation, facts: c.facts,
      contradicts: interpretationContradictsFacts(c.interpretation, c.facts),
    }));
    siteObjectives.push(toSiteObjective(view, decision, checkins));
  }
  siteObjectives.sort((a, b) => a.title.localeCompare(b.title));

  const totalKrs = views.reduce((n, v) => n + v.keyResults.length, 0);
  const levelAKrs = views.reduce((n, v) => n + v.keyResults.filter((k) => k.sourceLevel === 'A').length, 0);
  const coverage = computeCoverage({
    scope, sourceActive: settings?.sources.active ?? 'local',
    graphAvailability: { available: args.missingRights.length === 0, missingRights: args.missingRights },
    totalIssues: args.summary.issues, linkedIssues: linkedIssues.size, totalKrs, levelAKrs, now,
  });

  const totalDays = siteObjectives.reduce((sum, o) => sum + (o.cost?.days ?? 0), 0);
  const ghostDays = ghosts.reduce((sum, g) => sum + g.daysSpent, 0);
  const byState: Record<string, number> = {};
  for (const o of siteObjectives) if (o.stateCode) byState[o.stateCode] = (byState[o.stateCode] ?? 0) + 1;
  const signalCounts = new Map<string, number>();
  for (const o of siteObjectives) for (const s of o.signals) signalCounts.set(s.code, (signalCounts.get(s.code) ?? 0) + 1);

  return {
    generatedAt: new Date().toISOString(),
    demoNow: now,
    period,
    source: args.source ?? { kind: 'synthetic' as const, label: period },
    summary: args.summary,
    budget: args.budget,
    epochs: args.epochs,
    thresholds: settings?.thresholds ?? null,
    portfolio: {
      byState, workLinkedPct: coverage.workLinkedPct,
      ghostPct: Math.round((ghostDays / Math.max(1, totalDays + ghostDays)) * 1000) / 10,
      totalDays: Math.round(totalDays * 10) / 10, unattributedDays: Math.round(ghostDays * 10) / 10,
      krLevelAPct: coverage.krLevelAPct,
    },
    theatreCount: {
      byState,
      dominantSignals: [...signalCounts.entries()].map(([signal, count]) => ({ signal, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    },
    coverage,
    objectives: siteObjectives,
    ghosts: ghosts.map((o) => toSiteGhost(o, (id) => (id ? titles.get(id) ?? null : null))),
  };
}
