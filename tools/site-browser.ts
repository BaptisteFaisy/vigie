/**
 * Point d'entrée NAVIGATEUR du site public.
 *
 * Les vrais moteurs de Vigie (domaine pur + engines + les 15 actions MCP) tournent
 * DANS LE NAVIGATEUR : le site n'affiche aucune donnée maquettée et chaque
 * fonctionnalité est réellement exécutable — changer un seuil recalcule les
 * signaux, un pointage s'enregistre vraiment, un outil MCP répond vraiment.
 *
 * Rien ici n'importe `@forge/*` ni `node:*` (le domaine est pur par construction).
 * Bundlé en IIFE par `tools/build-site.mjs` → `site/vigie-engine.js` (`window.Vigie`).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { seedDemo, DEMO_NOW, DEMO_PERIOD, DEMO_SCOPE } from '../src/sample/seed';
import { fakeStore } from '../tests/helpers/fake-store';
import { fakeClock } from '../tests/helpers/fake-clock';
import { makeAppDeps } from '../tests/helpers/fake-app-deps';
import { fakeGraph } from '../tests/helpers/fake-gateways';
import { runAction, ACTION_KEYS } from '../src/actions/registry';
import { buildDossier } from '../src/domain/dossier';
import { buildPostmortem } from '../src/domain/postmortem';
import { sourceGap } from '../src/domain/recompute';
import { effectiveLevel } from '../src/domain/source-level';
import { DEFAULT_THRESHOLDS } from '../src/defaults';
import { buildSitePayload, DEMO_MISSING_RIGHTS } from './site-payload';
import { hydrateStore } from './recording-store';
import type { ActionKey, ObjectiveView, SignalId } from '../src/types';
import type { AppDeps } from '../src/ports';

interface Booted {
  deps: AppDeps;
  views: ObjectiveView[];
  summary: { objectives: number; issues: number; ghosts: number; epochs: number };
  budget: { objectives: number; calls: number; tokens: number };
  /** true quand le moteur tourne sur des données réelles importées. */
  real: boolean;
  now: string;
  sourceLabel: string | null;
  sourceKind: 'github' | 'jira';
  scope: string;
}

let booted: Booted | null = null;

async function qualifyAll(deps: AppDeps): Promise<ObjectiveView[]> {
  const objectives = await deps.store.listObjectives({});
  const views: ObjectiveView[] = [];
  for (const objective of objectives) {
    const view = await deps.theatre.qualify(objective.id);
    if (view) views.push(view);
  }
  views.sort((a, b) => a.objective.title.localeCompare(b.objective.title));
  return views;
}

/** Données réelles importées si présentes, sinon le trimestre synthétique (§27). */
interface Loaded { store: ReturnType<typeof fakeStore>; summary: Booted['summary']; now: string; real: boolean; sourceLabel: string | null; sourceKind: 'github' | 'jira'; scope: string }

async function loadStore(): Promise<Loaded> {
  const store = fakeStore();
  try {
    const res = await fetch('data/real-store.json', { cache: 'no-store' });
    if (res.ok) {
      const file = await res.json();
      const dump = file.entities ?? file;
      await hydrateStore(store, dump);
      const settings = (dump.settings ?? [])[0];
      const now = settings?.periodEnd ?? new Date().toISOString();
      const scope = settings?.scope ?? DEMO_SCOPE;
      const issues = new Set((dump.links ?? []).map((l: { issueId: string }) => l.issueId));
      return {
        store, now, real: true, scope,
        sourceLabel: file.meta?.repo ?? file.meta?.site ?? null,
        sourceKind: file.meta?.kind === 'jira' ? 'jira' : 'github',
        summary: {
          objectives: (dump.objectives ?? []).length,
          issues: issues.size + (dump.orphans ?? []).length,
          ghosts: (dump.orphans ?? []).length,
          epochs: (dump.epochs ?? []).length,
        },
      };
    }
  } catch {
    /* pas de données réelles : repli sur la démo synthétique */
  }
  const summary = await seedDemo(store);
  return { store, summary, now: DEMO_NOW, real: false, sourceLabel: null, sourceKind: 'github', scope: DEMO_SCOPE };
}

/** Charge les données, lance le recalcul nocturne, qualifie tout. Une seule fois. */
export async function boot(): Promise<Booted> {
  if (booted) return booted;
  const loaded = await loadStore();
  const deps = makeAppDeps({
    store: loaded.store,
    clock: fakeClock(loaded.now),
    scope: loaded.scope,
    graph: fakeGraph({ availability: { available: false, missingRights: DEMO_MISSING_RIGHTS } }),
  });
  const budget = await deps.nightly.run({ scope: loaded.scope, objectiveId: null, full: true });
  booted = { deps, views: await qualifyAll(deps), summary: loaded.summary, budget, real: loaded.real, now: loaded.now, sourceLabel: loaded.sourceLabel, sourceKind: loaded.sourceKind, scope: loaded.scope };
  return booted;
}

/** L'état complet du site, au même format que `site/data/demo.json`. */
export async function snapshot() {
  const state = await boot();
  const epochs = (await state.deps.store.listEpochs()).map((e) => ({ id: e.id, label: e.label, startsAt: e.startsAt, endsAt: e.endsAt }));
  const period = state.views[0]?.objective.periodId ?? DEMO_PERIOD;
  return buildSitePayload({
    store: state.deps.store, views: state.views, summary: state.summary, period,
    now: state.now, scope: state.scope, missingRights: DEMO_MISSING_RIGHTS, budget: state.budget, epochs,
    source: state.real
      ? { kind: state.sourceKind, label: state.sourceLabel ?? (state.sourceKind === 'jira' ? 'site Jira' : 'dépôt public'), fetchedAt: state.now }
      : { kind: 'synthetic', label: period },
  });
}

export async function views(): Promise<ObjectiveView[]> {
  return (await boot()).views;
}

/** Recalcule tout (après un changement de seuil, un rattachement, un pointage). */
export async function requalifyAll(): Promise<ObjectiveView[]> {
  const state = await boot();
  state.views = await qualifyAll(state.deps);
  return state.views;
}

/** Un outil MCP réellement exécuté (les 15 du §18). */
export async function callTool(key: string, input: Record<string, unknown> = {}) {
  const state = await boot();
  return runAction(key as ActionKey, input, {
    deps: state.deps, actor: { ref: 'visiteur-site', isAgent: true }, scope: state.scope,
  });
}

/** Change un seuil de signal et recalcule tout (§7 : seuils réglables). */
export async function setThreshold(signal: SignalId, value: number) {
  const state = await boot();
  const current = await state.deps.store.getSettings(DEMO_SCOPE);
  const settings = current ?? { thresholds: DEFAULT_THRESHOLDS } as never;
  await state.deps.store.saveSettings({ ...settings, thresholds: { ...settings.thresholds, [signal]: value } });
  return requalifyAll();
}

export async function dossier(objectiveId: string) {
  const view = (await views()).find((v) => v.objective.id === objectiveId) ?? null;
  if (!view) return null;
  const state = await boot();
  const decision = await state.deps.store.latestDecisionForObjective(objectiveId);
  return buildDossier({
    objective: view.objective, keyResults: view.keyResults, degree: view.degree, theatreState: view.theatreState,
    signals: view.signals, series: view.series, projection: view.projection, cost: view.cost,
    movement: view.movement, otherChanges: view.concordance?.otherChanges ?? [], links: view.links, decision,
  });
}

export async function postmortem(objectiveId: string) {
  const view = (await views()).find((v) => v.objective.id === objectiveId) ?? null;
  if (!view) return null;
  const state = await boot();
  const kr = view.keyResults[0] ?? null;
  const latest = kr ? view.series.filter((p) => p.krId === kr.id).slice(-1)[0] ?? null : null;
  const decision = await state.deps.store.latestDecisionForObjective(objectiveId);
  return buildPostmortem({
    objective: view.objective, baseline: kr?.baseline ?? null, finalValue: latest?.value ?? kr?.current ?? null,
    finalLevel: kr ? effectiveLevel(kr, latest) : 'none', direction: kr?.direction ?? 'up', links: view.links,
    landedIssueKeys: view.movement.filter((m) => m.closed).map((m) => m.issueKey), cost: view.cost,
    signalsFired: view.signals.map((s) => s.signal), decision, now: DEMO_NOW,
  });
}

/** Écarts « valeur recalculée vs valeur recopiée » (§8, recette item 5). */
export async function gaps() {
  const out: { objectiveId: string; krTitle: string; gap: ReturnType<typeof sourceGap> }[] = [];
  for (const view of await views()) {
    for (const kr of view.keyResults) {
      if (!kr.computedBy) continue;
      const gap = sourceGap(view.series.filter((p) => p.krId === kr.id));
      if (gap) out.push({ objectiveId: view.objective.id, krTitle: kr.title, gap });
    }
  }
  return out;
}

/** Tous les tickets de la démo (rattachés + fantômes) pour l'encart ticket (§19). */
export async function issues() {
  const state = await boot();
  const links = state.views.flatMap((v) => v.links.filter((l) => l.state !== 'detached'));
  const ghosts = await state.deps.store.listOrphans({});
  const byIssue = new Map<string, { issueId: string; issueKey: string; objectives: { id: string; title: string; fraction: number }[] }>();
  for (const link of links) {
    const entry = byIssue.get(link.issueId) ?? { issueId: link.issueId, issueKey: link.issueKey, objectives: [] };
    const objective = await state.deps.store.getObjective(link.objectiveId);
    entry.objectives.push({ id: link.objectiveId, title: objective?.title ?? link.objectiveId, fraction: link.fraction });
    byIssue.set(link.issueId, entry);
  }
  const attached = [...byIssue.values()].map((v) => ({ ...v, ghost: false, daysSpent: 0 }));
  const ghostRows = ghosts.map((g) => ({ issueId: g.issueId, issueKey: g.issueKey, objectives: [], ghost: true, daysSpent: g.daysSpent }));
  return [...attached, ...ghostRows].sort((a, b) => a.issueKey.localeCompare(b.issueKey));
}

export { ACTION_KEYS, DEMO_NOW, DEMO_PERIOD, DEMO_SCOPE };
