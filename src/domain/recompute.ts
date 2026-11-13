/**
 * Recalcul des résultats clés de niveau A (SPEC §8) — « la pièce centrale ».
 *
 * Un RC de niveau A est **recalculé**, jamais recopié : chaque nuit (et à la
 * demande), l'app recompute la valeur depuis les données Atlassian ou depuis une
 * app sœur du portefeuille (§14), écrit un nouveau point de série, et mesure
 * l'**écart** avec la dernière valeur recopiée à la main (recette §25 item 5).
 *
 * Le domaine reste pur : les gateways arrivent en paramètres (ports), jamais
 * `@forge/*`. Un échec de source rend `null` — l'app préfère « pas de mesure » à
 * une mesure fausse (§23 robustesse).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { JiraGateway, PortfolioGateway } from '../ports';
import type { ComputedBy, KeyResult, KrPoint, Movement, ObjectiveLink } from '../types';
import { sortedPoints } from './series';

export interface RecomputeInput {
  kr: KeyResult;
  /** Rattachements non détachés de l'objectif. */
  links: readonly ObjectiveLink[];
  /** Mouvements de ces tickets. */
  movements: readonly Movement[];
  /** Projet pour les mesures JSM. */
  projectKey: string | null;
  /** Début de période. */
  since: string;
  jira?: JiraGateway | null;
  portfolio?: PortfolioGateway | null;
}

export interface RecomputedValue {
  value: number;
  reference: string;
  computedBy: ComputedBy;
}

/** Part des tickets rattachés qui sont clos, depuis les mouvements stockés. */
function closedShare(links: readonly ObjectiveLink[], movements: readonly Movement[]): RecomputedValue | null {
  const issueIds = new Set(links.map((l) => l.issueId));
  if (issueIds.size === 0) return null;
  const closed = new Set(movements.filter((m) => m.closed).map((m) => m.issueId));
  const closedCount = [...issueIds].filter((id) => closed.has(id)).length;
  const value = Math.round((closedCount / issueIds.size) * 1000) / 10;
  return { value, reference: `${closedCount}/${issueIds.size} tickets rattachés clos`, computedBy: 'jira' };
}

async function fromPortfolio(portfolio: PortfolioGateway | null | undefined, source: ComputedBy, since: string): Promise<RecomputedValue | null> {
  if (!portfolio) return null;
  const calls: Partial<Record<ComputedBy, () => Promise<import('../ports').LevelAMeasure | null>>> = {
    laddition: () => portfolio.debtCostDays(since),
    'problemes-caches': () => portfolio.recurringIncidentCost(since),
    'rayon-impact': () => portfolio.releaseSafetyRate(since),
    'preuve-a-l-appui': () => portfolio.provenCriteriaRate(since),
    'delegable-ou-pas': () => portfolio.delegatedShare(since),
    'placard-wiki': () => portfolio.wikiOpenFireholds(since),
  };
  const call = calls[source];
  if (!call) return null;
  try {
    const measure = await call();
    return measure ? { value: measure.value, reference: measure.reference ?? source, computedBy: measure.computedBy } : null;
  } catch {
    return null;
  }
}

/** Recalcule la valeur d'un RC de niveau A ; `null` si la source ne répond pas. */
export async function recomputeLevelA(input: RecomputeInput): Promise<RecomputedValue | null> {
  const source = input.kr.computedBy ?? null;
  if (!source || source === 'none') return null;
  if (source === 'jira') return closedShare(input.links, input.movements);
  if (source === 'jsm') {
    if (!input.jira || !input.projectKey) return null;
    try {
      const count = await input.jira.jsmIncidentCount(input.projectKey, input.since);
      return count === null ? null : { value: count, reference: `incidents JSM ${input.projectKey} depuis ${input.since.slice(0, 10)}`, computedBy: 'jsm' };
    } catch {
      return null;
    }
  }
  if (source === 'bitbucket') return null; // déploiements : à brancher sur le graphe (§22)
  return fromPortfolio(input.portfolio, source, input.since);
}

/** Écart entre la dernière valeur recalculée et la dernière valeur recopiée (§8). */
export interface SourceGap {
  recomputed: number;
  copied: number;
  gap: number;
  recomputedAt: string;
  copiedAt: string;
  copiedLevel: 'B' | 'C';
}

export function sourceGap(series: readonly KrPoint[]): SourceGap | null {
  const sorted = sortedPoints(series);
  const computed = [...sorted].reverse().find((p) => p.source.kind === 'computed');
  const copied = [...sorted].reverse().find((p) => p.source.kind !== 'computed' && p.sourceLevel !== 'A');
  if (!computed || !copied) return null;
  return {
    recomputed: computed.value,
    copied: copied.value,
    gap: Math.round((computed.value - copied.value) * 100) / 100,
    recomputedAt: computed.measuredAt,
    copiedAt: copied.measuredAt,
    copiedLevel: copied.sourceLevel === 'B' ? 'B' : 'C',
  };
}
