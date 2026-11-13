/**
 * Degrés (§6), états de théâtre (§7) et concordance (§6 degré 4) — recette §25 item 4.
 */
import { describe, it, expect } from 'vitest';
import { computeDegree, degreeRank } from '../../src/domain/degrees.js';
import { qualifyState, isTheatre } from '../../src/domain/theatre-state.js';
import { computeConcordance } from '../../src/domain/concordance.js';
import { isoWeek } from '../../src/domain/movement.js';
import { makePoint, makeMovement, makeConcordance } from '../helpers/factories.js';
import type { SourceLevel } from '../../src/types.js';

const NOW = '2026-11-11T12:00:00.000Z';

describe('les quatre degrés (§6)', () => {
  const base = { hasCheckin: true, workMoved: false, seriesAdvanced: false, bestSeriesLevel: 'none' as SourceLevel | 'none', concordance: null };

  it('échelle : declare < travaille < avance < concordant', () => {
    expect(degreeRank('declare')).toBeLessThan(degreeRank('travaille'));
    expect(degreeRank('travaille')).toBeLessThan(degreeRank('avance'));
    expect(degreeRank('avance')).toBeLessThan(degreeRank('concordant'));
  });

  it('un pointage seul → déclaré', () => {
    expect(computeDegree(base).degree).toBe('declare');
  });

  it('travail qui bouge → travaillé', () => {
    expect(computeDegree({ ...base, workMoved: true }).degree).toBe('travaille');
  });

  it('série qui bouge depuis une source A → avancé', () => {
    expect(computeDegree({ ...base, seriesAdvanced: true, bestSeriesLevel: 'A' }).degree).toBe('avance');
  });

  it('item 4 — une série de niveau C ne permet JAMAIS d’atteindre « avancé »', () => {
    const deg = computeDegree({ ...base, workMoved: true, seriesAdvanced: true, bestSeriesLevel: 'C' });
    expect(degreeRank(deg.degree)).toBeLessThan(degreeRank('avance'));
  });

  it('concordant exige avancé + concordance établie', () => {
    const conc = makeConcordance({ degree: 'concordant' });
    expect(computeDegree({ ...base, seriesAdvanced: true, bestSeriesLevel: 'A', concordance: conc }).degree).toBe('concordant');
  });
});

describe('les sept états (§7)', () => {
  const facts = { seriesMoves: false, bestSeriesLevel: 'none' as SourceLevel | 'none', workMoves: false, hasRecentCheckin: false, periodClosedDays: null };

  it('S0 → orphelin (prééminence)', () => {
    expect(qualifyState(['S0'], facts)).toBe('orphelin');
  });
  it('S11 → mort-vivant', () => {
    expect(qualifyState(['S11'], facts)).toBe('mort-vivant');
  });
  it('S8 → sous-calibré', () => {
    expect(qualifyState(['S8'], facts)).toBe('sous-calibre');
  });
  it('S5 + S2 → narratif', () => {
    expect(qualifyState(['S5', 'S2'], facts)).toBe('narratif');
  });
  it('S2 + S4 (gelé ET plat) → mort-vivant, même période ouverte (extension §7)', () => {
    expect(qualifyState(['S2', 'S4'], { ...facts, periodClosedDays: null })).toBe('mort-vivant');
  });
  it('S11 prime sur tout sauf S0', () => {
    expect(qualifyState(['S11', 'S2', 'S4'], facts)).toBe('mort-vivant');
    expect(qualifyState(['S0', 'S11'], facts)).toBe('orphelin');
  });
  it('série A/B qui bouge + travail + pointage récent → vivant', () => {
    const live = { seriesMoves: true, bestSeriesLevel: 'A' as SourceLevel, workMoves: true, hasRecentCheckin: true, periodClosedDays: null };
    expect(qualifyState([], live)).toBe('vivant');
    expect(isTheatre('vivant')).toBe(false);
    expect(isTheatre('narratif')).toBe(true);
  });
});

describe('concordance (§6, degré 4)', () => {
  it('travail + nombre + travail qui précède → concordant, autres changements listés', () => {
    const early = isoWeek('2026-10-24T00:00:00.000Z');
    const series = [
      makePoint({ id: 'a', value: 900, measuredAt: '2026-10-25T00:00:00.000Z' }),
      makePoint({ id: 'b', value: 700, measuredAt: '2026-11-08T00:00:00.000Z' }),
    ];
    const movements = [makeMovement({ week: early, transitions: 3, commits: 2 })];
    const conc = computeConcordance({
      krId: 'kr_1', series, movements, direction: 'down',
      otherChanges: [{ kind: 'release', label: 'v2.4', at: '2026-11-01T00:00:00.000Z' }],
      now: NOW,
    });
    expect(conc.workMoved).toBe(true);
    expect(conc.numberMoved).toBe(true);
    expect(conc.degree).toBe('concordant');
    expect(conc.otherChanges).toHaveLength(1); // toujours listé (§6)
  });

  it('nombre qui bouge sans travail → pas concordant (avancé au plus)', () => {
    const series = [
      makePoint({ id: 'a', value: 900, measuredAt: '2026-10-25T00:00:00.000Z' }),
      makePoint({ id: 'b', value: 700, measuredAt: '2026-11-08T00:00:00.000Z' }),
    ];
    const conc = computeConcordance({ krId: 'kr_1', series, movements: [], direction: 'down', otherChanges: [], now: NOW });
    expect(conc.degree).not.toBe('concordant');
  });
});
