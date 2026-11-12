/**
 * Mapping ligne SQL ↔ entité du domaine (SPEC §21).
 *
 * Un seul endroit pour transformer une ligne de Forge SQL en objet du contrat
 * (`src/types.ts`), en tolérant les colonnes absentes ou corrompues (repli
 * documenté, jamais d'exception — §23). Les helpers scalaires viennent de
 * `mapping-common.ts`. Les écritures (entité → paramètres `?`) sont dans
 * `repo.ts`. VG-21 : les `*_ref` sont lus pour l'audit mais aucune fonction ici
 * ne les agrège.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type {
  Checkin, Concordance, Cost, Coverage, Epoch, GraphCursor, KeyResult, KrPoint,
  Movement, Objective, ObjectiveLink, Orphan, Postmortem, Projection,
  ReviewDecision, Scope, Settings, TheatreSignal, SignalFact, OtherChange,
  ProjectionLever, AttributionPolicy, CheckinFacts,
} from '../types.js';
import type { DossierRecord } from '../ports.js';
import {
  text, toNumber, toNullableNumber, parseJson, fromSqlBoolean, toNullableBoolean,
  parseEnum, parseEnumOrNull, fromTimestamp, emptyToNull, isObject,
} from './mapping-common.js';

type Row = Record<string, unknown>;

const SOURCE_LEVELS = ['A', 'B', 'C'] as const;
const DIRECTIONS = ['up', 'down'] as const;
const SOURCES = ['graph', 'local', 'import'] as const;
const OBJ_STATES = ['draft', 'open', 'closed', 'abandoned'] as const;
const THEATRE = ['vivant', 'narratif', 'travaille-muet', 'decoratif', 'orphelin', 'sous-calibre', 'mort-vivant'] as const;
const LINK_STATES = ['active', 'unmotivated', 'detached'] as const;
const DAYS_SOURCES = ['logged', 'estimated', 'cycle', 'none'] as const;
const CONCLUSIONS = ['atteignable', 'atteignable-sous-condition', 'pas-atteignable', 'pas-assez-de-recul'] as const;
const DEGREES = ['declare', 'travaille', 'avance', 'concordant'] as const;
const DECISIONS = ['continue', 'retarget', 'abandon'] as const;
const PROOF_TYPES = ['machine', 'attestee', 'declaree'] as const;

function scopeOf(row: Row): Scope {
  const raw = parseJson<Partial<Scope>>(row.scope_json, {});
  return {
    projectKeys: Array.isArray(raw.projectKeys) ? raw.projectKeys : [],
    components: Array.isArray(raw.components) ? raw.components : [],
    teams: Array.isArray(raw.teams) ? raw.teams : [],
  };
}

export function rowObjective(row: Row): Objective {
  return {
    id: text(row.id), source: parseEnum(row.source, SOURCES, 'local'), sourceId: text(row.source_id),
    title: text(row.title), ownerRef: emptyToNull(row.owner_ref), periodId: text(row.period_id),
    parentId: emptyToNull(row.parent_id), state: parseEnum(row.state, OBJ_STATES, 'open'),
    scope: scopeOf(row), createdAt: fromTimestamp(row.created_at), closedAt: emptyToNull(row.closed_at) ? fromTimestamp(row.closed_at) : null,
    theatreState: parseEnumOrNull(row.theatre_state, THEATRE),
  };
}

export function rowKeyResult(row: Row): KeyResult {
  return {
    id: text(row.id), objectiveId: text(row.objective_id), title: text(row.title),
    kind: parseEnum(row.kind, ['number', 'binary'] as const, 'number'), unit: emptyToNull(row.unit),
    direction: parseEnum(row.direction, DIRECTIONS, 'up'), baseline: toNullableNumber(row.baseline),
    target: toNullableNumber(row.target), current: toNullableNumber(row.current_value),
    sourceLevel: parseEnum(row.source_level, SOURCE_LEVELS, 'C'), proofType: parseEnumOrNull(row.proof_type, PROOF_TYPES),
    computedBy: (emptyToNull(row.computed_by) ?? null) as KeyResult['computedBy'],
    falsifiable: fromSqlBoolean(row.falsifiable, true),
  };
}

export function rowPoint(row: Row): KrPoint {
  const source = parseJson<KrPoint['source']>(row.source_json, { kind: 'declared' }, isObject);
  return {
    id: text(row.id), krId: text(row.kr_id), value: toNumber(row.value), measuredAt: fromTimestamp(row.measured_at),
    source, sourceLevel: parseEnum(row.source_level, SOURCE_LEVELS, 'C'), epochId: emptyToNull(row.epoch_id),
  };
}

export function rowLink(row: Row): ObjectiveLink {
  return {
    id: text(row.id), objectiveId: text(row.objective_id), issueId: text(row.issue_id), issueKey: text(row.issue_key),
    fraction: toNumber(row.fraction, 1), reason: emptyToNull(row.reason), linkedByRef: emptyToNull(row.linked_by_ref),
    linkedAt: fromTimestamp(row.linked_at), verifiedAt: emptyToNull(row.verified_at) ? fromTimestamp(row.verified_at) : null,
    state: parseEnum(row.state, LINK_STATES, 'active'),
  };
}

export function rowMovement(row: Row): Movement {
  return {
    issueId: text(row.issue_id), issueKey: text(row.issue_key), week: text(row.week), epochId: emptyToNull(row.epoch_id),
    transitions: toNumber(row.transitions), commits: toNumber(row.commits), closed: fromSqlBoolean(row.closed),
    cycleDays: toNullableNumber(row.cycle_days), daysSpent: toNumber(row.days_spent),
    daysSource: parseEnum(row.days_source, DAYS_SOURCES, 'none'),
  };
}

export function rowSignal(row: Row): TheatreSignal {
  return {
    id: text(row.id), objectiveId: text(row.objective_id), signal: text(row.signal) as TheatreSignal['signal'],
    facts: parseJson<SignalFact[]>(row.facts_json, [], (v) => Array.isArray(v)),
    firedAt: fromTimestamp(row.fired_at), dismissedReason: emptyToNull(row.dismissed_reason),
    dismissedUntil: emptyToNull(row.dismissed_until) ? fromTimestamp(row.dismissed_until) : null,
  };
}

export function rowProjection(row: Row): Projection {
  const assumptions = parseJson<{ fr?: string[]; en?: string[] }>(row.assumptions_json, {}, isObject);
  const fr = Array.isArray(assumptions.fr) ? assumptions.fr : [];
  const en = Array.isArray(assumptions.en) ? assumptions.en : fr;
  return {
    id: text(row.id), krId: text(row.kr_id), computedAt: fromTimestamp(row.computed_at), method: text(row.method),
    weeksUsed: toNumber(row.weeks_used), n: toNumber(row.n), pct: toNullableNumber(row.pct),
    ciLow: toNullableNumber(row.ci_low), ciHigh: toNullableNumber(row.ci_high),
    conclusion: parseEnum(row.conclusion, CONCLUSIONS, 'pas-assez-de-recul'),
    assumptions: fr,
    assumptionsEn: en,
    levers: parseJson<ProjectionLever[]>(row.levers_json, [], (v) => Array.isArray(v)),
    epochId: emptyToNull(row.epoch_id),
  };
}

export function rowConcordance(row: Row): Concordance {
  return {
    id: text(row.id), krId: text(row.kr_id), windowFrom: fromTimestamp(row.window_from), windowTo: fromTimestamp(row.window_to),
    workMoved: fromSqlBoolean(row.work_moved), numberMoved: fromSqlBoolean(row.number_moved),
    otherChanges: parseJson<OtherChange[]>(row.other_changes_json, [], (v) => Array.isArray(v)),
    degree: parseEnum(row.degree, DEGREES, 'declare'), computedAt: fromTimestamp(row.computed_at),
  };
}

export function rowCost(row: Row): Cost {
  return {
    id: text(row.id), objectiveId: text(row.objective_id), periodId: text(row.period_id), days: toNumber(row.days),
    method: parseEnum(row.method, DAYS_SOURCES, 'none'), sharedWithCount: toNumber(row.shared_with_count, 1),
    unattributedDays: toNumber(row.unattributed_days), ratioPerPoint: toNullableNumber(row.ratio_per_point),
    ratioCiLow: toNullableNumber(row.ratio_ci_low), ratioCiHigh: toNullableNumber(row.ratio_ci_high),
    computedAt: fromTimestamp(row.computed_at),
  };
}

export function rowCheckin(row: Row): Checkin {
  return {
    id: text(row.id), objectiveId: text(row.objective_id), at: fromTimestamp(row.at),
    facts: parseJson<CheckinFacts>(row.facts_json, {
      degree: 'declare', theatreState: null, activeSignals: [], weekMovement: null, newPoints: [],
      projectionPct: null, projectionConclusion: null, costDays: null,
    }, isObject),
    interpretation: text(row.interpretation), byRef: emptyToNull(row.by_ref),
  };
}

export function rowDecision(row: Row): ReviewDecision {
  return {
    id: text(row.id), objectiveId: text(row.objective_id), decision: parseEnum(row.decision, DECISIONS, 'continue'),
    reason: text(row.reason), at: fromTimestamp(row.at), byRef: emptyToNull(row.by_ref),
    followed: toNullableBoolean(row.followed), verifiedAt: emptyToNull(row.verified_at) ? fromTimestamp(row.verified_at) : null,
  };
}

export function rowOrphan(row: Row): Orphan {
  return {
    issueId: text(row.issue_id), issueKey: text(row.issue_key), projectKey: emptyToNull(row.project_key),
    detectedAt: fromTimestamp(row.detected_at), suggestedObjectiveId: emptyToNull(row.suggested_objective_id),
    confidence: toNumber(row.confidence), reason: emptyToNull(row.reason), daysSpent: toNumber(row.days_spent),
    resolvedAt: emptyToNull(row.resolved_at) ? fromTimestamp(row.resolved_at) : null,
  };
}

export function rowEpoch(row: Row): Epoch {
  return {
    id: text(row.id), startsAt: fromTimestamp(row.starts_at), endsAt: emptyToNull(row.ends_at) ? fromTimestamp(row.ends_at) : null,
    label: text(row.label), scopeChange: emptyToNull(row.scope_change_json),
  };
}

export function rowPostmortem(row: Row): Postmortem {
  return {
    id: text(row.id), objectiveId: text(row.objective_id), pageAri: emptyToNull(row.page_ari), issuedAt: fromTimestamp(row.issued_at),
    moved: fromSqlBoolean(row.moved), landed: fromSqlBoolean(row.landed),
    learned: parseJson<string[]>(row.learned_json, [], (v) => Array.isArray(v)),
  };
}

export function rowCoverage(row: Row): Coverage {
  return {
    scope: text(row.scope), sourceActive: parseEnum(row.source_active, SOURCES, 'local'),
    rightsMissing: parseJson<string[]>(row.rights_missing_json, [], (v) => Array.isArray(v)),
    workLinkedPct: toNumber(row.work_linked_pct), krLevelAPct: toNumber(row.kr_level_a_pct), computedAt: fromTimestamp(row.computed_at),
  };
}

export function rowSettings(row: Row): Settings {
  const thresholds = parseJson<Settings['thresholds']>(row.thresholds_json, {} as Settings['thresholds'], isObject);
  const sources = parseJson<Settings['sources']>(row.sources_json, { active: 'local', graphEnabled: false, portfolioAppsEnabled: true }, isObject);
  const attribution = parseJson<AttributionPolicy>(row.attribution_json, { defaultFraction: 'auto', maxObjectivesPerIssue: 3 }, isObject);
  return {
    scope: text(row.scope), thresholds, periodStart: fromTimestamp(row.period_start), periodEnd: fromTimestamp(row.period_end),
    currentEpochId: emptyToNull(row.current_epoch_id), sources, attribution,
    language: parseEnum(row.language, ['en', 'fr'] as const, 'fr'),
  };
}

export function rowCursor(row: Row): GraphCursor {
  return { objectType: text(row.object_type), lastId: emptyToNull(row.last_id), lastRunAt: emptyToNull(row.last_run_at) ? fromTimestamp(row.last_run_at) : null };
}

export function rowDossier(row: Row): DossierRecord {
  return {
    objectiveId: text(row.objective_id), pageAri: emptyToNull(row.page_ari),
    generatedAt: fromTimestamp(row.generated_at), decisionId: emptyToNull(row.decision_id),
  };
}
