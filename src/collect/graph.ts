/**
 * Adaptateur Teamwork Graph (SPEC §20, §22) — LECTURE SEULE.
 *
 * Lit les objectifs natifs (`AtlassianGoal`) et leurs progrès
 * (`AtlassianGoalUpdate`) via GraphQL. Contraintes vérifiées (§22) : le Cypher
 * brut est refusé aux nouvelles apps → requêtes prêtes/persistées ; la lecture se
 * fait au nom d'un utilisateur ; un droit manquant OMET les données sans erreur,
 * donc `availability()` distingue « pas de droit » de « pas de données ».
 *
 * L'ÉCRITURE dans le graphe passe par l'app jumelle « Le graveur » (connecteur),
 * jamais ici : une app ne peut pas faire les deux (§20). Forme de requête à
 * valider sur site réel (§22) — `queryGraphql` est injectable pour les tests.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { GraphAvailability, GraphGateway, GraphGoal, GraphGoalUpdate } from '../ports.js';
import { loadApi } from './forge-runtime.js';

export interface GraphDeps {
  queryGraphql?: (query: string, variables?: Record<string, unknown>) => Promise<GraphResult>;
}

export interface GraphResult {
  data?: unknown;
  errors?: { message: string; extensions?: { code?: string } }[];
}

const GOAL_QUERY = `query ListGoals($cursor: String) {
  teamworkGraph {
    atlassianGoals(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { id name owner { accountId } targetDate currentValue targetValue relatedWorkItems { key } }
    }
  }
}`;

const UPDATE_QUERY = `query GoalUpdates($goalId: ID!) {
  teamworkGraph {
    atlassianGoalUpdates(goalId: $goalId, first: 50) {
      nodes { createdAt progress message }
    }
  }
}`;

function defaultQuery(): (q: string, v?: Record<string, unknown>) => Promise<GraphResult> {
  return async (query, variables) => {
    const api = await loadApi();
    if (typeof api.requestGraph !== 'function') return { errors: [{ message: 'requestGraph indisponible', extensions: { code: 'NO_GRAPH' } }] };
    return (await api.requestGraph(query, variables)) as GraphResult;
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function isPermissionError(result: GraphResult): boolean {
  return (result.errors ?? []).some((e) => /permission|scope|forbidden|unauthor|not.*allow/i.test(e.message ?? ''));
}

function toGoal(node: unknown): GraphGoal {
  const n = asRecord(node);
  const owner = asRecord(n.owner);
  const related = Array.isArray(n.relatedWorkItems) ? n.relatedWorkItems.map((w) => asRecord(w).key).filter((k): k is string => typeof k === 'string') : [];
  return {
    sourceId: typeof n.id === 'string' ? n.id : '',
    title: typeof n.name === 'string' ? n.name : '',
    ownerRef: typeof owner.accountId === 'string' ? owner.accountId : null,
    periodLabel: typeof n.targetDate === 'string' ? n.targetDate : null,
    targetValue: typeof n.targetValue === 'number' ? n.targetValue : null,
    currentValue: typeof n.currentValue === 'number' ? n.currentValue : null,
    relatedIssueKeys: related,
  };
}

/** Crée l'adaptateur Teamwork Graph (lecture). */
export function createGraphGateway(deps: GraphDeps = {}): GraphGateway {
  const query = deps.queryGraphql ?? defaultQuery();

  return {
    async availability(): Promise<GraphAvailability> {
      const probe = await query(GOAL_QUERY, { cursor: null });
      if (isPermissionError(probe)) return { available: false, missingRights: ['read:graph:work-item'] };
      if (probe.errors && probe.errors.length > 0) return { available: false, missingRights: ['read:graph:work-item'] };
      return { available: true, missingRights: [] };
    },

    async listGoals(cursor: string | null): Promise<{ goals: GraphGoal[]; nextCursor: string | null }> {
      const result = await query(GOAL_QUERY, { cursor });
      if (result.errors || !result.data) return { goals: [], nextCursor: null };
      const connection = asRecord(asRecord(result.data).teamworkGraph).atlassianGoals;
      const nodes = asRecord(connection).nodes;
      const pageInfo = asRecord(asRecord(connection).pageInfo);
      const goals = Array.isArray(nodes) ? nodes.map(toGoal) : [];
      const nextCursor = pageInfo.hasNextPage === true && typeof pageInfo.endCursor === 'string' ? pageInfo.endCursor : null;
      return { goals, nextCursor };
    },

    async listUpdates(goalSourceId: string): Promise<GraphGoalUpdate[]> {
      const result = await query(UPDATE_QUERY, { goalId: goalSourceId });
      if (result.errors || !result.data) return [];
      const nodes = asRecord(asRecord(asRecord(result.data).teamworkGraph).atlassianGoalUpdates).nodes;
      if (!Array.isArray(nodes)) return [];
      return nodes.map((raw) => {
        const n = asRecord(raw);
        return {
          goalSourceId,
          at: typeof n.createdAt === 'string' ? n.createdAt : '',
          value: typeof n.progress === 'number' ? n.progress : null,
          note: typeof n.message === 'string' ? n.message : null,
        };
      });
    },
  };
}
