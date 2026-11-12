/**
 * Projection honnête (SPEC §10) — recette §25 items 6 et 7.
 */
import { describe, it, expect } from 'vitest';
import { computeProjection } from '../../src/domain/projection';
import { makePoint } from '../helpers/factories';

const NOW = '2026-11-11T12:00:00.000Z';
const PERIOD_END = '2026-12-31T23:59:59.000Z';

function weeklySeries(weeks: number, from: number, step: number) {
  return Array.from({ length: weeks }, (_, i) =>
    makePoint({ id: `p${i}`, value: from + i * step, measuredAt: new Date(new Date(NOW).getTime() - (weeks - 1 - i) * 7 * 86_400_000).toISOString() }));
}

describe('projection (§10)', () => {
  it('item 6 — 3 semaines de données → « pas assez de recul », sans pourcentage', () => {
    const p = computeProjection({
      krId: 'kr_1', series: weeklySeries(3, 900, -50), target: 400, baseline: 900,
      direction: 'down', attachedIssueCount: 8, periodEnd: PERIOD_END, now: NOW,
    });
    expect(p.conclusion).toBe('pas-assez-de-recul');
    expect(p.pct).toBeNull();
    expect(p.ciLow).toBeNull();
    expect(p.ciHigh).toBeNull();
  });

  it('sous 5 tickets rattachés → « pas assez de recul » même avec 8 semaines', () => {
    const p = computeProjection({
      krId: 'kr_1', series: weeklySeries(8, 900, -50), target: 400, baseline: 900,
      direction: 'down', attachedIssueCount: 3, periodEnd: PERIOD_END, now: NOW,
    });
    expect(p.conclusion).toBe('pas-assez-de-recul');
    expect(p.pct).toBeNull();
  });

  it('item 7 — 8 semaines → pourcentage, fourchette et effectif', () => {
    const p = computeProjection({
      krId: 'kr_1', series: weeklySeries(8, 900, -60), target: 400, baseline: 900,
      direction: 'down', attachedIssueCount: 8, periodEnd: PERIOD_END, now: NOW,
    });
    expect(p.pct).not.toBeNull();
    expect(p.ciLow).not.toBeNull();
    expect(p.ciHigh).not.toBeNull();
    expect(p.ciLow!).toBeLessThanOrEqual(p.ciHigh!);
    expect(p.n).toBeGreaterThan(0);
    expect(p.weeksUsed).toBeGreaterThan(0);
    expect(p.assumptions.length).toBeGreaterThan(0);
    expect(['atteignable', 'atteignable-sous-condition', 'pas-atteignable']).toContain(p.conclusion);
  });

  it('sans cible déclarée → « pas assez de recul » (raison explicite)', () => {
    const p = computeProjection({
      krId: 'kr_1', series: weeklySeries(8, 900, -60), target: null, baseline: 900,
      direction: 'down', attachedIssueCount: 8, periodEnd: PERIOD_END, now: NOW,
    });
    expect(p.conclusion).toBe('pas-assez-de-recul');
    expect(p.assumptions.join(' ')).toMatch(/cible/i);
  });

  it('ne mélange pas deux époques : seuls les points de l’époque courante comptent', () => {
    const old = weeklySeries(8, 900, -60).map((p) => makePoint({ ...p, epochId: 'ep_old' }));
    const p = computeProjection({
      krId: 'kr_1', series: old, target: 400, baseline: 900, direction: 'down',
      attachedIssueCount: 8, epochId: 'ep_new', periodEnd: PERIOD_END, now: NOW,
    });
    expect(p.conclusion).toBe('pas-assez-de-recul');
  });
});
