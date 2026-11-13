/**
 * Génère le payload du site depuis des DONNÉES RÉELLES (dépôt public GitHub).
 *
 * Même chaîne que le trimestre synthétique : import → recalcul nocturne (§8) →
 * qualification par les vrais moteurs → payload partagé (`tools/site-payload.ts`).
 * Écrit `site/data/real.json`. Le dépôt source vient de `VIGIE_REAL_REPO`.
 *
 * VG-21 : aucun auteur n'est importé, le texte des commentaires non plus.
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { importGithub } from './import-github-seed.js';
import { recordingStore } from './recording-store.js';
import { fakeStore } from '../tests/helpers/fake-store.js';
import { fakeClock } from '../tests/helpers/fake-clock.js';
import { makeAppDeps } from '../tests/helpers/fake-app-deps.js';
import { fakeGraph } from '../tests/helpers/fake-gateways.js';
import { buildSitePayload, DEMO_MISSING_RIGHTS } from './site-payload.js';
import type { AppDeps } from '../src/ports.js';
import type { ObjectiveView } from '../src/types.js';

const REPO = process.env.VIGIE_REAL_REPO ?? 'godotengine/godot';
const MAX_MILESTONES = Number(process.env.VIGIE_REAL_MAX ?? 8);
const PAGES = Number(process.env.VIGIE_REAL_PAGES ?? 40);
const GHOST_PAGES = Number(process.env.VIGIE_REAL_GHOSTS ?? 2);

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
  process.stdout.write(`import des données réelles de ${REPO} …\n`);
  const { store: recording, dump } = recordingStore(fakeStore());
  const imported = await importGithub(REPO, { store: recording, maxMilestones: MAX_MILESTONES, pages: PAGES, commentIssues: 0, ghostPages: GHOST_PAGES });
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
    source: { kind: 'github', label: REPO, fetchedAt: imported.meta.fetchedAt },
  });

  const out = resolve(process.cwd(), 'site', 'data', 'demo.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 1)}\n`, 'utf8');

  // Les entités réelles, pour hydrater le moteur DANS LE NAVIGATEUR : le site
  // reste interactif (seuils, pointages, MCP) tout en tournant sur du réel.
  const storeOut = resolve(process.cwd(), 'site', 'data', 'real-store.json');
  const entities = dump();
  writeFileSync(storeOut, `${JSON.stringify({ meta: imported.meta, entities })}\n`, 'utf8');

  const states = Object.entries(payload.portfolio.byState).filter(([, n]) => n > 0).map(([s, n]) => `${s}:${n}`).join(' ');
  process.stdout.write(`site/data/demo.json écrit (données RÉELLES) : ${views.length} objectifs réels, ${payload.ghosts.length} fantômes, ${imported.summary.issues} tickets.\n`);
  process.stdout.write(`états obtenus sur données réelles → ${states || 'aucun'}\n`);
}

await main();
