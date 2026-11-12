/**
 * Textes des faits de signaux, en français ET en anglais (SPEC §24).
 *
 * Un fait est généré une seule fois, dans les deux langues, depuis les mêmes
 * paramètres : les deux rendus ne peuvent pas diverger. Le domaine reste pur
 * (aucun import i18n/UI) et les affichages choisissent leur langue.
 *
 * VG-21 : aucun de ces textes ne nomme ni ne désigne une personne — S1 donne la
 * date et le compte, jamais l'acteur.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */

/** Une paire de rendus pour un même fait. */
export interface BiText {
  readonly fr: string;
  readonly en: string;
}

export const factNoAttachment = (): BiText => ({
  fr: 'Aucun ticket rattaché à l’objectif.',
  en: 'No ticket attached to the objective.',
});

export const factBulkAttach = (count: number, day: string): BiText => ({
  fr: `${count} tickets rattachés le même jour (${day}).`,
  en: `${count} tickets attached on the same day (${day}).`,
});

export const factOutOfScope = (count: number, projects: string): BiText => ({
  fr: `${count} ticket(s) rattaché(s) hors du périmètre déclaré (projets : ${projects}).`,
  en: `${count} attached ticket(s) outside the declared scope (projects: ${projects}).`,
});

export const factDoubleCount = (issueKey: string, shared: number): BiText => ({
  fr: `${issueKey} est rattaché à ${shared} objectifs à 100 % chacun, sans fraction déclarée.`,
  en: `${issueKey} is attached to ${shared} objectives at 100 % each, with no declared fraction.`,
});

export const factFrozenWork = (days: number): BiText => ({
  fr: `Aucune transition ni commit sur les tickets rattachés depuis ${days} jours.`,
  en: `No transition or commit on the attached tickets for ${days} days.`,
});

export const factStoryWithoutWork = (count: number): BiText => ({
  fr: `${count} pointages enregistrés pendant une période sans mouvement du travail.`,
  en: `${count} check-ins recorded during a period with no work movement.`,
});

export const factSilenceNever = (threshold: number): BiText => ({
  fr: `Aucun pointage enregistré alors que le travail bouge (seuil ${threshold} jours).`,
  en: `No check-in recorded while work is moving (threshold ${threshold} days).`,
});

export const factSilenceSince = (days: number): BiText => ({
  fr: `Aucun pointage depuis ${days} jours alors que le travail bouge.`,
  en: `No check-in for ${days} days while work is moving.`,
});

export const factSourceless = (count: number): BiText => ({
  fr: `${count} résultat(s) clé(s) sans source (niveau C) : un nombre tapé à la main.`,
  en: `${count} key result(s) without a source (level C): a hand-typed number.`,
});

export const factFlatSeries = (weeks: number): BiText => ({
  fr: `Aucune variation de la série sur ${weeks} semaines de mesures.`,
  en: `No variation in the series over ${weeks} weeks of measurements.`,
});

export const factNotFalsifiable = (count: number): BiText => ({
  fr: `${count} résultat(s) clé(s) non falsifiable(s) : ni nombre ni type de preuve déclaré.`,
  en: `${count} key result(s) not falsifiable: neither a number nor a declared proof type.`,
});

export const factEarlyReach = (pct: number, at: string, thresholdPct: number): BiText => ({
  fr: `Cible atteinte à ${pct} % de la période (${at}) — avant ${thresholdPct} %.`,
  en: `Target reached at ${pct} % of the period (${at}) — before ${thresholdPct} %.`,
});

export const factRepeatedTarget = (count: number, target: number): BiText => ({
  fr: `${count} cible(s) identique(s) à celle de la période précédente (${target}).`,
  en: `${count} target(s) identical to the previous period’s (${target}).`,
});

export const factZombie = (days: number): BiText => ({
  fr: `Période close depuis ${days} jours, objectif toujours ouvert et jamais refermé.`,
  en: `Period closed ${days} days ago, objective still open and never closed.`,
});
