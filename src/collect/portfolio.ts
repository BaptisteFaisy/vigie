/**
 * Le toit du portefeuille (SPEC §14) : les apps sœurs comme sources de niveau A.
 *
 * `laddition`, `problemes-caches`, `rayon-impact`, `preuve-a-l-appui`,
 * `delegable-ou-pas` et `placard-wiki` produisent déjà des nombres fiables.
 * Vigie les consomme comme RC de niveau A. Les endpoints exacts de ces apps ne
 * sont pas figés ici : ils sont configurables, et un appel qui échoue rend
 * `null` (dégradation gracieuse) — l'écran de couverture dira « source absente »
 * plutôt que d'afficher un zéro faux (§23). `fetchJson` est injectable (tests).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { LevelAMeasure, PortfolioGateway } from '../ports';
import type { ComputedBy } from '../types';

export interface PortfolioDeps {
  fetchJson?: (url: string) => Promise<unknown>;
  /** Base par app sœur ; absente → la mesure rend null. */
  endpoints?: Partial<Record<ComputedBy, string>>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toMeasure(raw: unknown, computedBy: ComputedBy): LevelAMeasure | null {
  const r = asRecord(raw);
  if (typeof r.value !== 'number' || !Number.isFinite(r.value)) return null;
  return {
    value: r.value,
    asOf: typeof r.asOf === 'string' ? r.asOf : new Date(0).toISOString(),
    computedBy,
    reference: typeof r.reference === 'string' ? r.reference : null,
  };
}

/** Crée l'adaptateur du portefeuille d'apps sœurs. */
export function createPortfolioGateway(deps: PortfolioDeps = {}): PortfolioGateway {
  const fetchJson = deps.fetchJson ?? (async () => null);
  const endpoints = deps.endpoints ?? {};

  const measure = async (app: ComputedBy): Promise<LevelAMeasure | null> => {
    const url = endpoints[app];
    if (!url) return null;
    try {
      return toMeasure(await fetchJson(url), app);
    } catch {
      return null;
    }
  };

  return {
    debtCostDays: () => measure('laddition'),
    recurringIncidentCost: () => measure('problemes-caches'),
    releaseSafetyRate: () => measure('rayon-impact'),
    provenCriteriaRate: () => measure('preuve-a-l-appui'),
    delegatedShare: () => measure('delegable-ou-pas'),
    wikiOpenFireholds: () => measure('placard-wiki'),
  };
}
