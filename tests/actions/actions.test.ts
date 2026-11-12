/**
 * Comportement des outils MCP (SPEC §18, §9, §12) — recette §25 items 10, 11.
 */
import { describe, it, expect } from 'vitest';
import { runAction } from '../../src/actions/registry';
import { makeAppDeps, TEST_SCOPE } from '../helpers/fake-app-deps';
import { makeObjective, makeKeyResult, makePoint, makeLink, makeMovement } from '../helpers/factories';
import { DEFAULT_PERIOD } from '../../src/defaults';
import { isoWeek } from '../../src/domain/movement';
import type { ActionDeps } from '../../src/ports';

const NOW = '2026-11-11T12:00:00.000Z';
const weeksAgo = (n: number) => new Date(new Date(NOW).getTime() - n * 7 * 86_400_000).toISOString();

function ctx(deps = makeAppDeps()): ActionDeps {
  return { deps, actor: { ref: 'actor_1', isAgent: true }, scope: TEST_SCOPE };
}

async function seedBasic(c: ActionDeps) {
  const store = c.deps.store;
  await store.saveObjective(makeObjective({ id: 'obj_1', periodId: DEFAULT_PERIOD.id }));
  await store.saveKeyResult(makeKeyResult({ id: 'kr_1', objectiveId: 'obj_1', baseline: 900, target: 400, direction: 'down', sourceLevel: 'A' }));
  for (let i = 0; i < 6; i += 1) await store.savePoint(makePoint({ id: `pt_${i}`, krId: 'kr_1', value: 900 - i * 80, measuredAt: weeksAgo(5 - i), sourceLevel: 'A' }));
}

describe('link-work (§9)', () => {
  it('fraction par défaut 1/n quand un ticket sert plusieurs objectifs', async () => {
    const c = ctx();
    for (const id of ['obj_a', 'obj_b', 'obj_c']) await c.deps.store.saveObjective(makeObjective({ id, periodId: DEFAULT_PERIOD.id }));
    for (const id of ['obj_a', 'obj_b', 'obj_c']) {
      await runAction('link-work', { objectiveId: id, issueKeys: 'PAY-7', reason: 'sert cet objectif' }, c);
    }
    const links = await c.deps.store.listLinksByIssue('PAY-7');
    const fractions = links.map((l) => Math.round(l.fraction * 1000) / 1000).sort();
    expect(fractions).toEqual([0.333, 0.5, 1]);
  });

  it('sans raison, le lien est marqué « non motivé »', async () => {
    const c = ctx();
    await c.deps.store.saveObjective(makeObjective({ id: 'obj_1', periodId: DEFAULT_PERIOD.id }));
    await runAction('link-work', { objectiveId: 'obj_1', issueKeys: 'PAY-1', reason: '   ' }, c);
    const links = await c.deps.store.listLinksByObjective('obj_1');
    expect(links[0].state).toBe('unmotivated');
  });
});

describe('record-checkin — pointage inversé (§12)', () => {
  it('item 10/11 — faits pré-remplis, et « en bonne voie » sur travail gelé signale l’écart sans censurer', async () => {
    const c = ctx();
    await seedBasic(c);
    // travail gelé : dernier mouvement il y a 40 jours (> seuil S2 de 21 j)
    await c.deps.store.saveLink(makeLink({ id: 'lnk_1', objectiveId: 'obj_1', issueId: '10001', issueKey: 'PAY-1' }));
    await c.deps.store.saveMovement(makeMovement({ issueId: '10001', issueKey: 'PAY-1', week: isoWeek(weeksAgo(6)), transitions: 1, commits: 0 }));
    const result = await runAction('record-checkin', { objectiveId: 'obj_1', interpretation: 'En bonne voie' }, c);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const value = result.value as { facts: { activeSignals: string[] }; interpretation: string; contradictsFacts: boolean };
    expect(value.facts.activeSignals).toContain('S2'); // fait pré-rempli AVANT l'interprétation
    expect(value.interpretation).toBe('En bonne voie'); // l'interprétation n'est PAS censurée
    expect(value.contradictsFacts).toBe(true);          // l'écart est rendu visible
  });
});

describe('count-theatre / get-objective (§18)', () => {
  it('count-theatre rend les sept états et get-objective un état + un degré', async () => {
    const c = ctx();
    await seedBasic(c);
    await c.deps.store.saveLink(makeLink({ id: 'lnk_1', objectiveId: 'obj_1', issueId: '10001', issueKey: 'PAY-1' }));
    await c.deps.store.saveMovement(makeMovement({ issueId: '10001', issueKey: 'PAY-1', week: isoWeek(weeksAgo(1)), transitions: 2, commits: 3, daysSpent: 3 }));
    const count = await runAction('count-theatre', { period: DEFAULT_PERIOD.id }, c);
    expect(count.ok).toBe(true);
    if (count.ok) expect(Object.keys((count.value as { byState: object }).byState)).toHaveLength(7);
    const obj = await runAction('get-objective', { objectiveId: 'obj_1' }, c);
    expect(obj.ok).toBe(true);
    if (obj.ok) {
      const value = obj.value as { degree: string; objective: { theatreState: string | null } };
      expect(value.degree).toBeDefined();
      expect(value.objective.theatreState === null || typeof value.objective.theatreState === 'string').toBe(true);
    }
  });
});
