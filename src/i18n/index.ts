/**
 * Catalogue i18n (SPEC §24, §23) — interface en anglais ET en français.
 *
 * Toute chaîne visible passe par `t(lang, key)` ; une clé par valeur de domaine
 * (états, signaux, degrés). Le registre (tableau) est équivalent à la carte
 * marine et WCAG AA : les libellés portent l'information, la « brume »
 * (pas assez de recul) n'est jamais le seul codage (§23).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */

export type Lang = 'en' | 'fr';

type Messages = Record<string, string>;

const en: Messages = {
  'theatre.vivant': 'Alive',
  'theatre.narratif': 'Narrative',
  'theatre.travaille-muet': 'Mute worker',
  'theatre.decoratif': 'Decorative',
  'theatre.orphelin': 'Orphan',
  'theatre.sous-calibre': 'Under-calibrated',
  'theatre.mort-vivant': 'Zombie',
  'degree.declare': 'Declared',
  'degree.travaille': 'Worked',
  'degree.avance': 'Advanced',
  'degree.concordant': 'Concordant',
  'signal.S0.label': 'No attachment',
  'signal.S1.label': 'Bulk attach',
  'signal.S2.label': 'Frozen work',
  'signal.S3.label': 'Sourceless number',
  'signal.S4.label': 'Flat series',
  'signal.S5.label': 'Story without work',
  'signal.S6.label': 'Not falsifiable',
  'signal.S7.label': 'Out of scope',
  'signal.S8.label': 'Early reach',
  'signal.S9.label': 'Repeated target',
  'signal.S10.label': 'Silence',
  'signal.S11.label': 'Zombie',
  'signal.S12.label': 'Double count',
  'register.title': 'Registre de bord',
  'register.objective': 'Objective',
  'register.state': 'State',
  'register.degree': 'Degree',
  'register.signals': 'Signals',
  'register.cost': 'Cost (days)',
  'register.projection': 'Projection',
  'register.empty': 'No objectives.',
  'cover.title': 'Coverage',
  'cover.source': 'Active source',
  'cover.rightsMissing': 'Missing rights',
  'cover.workLinked': 'Work linked',
  'cover.levelA': 'Key results measured (level A)',
  'cover.noData': 'No data (distinct from missing rights).',
  'projection.not-enough': 'Not enough data',
  'verso.title': 'Ghosts',
  'verso.objective': 'Suggested objective',
  'verso.confidence': 'Confidence',
  'source.A': 'A — computed',
  'source.B': 'B — referenced',
  'source.C': 'C — declared',
};

const fr: Messages = {
  'theatre.vivant': 'Vivant',
  'theatre.narratif': 'Narratif',
  'theatre.travaille-muet': 'Travaillé-muet',
  'theatre.decoratif': 'Décoratif',
  'theatre.orphelin': 'Orphelin',
  'theatre.sous-calibre': 'Sous-calibré',
  'theatre.mort-vivant': 'Mort-vivant',
  'degree.declare': 'Déclaré',
  'degree.travaille': 'Travaillé',
  'degree.avance': 'Avancé',
  'degree.concordant': 'Concordant',
  'signal.S0.label': 'Aucun rattachement',
  'signal.S1.label': 'Rattachement en masse',
  'signal.S2.label': 'Travail gelé',
  'signal.S3.label': 'Nombre sans source',
  'signal.S4.label': 'Série plate',
  'signal.S5.label': 'Récit sans travail',
  'signal.S6.label': 'Non falsifiable',
  'signal.S7.label': 'Hors périmètre',
  'signal.S8.label': 'Atteinte précoce',
  'signal.S9.label': 'Cible répétée',
  'signal.S10.label': 'Silence',
  'signal.S11.label': 'Mort-vivant',
  'signal.S12.label': 'Double comptage',
  'register.title': 'Registre de bord',
  'register.objective': 'Objectif',
  'register.state': 'État',
  'register.degree': 'Degré',
  'register.signals': 'Signaux',
  'register.cost': 'Coût (jours)',
  'register.projection': 'Projection',
  'register.empty': 'Aucun objectif.',
  'cover.title': 'Couverture',
  'cover.source': 'Source active',
  'cover.rightsMissing': 'Droits manquants',
  'cover.workLinked': 'Travail rattaché',
  'cover.levelA': 'Résultats clés mesurés (niveau A)',
  'cover.noData': 'Pas de données (distinct d’un droit manquant).',
  'projection.not-enough': 'Pas assez de recul',
  'verso.title': 'Fantômes',
  'verso.objective': 'Objectif suggéré',
  'verso.confidence': 'Confiance',
  'source.A': 'A — calculé',
  'source.B': 'B — référencé',
  'source.C': 'C — déclaré',
};

const catalog: Record<Lang, Messages> = { en, fr };

/** Traduit une clé ; repli sur la clé elle-même (jamais de chaîne vide). */
export function t(lang: Lang, key: string): string {
  return catalog[lang]?.[key] ?? catalog.en[key] ?? key;
}

/** Traduit un état de théâtre. */
export function theatreLabel(lang: Lang, state: string | null): string {
  if (!state) return '—';
  return t(lang, `theatre.${state}`);
}

/** Traduit un niveau de source. */
export function sourceLabel(lang: Lang, level: string): string {
  return t(lang, `source.${level}`) || level;
}