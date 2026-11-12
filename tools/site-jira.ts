/**
 * Génère le payload du site depuis un VRAI site Jira Cloud.
 *
 * Identifiants : uniquement par variables d'environnement (JIRA_SITE,
 * JIRA_EMAIL, JIRA_API_TOKEN) — jamais dans le dépôt, jamais affichés.
 * Sortie : `site/data/jira.json` + `site/data/jira-store.json`, tous deux
 * **gitignorés** : rien n'est publié sans décision explicite.
 *
 * Même chaîne que les autres sources : import → recalcul nocturne (§8) →
 * qualification par les vrais moteurs → payload partagé (`tools/site-payload.ts`).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { importJira } from './import-jira-seed.js';
import { recordingStore } from './recording-store.js';
import { fakeStore } from '../tests/helpers/fake-store.js';
import { fakeClock } from '../tests/helpers/fake-clock.js';
import { makeAppDeps } from '../tests/helpers/fake-app-deps.js';
import { fakeGraph } from '../tests/helpers/fake-gateways.js';
import { buildSitePayload, DEMO_MISSING_RIGHTS } from './site-payload.js';
import type { AppDeps } from '../src/ports.js';
import type { ObjectiveView } from '../src/types.js';

const MAX_EPICS = Number(process.env.VIGIE_JIRA_EPICS ?? 8);
const CHILDREN = Number(process.env.VIGIE_JIRA_CHILDREN ?? 200);
const GHOSTS = Number(process.env.VIGIE_JIRA_GHOSTS ?? 150);

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

async function main(): Promise<void> {
  const { store: recording, dump } = recordingStore(fakeStore());
  process.stdout.write('import du site Jira réel …\n');
  const imported = await importJira({ store: recording, maxEpics: MAX_EPICS, childrenPerEpic: CHILDREN, ghostLimit: GHOSTS });

  const deps = makeAppDeps({
    store: imported.store,
    clock: fakeClock(imported.now),
    scope: imported.scope,
    graph: fakeGraph({ availability: { available: false, missingRights: DEMO_MISSING_RIGHTS } }),
  });
  const budget = await deps.nightly.run({ scope: imported.scope, objectiveId: null, full: true });
  const views = await qualifyAll(deps);
  const epochs = (await imported.store.listEpochs()).map((e) => ({ id: e.id, label: e.label, startsAt: e.startsAt, endsAt: e.endsAt }));

  const payload = await buildSitePayload({
    store: imported.store, views, summary: imported.summary, period: imported.period,
    now: imported.now, scope: imported.scope, missingRights: DEMO_MISSING_RIGHTS, budget, epochs,
    source: { kind: 'jira', label: imported.meta.site, fetchedAt: imported.meta.fetchedAt },
  });

  const dir = resolve(process.cwd(), 'site', 'data');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'jira.json'), `${JSON.stringify(payload, null, 1)}\n`, 'utf8');
  writeFileSync(resolve(dir, 'jira-store.json'), `${JSON.stringify({ meta: imported.meta, entities: dump() })}\n`, 'utf8');

  const states = Object.entries(payload.portfolio.byState).filter(([, n]) => n > 0).map(([s, n]) => `${s}:${n}`).join(' ');
  process.stdout.write(`site/data/jira.json écrit (GITIGNORED) : ${views.length} objectifs réels, ${payload.ghosts.length} fantômes, ${imported.summary.issues} tickets.\n`);
  process.stdout.write(`états sur données réelles Jira → ${states || 'aucun'}\n`);
  process.stdout.write(`budget : ${budget.objectives} objectifs calculés, ${budget.calls} appels, ${budget.tokens} jetons LLM.\n`);
}

await main();
