/**
 * Fabriques de fixtures pour les tests (CONTRACTS §0 : fakes partagés).
 *
 * Une fonction par entité du contrat (`src/types.ts`), avec des valeurs par
 * défaut cohérentes et un `Partial` pour écraser ce qu'un test veut. Aucun lot
 * ne réinvente ses fixtures : on cherche ici avant d'écrire.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type {
  Checkin,
  CheckinFacts,
  Concordance,
  Cost,
  Coverage,
  Epoch,
  GraphCursor,
  KeyResult,
  KrPoint,
  Movement,
  Objective,
  ObjectiveLink,
  Orphan,
  Postmortem,
  Projection,
  ReviewDecision,
  Scope,
  Settings,
  TheatreSignal,
} from '../../src/types.js';
import { DEFAULT_PERIOD, DEFAULT_THRESHOLDS, defaultSettings } from '../../src/defaults.js';

type Over<T> = Partial<Omit<T, never>>;

export function makeScope(over: Over<Scope> = {}): Scope {
  return { projectKeys: ['PAY'], components: ['payments'], teams: ['team-pay'], ...over };
}

export function makeObjective(over: Over<Objective> = {}): Objective {
  return {
    id: 'obj_1',
    source: 'local',
    sourceId: 'GOAL-1',
    title: 'Réduire la latence de paiement',
    ownerRef: 'owner_ref_1',
    periodId: DEFAULT_PERIOD.id,
    parentId: null,
    state: 'open',
    scope: makeScope(),
    createdAt: '2026-10-01T09:00:00.000Z',
    closedAt: null,
    theatreState: null,
    ...over,
  };
}

export function makeKeyResult(over: Over<KeyResult> = {}): KeyResult {
  return {
    id: 'kr_1',
    objectiveId: 'obj_1',
    title: 'Latence p95 en ms',
    kind: 'number',
    unit: 'ms',
    direction: 'down',
    baseline: 900,
    target: 400,
    current: 900,
    sourceLevel: 'A',
    proofType: null,
    falsifiable: true,
    ...over,
  };
}

export function makePoint(over: Over<KrPoint> = {}): KrPoint {
  return {
    id: 'pt_1',
    krId: 'kr_1',
    value: 900,
    measuredAt: '2026-10-01T09:00:00.000Z',
    source: { kind: 'computed', computedBy: 'jira' },
    sourceLevel: 'A',
    epochId: null,
    ...over,
  };
}

export function makeLink(over: Over<ObjectiveLink> = {}): ObjectiveLink {
  return {
    id: 'lnk_1',
    objectiveId: 'obj_1',
    issueId: '10001',
    issueKey: 'PAY-1',
    fraction: 1,
    reason: 'Refonte du service de paiement.',
    linkedByRef: 'actor_ref_1',
    linkedAt: '2026-10-02T10:00:00.000Z',
    verifiedAt: null,
    state: 'active',
    ...over,
  };
}

export function makeMovement(over: Over<Movement> = {}): Movement {
  return {
    issueId: '10001',
    issueKey: 'PAY-1',
    week: '2026-S41',
    epochId: null,
    transitions: 2,
    commits: 3,
    closed: false,
    cycleDays: null,
    daysSpent: 1.5,
    daysSource: 'logged',
    ...over,
  };
}

export function makeSignal(over: Over<TheatreSignal> = {}): TheatreSignal {
  return {
    id: 'sig_1',
    objectiveId: 'obj_1',
    signal: 'S2',
    facts: [{ signal: 'S2', value: 30, threshold: 21, at: '2026-11-01T00:00:00.000Z', detail: 'Aucune transition depuis 30 jours.' }],
    firedAt: '2026-11-01T00:00:00.000Z',
    dismissedReason: null,
    dismissedUntil: null,
    ...over,
  };
}

export function makeProjection(over: Over<Projection> = {}): Projection {
  return {
    id: 'proj_1',
    krId: 'kr_1',
    computedAt: '2026-11-11T02:00:00.000Z',
    method: 'linear-6w',
    weeksUsed: 6,
    n: 6,
    pct: 62,
    ciLow: 48,
    ciHigh: 75,
    conclusion: 'atteignable-sous-condition',
    assumptions: ['rythme constant', 'périmètre inchangé'],
    levers: [{ text: 'Il manque environ 3 epics, ou un doublement du rythme sur 4 semaines.' }],
    epochId: null,
    ...over,
  };
}

export function makeConcordance(over: Over<Concordance> = {}): Concordance {
  return {
    id: 'conc_1',
    krId: 'kr_1',
    windowFrom: '2026-10-01T00:00:00.000Z',
    windowTo: '2026-10-22T00:00:00.000Z',
    workMoved: true,
    numberMoved: true,
    otherChanges: [],
    degree: 'concordant',
    computedAt: '2026-11-11T02:00:00.000Z',
    ...over,
  };
}

export function makeCost(over: Over<Cost> = {}): Cost {
  return {
    id: 'cost_1',
    objectiveId: 'obj_1',
    periodId: DEFAULT_PERIOD.id,
    days: 12.5,
    method: 'logged',
    sharedWithCount: 1,
    unattributedDays: 0,
    ratioPerPoint: 2.5,
    ratioCiLow: 2,
    ratioCiHigh: 3.1,
    computedAt: '2026-11-11T02:00:00.000Z',
    ...over,
  };
}

export function makeCheckinFacts(over: Over<CheckinFacts> = {}): CheckinFacts {
  return {
    degree: 'travaille',
    theatreState: 'vivant',
    activeSignals: [],
    weekMovement: makeMovement(),
    newPoints: [],
    projectionPct: 62,
    projectionConclusion: 'atteignable-sous-condition',
    costDays: 12.5,
    ...over,
  };
}

export function makeCheckin(over: Over<Checkin> = {}): Checkin {
  return {
    id: 'chk_1',
    objectiveId: 'obj_1',
    at: '2026-11-08T17:00:00.000Z',
    facts: makeCheckinFacts(),
    interpretation: 'En bonne voie.',
    byRef: 'actor_ref_1',
    ...over,
  };
}

export function makeDecision(over: Over<ReviewDecision> = {}): ReviewDecision {
  return {
    id: 'dec_1',
    objectiveId: 'obj_1',
    decision: 'continue',
    reason: 'Le rythme est suffisant.',
    at: '2026-11-10T10:00:00.000Z',
    byRef: 'actor_ref_1',
    followed: null,
    verifiedAt: null,
    ...over,
  };
}

export function makeOrphan(over: Over<Orphan> = {}): Orphan {
  return {
    issueId: '10050',
    issueKey: 'PAY-50',
    projectKey: 'PAY',
    detectedAt: '2026-11-11T02:00:00.000Z',
    suggestedObjectiveId: 'obj_1',
    confidence: 0.62,
    reason: 'Composant payments, titre proche.',
    daysSpent: 3,
    resolvedAt: null,
    ...over,
  };
}

export function makeEpoch(over: Over<Epoch> = {}): Epoch {
  return {
    id: 'ep_1',
    startsAt: '2026-10-01T00:00:00.000Z',
    endsAt: null,
    label: 'Équipe paiements stable',
    scopeChange: null,
    ...over,
  };
}

export function makePostmortem(over: Over<Postmortem> = {}): Postmortem {
  return {
    id: 'pm_1',
    objectiveId: 'obj_1',
    pageAri: null,
    issuedAt: '2026-12-31T18:00:00.000Z',
    moved: true,
    landed: true,
    learned: ['La cible était trop prudente.'],
    ...over,
  };
}

export function makeCoverage(over: Over<Coverage> = {}): Coverage {
  return {
    scope: 'cloud_1',
    sourceActive: 'local',
    rightsMissing: [],
    workLinkedPct: 82,
    krLevelAPct: 57,
    computedAt: '2026-11-11T02:00:00.000Z',
    ...over,
  };
}

export function makeSettings(over: Over<Settings> = {}): Settings {
  return defaultSettings('cloud_1', { thresholds: DEFAULT_THRESHOLDS, ...over });
}

export function makeCursor(over: Over<GraphCursor> = {}): GraphCursor {
  return { objectType: 'AtlassianGoal', lastId: null, lastRunAt: null, ...over };
}
