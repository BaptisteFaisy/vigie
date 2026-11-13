/**
 * `AppDeps` complet en mémoire — infra de test PARTAGÉE.
 *
 * Assemble les VRAIS moteurs (theatre, portfolio, orphan, nightly) sur un
 * `VigieStore` en mémoire (`fake-store`) et des gateways factices
 * (`fake-gateways`). Les actions MCP (L6) et la recette (L12) l'utilisent pour
 * tester le produit de bout en bout, sans Forge ni réseau.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { AppDeps, Actor, ActionDeps } from '../../src/ports.js';
import { createTheatreEngine } from '../../src/domain/theatre-engine.js';
import { createPortfolioEngine } from '../../src/domain/portfolio-engine.js';
import { createOrphanEngine } from '../../src/domain/orphan-engine.js';
import { createNightlyEngine } from '../../src/domain/nightly.js';
import { fakeStore } from './fake-store.js';
import { fakeJira, fakeGraph, fakePortfolio, fakeLlm, fakeConfluence, fakeIdentity, fakeQueue, fakeLogger } from './fake-gateways.js';
import { fakeClock, fakeIds } from './fake-clock.js';

export const TEST_SCOPE = 'cloud_test';

export interface AppDepsOverrides extends Partial<AppDeps> {
  scope?: string;
}

/** Construit un AppDeps fonctionnel (moteurs réels + fakes), écrivable à la marge. */
export function makeAppDeps(over: AppDepsOverrides = {}): AppDeps {
  const scope = over.scope ?? TEST_SCOPE;
  const store = over.store ?? fakeStore();
  const clock = over.clock ?? fakeClock();
  const ids = over.ids ?? fakeIds();
  const logger = over.logger ?? fakeLogger();
  const jira = over.jira ?? fakeJira();
  const graph = over.graph ?? fakeGraph();
  const portfolio = over.portfolio ?? fakePortfolio();
  const llm = over.llm ?? fakeLlm();
  const confluence = over.confluence ?? fakeConfluence();
  const identity = over.identity ?? fakeIdentity();
  const queue = over.queue ?? fakeQueue();

  const engineDeps = { store, clock, ids, logger, scope };
  const theatre = over.theatre ?? createTheatreEngine(engineDeps);
  const portfolioEngine = over.portfolioEngine ?? createPortfolioEngine(engineDeps, theatre);
  const orphans = over.orphans ?? createOrphanEngine({ ...engineDeps, jira });
  const nightly = over.nightly ?? createNightlyEngine({ ...engineDeps, jira, graph, portfolio, theatre, orphans });
  const schema = over.schema ?? { ensure: async () => { /* la base en mémoire a déjà son schéma */ } };
  const registerSync = over.registerSync ?? { syncIfIncomplete: async () => null };

  return { store, jira, graph, portfolio, llm, confluence, identity, queue, clock, ids, logger, theatre, portfolioEngine, orphans, nightly, schema, registerSync };
}

/** Un `ActionDeps` prêt pour appeler un outil MCP en test. */
export function makeActionDeps(actor: Actor = { ref: 'actor_test', isAgent: true }, over: AppDepsOverrides = {}): ActionDeps {
  return { deps: makeAppDeps(over), actor, scope: over.scope ?? TEST_SCOPE };
}
