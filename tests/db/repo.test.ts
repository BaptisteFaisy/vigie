/**
 * Allers-retours entité ↔ SQL pour `createStore(fakeSql())` (SPEC §21).
 *
 * Prouve que la persistance réelle (upsert, jointures, latest*, vides) se
 * comporte comme le store mémoire de référence (`fake-store`). Le faux SQL
 * n'interprète QUE les formes émises par repo.ts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../../src/db/repo';
import { fakeSql } from '../helpers/fake-sql';
import {
  makeObjective, makeKeyResult, makePoint, makeLink, makeMovement, makeSignal,
  makeProjection, makeCost, makeCheckin, makeDecision, makeOrphan, makeEpoch,
  makePostmortem, makeCoverage, makeSettings, makeCursor,
} from '../helpers/factories';
import type { VigieStore } from '../../src/ports';

let sql: ReturnType<typeof fakeSql>;
let store: VigieStore;

beforeEach(() => {
  sql = fakeSql();
  store = createStore(sql);
});

describe('objective / key_result / kr_point', () => {
  it('round-trip objectif, aucun champ perdu', async () => {
    const o = makeObjective({ id: 'obj_x', title: 'Titre accentué éè', scope: { projectKeys: ['PAY'], components: ['c'], teams: ['t'] } });
    await store.saveObjective(o);
    expect(await store.getObjective('obj_x')).toEqual(o);
    expect(await store.getObjective('inconnu')).toBeNull();
    expect(await store.listObjectives({ periodId: o.periodId })).toHaveLength(1);
    expect(await store.findObjectiveBySource('local', 'GOAL-1')).toEqual(o);
  });

  it('upsert idempotent : sauver deux fois ne duplique pas', async () => {
    await store.saveObjective(makeObjective({ id: 'obj_1' }));
    await store.saveObjective(makeObjective({ id: 'obj_1', title: 'Renommé' }));
    expect(await store.listObjectives({})).toHaveLength(1);
    expect((await store.getObjective('obj_1'))?.title).toBe('Renommé');
  });

  it('round-trip RC + points (bornes et latest)', async () => {
    await store.saveKeyResult(makeKeyResult({ id: 'kr_1' }));
    await store.savePoint(makePoint({ id: 'p1', krId: 'kr_1', value: 10, measuredAt: '2026-10-01T00:00:00.000Z' }));
    await store.savePoint(makePoint({ id: 'p2', krId: 'kr_1', value: 20, measuredAt: '2026-11-01T00:00:00.000Z' }));
    await store.savePoint(makePoint({ id: 'p3', krId: 'kr_1', value: 30, measuredAt: '2026-12-01T00:00:00.000Z' }));
    expect(await store.listPointsByKr('kr_1')).toHaveLength(3);
    expect(await store.listPointsByKr('kr_1', '2026-10-15T00:00:00.000Z')).toHaveLength(2);
    expect((await store.latestPointForKr('kr_1'))?.value).toBe(30);
    expect((await store.getKeyResult('kr_1'))?.falsifiable).toBe(true);
  });
});

describe('objective_link / movement (jointures)', () => {
  it('les liens « unmotivated » comptent, les « detached » non', async () => {
    await store.saveObjective(makeObjective({ id: 'obj_1' }));
    await store.saveLink(makeLink({ id: 'l1', issueId: '1', issueKey: 'PAY-1', state: 'active' }));
    await store.saveLink(makeLink({ id: 'l2', issueId: '2', issueKey: 'PAY-2', state: 'unmotivated' }));
    await store.saveLink(makeLink({ id: 'l3', issueId: '3', issueKey: 'PAY-3', state: 'detached' }));
    const active = await store.listActiveLinksByPeriod(makeObjective().periodId);
    expect(active.map((l) => l.id).sort()).toEqual(['l1', 'l2']);
    expect(await store.countObjectivesForIssue('1')).toBe(1);
  });

  it('listMovementsByObjective joint liens → mouvements', async () => {
    await store.saveObjective(makeObjective({ id: 'obj_1' }));
    await store.saveLink(makeLink({ id: 'l1', objectiveId: 'obj_1', issueId: '1', issueKey: 'PAY-1' }));
    await store.saveMovement(makeMovement({ issueId: '1', issueKey: 'PAY-1', week: '2026-S45' }));
    await store.saveMovement(makeMovement({ issueId: '99', issueKey: 'PAY-99', week: '2026-S45' }));
    const movements = await store.listMovementsByObjective('obj_1');
    expect(movements).toHaveLength(1);
    expect(movements[0].issueId).toBe('1');
  });

  it('clé primaire composée movement (issue_id, week)', async () => {
    await store.saveMovement(makeMovement({ issueId: '1', issueKey: 'PAY-1', week: '2026-S45', transitions: 1 }));
    await store.saveMovement(makeMovement({ issueId: '1', issueKey: 'PAY-1', week: '2026-S45', transitions: 5 }));
    expect(await store.listMovementsByIssue('1')).toHaveLength(1);
  });
});

describe('signals / projection / cost', () => {
  it('replaceSignalsForObjective remplace, dismissSignal écarte', async () => {
    await store.saveSignal(makeSignal({ id: 's1', objectiveId: 'obj_1', signal: 'S2' }));
    await store.replaceSignalsForObjective('obj_1', [makeSignal({ id: 's2', objectiveId: 'obj_1', signal: 'S4' })]);
    expect((await store.listSignalsByObjective('obj_1')).map((s) => s.id)).toEqual(['s2']);
    expect(await store.dismissSignal('s2', 'raison', '2027-01-01T00:00:00.000Z')).toBe(true);
    const dismissed = await store.listSignalsByObjective('obj_1');
    expect(dismissed[0].dismissedReason).toBe('raison');
  });

  it('projection : hypothèses FR et EN survivent à l’aller-retour', async () => {
    const p = makeProjection({ id: 'pr1', assumptions: ['rythme constant'], assumptionsEn: ['constant pace'], levers: [{ text: 'levier', textEn: 'lever' }] });
    await store.saveProjection(p);
    const back = await store.latestProjectionForKr('kr_1');
    expect(back?.assumptions).toEqual(['rythme constant']);
    expect(back?.assumptionsEn).toEqual(['constant pace']);
    expect(back?.levers[0].textEn).toBe('lever');
  });

  it('cost : latest par objectif+période et totaux portefeuille', async () => {
    await store.saveCost(makeCost({ id: 'c1', objectiveId: 'obj_1', days: 10, computedAt: '2026-11-01T00:00:00.000Z' }));
    await store.saveCost(makeCost({ id: 'c2', objectiveId: 'obj_1', days: 12, computedAt: '2026-11-20T00:00:00.000Z' }));
    expect((await store.latestCostForObjective('obj_1', makeCost().periodId))?.days).toBe(12);
    const totals = await store.portfolioCostTotals(makeCost().periodId);
    expect(totals.totalDays).toBe(12);
  });
});

describe('records (checkin, decision, orphan, epoch, postmortem, dossier, coverage, settings, cursor)', () => {
  it('checkin + decision + vérification', async () => {
    await store.saveObjective(makeObjective({ id: 'obj_1' }));
    await store.saveCheckin(makeCheckin({ id: 'ch1', objectiveId: 'obj_1' }));
    expect(await store.listCheckinsByObjective('obj_1')).toHaveLength(1);
    await store.saveDecision(makeDecision({ id: 'd1', objectiveId: 'obj_1', followed: null }));
    expect(await store.listDecisionsToVerify(makeObjective().periodId)).toHaveLength(1);
    await store.saveDecision(makeDecision({ id: 'd1', objectiveId: 'obj_1', followed: true, verifiedAt: '2026-12-01T00:00:00.000Z' }));
    expect(await store.listDecisionsToVerify(makeObjective().periodId)).toHaveLength(0);
  });

  it('orphan : liste non résolus, resolveOrphan', async () => {
    await store.saveOrphan(makeOrphan({ issueId: '1', issueKey: 'PAY-1', projectKey: 'PAY' }));
    await store.saveOrphan(makeOrphan({ issueId: '2', issueKey: 'OPS-2', projectKey: 'OPS' }));
    expect(await store.listOrphans({})).toHaveLength(2);
    expect(await store.listOrphans({ projectKey: 'OPS' })).toHaveLength(1);
    expect(await store.resolveOrphan('1', '2026-12-01T00:00:00.000Z')).toBe(true);
    expect(await store.listOrphans({})).toHaveLength(1);
  });

  it('epoch : currentEpoch gère l’époque ouverte (ends_at null)', async () => {
    await store.saveEpoch(makeEpoch({ id: 'e1', startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2026-11-01T00:00:00.000Z' }));
    await store.saveEpoch(makeEpoch({ id: 'e2', startsAt: '2026-11-01T00:00:00.000Z', endsAt: null }));
    expect((await store.currentEpoch('2026-12-15T00:00:00.000Z'))?.id).toBe('e2');
    expect((await store.currentEpoch('2026-10-15T00:00:00.000Z'))?.id).toBe('e1');
    expect(await store.listEpochs()).toHaveLength(2);
  });

  it('postmortem + dossier + coverage + settings + cursor', async () => {
    await store.savePostmortem(makePostmortem({ id: 'pm1', learned: ['a', 'b'] }));
    expect((await store.latestPostmortemForObjective('obj_1'))?.learned).toEqual(['a', 'b']);
    await store.saveDossierRecord({ objectiveId: 'obj_1', pageAri: 'ari:1', generatedAt: '2026-12-01T00:00:00.000Z', decisionId: 'd1' });
    expect((await store.getDossierRecord('obj_1'))?.pageAri).toBe('ari:1');
    await store.saveCoverage(makeCoverage({ scope: 's1', rightsMissing: ['read:graph:work-item'] }));
    expect((await store.getCoverage('s1'))?.rightsMissing).toEqual(['read:graph:work-item']);
    const settings = makeSettings({ scope: 's1' });
    await store.saveSettings(settings);
    expect((await store.getSettings('s1'))?.thresholds.S2).toBe(settings.thresholds.S2);
    await store.saveCursor(makeCursor({ objectType: 'AtlassianGoal', lastId: 'x' }));
    expect((await store.getCursor('AtlassianGoal'))?.lastId).toBe('x');
  });

  it('lectures vides : null / [], jamais d’exception', async () => {
    expect(await store.getObjective('nope')).toBeNull();
    expect(await store.listObjectives({})).toEqual([]);
    expect(await store.listPointsByKr('nope')).toEqual([]);
    expect(await store.latestProjectionForKr('nope')).toBeNull();
    expect(await store.getCoverage('nope')).toBeNull();
    expect(await store.getSettings('nope')).toBeNull();
  });
});
