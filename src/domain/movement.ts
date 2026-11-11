/**
 * Mouvement hebdomadaire du travail (SPEC §4, §11) — domaine PUR.
 *
 * Le mouvement, c'est ce qui a changé sur un ticket pendant une semaine :
 * transitions, commits, fermeture, délai, jours. C'est le fait qui fonde le
 * degré « travaillé » (§6) et les signaux S2/S5/S10 (§7).
 *
 * Coût (§11) : trois sources de jours, par ordre de préférence — temps saisi →
 * estimation → durée réelle (cycle time). La source retenue est toujours
 * affichée. 1 jour-homme = 8 h.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { DaysSource, Movement } from '../types.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
/** Un jour-homme = 8 heures (§11). */
export const HOURS_PER_DAY = 8;

/** Semaine ISO 8601 → `YYYY-Sww` (lundi = premier jour, semaine 1 = celle du 1er jeudi). */
export function isoWeek(iso: string): string {
  const date = new Date(iso);
  const day = (date.getUTCDay() + 6) % 7; // lundi = 0 … dimanche = 6
  date.setUTCDate(date.getUTCDate() - day + 3); // jeudi de la semaine ISO
  const year = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / WEEK_MS);
  return `${year}-S${String(week).padStart(2, '0')}`;
}

/** Nombre de jours (fractionnaire) entre `a` et `b` = (b − a) / 1 jour. */
export function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / DAY_MS;
}

/**
 * Semaine ISO `YYYY-Sww` → date ISO du lundi de cette semaine. Sert à dater
 * approximativement un mouvement hebdomadaire (les mouvements sont agrégés par
 * semaine, pas à l'horodatage près).
 */
export function isoWeekToDate(week: string): string {
  const match = /^(\d{4})-S(\d{2})$/.exec(week);
  if (!match) return new Date(0).toISOString();
  const year = Number(match[1]);
  const weekNum = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7; // lundi = 0
  const monday = new Date(jan4.getTime() - jan4Day * DAY_MS + (weekNum - 1) * WEEK_MS);
  return monday.toISOString();
}

/** Liste des semaines ISO entre deux dates (bornes incluses), sans doublon. */
export function weekRange(fromIso: string, toIso: string): string[] {
  const weeks: string[] = [];
  const seen = new Set<string>();
  const start = new Date(fromIso).getTime();
  const end = new Date(toIso).getTime();
  for (let t = start; t <= end; t += DAY_MS) {
    const week = isoWeek(new Date(t).toISOString());
    if (!seen.has(week)) { seen.add(week); weeks.push(week); }
  }
  return weeks;
}

/** Secondes → jours-homme (1 jour = 8 h). */
export function secondsToDays(seconds: number): number {
  return seconds / (HOURS_PER_DAY * 3600);
}

export interface DaysInput {
  spentSeconds?: number | null;
  estimateSeconds?: number | null;
  cycleDays?: number | null;
}

/**
 * Résout les jours d'un ticket et la source retenue (§11), par préférence :
 * temps saisi → estimation → cycle time → aucune. La source est affichée.
 */
export function resolveDays(input: DaysInput): { days: number; source: DaysSource } {
  if (typeof input.spentSeconds === 'number' && input.spentSeconds > 0) {
    return { days: secondsToDays(input.spentSeconds), source: 'logged' };
  }
  if (typeof input.estimateSeconds === 'number' && input.estimateSeconds > 0) {
    return { days: secondsToDays(input.estimateSeconds), source: 'estimated' };
  }
  if (typeof input.cycleDays === 'number' && input.cycleDays > 0) {
    return { days: input.cycleDays, source: 'cycle' };
  }
  return { days: 0, source: 'none' };
}

export interface WeekMovementInput {
  issueId: string;
  issueKey: string;
  epochId?: string | null;
  /** Horodatages de transitions d'état. */
  changelog: readonly { at: string }[];
  /** Horodatages de commits (panneau de développement). */
  commits: readonly { at: string }[];
  closed: boolean;
  resolutionDate?: string | null;
  createdAt: string;
  /** Temps saisi daté, pour répartir les jours par semaine. */
  worklog?: readonly { at: string; seconds: number }[];
  /** Source de jours retenue quand il n'y a pas de worklog daté (§11). */
  daysSource?: DaysSource;
  cycleDays?: number | null;
}

interface WeekBucket {
  transitions: number;
  commits: number;
  closed: boolean;
  seconds: number;
  cycleDays: number | null;
}

function addToWeek(buckets: Map<string, WeekBucket>, week: string): WeekBucket {
  let bucket = buckets.get(week);
  if (!bucket) {
    bucket = { transitions: 0, commits: 0, closed: false, seconds: 0, cycleDays: null };
    buckets.set(week, bucket);
  }
  return bucket;
}

/**
 * Agrège les événements d'un ticket par semaine ISO. Ne produit une ligne que
 * pour les semaines où quelque chose a bougé (transition, commit, fermeture ou
 * temps saisi) — une semaine sans événement n'apparaît pas.
 */
export function computeWeekMovement(input: WeekMovementInput): Movement[] {
  const buckets = new Map<string, WeekBucket>();
  for (const item of input.changelog) addToWeek(buckets, isoWeek(item.at)).transitions += 1;
  for (const commit of input.commits) addToWeek(buckets, isoWeek(commit.at)).commits += 1;
  for (const entry of input.worklog ?? []) addToWeek(buckets, isoWeek(entry.at)).seconds += entry.seconds;
  if (input.closed && input.resolutionDate) {
    const bucket = addToWeek(buckets, isoWeek(input.resolutionDate));
    bucket.closed = true;
    bucket.cycleDays = input.cycleDays ?? null;
  }

  const fallback = resolveDays({ spentSeconds: null, estimateSeconds: null, cycleDays: input.cycleDays ?? null });
  const weeks = [...buckets.keys()].sort();
  return weeks.map((week) => {
    const bucket = buckets.get(week) as WeekBucket;
    const days = bucket.seconds > 0 ? secondsToDays(bucket.seconds) : 0;
    const source: DaysSource = bucket.seconds > 0 ? 'logged' : (input.daysSource ?? (days > 0 ? 'logged' : fallback.source));
    return {
      issueId: input.issueId,
      issueKey: input.issueKey,
      week,
      epochId: input.epochId ?? null,
      transitions: bucket.transitions,
      commits: bucket.commits,
      closed: bucket.closed,
      cycleDays: bucket.cycleDays,
      daysSpent: days,
      daysSource: bucket.transitions + bucket.commits === 0 && days === 0 ? 'none' : source,
    };
  });
}
