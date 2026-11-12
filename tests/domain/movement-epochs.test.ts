/**
 * Mouvement hebdomadaire + jours (SPEC §4, §11) et époques (§16) — recette §25 item 15.
 */
import { describe, it, expect } from 'vitest';
import { isoWeek, weekRange, daysBetween, secondsToDays, resolveDays, computeWeekMovement } from '../../src/domain/movement';
import { epochOf, pointsInEpoch, detectReorg } from '../../src/domain/epochs';
import { isoWeekOf } from '../helpers/fake-clock';
import { makePoint, makeEpoch } from '../helpers/factories';

describe('mouvement (§4, §11)', () => {
  it('isoWeek suit la semaine ISO 8601 (vérifié contre le helper de test)', () => {
    for (const iso of ['2026-10-01T10:00:00.000Z', '2026-11-11T12:00:00.000Z', '2026-12-31T09:00:00.000Z']) {
      expect(isoWeek(iso)).toBe(isoWeekOf(iso));
      expect(isoWeek(iso)).toMatch(/^\d{4}-S\d{2}$/);
    }
  });

  it('jours-homme : 1 jour = 8 h', () => {
    expect(secondsToDays(8 * 3600)).toBe(1);
    expect(secondsToDays(4 * 3600)).toBe(0.5);
  });

  it('préférence des sources de jours : saisi > estimé > cycle (§11)', () => {
    expect(resolveDays({ spentSeconds: 3600, estimateSeconds: 7200, cycleDays: 3 }).source).toBe('logged');
    expect(resolveDays({ spentSeconds: 0, estimateSeconds: 7200, cycleDays: 3 }).source).toBe('estimated');
    expect(resolveDays({ spentSeconds: 0, estimateSeconds: 0, cycleDays: 3 }).source).toBe('cycle');
    expect(resolveDays({}).source).toBe('none');
  });

  it('agrège transitions et commits par semaine', () => {
    const rows = computeWeekMovement({
      issueId: '1', issueKey: 'PAY-1', closed: false, createdAt: '2026-10-01T00:00:00.000Z',
      changelog: [{ at: '2026-11-10T10:00:00.000Z' }, { at: '2026-11-11T10:00:00.000Z' }],
      commits: [{ at: '2026-11-10T11:00:00.000Z' }],
    });
    expect(rows.length).toBe(1);
    expect(rows[0].transitions).toBe(2);
    expect(rows[0].commits).toBe(1);
    expect(rows[0].week).toBe(isoWeek('2026-11-10T10:00:00.000Z'));
  });

  it('weekRange liste les semaines entre deux dates, daysBetween compte les jours', () => {
    expect(weekRange('2026-10-01T00:00:00.000Z', '2026-10-20T00:00:00.000Z').length).toBeGreaterThanOrEqual(3);
    expect(Math.floor(daysBetween('2026-10-01T00:00:00.000Z', '2026-10-11T00:00:00.000Z'))).toBe(10);
  });
});

describe('époques (§16, VG-22)', () => {
  const ep1 = makeEpoch({ id: 'ep1', startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2026-11-01T00:00:00.000Z' });
  const ep2 = makeEpoch({ id: 'ep2', startsAt: '2026-11-01T00:00:00.000Z', endsAt: null });

  it('item 15 — une réorganisation ouvre une époque ; les séries ne sont jamais mélangées', () => {
    expect(epochOf('2026-10-15T00:00:00.000Z', [ep1, ep2])?.id).toBe('ep1');
    expect(epochOf('2026-11-11T00:00:00.000Z', [ep1, ep2])?.id).toBe('ep2');
    const points = [
      makePoint({ id: 'a', epochId: 'ep1', measuredAt: '2026-10-15T00:00:00.000Z' }),
      makePoint({ id: 'b', epochId: 'ep2', measuredAt: '2026-11-05T00:00:00.000Z' }),
    ];
    expect(pointsInEpoch(points, 'ep2').map((p) => p.id)).toEqual(['b']);
    expect(pointsInEpoch(points, 'ep1').map((p) => p.id)).toEqual(['a']);
  });

  it('détecte un déplacement massif de tickets (réorganisation)', () => {
    const moves = Array.from({ length: 6 }, (_, i) => ({ at: `2026-11-0${i + 1}T00:00:00.000Z` }));
    expect(detectReorg(moves, 5, 7)).not.toBeNull();
    expect(detectReorg(moves.slice(0, 2), 5, 7)).toBeNull();
  });
});
