/**
 * Fakes en mémoire des gateways — infra de test PARTAGÉE.
 *
 * Implémente les interfaces de `src/ports.ts` (JiraGateway, GraphGateway,
 * PortfolioGateway, LlmGateway, ConfluenceGateway, IdentityGateway, JobQueue,
 * Logger) sans `@forge/*`. Les couches hautes (actions L6, engines L8, recette
 * L12) les utilisent ; les VRAIS adaptateurs (L5) sont testés contre de faux
 * `request*` Forge. Chaque fake est amorçable et enregistre ce qu'il reçoit.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ObjectiveView } from '../../src/types';
import type {
  Actor, ActorContext, ChangelogItem, CommitRef, ConfluenceGateway, GraphAvailability,
  GraphGoal, GraphGoalUpdate, GraphGateway, IdentityGateway, IssueRef, JiraGateway,
  JobQueue, LevelAMeasure, LlmGateway, Logger, PortfolioGateway, RecalcMessage,
  SuggestedLink,
} from '../../src/ports';

/* -------------------------------------------------------------------- Jira */

export interface JiraSeed {
  issues?: IssueRef[];
  changelogs?: Record<string, ChangelogItem[]>;
  commits?: Record<string, CommitRef[]>;
  worklogSeconds?: Record<string, number>;
  jsmCounts?: Record<string, number>;
}

export function fakeJira(seed: JiraSeed = {}): JiraGateway & { calls: string[] } {
  const calls: string[] = [];
  const byKey = new Map((seed.issues ?? []).flatMap((i) => [[i.id, i], [i.key, i]] as const));
  return {
    calls,
    async searchIssues(_jql, _limit) { calls.push('searchIssues'); return seed.issues ?? []; },
    async getIssue(idOrKey) { calls.push(`getIssue:${idOrKey}`); return byKey.get(idOrKey) ?? null; },
    async changelog(issueId) { calls.push(`changelog:${issueId}`); return seed.changelogs?.[issueId] ?? []; },
    async commits(issueId) { calls.push(`commits:${issueId}`); return seed.commits?.[issueId] ?? []; },
    async worklogSeconds(issueId) { calls.push(`worklog:${issueId}`); return seed.worklogSeconds?.[issueId] ?? 0; },
    async jsmIncidentCount(projectKey) { calls.push(`jsm:${projectKey}`); return seed.jsmCounts?.[projectKey] ?? null; },
  };
}

/* ------------------------------------------------------------------- graph */

export interface GraphSeed {
  availability?: GraphAvailability;
  goals?: GraphGoal[];
  updates?: Record<string, GraphGoalUpdate[]>;
}

export function fakeGraph(seed: GraphSeed = {}): GraphGateway {
  const goals = seed.goals ?? [];
  return {
    async availability() { return seed.availability ?? { available: false, missingRights: [] }; },
    async listGoals(_cursor) { return { goals, nextCursor: null }; },
    async listUpdates(goalSourceId) { return seed.updates?.[goalSourceId] ?? []; },
  };
}

/* -------------------------------------------------------------- portfolio */

export type PortfolioSeed = Partial<Record<keyof PortfolioGateway, LevelAMeasure | null>>;

export function fakePortfolio(seed: PortfolioSeed = {}): PortfolioGateway {
  const get = (k: keyof PortfolioGateway) => async () => seed[k] ?? null;
  return {
    debtCostDays: get('debtCostDays'),
    recurringIncidentCost: get('recurringIncidentCost'),
    releaseSafetyRate: get('releaseSafetyRate'),
    provenCriteriaRate: get('provenCriteriaRate'),
    delegatedShare: get('delegatedShare'),
    wikiOpenFireholds: get('wikiOpenFireholds'),
  } as unknown as PortfolioGateway;
}

/* --------------------------------------------------------------------- llm */

export function fakeLlm(suggestions: SuggestedLink[] = []): LlmGateway & { prompts: number } {
  const state = { prompts: 0 };
  return {
    prompts: 0,
    async suggestLinks() { state.prompts += 1; return suggestions; },
    async synthesizeDossier(_view: ObjectiveView) { state.prompts += 1; return 'Brouillon de dossier (LLM).'; },
    get promptsCount() { return state.prompts; },
  } as unknown as LlmGateway & { prompts: number };
}

/* -------------------------------------------------------------- confluence */

export interface CreatedPage { spaceKey: string; title: string; html: string; ari: string }

export function fakeConfluence(): ConfluenceGateway & { pages: CreatedPage[]; updated: string[] } {
  const pages: CreatedPage[] = [];
  const updated: string[] = [];
  return {
    pages,
    updated,
    async createPage(spaceKey, title, html) {
      const ari = `ari:cloud:confluence::page/${pages.length + 1}`;
      pages.push({ spaceKey, title, html, ari });
      return { ari, url: `https://example.atlassian.net/wiki/pages/${pages.length}` };
    },
    async updatePage(ari) { updated.push(ari); return true; },
  };
}

/* ---------------------------------------------------------------- identity */

export function fakeIdentity(): IdentityGateway {
  return { async actorOf(ctx: ActorContext): Promise<Actor> { return { ref: ctx.accountId, isAgent: ctx.fromMcp }; } };
}

/* ------------------------------------------------------------------- queue */

export function fakeQueue(): JobQueue & { messages: RecalcMessage[] } {
  const messages: RecalcMessage[] = [];
  return { messages, async publish(m) { messages.push(m); } };
}

/* ------------------------------------------------------------------ logger */

export interface LogEntry { level: string; message: string; meta?: unknown }

export function fakeLogger(): Logger & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return { entries, log(level, message, meta) { entries.push({ level, message, meta }); } };
}
