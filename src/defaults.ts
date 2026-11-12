/**
 * Constantes et seuils par défaut — tous réglables (SPEC §7, écran Réglages §19).
 *
 * Chaque signal a un fait déclencheur et un seuil (SPEC §7). Ces valeurs sont
 * celles du cahier des charges ; l'écran de réglages les écrase par
 * installation. Le domaine lit les seuils depuis `Settings`, jamais d'ici en
 * dur — ce fichier ne fournit que le défaut.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type {
  AttributionPolicy,
  Degree,
  Direction,
  ObjectiveSource,
  Settings,
  SignalId,
  SignalThresholds,
  TheatreState,
} from './types';

/* -------------------------------------------------------------- énumérations */

/** Les treize signaux, dans l'ordre du SPEC §7. */
export const SIGNAL_IDS: readonly SignalId[] = [
  'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12',
] as const;

/** Les sept états de théâtre (SPEC §7). `vivant` est le seul état sain. */
export const THEATRE_STATES: readonly TheatreState[] = [
  'vivant', 'narratif', 'travaille-muet', 'decoratif', 'orphelin', 'sous-calibre', 'mort-vivant',
] as const;

/** Les quatre degrés, du plus faible au plus fort (SPEC §6). */
export const DEGREE_ORDER: readonly Degree[] = ['declare', 'travaille', 'avance', 'concordant'] as const;

/** Adaptateurs de source, du plus riche au plus universel (SPEC §20). */
export const SOURCE_ORDER: readonly ObjectiveSource[] = ['graph', 'local', 'import'] as const;

/* ------------------------------------------------------------------- seuils */

/**
 * Seuils par défaut des signaux (SPEC §7). Sens de chaque valeur :
 * S0 liens (0 = aucun) · S1 tickets liés le même jour · S2 jours de gel ·
 * S3 RC de niveau C (0 = dès le premier) · S4 semaines sans variation ·
 * S5 pointages pendant un gel · S6 RC non falsifiables · S7 tickets hors périmètre ·
 * S8 fraction de période avant atteinte · S9 cibles répétées · S10 jours de silence ·
 * S11 jours après clôture · S12 objectifs partageant un ticket sans fraction.
 */
export const DEFAULT_THRESHOLDS: SignalThresholds = {
  S0: 0,
  S1: 5,
  S2: 21,
  S3: 0,
  S4: 6,
  S5: 3,
  S6: 0,
  S7: 0,
  S8: 0.5,
  S9: 0,
  S10: 45,
  S11: 30,
  S12: 3,
};

/** Projection honnête (SPEC §10) : sous ces seuils, « pas assez de recul ». */
export const PROJECTION_DEFAULTS = {
  /** Fenêtre de rythme : les 6 dernières semaines. */
  lookbackWeeks: 6,
  /** Sous 4 semaines de données, on refuse de conclure. */
  minWeeks: 4,
  /** Sous 5 tickets rattachés, on refuse de conclure. */
  minTickets: 5,
  /** Intervalle de confiance (fourchette systématique). */
  confidence: 0.8,
} as const;

/** Concordance (SPEC §6, degré 4) : fenêtre où le travail précède le nombre. */
export const CONCORDANCE_DEFAULTS = {
  windowWeeks: 3,
} as const;

/** Verso / fantômes (SPEC §7) : sous cette confiance, « pas assez de recul ». */
export const ORPHAN_DEFAULTS = {
  minConfidence: 0.4,
} as const;

/** Coût de l'intention (SPEC §11) : ordre de préférence des sources de jours. */
export const COST_SOURCE_ORDER = ['logged', 'estimated', 'cycle'] as const;

/* ------------------------------------------------------------------ réglages */

export const DEFAULT_ATTRIBUTION: AttributionPolicy = {
  defaultFraction: 'auto',
  maxObjectivesPerIssue: 3,
};

export const DEFAULT_PERIOD = {
  /** Période de démonstration : un trimestre (SPEC §27). */
  id: 'demo-2026-T4',
  start: '2026-10-01T00:00:00.000Z',
  end: '2026-12-31T23:59:59.000Z',
} as const;

/** Fabrique les réglages par défaut d'une installation (portée = cloudId). */
export function defaultSettings(scope: string, overrides?: Partial<Settings>): Settings {
  const base: Settings = {
    scope,
    thresholds: DEFAULT_THRESHOLDS,
    periodStart: DEFAULT_PERIOD.start,
    periodEnd: DEFAULT_PERIOD.end,
    currentEpochId: null,
    sources: { active: 'local', graphEnabled: false, portfolioAppsEnabled: true },
    attribution: DEFAULT_ATTRIBUTION,
    language: 'fr',
  };
  return overrides ? { ...base, ...overrides } : base;
}

/** Direction par défaut d'un RC quand aucune n'est déclarée (SPEC §8). */
export const DEFAULT_DIRECTION: Direction = 'up';
