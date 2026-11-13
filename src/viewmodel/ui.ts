/**
 * Viewmodel (SPEC §19) — mise en forme PURE du store vers l'interface.
 *
 * Le registre de bord est la vue accessible (WCAG AA) : la même information que
 * la carte marine, en tableau, navigation clavier. Chaque ligne porte l'état, le
 * degré, les signaux et leur fait, le coût et la conclusion de projection — avec
 * la « brume » (pas assez de recul) rendue TEXTUELLEMENT, jamais seulement par
 * une couleur (§23). Aucune donnée de personne (VG-21). N'importe pas @forge.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Coverage, ObjectiveView, Orphan, PortfolioBrief, TheatreSignal } from '../types';
import type { Lang } from '../i18n/index';
import { t, theatreLabel } from '../i18n/index';

export interface RegisterRow {
  objectiveId: string;
  title: string;
  state: string;
  degree: string;
  signals: { id: string; label: string; fact: string }[];
  costDays: number | null;
  projection: string;
}

function signalFact(lang: Lang, signal: TheatreSignal): string {
  const header = signal.facts.map((f) => f.detail).join(' · ');
  return `${t(lang, `signal.${signal.signal}.label`)} — ${header}`;
}

/** Une ligne du registre par objectif qualifié. */
export function registerRows(views: readonly ObjectiveView[], lang: Lang): RegisterRow[] {
  return views.map((view) => ({
    objectiveId: view.objective.id,
    title: view.objective.title,
    state: theatreLabel(lang, view.theatreState),
    degree: t(lang, `degree.${view.degree}`),
    signals: view.signals.map((s) => ({ id: s.signal, label: t(lang, `signal.${s.signal}.label`), fact: signalFact(lang, s) })),
    costDays: view.cost?.days ?? null,
    projection: view.projection
      ? `${view.projection.pct ?? '—'} % · ${t(lang, view.projection.conclusion === 'pas-assez-de-recul' ? 'projection.not-enough' : `degree.${view.degree}`)}`
      : t(lang, 'projection.not-enough'),
  }));
}

/** En-tête de portefeuille pour l'écran de couverture / la première page. */
export function portfolioHead(brief: PortfolioBrief, lang: Lang): Record<string, string | number> {
  return {
    [t(lang, 'cover.workLinked')]: brief.workLinkedPct,
    [t(lang, 'cover.levelA')]: brief.krLevelAPct,
    ghostPct: brief.ghostPct,
    totalDays: brief.totalDays,
  };
}

/** Ligne d'un fantôme (verso). */
export function orphanRow(o: Orphan): { issueKey: string; suggested: string | null; confidence: number; reason: string | null; daysSpent: number } {
  return { issueKey: o.issueKey, suggested: o.suggestedObjectiveId, confidence: o.confidence, reason: o.reason, daysSpent: o.daysSpent };
}

/** Mise en forme de la ligne de couverture. */
export function coverageView(coverage: Coverage | null, lang: Lang): { source: string; rightsMissing: string[]; workLinkedPct: number; krLevelAPct: number; noData: boolean } {
  return {
    source: coverage ? t(lang, `source.${coverage.sourceActive}`) : t(lang, 'source.C'),
    rightsMissing: [...(coverage?.rightsMissing ?? [])],
    workLinkedPct: coverage?.workLinkedPct ?? 0,
    krLevelAPct: coverage?.krLevelAPct ?? 0,
    noData: coverage === null,
  };
}