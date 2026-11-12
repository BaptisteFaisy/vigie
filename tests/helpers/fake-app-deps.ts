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
import type { AppDeps, Actor, ActionDeps } from '../../src/ports';
import { createTheatreEngine } from '../../src/domain/theatre-engine';
import { createPortfolioEngine } from '../../src/domain/portfolio-engine';
import { createOrphanEngine } from '../../src/domain/orphan-engine';
import { createNightlyEngine } from '../../src/domain/nightly';
import { fakeStore } from './fake-store';
import { fakeJira, fakeGraph, fakePortfolio, fakeLlm, fakeConfluence, fakeIdentity, fakeQueue, fakeLogger } from './fake-gateways';
import { fakeClock, fakeIds } from './fake-clock';

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

  return { store, jira, graph, portfolio, llm, confluence, identity, queue, clock, ids, logger, theatre, portfolioEngine, orphans, nightly };
}

/** Un `ActionDeps` prêt pour appeler un outil MCP en test. */
export function makeActionDeps(actor: Actor = { ref: 'actor_test', isAgent: true }, over: AppDepsOverrides = {}): ActionDeps {
  return { deps: makeAppDeps(over), actor, scope: over.scope ?? TEST_SCOPE };
}
