/**
 * Resolver des modules UI : chaque écran ne reçoit QUE ses données (§19).
 * Vérifie l'encart ticket (VG-15), le gadget, la page projet et les réglages.
 */
import { describe, it, expect } from 'vitest';
import { registerResolvers } from '../../src/handlers/resolver.js';
import type { ResolverLike } from '../../src/handlers/resolver.js';
import { makeAppDeps } from '../helpers/fake-app-deps.js';
import { seedDemo, DEMO_SCOPE } from '../../src/sample/seed.js';
import { fakeStore } from '../helpers/fake-store.js';
import { fakeClock } from '../helpers/fake-clock.js';
import { DEMO_NOW } from '../../src/sample/builders.js';

function fakeResolver(): ResolverLike & { get(key: string): (req: unknown) => Promise<unknown> } {
  const fns = new Map<string, (req: unknown) => Promise<unknown>>();
  return {
    define(key, fn) { fns.set(key, fn); },
    get(key) {
      const fn = fns.get(key);
      if (!fn) throw new Error(`resolver manquant : ${key}`);
      return fn;
    },
  };
}

async function setup() {
  const store = fakeStore();
  await seedDemo(store);
  const deps = makeAppDeps({ store, clock: fakeClock(DEMO_NOW), scope: DEMO_SCOPE });
  const resolver = fakeResolver();
  registerResolvers(resolver, deps);
  return resolver;
}

describe('resolver — période effective', () => {
  it('le registre affiche les objectifs de la période qui les porte, pas la période par défaut', async () => {
    const store = fakeStore();
    const deps = makeAppDeps({ store, clock: fakeClock(DEMO_NOW), scope: DEMO_SCOPE });
    // Un objectif importé depuis Jira porte la période déduite de sa date
    // (« 2026-T4 »), pas la période de démonstration (« demo-2026-T4 ») :
    // l'écran doit afficher CETTE période, sinon le registre reste vide.
    await store.saveObjective({
      id: 'obj-EPIC-1', source: 'local', sourceId: 'https://site/browse/EPIC-1', title: 'Objectif importé',
      ownerRef: null, periodId: '2026-T4', parentId: null, state: 'open',
      scope: { projectKeys: ['PAY'], components: [], teams: [] },
      createdAt: '2024-01-01T00:00:00.000Z', closedAt: null, theatreState: null,
    });
    const resolver = fakeResolver();
    registerResolvers(resolver, deps);
    const register = (await resolver.get('get-register')({ payload: { language: 'fr' } })) as { rows: { title: string }[] };
    expect(register.rows.map((r) => r.title)).toContain('Objectif importé');
  });
});

describe('resolver — encart sur le ticket (VG-15)', () => {
  it('un ticket rattaché montre l’objectif servi et sa fraction', async () => {
    const resolver = await setup();
    const links = await resolver.get('get-feature')({ payload: { language: 'en' }, context: { platform: { issue: { id: '10001' } } } });
    const value = links as { links: { objectiveTitle: string; fraction: number }[]; orphan: boolean };
    expect(value.orphan).toBe(false);
    expect(value.links.length).toBeGreaterThan(0);
    expect(value.links[0].objectiveTitle).toBeTruthy();
    expect(value.links[0].fraction).toBeGreaterThan(0);
  });

  it('un ticket fantôme est annoncé comme tel', async () => {
    const resolver = await setup();
    const orphans = (await resolver.get('get-verso')({ payload: {} })) as { issueKey: string }[];
    expect(orphans.length).toBe(12);
    // retrouve l'issueId d'un fantôme via le store pour l'encart
    const store = fakeStore();
    await seedDemo(store);
    const firstOrphan = orphans[0];
    const allLinks = await store.listOrphans({});
    const issueId = allLinks.find((o) => o.issueKey === firstOrphan.issueKey)?.issueId;
    const result = await resolver.get('get-feature')({ payload: {}, context: { platform: { issue: { id: issueId } } } });
    expect((result as { orphan: boolean }).orphan).toBe(true);
  });
});

describe('resolver — gadget, projet, réglages', () => {
  it('le gadget rend les parts par état et les signaux dominants', async () => {
    const resolver = await setup();
    const gadget = (await resolver.get('get-gadget')({ payload: { language: 'fr' } })) as { byState: Record<string, number>; dominantSignals: unknown[] };
    expect(Object.values(gadget.byState).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(Array.isArray(gadget.dominantSignals)).toBe(true);
  });

  it('la page projet rend part rattachée et fantômes du projet', async () => {
    const resolver = await setup();
    const project = (await resolver.get('get-project')({ payload: { projectKey: 'PAY' } })) as { linkedPct: number; ghostCount: number };
    expect(project.linkedPct).toBeGreaterThan(0);
    expect(project.ghostCount).toBeGreaterThan(0);
  });

  it('les réglages exposent les 13 seuils, la période et les époques', async () => {
    const resolver = await setup();
    const settings = (await resolver.get('get-settings')({ context: { cloudId: DEMO_SCOPE } })) as { settings: { thresholds: Record<string, number> }; epochs: unknown[] };
    expect(Object.keys(settings.settings.thresholds)).toHaveLength(13);
    expect(settings.epochs).toHaveLength(2);
  });

  it('le dossier expose les trois options chiffrées', async () => {
    const resolver = await setup();
    const dossier = (await resolver.get('get-dossier')({ payload: { objectiveId: 'obj-vivant' } })) as { options: { kind: string }[] };
    expect(dossier.options.map((o) => o.kind)).toEqual(['continue', 'retarget', 'abandon']);
  });
});
