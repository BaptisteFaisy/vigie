/**
 * Recalcul des RC de niveau A (SPEC §8) et écart avec la valeur recopiée
 * (recette §25 item 5).
 */
import { describe, it, expect } from 'vitest';
import { recomputeLevelA, sourceGap } from '../../src/domain/recompute';
import { makeKeyResult, makeLink, makeMovement, makePoint } from '../helpers/factories';
import { fakePortfolio, fakeJira } from '../helpers/fake-gateways';

const SINCE = '2026-10-01T00:00:00.000Z';

describe('recomputeLevelA (§8)', () => {
  it('source « jira » : part des tickets rattachés clos', async () => {
    const links = [1, 2, 3, 4].map((n) => makeLink({ id: `l${n}`, issueId: `${n}`, issueKey: `PAY-${n}` }));
    const movements = [
      makeMovement({ issueId: '1', issueKey: 'PAY-1', week: '2026-S45', closed: true }),
      makeMovement({ issueId: '2', issueKey: 'PAY-2', week: '2026-S45', closed: false }),
    ];
    const kr = makeKeyResult({ sourceLevel: 'A', computedBy: 'jira' });
    const result = await recomputeLevelA({ kr, links, movements, projectKey: 'PAY', since: SINCE });
    expect(result?.value).toBe(25); // 1 clos sur 4
    expect(result?.computedBy).toBe('jira');
    expect(result?.reference).toContain('1/4');
  });

  it('source « app sœur » : la mesure vient du portefeuille (§14)', async () => {
    const portfolio = fakePortfolio({ debtCostDays: { value: 42, asOf: '2026-12-01T00:00:00.000Z', computedBy: 'laddition', reference: 'laddition/dette' } });
    const kr = makeKeyResult({ sourceLevel: 'A', computedBy: 'laddition' });
    const result = await recomputeLevelA({ kr, links: [], movements: [], projectKey: null, since: SINCE, portfolio });
    expect(result?.value).toBe(42);
    expect(result?.reference).toBe('laddition/dette');
  });

  it('source JSM : le nombre d’incidents vient de Jira', async () => {
    const jira = fakeJira({ jsmCounts: { PAY: 7 } });
    const kr = makeKeyResult({ sourceLevel: 'A', computedBy: 'jsm' });
    const result = await recomputeLevelA({ kr, links: [], movements: [], projectKey: 'PAY', since: SINCE, jira });
    expect(result?.value).toBe(7);
  });

  it('sans source déclarée, ou source muette → null (jamais un zéro faux)', async () => {
    const kr = makeKeyResult({ sourceLevel: 'A', computedBy: null });
    expect(await recomputeLevelA({ kr, links: [], movements: [], projectKey: null, since: SINCE })).toBeNull();
    const kr2 = makeKeyResult({ sourceLevel: 'A', computedBy: 'laddition' });
    expect(await recomputeLevelA({ kr: kr2, links: [], movements: [], projectKey: null, since: SINCE, portfolio: fakePortfolio() })).toBeNull();
  });

  it('aucun ticket rattaché → pas de mesure « jira »', async () => {
    const kr = makeKeyResult({ sourceLevel: 'A', computedBy: 'jira' });
    expect(await recomputeLevelA({ kr, links: [], movements: [], projectKey: 'PAY', since: SINCE })).toBeNull();
  });
});

describe('sourceGap — recalculé vs recopié (recette §25 item 5)', () => {
  it('mesure l’écart entre la dernière valeur calculée et la dernière valeur tapée', () => {
    const series = [
      makePoint({ id: 'p1', value: 55, measuredAt: '2026-11-01T00:00:00.000Z', sourceLevel: 'C', source: { kind: 'declared' } }),
      makePoint({ id: 'p2', value: 37.5, measuredAt: '2026-12-15T00:00:00.000Z', sourceLevel: 'A', source: { kind: 'computed', computedBy: 'jira' } }),
    ];
    const gap = sourceGap(series);
    expect(gap).not.toBeNull();
    expect(gap?.copied).toBe(55);
    expect(gap?.recomputed).toBe(37.5);
    expect(gap?.gap).toBe(-17.5);
    expect(gap?.copiedLevel).toBe('C');
  });

  it('aucun écart quand tout est calculé (rien n’a été recopié)', () => {
    const series = [
      makePoint({ id: 'p1', value: 10, measuredAt: '2026-11-01T00:00:00.000Z', sourceLevel: 'A', source: { kind: 'computed', computedBy: 'jira' } }),
    ];
    expect(sourceGap(series)).toBeNull();
  });
});
