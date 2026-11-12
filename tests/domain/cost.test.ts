/**
 * Coût de l'intention (SPEC §11) — recette §25 item 8 (partage, non-double-comptage).
 */
import { describe, it, expect } from 'vitest';
import { computeCost, portfolioTotal, portfolioUnattributed } from '../../src/domain/cost';
import { makeLink, makeMovement } from '../helpers/factories';

const NOW = '2026-11-11T12:00:00.000Z';

function costFor(objectiveId: string, fraction: number, daysSpent: number) {
  const movements = [makeMovement({ issueId: '10001', issueKey: 'PAY-1', week: '2026-S45', daysSpent, daysSource: 'logged' })];
  const links = [makeLink({ objectiveId, issueId: '10001', issueKey: 'PAY-1', fraction })];
  return computeCost({ objectiveId, periodId: 'demo-2026-T4', movements, links, pointsGained: null, now: NOW });
}

describe('coût de l’intention (§11)', () => {
  it('item 8 — un ticket sur 3 objectifs compte pour un tiers dans chacun', () => {
    const a = costFor('obj_a', 1 / 3, 9);
    const b = costFor('obj_b', 1 / 3, 9);
    const c = costFor('obj_c', 1 / 3, 9);
    expect(a.days).toBeCloseTo(3, 5);
    expect(b.days).toBeCloseTo(3, 5);
    expect(c.days).toBeCloseTo(3, 5);
  });

  it('item 8 — le total du portefeuille ne double jamais', () => {
    const costs = [costFor('obj_a', 1 / 3, 9), costFor('obj_b', 1 / 3, 9), costFor('obj_c', 1 / 3, 9)];
    expect(portfolioTotal(costs)).toBeCloseTo(9, 5);
  });

  it('la méthode retenue est affichée (temps saisi ici)', () => {
    const cost = costFor('obj_a', 1, 9);
    expect(cost.method).toBe('logged');
  });

  it('ratio jours/point gagné, avec fourchette quand une plage est fournie', () => {
    const movements = [makeMovement({ issueId: '1', issueKey: 'PAY-1', week: '2026-S45', daysSpent: 10, daysSource: 'logged' })];
    const links = [makeLink({ issueId: '1', issueKey: 'PAY-1', fraction: 1 })];
    const cost = computeCost({ objectiveId: 'o', periodId: 'p', movements, links, pointsGained: 4, pointsRange: { low: 2, high: 8 }, now: NOW });
    expect(cost.ratioPerPoint).toBeCloseTo(2.5, 5);
    expect(cost.ratioCiLow).toBeCloseTo(10 / 8, 5);
    expect(cost.ratioCiHigh).toBeCloseTo(10 / 2, 5);
  });

  it('part non attribuée du portefeuille, jamais négative', () => {
    expect(portfolioUnattributed(100, 82)).toBeCloseTo(18, 5);
    expect(portfolioUnattributed(50, 80)).toBe(0);
  });
});
