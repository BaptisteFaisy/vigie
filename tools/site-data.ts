/**
 * Générateur de données du site public (build-time).
 *
 * Fait tourner les VRAIS moteurs sur le jeu de démonstration (§27) et écrit le
 * JSON consommé par `site/`. Le site ne contient donc aucune donnée maquettée :
 * chaque état, signal, projection, coût et fantôme affiché est le résultat du
 * calcul réel de Vigie. Lancé par `tools/build-site.mjs` (bundle esbuild).
 *
 * VG-21 : aucune donnée de personne n'est exportée (les `*_ref` restent dans le
 * store ; la projection JSON les omet volontairement).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { seedDemo, DEMO_NOW, DEMO_PERIOD, DEMO_SCOPE } from '../src/sample/seed.js';
import { fakeStore } from '../tests/helpers/fake-store.js';
import { fakeClock } from '../tests/helpers/fake-clock.js';
import { makeAppDeps } from '../tests/helpers/fake-app-deps.js';
import { computeCoverage } from '../src/domain/coverage.js';
import { sourceGap } from '../src/domain/recompute.js';
import type { ObjectiveView, Orphan, ReviewDecision } from '../src/types.js';

interface SiteObjective {
  id: string;
  title: string;
  periodId: string;
  stateCode: string | null;
  degreeCode: string;
  degreeFacts: string[];
  keyResults: { title: string; unit: string | null; direction: string; baseline: number | null; target: number | null; current: number | null; sourceLevel: string; computedBy: string | null }[];
  signals: { code: string; firedAt: string; facts: { value: number; threshold: number; at: string; detail: string }[] }[];
  projection: { pct: number | null; ciLow: number | null; ciHigh: number | null; conclusion: string; n: number; weeksUsed: number; method: string; assumptions: string[]; levers: string[] } | null;
  cost: { days: number; method: string; sharedWithCount: number; ratioPerPoint: number | null } | null;
  concordance: { workMoved: boolean; numberMoved: boolean; degree: string; windowFrom: string; windowTo: string } | null;
  series: { at: string; value: number; level: string }[];
  links: { issueKey: string; fraction: number; reason: string | null; state: string }[];
  sourceGap: { recomputed: number; copied: number; gap: number; copiedLevel: string } | null;
  decision: { decision: string; reason: string; followed: boolean | null } | null;
}

function toSiteObjective(view: ObjectiveView, decision: ReviewDecision | null): SiteObjective {
  const kr = view.keyResults[0] ?? null;
  return {
    id: view.objective.id,
    title: view.objective.title,
    periodId: view.objective.periodId,
    stateCode: view.theatreState,
    degreeCode: view.degree,
    degreeFacts: view.degreeBasis.facts,
    keyResults: view.keyResults.map((k) => ({
      title: k.title, unit: k.unit, direction: k.direction, baseline: k.baseline,
      target: k.target, current: k.current, sourceLevel: k.sourceLevel, computedBy: k.computedBy ?? null,
    })),
    signals: view.signals.map((s) => ({
      code: s.signal, firedAt: s.firedAt,
      facts: s.facts.map((f) => ({ value: f.value, threshold: f.threshold, at: f.at, detail: f.detail, detailEn: f.detailEn })),
    })),
    projection: view.projection ? {
      pct: view.projection.pct, ciLow: view.projection.ciLow, ciHigh: view.projection.ciHigh,
      conclusion: view.projection.conclusion, n: view.projection.n, weeksUsed: view.projection.weeksUsed,
      method: view.projection.method, assumptions: [...view.projection.assumptions],
      assumptionsEn: [...view.projection.assumptionsEn],
      levers: view.projection.levers.map((l) => ({ text: l.text, textEn: l.textEn })),
    } : null,
    cost: view.cost ? { days: view.cost.days, method: view.cost.method, sharedWithCount: view.cost.sharedWithCount, ratioPerPoint: view.cost.ratioPerPoint } : null,
    concordance: view.concordance ? {
      workMoved: view.concordance.workMoved, numberMoved: view.concordance.numberMoved,
      degree: view.concordance.degree, windowFrom: view.concordance.windowFrom, windowTo: view.concordance.windowTo,
    } : null,
    series: (kr ? view.series.filter((p) => p.krId === kr.id) : []).map((p) => ({ at: p.measuredAt, value: p.value, level: p.sourceLevel })),
    links: view.links.map((l) => ({ issueKey: l.issueKey, fraction: l.fraction, reason: l.reason, state: l.state })),
    sourceGap: firstSourceGap(view),
    decision: decision ? { decision: decision.decision, reason: decision.reason, followed: decision.followed } : null,
  };
}

/** Premier écart « valeur recalculée vs valeur recopiée » trouvé sur l'objectif (§8). */
function firstSourceGap(view: ObjectiveView): SiteObjective['sourceGap'] {
  for (const kr of view.keyResults) {
    if (!kr.computedBy) continue;
    const gap = sourceGap(view.series.filter((p) => p.krId === kr.id));
    if (gap) return { recomputed: gap.recomputed, copied: gap.copied, gap: gap.gap, copiedLevel: gap.copiedLevel };
  }
  return null;
}

function toSiteGhost(o: Orphan, titleOf: (id: string | null) => string | null) {
  return {
    issueKey: o.issueKey, projectKey: o.projectKey, daysSpent: o.daysSpent,
    confidence: o.confidence, suggestedObjectiveId: o.suggestedObjectiveId,
    suggestedTitle: titleOf(o.suggestedObjectiveId), reason: o.reason,
  };
}

async function main(): Promise<void> {
  const store = fakeStore();
  const summary = await seedDemo(store);
  const deps = makeAppDeps({ store, clock: fakeClock(DEMO_NOW), scope: DEMO_SCOPE });

  // Le recalcul nocturne d'abord : il RECALCULE les RC de niveau A (§8), vérifie
  // les décisions (§13) et rafraîchit la couverture — avant toute qualification.
  await deps.nightly.run({ scope: DEMO_SCOPE, objectiveId: null, full: true });

  const objectives = await store.listObjectives({});
  const views: ObjectiveView[] = [];
  for (const objective of objectives) {
    const view = await deps.theatre.qualify(objective.id);
    if (view) views.push(view);
  }

  const brief = await deps.portfolioEngine.brief(DEMO_PERIOD);
  const theatre = await deps.portfolioEngine.theatreCount(DEMO_PERIOD);
  const ghosts = await store.listOrphans({});
  const titles = new Map(views.map((v) => [v.objective.id, v.objective.title] as const));
  const linkedIssues = new Set((await store.listActiveLinksByPeriod(DEMO_PERIOD)).map((l) => l.issueId));

  const coverage = computeCoverage({
    scope: DEMO_SCOPE, sourceActive: 'local',
    graphAvailability: { available: false, missingRights: ['read:graph:work-item', 'read:graph:project'] },
    totalIssues: summary.issues, linkedIssues: linkedIssues.size,
    totalKrs: views.reduce((n, v) => n + v.keyResults.length, 0),
    levelAKrs: views.reduce((n, v) => n + v.keyResults.filter((k) => k.sourceLevel === 'A').length, 0),
    now: DEMO_NOW,
  });

  const siteObjectives: SiteObjective[] = [];
  for (const view of views) {
    const decision = await store.latestDecisionForObjective(view.objective.id);
    siteObjectives.push(toSiteObjective(view, decision));
  }
  siteObjectives.sort((a, b) => a.title.localeCompare(b.title));

  const payload = {
    generatedAt: new Date().toISOString(),
    demoNow: DEMO_NOW,
    period: DEMO_PERIOD,
    summary,
    portfolio: {
      byState: brief.byState, workLinkedPct: brief.workLinkedPct, ghostPct: brief.ghostPct,
      totalDays: brief.totalDays, unattributedDays: brief.unattributedDays, krLevelAPct: brief.krLevelAPct,
    },
    theatreCount: { byState: theatre.byState, dominantSignals: theatre.dominantSignals },
    coverage,
    objectives: siteObjectives,
    ghosts: ghosts.map((o) => toSiteGhost(o, (id) => (id ? titles.get(id) ?? null : null))),
  };

  const out = resolve(process.cwd(), 'site', 'data', 'demo.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 1)}\n`, 'utf8');
  process.stdout.write(`site/data/demo.json écrit : ${views.length} objectifs, ${ghosts.length} fantômes, ${summary.issues} tickets.\n`);
}

await main();