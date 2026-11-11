/**
 * Recette d'acceptation (SPEC §25) — intégration de bout en bout.
 *
 * Sème le trimestre de démonstration (§27) dans un store en mémoire, branche les
 * VRAIS moteurs, et vérifie que chaque objectif est qualifié vers l'état annoncé,
 * que le verso compte les fantômes, et que les projections/états respectent les
 * règles d'honnêteté. Les items purement locaux (4, 6, 8, 12, 15, 16) sont
 * couverts par les tests domaine/actions ; ce fichier couvre le bout-en-bout.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { seedDemo, DEMO_NOW, DEMO_PERIOD, DEMO_SCOPE } from '../../src/sample/seed.js';
import { fakeStore } from '../helpers/fake-store.js';
import { fakeClock } from '../helpers/fake-clock.js';
import { makeAppDeps } from '../helpers/fake-app-deps.js';
import { runAction } from '../../src/actions/registry.js';
import type { AppDeps, ActionDeps } from '../../src/ports.js';
import type { ObjectiveView, TheatreState } from '../../src/types.js';

let deps: AppDeps;
let ctx: ActionDeps;
const views = new Map<string, ObjectiveView>();

async function qualify(id: string): Promise<ObjectiveView | null> {
  return deps.theatre.qualify(id);
}

beforeAll(async () => {
  const store = fakeStore();
  await seedDemo(store);
  deps = makeAppDeps({ store, clock: fakeClock(DEMO_NOW), scope: DEMO_SCOPE });
  ctx = { deps, actor: { ref: 'demo_agent', isAgent: true }, scope: DEMO_SCOPE };
  for (const id of ['obj-vivant', 'obj-concordant', 'obj-narratif', 'obj-muet', 'obj-decoratif', 'obj-orphelin', 'obj-souscalibre', 'obj-mortvivant']) {
    const view = await qualify(id);
    if (view) views.set(id, view);
  }
});

describe('recette §25 — les huit objectifs de la démo (§27)', () => {
  it('item 1 — série A qui bouge + travail qui bouge → vivant', () => {
    expect(views.get('obj-vivant')?.theatreState).toBe('vivant');
    const basis = views.get('obj-vivant')?.degreeBasis;
    expect(basis?.facts.join(' ')).toMatch(/travail/i); // les faits sont affichés
  });

  it('item 2 — pointé 3× pendant gel → narratif, avec S2 et S5', () => {
    const view = views.get('obj-narratif');
    expect(view?.theatreState).toBe('narratif');
    const signals = view?.signals.map((s) => s.signal) ?? [];
    expect(signals).toContain('S2');
    expect(signals).toContain('S5');
  });

  it('item 3 — 5+ tickets liés le même jour par le même acteur → S1 (fait visible)', () => {
    const view = views.get('obj-decoratif');
    expect(view?.theatreState).toBe('decoratif');
    const s1 = view?.signals.find((s) => s.signal === 'S1');
    expect(s1).toBeDefined();
    expect(s1?.facts[0].value).toBeGreaterThanOrEqual(5);
    expect(s1?.facts[0].detail).not.toContain('demo_actor_mass'); // VG-21
  });

  it('item 7 — projection sur ≥ 4 semaines → pourcentage, fourchette, effectif', () => {
    const projection = views.get('obj-vivant')?.projection;
    expect(projection).not.toBeNull();
    expect(projection?.conclusion).not.toBe('pas-assez-de-recul');
    expect(projection?.pct).not.toBeNull();
    expect(projection?.ciLow).not.toBeNull();
    expect(projection?.ciHigh).not.toBeNull();
    expect(projection?.n).toBeGreaterThan(0);
  });

  it('item 14 — période close depuis > 30 j, jamais refermé → mort-vivant + S11', () => {
    const view = views.get('obj-mortvivant');
    expect(view?.theatreState).toBe('mort-vivant');
    expect(view?.signals.map((s) => s.signal)).toContain('S11');
  });

  it('les sept états sont représentés dans la démo', () => {
    const states = new Set<TheatreState>();
    for (const view of views.values()) if (view.theatreState) states.add(view.theatreState);
    for (const expected of ['vivant', 'narratif', 'travaille-muet', 'decoratif', 'orphelin', 'sous-calibre', 'mort-vivant'] as TheatreState[]) {
      expect(states.has(expected), `état manquant : ${expected}`).toBe(true);
    }
  });

  it('sous-calibré : cible atteinte tôt → S8', () => {
    expect(views.get('obj-souscalibre')?.theatreState).toBe('sous-calibre');
    expect(views.get('obj-souscalibre')?.signals.map((s) => s.signal)).toContain('S8');
  });

  it('orphelin : aucun rattachement → S0', () => {
    expect(views.get('obj-orphelin')?.theatreState).toBe('orphelin');
    expect(views.get('obj-orphelin')?.signals.map((s) => s.signal)).toContain('S0');
  });

  it('travaillé-muet : le travail bouge, la série reste plate → S4', () => {
    expect(views.get('obj-muet')?.theatreState).toBe('travaille-muet');
    expect(views.get('obj-muet')?.signals.map((s) => s.signal)).toContain('S4');
  });
});

describe('recette §25 — verso, portefeuille, concordance', () => {
  it('item 9 — 12 fantômes au verso, avec objectif plausible et confiance', async () => {
    const result = await runAction('list-goal-orphans', {}, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const value = result.value as { orphans: { suggestedObjectiveId: string | null; confidence: number }[]; count: number };
    expect(value.count).toBe(12);
    expect(value.orphans.some((o) => o.suggestedObjectiveId !== null && o.confidence >= 0.4)).toBe(true);
    expect(value.orphans.some((o) => o.suggestedObjectiveId === null)).toBe(true); // pas assez de recul
  });

  it('le portefeuille compte les objectifs par état (compteur de théâtre)', async () => {
    const result = await runAction('count-theatre', { period: DEMO_PERIOD }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const value = result.value as { byState: Record<string, number> };
    const total = Object.values(value.byState).reduce((a, b) => a + b, 0);
    expect(total).toBe(7); // les 7 objectifs du trimestre T4 (le mort-vivant est en T3)
  });

  it('item 11 (degré 4) — l’objectif concordant atteint le degré « concordant »', () => {
    expect(views.get('obj-concordant')?.degree).toBe('concordant');
  });

  it('item 15 — deux époques, la réorganisation coupe les séries', async () => {
    const epochs = await deps.store.listEpochs();
    expect(epochs).toHaveLength(2);
    const vivant = views.get('obj-vivant');
    // la projection n'utilise que l'époque courante (ep-2)
    expect(vivant?.projection?.epochId === 'ep-2' || vivant?.projection?.epochId === null).toBe(true);
  });
});
