/**
 * Contrat gelé — le vocabulaire du produit (SPEC §4) et les entités (§21).
 *
 * Tout le dépôt code contre ce fichier. `src/domain/*` est pur : il n'importe
 * que d'ici et de `./ports.js`, jamais `@forge/*`. Les entrées/sorties passent
 * par les ports (docs/CONTRACTS.md).
 *
 * Règle maison : fichiers < 500 lignes, fonctions < 50 lignes.
 *
 * Principe transversal (§5, VG-21) : AUCUNE statistique par personne. Les
 * `*_ref` (owner, auteur) servent à la responsabilité et à l'audit ; ils ne
 * sont JAMAIS agrégés, classés, ni renvoyés par un outil MCP, un écran ou
 * l'agent. La garde `no-person-stats` (tests/acceptance) le vérifie.
 */

/* --------------------------------------------------------- source du nombre */

/**
 * Niveau de source d'un nombre (SPEC §8) : la pièce centrale.
 * - `A` calculé par l'app depuis les données Atlassian ou une app sœur ;
 * - `B` saisi avec une référence vérifiable et une date ;
 * - `C` déclaré sans source (un nombre tapé dans une case).
 */
export type SourceLevel = 'A' | 'B' | 'C';

/** D'où vient un point de niveau A (traçabilité du recalcul, SPEC §8, §14). */
export type ComputedBy =
  | 'jira' | 'jsm' | 'bitbucket'
  | 'laddition' | 'problemes-caches' | 'rayon-impact'
  | 'preuve-a-l-appui' | 'delegable-ou-pas' | 'placard-wiki' | 'none';

/* ------------------------------------------------- degrés et états (§6, §7) */

/**
 * Les quatre degrés (SPEC §6). Un objectif « avance » veut dire quatre choses
 * différentes ; l'app les sépare et ne monte jamais un degré sans son fait.
 * Ordre croissant — `degreeRank` dans le domaine.
 */
export type Degree = 'declare' | 'travaille' | 'avance' | 'concordant';

/**
 * Les sept états de théâtre (SPEC §7), qualifiés d'après des faits.
 * `vivant` est le seul état sain ; les six autres nomment une dérive.
 */
export type TheatreState =
  | 'vivant'
  | 'narratif'
  | 'travaille-muet'
  | 'decoratif'
  | 'orphelin'
  | 'sous-calibre'
  | 'mort-vivant';

/** Les douze signaux + S0 (SPEC §7). Tous faits mesurables, seuils réglables. */
export type SignalId =
  | 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'
  | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12';
// S0 aucun rattachement · S1 masse · S2 travail gelé · S3 nombre sans source ·
// S4 série plate · S5 récit sans travail · S6 non falsifiable · S7 hors périmètre ·
// S8 atteinte précoce · S9 cible répétée · S10 silence · S11 mort-vivant · S12 double comptage.

/** Adaptateur de source d'objectifs actif (SPEC §20, VG-01). */
export type ObjectiveSource = 'graph' | 'local' | 'import';

/* ----------------------------------------------------- objectif et RC (§4) */

export type ObjectiveState = 'draft' | 'open' | 'closed' | 'abandoned';

/** Résultat clé : `number` (valeur, cible, sens) ou `binary` (exige une preuve). */
export type KrKind = 'number' | 'binary';

/** Sens attendu du nombre : `up` = plus c'est mieux, `down` = moins c'est mieux. */
export type Direction = 'up' | 'down';
/** Type de preuve d'un RC binaire — grille de `preuve-a-l-appui` (machine/attestée/déclarée). */
export type ProofType = 'machine' | 'attestee' | 'declaree';

/** Périmètre déclaré d'un objectif : sert S7 (rattachement hors périmètre). */
export interface Scope {
  readonly projectKeys: readonly string[];
  readonly components: readonly string[];
  readonly teams: readonly string[];
}

/** Un objectif (SPEC §4, table `objective` §21). */
export interface Objective {
  readonly id: string;
  readonly source: ObjectiveSource;
  /** Identifiant chez la source (ARI du graphe, clé Jira du registre, ligne import). */
  readonly sourceId: string;
  readonly title: string;
  /** Référence de responsabilité — jamais agrégée ni affichée en statistique (VG-21). */
  readonly ownerRef: string | null;
  readonly periodId: string;
  readonly parentId: string | null;
  readonly state: ObjectiveState;
  readonly scope: Scope;
  readonly createdAt: string;
  readonly closedAt: string | null;
  /** Calculé, jamais saisi : le dernier état de théâtre qualifié (SPEC §7). */
  readonly theatreState: TheatreState | null;
}

/** Un résultat clé (SPEC §4, table `key_result` §21). */
export interface KeyResult {
  readonly id: string;
  readonly objectiveId: string;
  readonly title: string;
  readonly kind: KrKind;
  readonly unit: string | null;
  readonly direction: Direction;
  readonly baseline: number | null;
  readonly target: number | null;
  /** Dernière valeur connue ; pour un niveau A elle est recalculée, jamais recopiée. */
  readonly current: number | null;
  readonly sourceLevel: SourceLevel;
  readonly proofType: ProofType | null;
  /** Pour un RC de niveau A : la source qui permet de le RECALCULER (§8). */
  readonly computedBy?: ComputedBy | null;
  /** Un RC sans nombre ni type de preuve est non falsifiable (S6). */
  readonly falsifiable: boolean;
}

/** Provenance d'un point de série : garde la trace du niveau et de la source. */
export interface PointSourceRef {
  readonly kind: 'computed' | 'reference' | 'declared';
  readonly url?: string;
  readonly computedBy?: ComputedBy;
  readonly note?: string;
}

/** Un point de la série d'un RC (SPEC §4, table `kr_point` §21). */
export interface KrPoint {
  readonly id: string;
  readonly krId: string;
  readonly value: number;
  readonly measuredAt: string;
  readonly source: PointSourceRef;
  readonly sourceLevel: SourceLevel;
  /** Époque du point : les séries ne mélangent jamais deux époques (SPEC §16). */
  readonly epochId: string | null;
}

/* ---------------------------------------------- rattachement et mouvement (§9) */

/** Pourquoi un rattachement existe (SPEC §9) — sans raison, il est « non motivé ». */
export type LinkState = 'active' | 'unmotivated' | 'detached';

/** Lien objectif ↔ ticket, avec raison écrite et fraction (SPEC §9, VG-02). */
export interface ObjectiveLink {
  readonly id: string;
  readonly objectiveId: string;
  readonly issueId: string;
  readonly issueKey: string;
  /** Part du ticket qui sert cet objectif : 1/n par défaut, jamais 100 % partout (S12). */
  readonly fraction: number;
  readonly reason: string | null;
  /** Référence d'audit (qui a rattaché) — nourrit S1, jamais une statistique (VG-21). */
  readonly linkedByRef: string | null;
  readonly linkedAt: string;
  readonly verifiedAt: string | null;
  readonly state: LinkState;
}

/** D'où viennent les jours d'un ticket (SPEC §11) — la source retenue est affichée. */
export type DaysSource = 'logged' | 'estimated' | 'cycle' | 'none';

/** Mouvement hebdomadaire d'un ticket rattaché (SPEC §4, table `movement` §21). */
export interface Movement {
  readonly issueId: string;
  readonly issueKey: string;
  /** Semaine ISO, normalisée : `${année}-S${semaine}` (ex. `2026-S45`). */
  readonly week: string;
  readonly epochId: string | null;
  readonly transitions: number;
  readonly commits: number;
  readonly closed: boolean;
  readonly cycleDays: number | null;
  readonly daysSpent: number;
  readonly daysSource: DaysSource;
}

/* --------------------------------------------- signaux et état de théâtre (§7) */

/** Le fait mesurable qui fonde un signal : valeur observée, seuil, date (SPEC §7). */
export interface SignalFact {
  readonly signal: SignalId;
  /** Valeur observée (ex. nombre de tickets liés le même jour, jours de gel). */
  readonly value: number;
  readonly threshold: number;
  readonly at: string;
  /** Détail lisible en français : clés de tickets, dates, composants — jamais de personne. */
  readonly detail: string;
  /** Même fait en anglais (SPEC §24) — généré depuis les mêmes paramètres. */
  readonly detailEn: string;
}

/** Un signal déclenché, éventuellement écarté avec raison et réexamen (SPEC §7). */
export interface TheatreSignal {
  readonly id: string;
  readonly objectiveId: string;
  readonly signal: SignalId;
  readonly facts: readonly SignalFact[];
  readonly firedAt: string;
  readonly dismissedReason: string | null;
  readonly dismissedUntil: string | null;
}

/** Les faits qui fondent le degré atteint (SPEC §6) — affichés avec le degré. */
export interface DegreeBasis {
  readonly degree: Degree;
  readonly facts: readonly string[];
}

/* ------------------------------------------ projection, concordance, coût (§10-11) */

/** Conclusion unique d'une projection (SPEC §10). « pas assez de recul » en est une. */
export type ProjectionConclusion =
  | 'atteignable'
  | 'atteignable-sous-condition'
  | 'pas-atteignable'
  | 'pas-assez-de-recul';

/** Ce qui ferait changer la réponse (SPEC §10), en clair. */
export interface ProjectionLever {
  readonly text: string;
  /** Même levier en anglais (SPEC §24). */
  readonly textEn: string;
}

/** Projection honnête : fourchette + effectif + hypothèses, sinon « pas assez de recul ». */
export interface Projection {
  readonly id: string;
  readonly krId: string;
  readonly computedAt: string;
  readonly method: string;
  readonly weeksUsed: number;
  /** Effectif affiché : semaines ou tickets utilisés (SPEC §10). */
  readonly n: number;
  /** Pourcentage de la cible atteint à la projection ; null si pas assez de recul. */
  readonly pct: number | null;
  readonly ciLow: number | null;
  readonly ciHigh: number | null;
  readonly conclusion: ProjectionConclusion;
  readonly assumptions: readonly string[];
  /** Mêmes hypothèses en anglais (SPEC §24). */
  readonly assumptionsEn: readonly string[];
  readonly levers: readonly ProjectionLever[];
  readonly epochId: string | null;
}

/** Concordance travail ↔ nombre (SPEC §6, degré 4) : jamais une causalité. */
export interface Concordance {
  readonly id: string;
  readonly krId: string;
  readonly windowFrom: string;
  readonly windowTo: string;
  readonly workMoved: boolean;
  readonly numberMoved: boolean;
  /** Ce qui d'autre a changé dans la fenêtre — toujours listé (SPEC §6). */
  readonly otherChanges: readonly OtherChange[];
  readonly degree: Degree;
  readonly computedAt: string;
}

/** Un autre mouvement de la fenêtre que l'app ne peut pas exclure (SPEC §6). */
export interface OtherChange {
  readonly kind: 'release' | 'incident' | 'other-objective' | 'campaign' | 'reorg';
  readonly label: string;
  readonly at: string;
}

/** Coût de l'intention (SPEC §11) : jours consommés, méthode, part partagée. */
export interface Cost {
  readonly id: string;
  readonly objectiveId: string;
  readonly periodId: string;
  readonly days: number;
  readonly method: DaysSource;
  /** Nombre d'objectifs avec lesquels le travail est partagé (fractions). */
  readonly sharedWithCount: number;
  readonly unattributedDays: number;
  /** Jours par point de RC gagné, avec fourchette (SPEC §11). */
  readonly ratioPerPoint: number | null;
  readonly ratioCiLow: number | null;
  readonly ratioCiHigh: number | null;
  readonly computedAt: string;
}

/* ---------------------------------- pointage, revue, décision, fantôme (§12-15) */

/** Faits pré-remplis AVANT l'interprétation humaine (SPEC §12, pointage inversé). */
export interface CheckinFacts {
  readonly degree: Degree;
  readonly theatreState: TheatreState | null;
  readonly activeSignals: readonly SignalId[];
  readonly weekMovement: Movement | null;
  readonly newPoints: readonly KrPoint[];
  readonly projectionPct: number | null;
  readonly projectionConclusion: ProjectionConclusion | null;
  readonly costDays: number | null;
}

/** Un pointage : faits d'un côté, interprétation de l'autre (SPEC §12). */
export interface Checkin {
  readonly id: string;
  readonly objectiveId: string;
  readonly at: string;
  readonly facts: CheckinFacts;
  readonly interpretation: string;
  readonly byRef: string | null;
}

/** Trois options chiffrées d'une revue (SPEC §13). */
export type ReviewOptionKind = 'continue' | 'retarget' | 'abandon';

export interface ReviewOption {
  readonly kind: ReviewOptionKind;
  readonly label: string;
  readonly detail: string;
  readonly costDays: number | null;
  /** Pour `retarget` : la cible que le rythme rend crédible. */
  readonly suggestedTarget: number | null;
  /** Pour `abandon` : le travail qui devient fantôme (SPEC §13). */
  readonly orphanedIssueKeys: readonly string[];
}

/** Décision de revue enregistrée, puis vérifiée à la période suivante (SPEC §13). */
export interface ReviewDecision {
  readonly id: string;
  readonly objectiveId: string;
  readonly decision: ReviewOptionKind;
  readonly reason: string;
  readonly at: string;
  readonly byRef: string | null;
  readonly followed: boolean | null;
  readonly verifiedAt: string | null;
}

/** Dossier de revue généré (SPEC §13) — page Confluence modifiable. */
export interface ReviewDossier {
  readonly objectiveId: string;
  readonly theatreState: TheatreState | null;
  readonly degree: Degree;
  readonly signals: readonly TheatreSignal[];
  readonly series: readonly KrPoint[];
  readonly projection: Projection | null;
  readonly cost: Cost | null;
  readonly movement: readonly Movement[];
  readonly otherChanges: readonly OtherChange[];
  readonly options: readonly ReviewOption[];
  readonly decision: ReviewDecision | null;
  readonly pageAri: string | null;
}

/** Un fantôme (SPEC §7 verso) : ticket qui avance sans servir d'objectif déclaré. */
export interface Orphan {
  readonly issueId: string;
  readonly issueKey: string;
  readonly projectKey: string | null;
  readonly detectedAt: string;
  readonly suggestedObjectiveId: string | null;
  /** 0..1 ; sous le seuil, l'app dit « pas assez de recul », pas une devinette. */
  readonly confidence: number;
  readonly reason: string | null;
  readonly daysSpent: number;
  readonly resolvedAt: string | null;
}

/* ------------------------------------------------ époques, post-mortem (§15-16) */

/** Une époque : période où l'organisation n'a pas changé (SPEC §16). */
export interface Epoch {
  readonly id: string;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly label: string;
  readonly scopeChange: string | null;
}

/** Post-mortem d'objectif (SPEC §15) : réussi ou abandonné, même bilan. */
export interface Postmortem {
  readonly id: string;
  readonly objectiveId: string;
  readonly pageAri: string | null;
  readonly issuedAt: string;
  readonly moved: boolean;
  readonly landed: boolean;
  readonly learned: readonly string[];
}

/* --------------------------------------------- couverture, réglages, curseur */

/** Ce que l'app voit et ne voit pas (SPEC §19, VG-19) — écran de couverture. */
export interface Coverage {
  readonly scope: string;
  readonly sourceActive: ObjectiveSource;
  readonly rightsMissing: readonly string[];
  readonly workLinkedPct: number;
  readonly krLevelAPct: number;
  readonly computedAt: string;
}

/** Seuils réglables des signaux (SPEC §7) — chaque signal a son fait et son seuil. */
export type SignalThresholds = Readonly<Record<SignalId, number>>;

/** Politique d'attribution du coût (SPEC §11). */
export interface AttributionPolicy {
  readonly defaultFraction: 'auto' | 'manual';
  readonly maxObjectivesPerIssue: number;
}

/** Réglages de l'installation (SPEC §19, écran 9). */
export interface Settings {
  readonly scope: string;
  readonly thresholds: SignalThresholds;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly currentEpochId: string | null;
  readonly sources: {
    readonly active: ObjectiveSource;
    readonly graphEnabled: boolean;
    readonly portfolioAppsEnabled: boolean;
  };
  readonly attribution: AttributionPolicy;
  readonly language: 'en' | 'fr';
}

/** Curseur de pagination du graphe et des recalculs longs (SPEC §20, table §21). */
export interface GraphCursor {
  readonly objectType: string;
  readonly lastId: string | null;
  readonly lastRunAt: string | null;
}

/* ---------------------------------------------------- vue de l'objectif (VM) */

/** L'état calculé complet d'un objectif — ce que lisent écrans, MCP et agent. */
export interface ObjectiveView {
  readonly objective: Objective;
  readonly keyResults: readonly KeyResult[];
  readonly degree: Degree;
  readonly degreeBasis: DegreeBasis;
  readonly theatreState: TheatreState | null;
  readonly signals: readonly TheatreSignal[];
  readonly series: readonly KrPoint[];
  readonly projection: Projection | null;
  readonly cost: Cost | null;
  readonly concordance: Concordance | null;
  readonly links: readonly ObjectiveLink[];
  readonly movement: readonly Movement[];
}

/** Première page d'une revue de direction (SPEC §13, §19) — le portefeuille. */
export interface PortfolioBrief {
  readonly periodId: string;
  readonly byState: Readonly<Record<TheatreState, number>>;
  readonly workLinkedPct: number;
  readonly ghostPct: number;
  readonly totalDays: number;
  readonly unattributedDays: number;
  readonly krLevelAPct: number;
  readonly objectives: readonly ObjectiveView[];
}

/** Compteur de théâtre de la période (SPEC §19, gadget) — par état + signaux dominants. */
export interface TheatreCount {
  readonly periodId: string;
  readonly byState: Readonly<Record<TheatreState, number>>;
  readonly dominantSignals: readonly { readonly signal: SignalId; readonly count: number }[];
}

/* ------------------------------------------------------------- actions (MCP) */

/** Résultat d'un outil MCP (SPEC §18). `ok=false` porte une raison, jamais une exception. */
export type ActionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string; readonly reason?: string };

/** Les 15 clés d'outil du SPEC §18. */
export type ActionKey =
  | 'get-objective'
  | 'list-objectives'
  | 'count-theatre'
  | 'get-kr-series'
  | 'get-projection'
  | 'get-goal-cost'
  | 'list-goal-orphans'
  | 'get-concordance'
  | 'get-review-dossier'
  | 'get-portfolio-brief'
  | 'link-work'
  | 'record-kr-number'
  | 'record-checkin'
  | 'record-decision'
  | 'open-postmortem';
