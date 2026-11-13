import { describe, it, expect } from 'vitest';
import { syncRegisterFromJira } from '../../src/collect/register-jira';
import type { IssueRef, JiraGateway } from '../../src/ports';
import { fakeStore } from '../helpers/fake-store';

function issue(over: Partial<IssueRef> & { key: string }): IssueRef {
  return {
    id: `id-${over.key}`, projectId: 'P1', projectKey: 'PAY', summary: 'ticket', issueType: 'Story',
    components: [], labels: [], status: 'To Do', statusCategory: 'new',
    created: '2026-10-01T00:00:00.000Z', updated: '2026-10-02T00:00:00.000Z', resolutionDate: null,
    isEpic: false, epicLink: null, estimateSeconds: null, spentSeconds: null,
    ...over,
  };
}

const epic = (key: string): IssueRef => issue({ key, issueType: 'Epic', isEpic: true, summary: `Objectif ${key}` });
const child = (key: string, epicKey: string): IssueRef => issue({ key, issueType: 'Story', epicLink: epicKey });
const ghost = (key: string): IssueRef => issue({ key, issueType: 'Task' });

function gate(epics: IssueRef[], children: IssueRef[], ghosts: IssueRef[]): JiraGateway {
  return {
    async searchIssues(jql: string, _limit: number) {
      if (jql.includes('issuetype = Epic')) return epics;
      const link = jql.match(/"Epic Link" = ([A-Z0-9-]+)/);
      if (link) return children.filter((c) => c.epicLink === link[1]);
      if (jql.includes('is EMPTY')) return ghosts;
      return [];
    },
    getIssue: async () => null,
    changelog: async () => [],
    commits: async () => [],
    worklogSeconds: async () => 0,
    jsmIncidentCount: async () => null,
  };
}

describe('import du registre Jira réel (chemin Forge)', () => {
  it('epics → objectifs, enfants → liens, sans epic → fantômes, et recalcul ensuite', async () => {
    const store = fakeStore();
    const jira = gate([epic('PAY-1'), epic('PAY-2')], [child('PAY-11', 'PAY-1'), child('PAY-12', 'PAY-1'), child('PAY-21', 'PAY-2')], [ghost('PAY-99'), ghost('PAY-98')]);

    const summary = await syncRegisterFromJira(store, jira, { scope: 'cloud_test', site: 't.atlassian.net' });
    expect(summary).not.toBeNull();
    expect(summary!.objectives).toBe(2);
    expect(summary!.ghosts).toBe(2);

    const objectives = await store.listObjectives({});
    expect(objectives).toHaveLength(2);
    expect(objectives.map((o) => o.sourceId).sort()).toEqual([
      'https://t.atlassian.net/browse/PAY-1', 'https://t.atlassian.net/browse/PAY-2',
    ]);

    for (const objective of objectives) {
      const krs = await store.listKeyResultsByObjective(objective.id);
      expect(krs.length).toBeGreaterThan(0);
      expect(krs[0].sourceLevel).toBe('A');
    }
    const links = await store.listActiveLinksByPeriod(objectives[0].periodId);
    expect(links).toHaveLength(3);

    const orphans = await store.listOrphans({});
    expect(orphans).toHaveLength(2);

    // Un second appel ne réimporte pas : syncIfEmpty est idempotent.
    expect(await syncRegisterFromJira(store, jira, { scope: 'cloud_test' })).toBeNull();
  });
});