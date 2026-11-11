/**
 * Construction du trimestre de démonstration (SPEC §27). Voir `builders.ts`
 * pour les helpers. Chaque objectif est outillé pour que le moteur le qualifie
 * vers l'état annoncé — la recette (§25) le vérifie.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { VigieStore } from '../ports.js';
import type { Orphan } from '../types.js';
import { defaultSettings } from '../defaults.js';
import { isoWeek } from '../domain/movement.js';
import {
  DEMO_NOW, DEMO_PERIOD_PREV, DEMO_SCOPE, EP1, EP2,
  addObjective, addKr, addSeries, addWork, addCheckins, date,
} from './builders.js';
import type { DemoSummary, SeedCtx as Ctx } from './builders.js';

// Ré-export des repères de la démo : les tests et l'UI les lisent depuis seed.js.
export { DEMO_NOW, DEMO_PERIOD, DEMO_PERIOD_PREV, DEMO_SCOPE } from './builders.js';

async function seedEpochsAndSettings(ctx: Ctx): Promise<void> {
  await ctx.store.saveEpoch({ id: EP1, startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2026-11-01T00:00:00.000Z', label: 'Avant réorganisation', scopeChange: null });
  await ctx.store.saveEpoch({ id: EP2, startsAt: '2026-11-01T00:00:00.000Z', endsAt: null, label: 'Après réorganisation (équipes fusionnées)', scopeChange: 'Fusion des équipes PAY et OPS' });
  await ctx.store.saveSettings(defaultSettings(DEMO_SCOPE, { periodStart: '2026-10-01T00:00:00.000Z', periodEnd: '2026-12-31T23:59:59.000Z', currentEpochId: EP2, language: 'fr' }));
}

/** 1 — vivant : série A qui bouge + travail qui bouge + pointage récent. */
async function seedVivant(ctx: Ctx): Promise<void> {
  await addObjective(ctx, { id: 'obj-vivant', title: 'Réduire la latence de paiement' });
  await addKr(ctx, { id: 'kr-vivant', objectiveId: 'obj-vivant', title: 'Latence p95 (ms)', baseline: 900, target: 400, direction: 'down', sourceLevel: 'A', unit: 'ms' });
  await addSeries(ctx, 'kr-vivant', [900, 840, 780, 700, 620, 540, 500], [6, 5, 4, 3, 2, 1, 0], 'A', EP2);
  await addWork(ctx, 'obj-vivant', 'PAY', 8, { moving: true, fraction: 1 / 8 });
  await addCheckins(ctx, 'obj-vivant', [1]);
}

/** 2 — concordant (vitrine du 4e degré) : vivant + travail qui précède le nombre. */
async function seedConcordant(ctx: Ctx): Promise<void> {
  await addObjective(ctx, { id: 'obj-concordant', title: 'Baisser les incidents de paiement' });
  await addKr(ctx, { id: 'kr-concordant', objectiveId: 'obj-concordant', title: 'Incidents/semaine', baseline: 40, target: 10, direction: 'down', sourceLevel: 'A' });
  await addSeries(ctx, 'kr-concordant', [40, 36, 33, 28, 24, 20, 17], [6, 5, 4, 3, 2, 1, 0], 'A', EP2);
  await addWork(ctx, 'obj-concordant', 'PAY', 8, { moving: true, fraction: 1 / 8, commits: 4 });
  await addCheckins(ctx, 'obj-concordant', [1]);
}

/** 3 — narratif : pointages fréquents + travail gelé + nombre niveau C. */
async function seedNarratif(ctx: Ctx): Promise<void> {
  await addObjective(ctx, { id: 'obj-narratif', title: 'Améliorer la satisfaction client' });
  await addKr(ctx, { id: 'kr-narratif', objectiveId: 'obj-narratif', title: 'CSAT', baseline: 70, target: 90, direction: 'up', sourceLevel: 'C' });
  await addSeries(ctx, 'kr-narratif', [70, 70], [10, 9], 'C', EP1);
  await addWork(ctx, 'obj-narratif', 'PAY', 6, { moving: false });
  await addCheckins(ctx, 'obj-narratif', [1, 2, 3]);
}

/** 4 — travaillé-muet : le travail bouge, la série reste plate (S4). */
async function seedTravailleMuet(ctx: Ctx): Promise<void> {
  await addObjective(ctx, { id: 'obj-muet', title: 'Moderniser le socle technique' });
  await addKr(ctx, { id: 'kr-muet', objectiveId: 'obj-muet', title: 'Couverture de tests (%)', baseline: 60, target: 85, direction: 'up', sourceLevel: 'A' });
  await addSeries(ctx, 'kr-muet', [60, 60, 60, 60, 60, 60], [5, 4, 3, 2, 1, 0], 'A', EP2);
  await addWork(ctx, 'obj-muet', 'PAY', 6, { moving: true });
}

/** 5 — décoratif : rattachement en masse (S1) + hors périmètre (S7), sans commit. */
async function seedDecoratif(ctx: Ctx): Promise<void> {
  await addObjective(ctx, { id: 'obj-decoratif', title: 'Devenir une plateforme de référence' });
  await addKr(ctx, { id: 'kr-decoratif', objectiveId: 'obj-decoratif', title: 'Partenaires intégrés', baseline: 0, target: 20, direction: 'up', sourceLevel: 'B' });
  await addSeries(ctx, 'kr-decoratif', [0, 1], [8, 4], 'B', EP2);
  await addWork(ctx, 'obj-decoratif', 'OTHER', 8, { moving: false, sameDayActor: 'demo_actor_mass', fraction: 1 });
}

/** 6 — orphelin : aucun travail rattaché (S0). */
async function seedOrphelin(ctx: Ctx): Promise<void> {
  await addObjective(ctx, { id: 'obj-orphelin', title: 'Préparer l’expansion internationale' });
  await addKr(ctx, { id: 'kr-orphelin', objectiveId: 'obj-orphelin', title: 'Pays ouverts', baseline: 0, target: 3, direction: 'up', sourceLevel: 'C' });
}

/** 7 — sous-calibré : cible atteinte avant 50 % de la période (S8). */
async function seedSousCalibre(ctx: Ctx): Promise<void> {
  await addObjective(ctx, { id: 'obj-souscalibre', title: 'Stabiliser la release 2.3' });
  await addKr(ctx, { id: 'kr-souscalibre', objectiveId: 'obj-souscalibre', title: 'Crashs/jour', baseline: 50, target: 40, direction: 'down', sourceLevel: 'A' });
  await addSeries(ctx, 'kr-souscalibre', [50, 40, 38, 37], [9, 8, 4, 1], 'A', EP1);
  await addWork(ctx, 'obj-souscalibre', 'PAY', 6, { moving: true });
}

/** 8 — mort-vivant : période T3 close depuis > 30 j, objectif jamais refermé (S11). */
async function seedMortVivant(ctx: Ctx): Promise<void> {
  await addObjective(ctx, { id: 'obj-mortvivant', title: 'Migrer l’ancien moteur de règles', periodId: DEMO_PERIOD_PREV, state: 'open' });
  await addKr(ctx, { id: 'kr-mortvivant', objectiveId: 'obj-mortvivant', title: 'Règles migrées (%)', baseline: 0, target: 100, direction: 'up', sourceLevel: 'A' });
  await addSeries(ctx, 'kr-mortvivant', [0, 20], [22, 18], 'A', EP1);
  await addWork(ctx, 'obj-mortvivant', 'PAY', 6, { moving: false });
}

/** 12 fantômes : tickets qui bougent sans servir aucun objectif déclaré. */
async function seedGhosts(ctx: Ctx): Promise<number> {
  const projects = ['PAY', 'OPS'];
  for (let i = 0; i < 12; i += 1) {
    ctx.issueSeq.n += 1;
    const issueId = `1${String(ctx.issueSeq.n).padStart(4, '0')}`;
    const issueKey = `${projects[i % 2]}-${ctx.issueSeq.n}`;
    const at = date(1);
    await ctx.store.saveMovement({ issueId, issueKey, week: isoWeek(at), epochId: EP2, transitions: 3, commits: 2, closed: false, cycleDays: null, daysSpent: 2 + (i % 4), daysSource: 'logged' });
    const suggested = i < 5 ? 'obj-vivant' : null;
    const orphan: Orphan = {
      issueId, issueKey, projectKey: projects[i % 2], detectedAt: DEMO_NOW,
      suggestedObjectiveId: suggested, confidence: suggested ? 0.7 : 0.2,
      reason: suggested ? 'Même composant payments que « Réduire la latence de paiement ».' : 'Aucun objectif plausible — pas assez de recul.',
      daysSpent: 2 + (i % 4), resolvedAt: null,
    };
    await ctx.store.saveOrphan(orphan);
  }
  return 12;
}

/** People un `VigieStore` avec le trimestre de démonstration. */
export async function seedDemo(store: VigieStore): Promise<DemoSummary> {
  const ctx: Ctx = { store, issueSeq: { n: 0 } };
  await seedEpochsAndSettings(ctx);
  await seedVivant(ctx);
  await seedConcordant(ctx);
  await seedNarratif(ctx);
  await seedTravailleMuet(ctx);
  await seedDecoratif(ctx);
  await seedOrphelin(ctx);
  await seedSousCalibre(ctx);
  await seedMortVivant(ctx);
  const ghosts = await seedGhosts(ctx);
  return { objectives: 8, issues: ctx.issueSeq.n, ghosts, epochs: 2 };
}
