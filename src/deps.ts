/**
 * Graphe de dépendances : le seul endroit où le runtime Forge est construit.
 *
 * Les handlers reçoivent `AppDeps` (ports.ts) et n'importent jamais `@forge/*`
 * eux-mêmes — c'est ce qui rend toute la chaîne testable avec `fake-app-deps`.
 * Les gateways réelles viennent de `src/collect`, le store réel de `src/db`,
 * les moteurs de `src/domain`. Le scope (cloudId de l'installation) est figé à
 * la construction : pour la démo, une installation = un scope.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { AppDeps, Clock, IdGenerator, JobQueue, Logger } from './ports';
import { createStore } from './db/repo';
import { createForgeSqlClient } from './db/sql-client';
import { ensureSchema } from './db/ensure-schema';
import { syncRegisterFromJira } from './collect/register-jira';
import { createJiraGateway } from './collect/jira';
import { createGraphGateway } from './collect/graph';
import { createPortfolioGateway } from './collect/portfolio';
import { createLlmGateway } from './collect/llm';
import { createConfluenceGateway } from './collect/confluence';
import { createIdentityGateway } from './collect/identity';
import { createTheatreEngine } from './domain/theatre-engine';
import { createPortfolioEngine } from './domain/portfolio-engine';
import { createOrphanEngine } from './domain/orphan-engine';
import { createNightlyEngine } from './domain/nightly';

export const DEFAULT_SCOPE = 'forge-installation';

/** Horloge réelle : tous les horodatages passent par là. */
export const systemClock: Clock = { now: () => new Date().toISOString() };

/** Identifiants réels, lisibles. */
export function createSystemIds(): IdGenerator {
  let counter = 0;
  return {
    next(prefix: string) {
      counter += 1;
      return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
    },
  };
}

/** Logger minimal vers la console Forge. */
export const systemLogger: Logger = {
  log: (level, message, meta) => {
    // eslint-disable-next-line no-console
    if (level === 'error') console.error(message, meta ?? '');
    else if (level === 'warn') console.warn(message, meta ?? '');
    else console.log(message, meta ?? '');
  },
};

/** Construit le graphe de dépendances complet (production). */
export function createAppDeps(queue: JobQueue, scope: string = DEFAULT_SCOPE): AppDeps {
  const store = createStore(createForgeSqlClient());
  const clock = systemClock;
  const ids = createSystemIds();
  const logger = systemLogger;
  const jira = createJiraGateway();
  const graph = createGraphGateway();
  const portfolio = createPortfolioGateway();
  const llm = createLlmGateway();
  const confluence = createConfluenceGateway();
  const identity = createIdentityGateway();

  const engineDeps = { store, clock, ids, logger, scope };
  const theatre = createTheatreEngine(engineDeps);
  const portfolioEngine = createPortfolioEngine(engineDeps, theatre);
  const orphans = createOrphanEngine({ ...engineDeps, jira });
  const nightly = createNightlyEngine({ ...engineDeps, jira, graph, portfolio, theatre, orphans });
  const schema = { ensure: async (): Promise<void> => { await ensureSchema(); } };
  const registerSync = {
    syncIfEmpty: () => syncRegisterFromJira(store, jira, { scope, site: scope }),
  };

  return { store, jira, graph, portfolio, llm, confluence, identity, queue, clock, ids, logger, theatre, portfolioEngine, orphans, nightly, schema, registerSync };
}