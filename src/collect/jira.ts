/**
 * Adaptateur Jira (SPEC §8, §20) : tickets, changelog, commits, temps saisi, JSM.
 *
 * VG-21 structurel : le mapping vers `IssueRef` ne lit JAMAIS l'assigné — la
 * donnée de personne n'entre même pas dans le domaine. Dégradation gracieuse :
 * un endpoint absent/interdit rend `null` ou `[]`, jamais d'exception (§23).
 * Le `request` est injectable pour les tests (pas de runtime Forge requis).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ChangelogItem, CommitRef, IssueRef, JiraGateway } from '../ports';
import { requestAsUserOrApp, toForgeRoute } from './forge-runtime';
import type { Response } from './forge-runtime';

export interface JiraDeps {
  /** Injecté en test ; sinon `@forge/api` chargé paresseusement. */
  request?: (route: string, init?: { method?: string; body?: string }) => Promise<Response>;
}

const FIELDS = 'summary,issuetype,components,labels,status,created,updated,resolutiondate,timetracking,project,parent';

function defaultRequest(): (route: string, init?: { method?: string; body?: string }) => Promise<Response> {
  return async (path, init) => {
    const res = await requestAsUserOrApp((api) => api.requestJira(toForgeRoute(path), init as never));
    return res as unknown as Response;
  };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function toIssueRef(raw: unknown): IssueRef | null {
  const issue = asRecord(raw);
  const key = typeof issue.key === 'string' ? issue.key : '';
  if (!key) return null;
  const fields = asRecord(issue.fields);
  const project = asRecord(fields.project);
  const issuetype = asRecord(fields.issuetype);
  const status = asRecord(fields.status);
  const category = asRecord(status.statusCategory);
  const timetracking = asRecord(fields.timetracking);
  const components = Array.isArray(fields.components)
    ? fields.components.map((c) => asRecord(c).name).filter((n): n is string => typeof n === 'string')
    : [];
  const statusKey = typeof category.key === 'string' ? category.key : 'new';
  const parent = asRecord(fields.parent);
  return {
    id: typeof issue.id === 'string' ? issue.id : key,
    key,
    projectId: typeof project.id === 'string' ? project.id : key.split('-')[0],
    projectKey: typeof project.key === 'string' ? project.key : key.split('-')[0],
    summary: typeof fields.summary === 'string' ? fields.summary : '',
    issueType: typeof issuetype.name === 'string' ? issuetype.name : '',
    components,
    labels: strList(fields.labels),
    status: typeof status.name === 'string' ? status.name : '',
    statusCategory: statusKey === 'done' ? 'done' : statusKey === 'indeterminate' ? 'indeterminate' : 'new',
    created: typeof fields.created === 'string' ? fields.created : '',
    updated: typeof fields.updated === 'string' ? fields.updated : '',
    resolutionDate: typeof fields.resolutiondate === 'string' ? fields.resolutiondate : null,
    isEpic: issuetype.name === 'Epic',
    epicLink: typeof parent.key === 'string' ? parent.key : null,
    estimateSeconds: typeof timetracking.originalEstimateSeconds === 'number' ? timetracking.originalEstimateSeconds : null,
    spentSeconds: typeof timetracking.timeSpentSeconds === 'number' ? timetracking.timeSpentSeconds : null,
  };
}

/** Crée l'adaptateur Jira. */
export function createJiraGateway(deps: JiraDeps = {}): JiraGateway {
  const request = deps.request ?? defaultRequest();

  return {
    async searchIssues(jql: string, limit: number): Promise<IssueRef[]> {
      const body = JSON.stringify({ jql, maxResults: limit, fields: FIELDS.split(',') });
      const data = await safeJson(await request('/rest/api/3/search/jql', { method: 'POST', body }));
      const issues = asRecord(data).issues;
      return Array.isArray(issues) ? issues.map(toIssueRef).filter((i): i is IssueRef => i !== null) : [];
    },

    async getIssue(idOrKey: string): Promise<IssueRef | null> {
      const data = await safeJson(await request(`/rest/api/3/issue/${encodeURIComponent(idOrKey)}?fields=${FIELDS}`));
      return toIssueRef(data);
    },

    async changelog(issueId: string, since: string): Promise<ChangelogItem[]> {
      const data = await safeJson(await request(`/rest/api/3/issue/${encodeURIComponent(issueId)}/changelog?expand=changelog`));
      const histories = asRecord(data).histories;
      if (!Array.isArray(histories)) return [];
      const out: ChangelogItem[] = [];
      for (const history of histories) {
        const at = asRecord(history).created;
        if (typeof at !== 'string' || at < since) continue;
        for (const item of (asRecord(history).items as unknown[]) ?? []) {
          const change = asRecord(item);
          if (change.field === 'status') {
            out.push({ at, field: 'status', from: (change['fromString'] as string | null) ?? null, to: (change['toString'] as string | null) ?? null });
          }
        }
      }
      return out;
    },

    async commits(issueId: string, since: string): Promise<CommitRef[]> {
      const route = `/rest/dev-status/1.0/issue/detail?issueId=${encodeURIComponent(issueId)}&applicationType=stash`;
      const data = await safeJson(await request(route));
      const detail = asRecord(data).detail;
      if (!Array.isArray(detail)) return [];
      const out: CommitRef[] = [];
      for (const repo of detail) {
        const repository = asRecord(repo).repository ?? asRecord(repo);
        const name = typeof asRecord(repository).name === 'string' ? (asRecord(repository).name as string) : 'repo';
        for (const commit of (asRecord(repo).commits as unknown[]) ?? []) {
          const c = asRecord(commit);
          const at = typeof c.authorTimestamp === 'string' ? c.authorTimestamp : typeof c.commitTimestamp === 'string' ? c.commitTimestamp : '';
          if (at && at >= since) out.push({ at, repository: name, sha: typeof c.id === 'string' ? c.id : '' });
        }
      }
      return out;
    },

    async worklogSeconds(issueId: string, _since: string): Promise<number> {
      const data = await safeJson(await request(`/rest/api/3/issue/${encodeURIComponent(issueId)}?fields=timetracking`));
      const tt = asRecord(asRecord(data).fields).timetracking;
      const spent = asRecord(tt).timeSpentSeconds;
      return typeof spent === 'number' ? spent : 0;
    },

    async jsmIncidentCount(projectKey: string, _since: string): Promise<number | null> {
      // JSM : meilleur effort — renvoie null si le projet n'est pas un JSM ou sans droit.
      const data = await safeJson(await request(`/rest/servicedeskapi/servicedesk?projectKey=${encodeURIComponent(projectKey)}`));
      const desks = asRecord(data).values;
      if (!Array.isArray(desks) || desks.length === 0) return null;
      const deskId = asRecord(desks[0]).id;
      const requests = await safeJson(await request(`/rest/servicedeskapi/servicedesk/${String(deskId)}/queue`));
      const queues = asRecord(requests).values;
      return Array.isArray(queues) ? queues.length : null;
    },
  };
}
