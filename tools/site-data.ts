/**
 * Générateur de données du site public (build-time).
 *
 * Fait tourner les VRAIS moteurs sur le jeu de démonstration (§27) et écrit le
 * JSON de repli consommé par `site/` quand le moteur navigateur n'est pas
 * disponible. La mise en forme est partagée avec le bundle navigateur
 * (`tools/site-payload.ts`) : les deux rendus ne peuvent pas diverger.
 *
 * VG-21 : aucune donnée de personne n'est exportée.
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { seedDemo, DEMO_NOW, DEMO_PERIOD, DEMO_SCOPE } from '../src/sample/seed';
import { fakeStore } from '../tests/helpers/fake-store';
import { fakeClock } from '../tests/helpers/fake-clock';
import { makeAppDeps } from '../tests/helpers/fake-app-deps';
import { fakeGraph } from '../tests/helpers/fake-gateways';
import { buildSitePayload, DEMO_MISSING_RIGHTS } from './site-payload';
import type { ObjectiveView } from '../src/types';

async function qualifyAll(deps: ReturnType<typeof makeAppDeps>): Promise<ObjectiveView[]> {
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
  const store = fakeStore();
  const summary = await seedDemo(store);
  const deps = makeAppDeps({
    store,
    clock: fakeClock(DEMO_NOW),
    scope: DEMO_SCOPE,
    graph: fakeGraph({ availability: { available: false, missingRights: DEMO_MISSING_RIGHTS } }),
  });

  // Le recalcul nocturne d'abord : il RECALCULE les RC de niveau A (§8), vérifie
  // les décisions (§13) et rafraîchit la couverture — avant toute qualification.
  const budget = await deps.nightly.run({ scope: DEMO_SCOPE, objectiveId: null, full: true });
  const views = await qualifyAll(deps);
  const epochs = (await store.listEpochs()).map((e) => ({ id: e.id, label: e.label, startsAt: e.startsAt, endsAt: e.endsAt }));

  const payload = await buildSitePayload({
    store, views, summary, period: DEMO_PERIOD, now: DEMO_NOW, scope: DEMO_SCOPE,
    missingRights: DEMO_MISSING_RIGHTS, budget, epochs,
  });

  const out = resolve(process.cwd(), 'site', 'data', 'demo.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 1)}\n`, 'utf8');
  process.stdout.write(`site/data/demo.json écrit : ${views.length} objectifs, ${payload.ghosts.length} fantômes, ${summary.issues} tickets.\n`);
}

await main();
