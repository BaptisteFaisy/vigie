/**
 * Projection honnête (SPEC §10) — domaine PUR.
 *
 * Pour chaque RC de niveau A ou B : la valeur attendue en fin de période, sur
 * le rythme des 6 dernières semaines, avec FOURCHETTE systématique, EFFECTIF
 * affiché, hypothèses visibles et une conclusion unique. Sous les seuils
 * (< 4 semaines de données ou < 5 tickets rattachés), la réponse est
 * « pas assez de recul » — une réponse complète, pas un échec.
 *
 * Aucune projection n'est affichée sans sa fourchette et son effectif (§10).
 * Hypothèses et leviers sont émis dans les deux langues depuis les mêmes
 * nombres (§24) : les deux rendus ne peuvent pas diverger.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Direction, KrPoint, Projection, ProjectionConclusion, ProjectionLever } from '../types';
import { PROJECTION_DEFAULTS } from '../defaults';
import { daysBetween, isoWeek } from './movement';
import { pointsInWindow } from './series';
import { pointsInEpoch } from './epochs';
import type { BiText } from './signals/fact-text';

export interface ProjectionInput {
  krId: string;
  series: readonly KrPoint[];
  target: number | null;
  baseline: number | null;
  direction: Direction;
  attachedIssueCount: number;
  epochId?: string | null;
  periodEnd: string;
  now: string;
  opts?: Partial<typeof PROJECTION_DEFAULTS>;
}

interface Regression {
  slope: number;
  intercept: number;
  residStd: number;
  m: number;
  xbar: number;
  sxx: number;
}

/** Facteur z bilatéral pour quelques niveaux de confiance usuels. */
function zScore(confidence: number): number {
  if (confidence >= 0.95) return 1.96;
  if (confidence >= 0.9) return 1.6449;
  return 1.2816; // 0.8 par défaut
}

/** Régression linéaire des valeurs sur l'indice de point (0..m-1). */
function linreg(values: readonly number[]): Regression {
  const m = values.length;
  const xbar = (m - 1) / 2;
  const ybar = values.reduce((a, b) => a + b, 0) / m;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < m; i += 1) {
    sxx += (i - xbar) * (i - xbar);
    sxy += (i - xbar) * (values[i] - ybar);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = ybar - slope * xbar;
  let sse = 0;
  for (let i = 0; i < m; i += 1) {
    const predicted = intercept + slope * i;
    sse += (values[i] - predicted) * (values[i] - predicted);
  }
  const residStd = m > 2 ? Math.sqrt(sse / (m - 2)) : 0;
  return { slope, intercept, residStd, m, xbar, sxx };
}

/** Progression vers la cible en % (gère le sens up/down). */
function progressPct(value: number, baseline: number, target: number, direction: Direction): number {
  const span = direction === 'up' ? target - baseline : baseline - target;
  if (span === 0) return 0;
  const gained = direction === 'up' ? value - baseline : baseline - value;
  return (gained / span) * 100;
}

function conclusionOf(ciLow: number, ciHigh: number, baseline: number, target: number, direction: Direction): ProjectionConclusion {
  const prudent = direction === 'up' ? ciLow : ciHigh;
  const optimistic = direction === 'up' ? ciHigh : ciLow;
  if (progressPct(prudent, baseline, target, direction) >= 100) return 'atteignable';
  if (progressPct(optimistic, baseline, target, direction) < 100) return 'pas-atteignable';
  return 'atteignable-sous-condition';
}

function buildLevers(projected: number, target: number, slope: number, direction: Direction, weeksLeft: number): ProjectionLever[] {
  const gap = direction === 'up' ? target - projected : projected - target;
  if (gap <= 0) {
    return [{ text: 'La cible est atteinte au rythme actuel.', textEn: 'The target is met at the current pace.' }];
  }
  const levers: ProjectionLever[] = [];
  if (weeksLeft > 0) {
    const ratio = slope !== 0 ? Math.abs(gap / weeksLeft / slope) : Number.POSITIVE_INFINITY;
    levers.push({
      text: `Il manque environ ${gap.toFixed(0)} unités : il faudrait un rythme ×${ratio.toFixed(1)} sur ${weeksLeft.toFixed(0)} semaines.`,
      textEn: `About ${gap.toFixed(0)} units are missing: a ×${ratio.toFixed(1)} pace over ${weeksLeft.toFixed(0)} weeks would be needed.`,
    });
  }
  levers.push({
    text: `Ou combler ${gap.toFixed(0)} unités de travail rattaché supplémentaire d’ici la fin de période.`,
    textEn: `Or deliver ${gap.toFixed(0)} more units of attached work before the end of the period.`,
  });
  return levers;
}

function notEnough(krId: string, weeksUsed: number, n: number, reason: BiText, now: string, epochId: string | null): Projection {
  return {
    id: `proj_${krId}_${Date.parse(now) || 0}`, krId, computedAt: now, method: 'none',
    weeksUsed, n, pct: null, ciLow: null, ciHigh: null, conclusion: 'pas-assez-de-recul',
    assumptions: [reason.fr], assumptionsEn: [reason.en], levers: [], epochId,
  };
}

function assumptionsFor(lookback: number, epochId: string | null): { fr: string[]; en: string[] } {
  return {
    fr: [
      `Rythme constant (régression linéaire sur ${lookback} semaines).`,
      'Pas d’effet de fin de période.',
      'Périmètre inchangé.',
      epochId ? `Époque courante : ${epochId}.` : 'Aucune époque déclarée.',
    ],
    en: [
      `Constant pace (linear regression over ${lookback} weeks).`,
      'No end-of-period effect.',
      'Unchanged scope.',
      epochId ? `Current epoch: ${epochId}.` : 'No declared epoch.',
    ],
  };
}

/** Calcule la projection d'un RC (SPEC §10). */
export function computeProjection(input: ProjectionInput): Projection {
  const opts = { ...PROJECTION_DEFAULTS, ...(input.opts ?? {}) };
  const epochId = input.epochId ?? null;
  const inEpoch = epochId ? pointsInEpoch(input.series, epochId) : [...input.series];
  const window = pointsInWindow(inEpoch, opts.lookbackWeeks, input.now);
  const weeksUsed = new Set(window.map((p) => isoWeek(p.measuredAt))).size;
  const n = window.length;

  if (weeksUsed < opts.minWeeks) {
    return notEnough(input.krId, weeksUsed, n, {
      fr: `Pas assez de recul : ${weeksUsed} semaine(s) de mesures (minimum ${opts.minWeeks}).`,
      en: `Not enough data: ${weeksUsed} week(s) of measurements (minimum ${opts.minWeeks}).`,
    }, input.now, epochId);
  }
  if (input.attachedIssueCount < opts.minTickets) {
    return notEnough(input.krId, weeksUsed, n, {
      fr: `Pas assez de recul : ${input.attachedIssueCount} ticket(s) rattaché(s) (minimum ${opts.minTickets}).`,
      en: `Not enough data: ${input.attachedIssueCount} attached ticket(s) (minimum ${opts.minTickets}).`,
    }, input.now, epochId);
  }
  if (input.target === null) {
    return notEnough(input.krId, weeksUsed, n, {
      fr: 'Pas de cible déclarée : projection impossible.',
      en: 'No declared target: projection impossible.',
    }, input.now, epochId);
  }

  const values = window.map((p) => p.value);
  const baseline = input.baseline ?? values[0];
  const reg = linreg(values);
  const weeksLeft = Math.max(0, daysBetween(input.now, input.periodEnd) / 7);
  const xEnd = reg.m - 1 + weeksLeft;
  const projected = reg.intercept + reg.slope * xEnd;

  const z = zScore(opts.confidence);
  const spread = reg.sxx === 0 ? 0 : Math.sqrt(1 + 1 / reg.m + ((xEnd - reg.xbar) * (xEnd - reg.xbar)) / reg.sxx);
  const margin = z * reg.residStd * spread;
  const ciLow = projected - margin;
  const ciHigh = projected + margin;
  const assumptions = assumptionsFor(opts.lookbackWeeks, epochId);

  return {
    id: `proj_${input.krId}_${Date.parse(input.now) || 0}`,
    krId: input.krId,
    computedAt: input.now,
    method: `linear-${opts.lookbackWeeks}w`,
    weeksUsed,
    n,
    pct: Math.round(progressPct(projected, baseline, input.target, input.direction)),
    ciLow: Math.round(ciLow * 100) / 100,
    ciHigh: Math.round(ciHigh * 100) / 100,
    conclusion: conclusionOf(ciLow, ciHigh, baseline, input.target, input.direction),
    assumptions: assumptions.fr,
    assumptionsEn: assumptions.en,
    levers: buildLevers(projected, input.target, reg.slope, input.direction, weeksLeft),
    epochId,
  };
}
