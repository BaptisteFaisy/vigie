/**
 * Garde VG-21 (SPEC §5, §18, recette §25 item 16) : aucune sortie d'outil MCP ne
 * contient de donnée de personne — ni clé d'identité, ni valeur d'acteur.
 */
import { describe, it, expect } from 'vitest';
import { runAction, ACTION_KEYS } from '../../src/actions/registry.js';
import { makeAppDeps, TEST_SCOPE } from '../helpers/fake-app-deps.js';
import { makeObjective, makeKeyResult, makePoint, makeLink, makeMovement, makeCheckin } from '../helpers/factories.js';
import { DEFAULT_PERIOD } from '../../src/defaults.js';
import { isoWeek } from '../../src/domain/movement.js';
import type { ActionDeps } from '../../src/ports.js';
import type { ActionKey } from '../../src/types.js';

const SECRETS = ['OWNER_SECRET', 'LINKER_SECRET', 'CHECKER_SECRET'];
const PERSON_KEYS = ['ownerRef', 'byRef', 'linkedByRef', 'accountId', 'assignee', 'reporter'];

const NOW = '2026-11-11T12:00:00.000Z';
const weeksAgo = (n: number) => new Date(new Date(NOW).getTime() - n * 7 * 86_400_000).toISOString();

async function seededCtx(): Promise<ActionDeps> {
  const deps = makeAppDeps();
  const store = deps.store;
  await store.saveObjective(makeObjective({ id: 'obj_1', ownerRef: 'OWNER_SECRET', periodId: DEFAULT_PERIOD.id }));
  await store.saveKeyResult(makeKeyResult({ id: 'kr_1', objectiveId: 'obj_1', baseline: 900, target: 400, direction: 'down', sourceLevel: 'A' }));
  for (let i = 0; i < 6; i += 1) {
    await store.savePoint(makePoint({ id: `pt_${i}`, krId: 'kr_1', value: 900 - i * 80, measuredAt: weeksAgo(5 - i), sourceLevel: 'A' }));
  }
  await store.saveLink(makeLink({ id: 'lnk_1', objectiveId: 'obj_1', issueId: '10001', issueKey: 'PAY-1', linkedByRef: 'LINKER_SECRET', fraction: 1 }));
  await store.saveMovement(makeMovement({ issueId: '10001', issueKey: 'PAY-1', week: isoWeek(weeksAgo(1)), transitions: 2, commits: 3, daysSpent: 4 }));
  await store.saveCheckin(makeCheckin({ id: 'chk_1', objectiveId: 'obj_1', byRef: 'CHECKER_SECRET' }));
  return { deps, actor: { ref: 'AGENT_SECRET', isAgent: true }, scope: TEST_SCOPE };
}

const INPUTS: Record<ActionKey, Record<string, unknown>> = {
  'get-objective': { objectiveId: 'obj_1' },
  'list-objectives': { period: DEFAULT_PERIOD.id },
  'count-theatre': { period: DEFAULT_PERIOD.id },
  'get-kr-series': { krId: 'kr_1' },
  'get-projection': { objectiveId: 'obj_1' },
  'get-goal-cost': { objectiveId: 'obj_1' },
  'list-goal-orphans': {},
  'get-concordance': { krId: 'kr_1' },
  'get-review-dossier': { objectiveId: 'obj_1' },
  'get-portfolio-brief': { period: DEFAULT_PERIOD.id },
  'link-work': { objectiveId: 'obj_1', issueKeys: 'PAY-9', reason: 'Refonte du service.' },
  'record-kr-number': { krId: 'kr_1', value: 410, sourceRef: 'dash/latency', sourceLevel: 'B' },
  'record-checkin': { objectiveId: 'obj_1', interpretation: 'En bonne voie.' },
  'record-decision': { objectiveId: 'obj_1', decision: 'continue', reason: 'Rythme suffisant.' },
  'open-postmortem': { objectiveId: 'obj_1' },
};

describe('VG-21 — aucune donnée de personne dans les sorties MCP', () => {
  it('les 15 outils sont enregistrés', () => {
    expect(ACTION_KEYS).toHaveLength(15);
  });

  for (const key of ACTION_KEYS) {
    it(`${key} ne fuit ni identité ni clé de personne`, async () => {
      const ctx = await seededCtx();
      const result = await runAction(key, INPUTS[key], ctx);
      expect(result.ok).toBe(true);
      const json = JSON.stringify(result.ok ? result.value : result);
      for (const secret of SECRETS) expect(json).not.toContain(secret);
      expect(json).not.toContain('AGENT_SECRET');
      for (const personKey of PERSON_KEYS) expect(json).not.toContain(personKey);
    });
  }
});
