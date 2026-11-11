/**
 * Resolver des modules UI : définit les fonctions invoquées par le frontend via
 * `@forge/bridge` `invoke(...)`. Chaque écran (registre, couverture, verso,
 * encart ticket) a sa fonction. Les données viennent des moteurs (point de calcul
 * unique) et sont mises en forme par `src/viewmodel/ui.ts` (pur).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { AppDeps } from '../ports.js';
import type { Lang } from '../i18n/index.js';
import { DEFAULT_PERIOD } from '../defaults.js';
import { registerRows, coverageView, orphanRow, portfolioHead } from '../viewmodel/ui.js';

/** Forme structurelle de `@forge/resolver` (testable sans runtime). */
export interface ResolverLike {
  define(key: string, fn: (request: unknown) => Promise<unknown>): void;
}

interface ResolverRequest {
  payload?: { language?: string; periodId?: string; issueId?: string };
  context?: { cloudId?: string };
}

function langOf(request: ResolverRequest): Lang {
  return request.payload?.language?.startsWith('fr') ? 'fr' : 'en';
}

function periodOf(request: ResolverRequest): string {
  return typeof request.payload?.periodId === 'string' ? request.payload.periodId : DEFAULT_PERIOD.id;
}

/** Enregistre les fonctions du resolver (appelées par `invoke`). */
export function registerResolvers(resolver: ResolverLike, deps: AppDeps): void {
  resolver.define('get-register', async (request) => {
    const req = request as ResolverRequest;
    const brief = await deps.portfolioEngine.brief(periodOf(req));
    return { rows: registerRows(brief.objectives, langOf(req)), head: portfolioHead(brief, langOf(req)), byState: brief.byState };
  });

  resolver.define('get-coverage', async (request) => {
    const req = request as ResolverRequest;
    const coverage = await deps.store.getCoverage(req.context?.cloudId ?? '');
    return coverageView(coverage, langOf(req));
  });

  resolver.define('get-verso', async () => {
    const orphans = await deps.store.listOrphans({});
    return orphans.map((o) => orphanRow(o));
  });

  resolver.define('get-feature', async (request) => {
    const req = request as ResolverRequest;
    const issueId = req.payload?.issueId;
    if (!issueId) return [];
    return deps.store.listLinksByIssue(String(issueId));
  });
}