/**
 * Ports : l'unique frontière entre le domaine pur et le runtime Forge.
 *
 * `src/domain/*` n'importe jamais `@forge/*` ni le réseau : tout passe par ces
 * interfaces, implémentées par `src/db`, `src/collect`, `src/handlers`. C'est ce
 * qui rend toute la chaîne de décision testable avec les fakes de
 * `tests/helpers/` (docs/CONTRACTS.md).
 *
 * Fichier gelé : un lot n'y touche pas, il implémente son interface.
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 *
 * VG-21 : `IssueRef` ne porte volontairement AUCUN assigné — impossible
 * d'agréger du travail par personne puisque la donnée n'entre pas.
 */
import type {
  ActionKey,
  Concordance,
  Cost,
  Coverage,
  Checkin,
  ComputedBy,
  Epoch,
  GraphCursor,
  KeyResult,
  KrPoint,
  Movement,
  Objective,
  ObjectiveLink,
  ObjectiveView,
  Orphan,
  PortfolioBrief,
  Postmortem,
  Projection,
  ReviewDecision,
  Settings,
  TheatreCount,
  TheatreSignal,
} from './types';

/* --------------------------------------------------------------- primitives */

/** Horloge injectée : chaque horodatage de l'app vient de là, jamais `Date.now()`. */
export interface Clock {
  now(): string;
}

/** Identifiants injectés, pour des tests déterministes. */
export interface IdGenerator {
  next(prefix: string): string;
}

export interface Logger {
  log(level: 'info' | 'warn' | 'error', message: string, meta?: unknown): void;
}

/** File Forge (SPEC §20) : le web trigger / le planifié enqueue, le consumer calcule. */
export interface JobQueue {
  publish(message: RecalcMessage): Promise<void>;
}

/** Message de recalcul mis en file (SPEC §20, traitements longs jusqu'à 900 s). */
export interface RecalcMessage {
  readonly scope: string;
  readonly objectiveId: string | null;
  readonly full: boolean;
}

/* ------------------------------------------------------------------ gateways */

/** Une issue Jira, sans assigné (VG-21). Ce que le domaine voit d'un ticket. */
export interface IssueRef {
  readonly id: string;
  readonly key: string;
  readonly projectId: string;
  readonly projectKey: string;
  readonly summary: string;
  readonly issueType: string;
  readonly components: readonly string[];
  readonly labels: readonly string[];
  readonly status: string;
  readonly statusCategory: 'new' | 'indeterminate' | 'done';
  readonly created: string;
  readonly updated: string;
  readonly resolutionDate: string | null;
  readonly isEpic: boolean;
  readonly epicLink: string | null;
  readonly estimateSeconds: number | null;
  readonly spentSeconds: number | null;
}

/** Un changement d'état daté (transitions) — alimente le mouvement (SPEC §4). */
export interface ChangelogItem {
  readonly at: string;
  readonly field: string;
  readonly from: string | null;
  readonly to: string | null;
}

/** Un commit du panneau de développement Bitbucket, daté (SPEC §6, mouvement). */
export interface CommitRef {
  readonly at: string;
  readonly repository: string;
  readonly sha: string;
}

/** Lit Jira (et JSM/Bitbucket via le panneau de développement). */
export interface JiraGateway {
  searchIssues(jql: string, limit: number): Promise<IssueRef[]>;
  getIssue(idOrKey: string): Promise<IssueRef | null>;
  changelog(issueId: string, since: string): Promise<ChangelogItem[]>;
  commits(issueId: string, since: string): Promise<CommitRef[]>;
  /** Temps saisi (source 1 du coût, SPEC §11) ; null si l'organisation n'en saisit pas. */
  worklogSeconds(issueId: string, since: string): Promise<number>;
  /** Incidents JSM liés à un service, pour les RC de niveau A (SPEC §8). */
  jsmIncidentCount(projectKey: string, since: string): Promise<number | null>;
}

/** Un objectif natif lu dans le Teamwork Graph (`AtlassianGoal`, SPEC §20, §22). */
export interface GraphGoal {
  readonly sourceId: string;
  readonly title: string;
  readonly ownerRef: string | null;
  readonly periodLabel: string | null;
  readonly targetValue: number | null;
  readonly currentValue: number | null;
  readonly relatedIssueKeys: readonly string[];
}

/** Un progrès déclaré natif (`AtlassianGoalUpdate`, SPEC §20). */
export interface GraphGoalUpdate {
  readonly goalSourceId: string;
  readonly at: string;
  readonly value: number | null;
  readonly note: string | null;
}

/** Disponibilité et droits du graphe — distingue « pas de droit » de « pas de données ». */
export interface GraphAvailability {
  readonly available: boolean;
  readonly missingRights: readonly string[];
}

/** Adaptateur Teamwork Graph (lecture seule ; l'écriture passe par l'app 2, SPEC §20). */
export interface GraphGateway {
  availability(): Promise<GraphAvailability>;
  listGoals(cursor: string | null): Promise<{ goals: GraphGoal[]; nextCursor: string | null }>;
  listUpdates(goalSourceId: string): Promise<GraphGoalUpdate[]>;
}

/** Un nombre de niveau A produit par une app sœur du portefeuille (SPEC §14). */
export interface LevelAMeasure {
  readonly value: number;
  readonly asOf: string;
  readonly computedBy: ComputedBy;
  readonly reference: string | null;
}

/** Le toit du portefeuille : les apps sœurs comme sources de niveau A (SPEC §14). */
export interface PortfolioGateway {
  debtCostDays(since: string): Promise<LevelAMeasure | null>;          // laddition
  recurringIncidentCost(since: string): Promise<LevelAMeasure | null>; // problemes-caches
  releaseSafetyRate(since: string): Promise<LevelAMeasure | null>;     // rayon-impact
  provenCriteriaRate(since: string): Promise<LevelAMeasure | null>;    // preuve-a-l-appui
  delegatedShare(since: string): Promise<LevelAMeasure | null>;        // delegable-ou-pas
  wikiOpenFireholds(since: string): Promise<LevelAMeasure | null>;     // placard-wiki
}

/** Une proposition de rattachement (SPEC §9) : jamais une devinette, toujours confirmée. */
export interface SuggestedLink {
  readonly issueKey: string;
  readonly confidence: number;
  readonly rationale: string;
}

/** LLM hébergé, borné (SPEC §20) : rattachements candidats et synthèse SEULEMENT. */
export interface LlmGateway {
  suggestLinks(
    objectiveTitle: string,
    scopeKeywords: readonly string[],
    candidates: readonly { key: string; summary: string; components: readonly string[] }[],
  ): Promise<SuggestedLink[]>;
  /** Brouillon de dossier ; l'humain garde la main, jamais de jugement de pointage. */
  synthesizeDossier(view: ObjectiveView): Promise<string>;
}

/** Écriture Confluence : dossier de revue et post-mortem (SPEC §13, §15, §20). */
export interface ConfluenceGateway {
  createPage(spaceKey: string, title: string, storageHtml: string): Promise<{ ari: string; url: string } | null>;
  updatePage(ari: string, storageHtml: string): Promise<boolean>;
}

/** Qui agit (SPEC §18) : un appel MCP/agent est toujours `isAgent`. */
export interface Actor {
  readonly ref: string;
  readonly isAgent: boolean;
}

export interface ActorContext {
  readonly accountId: string;
  readonly moduleId: string;
  readonly fromMcp: boolean;
  readonly cloudId: string;
}

export interface IdentityGateway {
  actorOf(context: ActorContext): Promise<Actor>;
}

/* ------------------------------------------------------------------- storage */

/**
 * Chaque méthode est qualifiée par son entité (`saveObjective`, `getCoverage`…) :
 * `VigieStore` les agrège toutes, et deux stores ne peuvent pas entrer en
 * collision sur un nom (`save`, `get`, `list`). C'est la convention des apps
 * sœurs ; elle rend l'agrégat compilable et la lecture sans ambiguïté.
 */

/** Enregistrement persisté du dossier de revue (SPEC §13) : la page générée. */
export interface DossierRecord {
  readonly objectiveId: string;
  readonly pageAri: string | null;
  readonly generatedAt: string;
  readonly decisionId: string | null;
}

export interface ObjectiveStore {
  getObjective(id: string): Promise<Objective | null>;
  listObjectives(filter: { periodId?: string; state?: string; source?: string; limit?: number }): Promise<Objective[]>;
  findObjectiveBySource(source: string, sourceId: string): Promise<Objective | null>;
  saveObjective(objective: Objective): Promise<void>;
}

export interface KeyResultStore {
  listKeyResultsByObjective(objectiveId: string): Promise<KeyResult[]>;
  getKeyResult(id: string): Promise<KeyResult | null>;
  saveKeyResult(kr: KeyResult): Promise<void>;
}

export interface PointStore {
  listPointsByKr(krId: string, from?: string, to?: string): Promise<KrPoint[]>;
  latestPointForKr(krId: string): Promise<KrPoint | null>;
  savePoint(point: KrPoint): Promise<void>;
}

export interface LinkStore {
  listLinksByObjective(objectiveId: string, state?: string): Promise<ObjectiveLink[]>;
  listLinksByIssue(issueId: string): Promise<ObjectiveLink[]>;
  listActiveLinksByPeriod(periodId: string): Promise<ObjectiveLink[]>;
  countObjectivesForIssue(issueId: string): Promise<number>;
  saveLink(link: ObjectiveLink): Promise<void>;
}

export interface MovementStore {
  listMovementsByObjective(objectiveId: string, fromWeek?: string, toWeek?: string): Promise<Movement[]>;
  listMovementsByIssue(issueId: string): Promise<Movement[]>;
  saveMovement(movement: Movement): Promise<void>;
}

export interface SignalStore {
  listSignalsByObjective(objectiveId: string, activeOnly?: boolean): Promise<TheatreSignal[]>;
  saveSignal(signal: TheatreSignal): Promise<void>;
  replaceSignalsForObjective(objectiveId: string, signals: readonly TheatreSignal[]): Promise<void>;
  dismissSignal(id: string, reason: string, until: string): Promise<boolean>;
}

export interface ProjectionStore {
  latestProjectionForKr(krId: string): Promise<Projection | null>;
  saveProjection(projection: Projection): Promise<void>;
}

export interface ConcordanceStore {
  latestConcordanceForKr(krId: string): Promise<Concordance | null>;
  saveConcordance(concordance: Concordance): Promise<void>;
}

export interface CostStore {
  latestCostForObjective(objectiveId: string, periodId: string): Promise<Cost | null>;
  portfolioCostTotals(periodId: string): Promise<{ totalDays: number; unattributedDays: number }>;
  saveCost(cost: Cost): Promise<void>;
}

export interface CheckinStore {
  listCheckinsByObjective(objectiveId: string): Promise<Checkin[]>;
  saveCheckin(checkin: Checkin): Promise<void>;
}

export interface DecisionStore {
  latestDecisionForObjective(objectiveId: string): Promise<ReviewDecision | null>;
  listDecisionsToVerify(periodId: string): Promise<ReviewDecision[]>;
  saveDecision(decision: ReviewDecision): Promise<void>;
}

export interface OrphanStore {
  listOrphans(filter: { projectKey?: string; limit?: number }): Promise<Orphan[]>;
  saveOrphan(orphan: Orphan): Promise<void>;
  resolveOrphan(issueId: string, at: string): Promise<boolean>;
}

export interface EpochStore {
  listEpochs(): Promise<Epoch[]>;
  currentEpoch(at: string): Promise<Epoch | null>;
  saveEpoch(epoch: Epoch): Promise<void>;
}

export interface PostmortemStore {
  latestPostmortemForObjective(objectiveId: string): Promise<Postmortem | null>;
  savePostmortem(postmortem: Postmortem): Promise<void>;
}

export interface DossierStore {
  getDossierRecord(objectiveId: string): Promise<DossierRecord | null>;
  saveDossierRecord(record: DossierRecord): Promise<void>;
}

export interface CoverageStore {
  getCoverage(scope: string): Promise<Coverage | null>;
  saveCoverage(coverage: Coverage): Promise<void>;
}

export interface SettingsStore {
  getSettings(scope: string): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<void>;
}

export interface CursorStore {
  getCursor(objectType: string): Promise<GraphCursor | null>;
  saveCursor(cursor: GraphCursor): Promise<void>;
}

/** Toute la surface de persistance, assemblée dans `src/db/repo.ts`. */
export interface VigieStore
  extends ObjectiveStore,
    KeyResultStore,
    PointStore,
    LinkStore,
    MovementStore,
    SignalStore,
    ProjectionStore,
    ConcordanceStore,
    CostStore,
    CheckinStore,
    DecisionStore,
    OrphanStore,
    EpochStore,
    PostmortemStore,
    DossierStore,
    CoverageStore,
    SettingsStore,
    CursorStore {}

/* ------------------------------------------------------------------- engines */

/**
 * Qualifie UN objectif de bout en bout (SPEC §6-§11) : mouvement, signaux,
 * état, degré, série, projection, coût, concordance — et persiste le tout.
 * Implémenté par le domaine ; appelé par les handlers, le MCP et l'agent pour
 * que tous lisent la même ligne (jamais de recalcul divergent).
 */
export interface TheatreEngine {
  qualify(objectiveId: string): Promise<ObjectiveView | null>;
  qualifyAll(periodId: string): Promise<ObjectiveView[]>;
}

/** Le portefeuille et le compteur de théâtre (SPEC §13, §19). */
export interface PortfolioEngine {
  brief(periodId: string): Promise<PortfolioBrief>;
  theatreCount(periodId: string): Promise<TheatreCount>;
}

/** Le verso : les fantômes, avec objectif plausible et confiance (SPEC §7, VG-12). */
export interface OrphanEngine {
  detect(periodId: string): Promise<Orphan[]>;
}

/** Recalcul nocturne / à la demande : séries A, mouvements, projections, coûts (SPEC §20). */
export interface NightlyEngine {
  run(message: RecalcMessage): Promise<{ objectives: number; calls: number; tokens: number }>;
}

/* ------------------------------------------------------------- dependencies */

/** Tout ce dont un handler a besoin, injecté, jamais global (assemblé dans deps.ts). */
export interface AppDeps {
  readonly store: VigieStore;
  readonly jira: JiraGateway;
  readonly graph: GraphGateway;
  readonly portfolio: PortfolioGateway;
  readonly llm: LlmGateway;
  readonly confluence: ConfluenceGateway;
  readonly identity: IdentityGateway;
  readonly queue: JobQueue;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly theatre: TheatreEngine;
  readonly portfolioEngine: PortfolioEngine;
  readonly orphans: OrphanEngine;
  readonly nightly: NightlyEngine;
  readonly schema: SchemaPort;
  readonly registerSync: RegisterSync;
}

/**
 * Garantit que le schéma de la base est en place avant la première lecture.
 *
 * Forge SQL ne crée aucune table tout seul : le DDL de `src/db/schema.ts` doit
 * être appliqué (SPEC §21). Le port existe pour que les handlers n'importent
 * jamais `@forge/*` et que les tests tournent sans runtime.
 */
export interface SchemaPort {
  ensure(): Promise<void>;
}

/**
 * Peuple le registre local depuis Jira réel, UNE fois (SPEC §20).
 *
 * `syncIfEmpty` importe les epics réels, leurs enfants et les fantômes si le
 * registre est vide, et rend `null` sinon. Idempotent : le recalcul nocturne
 * peut l'appeler à chaque run.
 */
export interface RegisterSummary {
  readonly objectives: number;
  readonly issues: number;
  readonly ghosts: number;
  readonly epochs: number;
}

export interface RegisterSync {
  syncIfEmpty(): Promise<RegisterSummary | null>;
}

/** Ce qu'un outil MCP reçoit pour s'exécuter (SPEC §18). */
export interface ActionDeps {  readonly deps: AppDeps;
  readonly actor: Actor;
  readonly scope: string;
}

/** Signature uniforme d'un outil : entrées plates, sortie typée, jamais d'exception. */
export type ActionHandler<TIn, TOut> = (
  input: TIn,
  ctx: ActionDeps,
) => Promise<{ ok: true; value: TOut } | { ok: false; error: string; reason?: string }>;

/** Registre des 15 outils (SPEC §18) — `ActionKey` vient de types.ts. */
export type ActionRegistry = Readonly<Record<ActionKey, ActionHandler<Record<string, unknown>, unknown>>>;
