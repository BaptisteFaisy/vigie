/**
 * Tests des 13 signaux de théâtre (SPEC §7) + recette §25 items 2, 3, 14.
 * Domaine pur : on passe `now` en dur, pas d'horloge.
 */
import { describe, it, expect } from 'vitest';
import { detectSignals } from '../../src/domain/signals/index.js';
import type { SignalInput } from '../../src/domain/signals/index.js';
import { DEFAULT_THRESHOLDS } from '../../src/defaults.js';
import { makeKeyResult, makeLink, makePoint, makeCheckin, makeScope, makeMovement } from '../helpers/factories.js';
import type { SignalId } from '../../src/types.js';

const NOW = '2026-11-11T12:00:00.000Z';
const PERIOD = { start: '2026-10-01T00:00:00.000Z', end: '2026-12-31T23:59:59.000Z' };

function base(over: Partial<SignalInput> = {}): SignalInput {
  return {
    objectiveId: 'obj_1',
    objectiveOpen: true,
    links: [makeLink()],
    movements: [],
    series: [],
    keyResults: [makeKeyResult()],
    checkins: [],
    scope: makeScope(),
    period: PERIOD,
    thresholds: DEFAULT_THRESHOLDS,
    now: NOW,
    lastActivityAt: '2026-11-10T00:00:00.000Z',
    ...over,
  };
}

const ids = (input: SignalInput): SignalId[] => detectSignals(input).map((s) => s.signal);
const daysAgo = (n: number): string => new Date(new Date(NOW).getTime() - n * 86_400_000).toISOString();

describe('signaux de théâtre (§7)', () => {
  it('S0 — aucun rattachement', () => {
    expect(ids(base({ links: [] }))).toContain('S0');
  });

  it('S1 — 5 tickets liés le même jour par le même acteur (recette §25 item 3)', () => {
    const day = '2026-10-05T09:00:00.000Z';
    const links = [1, 2, 3, 4, 5].map((n) =>
      makeLink({ id: `lnk_${n}`, issueId: `100${n}`, issueKey: `PAY-${n}`, linkedAt: day, linkedByRef: 'actor_x' }));
    const signals = detectSignals(base({ links }));
    const s1 = signals.find((s) => s.signal === 'S1');
    expect(s1).toBeDefined();
    expect(s1?.facts[0].value).toBe(5);
    // VG-21 : le détail ne doit JAMAIS révéler l'identité de l'acteur, dans aucune langue.
    expect(JSON.stringify(s1?.facts[0].detail)).not.toContain('actor_x');
    expect(JSON.stringify(s1?.facts[0].detailEn)).not.toContain('actor_x');
  });

  it('chaque fait porte ses deux langues (§24)', () => {
    const frozen = daysAgo(30);
    const signals = detectSignals(base({
      lastActivityAt: frozen,
      checkins: [25, 20, 15].map((d) => makeCheckin({ id: `c${d}`, at: daysAgo(d) })),
      keyResults: [makeKeyResult({ sourceLevel: 'C' })],
    }));
    expect(signals.length).toBeGreaterThan(0);
    for (const signal of signals) {
      for (const fact of signal.facts) {
        expect(fact.detail.length, `fait FR vide pour ${signal.signal}`).toBeGreaterThan(0);
        expect(fact.detailEn.length, `fait EN vide pour ${signal.signal}`).toBeGreaterThan(0);
        expect(fact.detailEn).not.toBe(fact.detail);
      }
    }
  });

  it('S1 — ne se déclenche pas sous le seuil (4 liens)', () => {
    const day = '2026-10-05T09:00:00.000Z';
    const links = [1, 2, 3, 4].map((n) => makeLink({ id: `l${n}`, issueId: `100${n}`, issueKey: `PAY-${n}`, linkedAt: day, linkedByRef: 'a' }));
    expect(ids(base({ links }))).not.toContain('S1');
  });

  it('S2 — travail gelé depuis 30 jours (recette §25 item 2)', () => {
    const signals = detectSignals(base({ lastActivityAt: daysAgo(30) }));
    const s2 = signals.find((s) => s.signal === 'S2');
    expect(s2).toBeDefined();
    expect(s2?.facts[0].value).toBeGreaterThanOrEqual(21);
  });

  it('S3 — nombre sans source (RC niveau C)', () => {
    expect(ids(base({ keyResults: [makeKeyResult({ sourceLevel: 'C' })] }))).toContain('S3');
  });

  it('S4 — série plate sur 6 semaines', () => {
    const series = [0, 1, 2, 3, 4, 5, 6].map((w) =>
      makePoint({ id: `p${w}`, value: 500, measuredAt: daysAgo(w * 7) }));
    expect(ids(base({ series }))).toContain('S4');
  });

  it('S5 — récit sans travail : 3 pointages pendant un gel', () => {
    const frozen = daysAgo(30);
    const checkins = [25, 20, 15].map((d) => makeCheckin({ id: `c${d}`, at: daysAgo(d) }));
    expect(ids(base({ lastActivityAt: frozen, checkins }))).toContain('S5');
  });

  it('S6 — objectif non falsifiable (RC sans nombre ni preuve)', () => {
    const kr = makeKeyResult({ kind: 'number', baseline: null, target: null, proofType: null, falsifiable: false });
    expect(ids(base({ keyResults: [kr] }))).toContain('S6');
  });

  it('S7 — rattachement hors périmètre', () => {
    const links = [makeLink({ issueId: '9001', issueKey: 'OTHER-1' })];
    expect(ids(base({ links, scope: makeScope({ projectKeys: ['PAY'] }) }))).toContain('S7');
  });

  it('S8 — cible atteinte avant 50 % de la période', () => {
    const kr = makeKeyResult({ direction: 'down', baseline: 900, target: 400 });
    const series = [makePoint({ value: 400, measuredAt: '2026-10-10T00:00:00.000Z' })];
    expect(ids(base({ keyResults: [kr], series }))).toContain('S8');
  });

  it('S9 — cible identique à la période précédente', () => {
    const kr = makeKeyResult({ target: 400 });
    expect(ids(base({ keyResults: [kr], previousPeriodTarget: 400 }))).toContain('S9');
  });

  it('S10 — silence : aucun pointage alors que le travail bouge', () => {
    const movements = [makeMovement({ week: '2026-S45', transitions: 3, commits: 2 })];
    expect(ids(base({ lastActivityAt: daysAgo(2), movements, checkins: [] }))).toContain('S10');
  });

  it('S11 — mort-vivant : période close depuis 40 jours (recette §25 item 14)', () => {
    const period = { start: '2026-08-01T00:00:00.000Z', end: '2026-10-02T00:00:00.000Z' };
    const signals = detectSignals(base({ period, objectiveOpen: true }));
    const s11 = signals.find((s) => s.signal === 'S11');
    expect(s11).toBeDefined();
    expect(s11?.facts[0].value).toBeGreaterThanOrEqual(30);
  });

  it('S12 — double comptage : ticket sur 3 objectifs sans fraction', () => {
    const links = [makeLink({ issueId: '10001', issueKey: 'PAY-1', fraction: 1 })];
    expect(ids(base({ links, objectivesPerIssue: { '10001': 3 } }))).toContain('S12');
  });

  it('un objectif sain ne déclenche aucun signal', () => {
    const series = [0, 1, 2, 3, 4, 5].map((w) => makePoint({ id: `p${w}`, value: 900 - w * 80, measuredAt: daysAgo(w * 7), sourceLevel: 'A' }));
    const checkins = [makeCheckin({ at: daysAgo(2) })];
    const movements = [makeMovement({ week: '2026-S45', transitions: 2, commits: 3 })];
    const input = base({ series, checkins, movements, lastActivityAt: daysAgo(2), keyResults: [makeKeyResult({ sourceLevel: 'A' })] });
    expect(ids(input)).toEqual([]);
  });
});
