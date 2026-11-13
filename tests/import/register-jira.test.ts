import { describe, it, expect } from 'vitest';
import { fetchRegister, syncRegisterFromJira } from '../../src/collect/register-jira';
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

    // Un second appel n'a plus rien à importer : le registre est complet.
    expect(await syncRegisterFromJira(store, jira, { scope: 'cloud_test' })).toBeNull();
  });

  it('l’import se fait par tranches : le registre se remplit jusqu’à tous les epics', async () => {
    const store = fakeStore();
    const epics = [epic('PAY-1'), epic('PAY-2'), epic('PAY-3'), epic('PAY-4'), epic('PAY-5')];
    const jira = gate(epics, [child('PAY-11', 'PAY-1')], []);

    // Première tranche : deux epics, pas plus (le temps d’une invocation est borné).
    const first = await syncRegisterFromJira(store, jira, { scope: 'cloud_test', chunk: 2 });
    expect(first!.objectives).toBe(2);
    expect((await store.listObjectives({})).length).toBe(2);

    // Les tranches suivantes continuent où la précédente s’est arrêtée.
    const second = await syncRegisterFromJira(store, jira, { scope: 'cloud_test', chunk: 2 });
    const third = await syncRegisterFromJira(store, jira, { scope: 'cloud_test', chunk: 2 });
    expect(second!.objectives).toBe(2);
    expect(third!.objectives).toBe(1);
    expect((await store.listObjectives({})).length).toBe(5);

    // Registre complet : plus rien à importer.
    expect(await syncRegisterFromJira(store, jira, { scope: 'cloud_test', chunk: 2 })).toBeNull();
  });
});
describe('JQL bornées — Atlassian refuse une requête sans restriction (HTTP 400)', () => {
  it("l'import n'envoie que des requêtes bornées (date ou relation)", async () => {
    const seen: string[] = [];
    const jira: JiraGateway = {
      async searchIssues(jql: string) { seen.push(jql); return []; },
      getIssue: async () => null,
      changelog: async () => [],
      commits: async () => [],
      worklogSeconds: async () => 0,
      jsmIncidentCount: async () => null,
    };
    // fetchRegister : pas de cooldown d'import (contrairement à syncIfIncomplete),
    // donc chaque requête est bien émise et capturable.
    await fetchRegister(jira, 8);
    expect(seen.length).toBeGreaterThan(0);
    for (const jql of seen) {
      expect(/updated >= -\d+d|"Epic Link"|parent =/.test(jql)).toBe(true);
    }
  });
});
