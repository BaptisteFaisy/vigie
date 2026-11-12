/**
 * Importateur de DONNÉES RÉELLES depuis un dépôt public GitHub.
 *
 * La démo synthétique (§27) montre les sept états de façon pédagogique ; cet
 * importateur, lui, construit un portefeuille à partir de faits réels :
 *
 *   objectif        = un milestone réel (titre, échéance)
 *   résultat clé    = « part des tickets livrés » — niveau A, RECALCULÉ par
 *                     l'app depuis les vrais tickets (`computedBy: 'jira'`)
 *   valeur recopiée = le pourcentage que l'API GitHub déclare pour ce milestone
 *                     (niveau B, référence = l'URL du milestone) → l'écart avec
 *                     notre recalcul est réel, pas mis en scène (§8)
 *   rattachement    = les vrais tickets du milestone (raison = le milestone)
 *   mouvement       = semaines réelles de création et de clôture
 *   jours           = durée réelle (cycle time) des tickets clos — la 3ᵉ source
 *                     du §11, la seule disponible ici ; la méthode est affichée
 *   pointage        = de vrais commentaires (dates réelles) : un milestone bavard
 *                     sans livraisons devient « narratif » pour de vrai
 *   fantôme         = les vrais tickets actifs SANS milestone → le vrai verso
 *   époques         = 2, coupées à la médiane des dates de création
 *
 * VG-21 : aucun auteur n'est lu ni importé (le champ `user` n'est jamais touché).
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { execFileSync } from 'node:child_process';
import type { VigieStore } from '../src/ports';
import type { Checkin, Epoch, KeyResult, KrPoint, Movement, Objective, ObjectiveLink, Orphan } from '../src/types';
import { isoWeek } from '../src/domain/movement';

const DAY_MS = 86_400_000;
const HOURS_PER_DAY = 8;

export interface GhIssue {
  number: number; title: string; state: string; milestone: { number: number } | null;
  created_at: string; closed_at: string | null; comments: number; labels: { name: string }[];
  pull_request?: unknown;
}
export interface GhMilestone { number: number; title: string; due_on: string | null; closed_at: string | null; updated_at: string | null; created_at: string; closed_issues: number; open_issues: number; html_url: string; state: string }
export interface GhComment { created_at: string }

export interface RealImport {
  store: VigieStore;
  summary: { objectives: number; issues: number; ghosts: number; epochs: number };
  meta: { kind: 'github'; repo: string; fetchedAt: string; milestones: number; issues: number; ghosts: number };
  scope: string;
  now: string;
  period: string;
}

/** Appel API avec retries : un échec transitoire ne doit pas casser le build. */
function gh<T>(path: string, attempts = 3): T {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const out = execFileSync('gh', ['api', path], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      return JSON.parse(out) as T;
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) execFileSync('sleep', [String(2 * (i + 1))]);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`échec API : ${path}`);
}

/** Les N milestones les plus récents ayant une échéance (périodes réelles). */
/** Ancre temporelle d'un milestone : échéance, sinon clôture, sinon dernière activité. */
export function milestoneAnchor(m: GhMilestone): string | null {
  return m.due_on ?? m.closed_at ?? m.updated_at ?? null;
}

export function pickMilestones(repo: string, max: number): GhMilestone[] {
  const all = gh<GhMilestone[]>(`repos/${repo}/milestones?state=all&per_page=100&sort=due_on&direction=desc`);
  return all
    .filter((m) => milestoneAnchor(m) && (m.closed_issues + m.open_issues) > 0)
    .sort((a, b) => String(milestoneAnchor(b)).localeCompare(String(milestoneAnchor(a))))
    .slice(0, max);
}

/** Plafond dur de pagination : borne le coût API et la taille du payload. */
export const MAX_PAGES = 40;

function fetchIssues(repo: string, query: string, pages: number): GhIssue[] {
  const out: GhIssue[] = [];
  for (let page = 1; page <= Math.min(pages, MAX_PAGES); page += 1) {
    const batch = gh<GhIssue[]>(`repos/${repo}/issues?state=all&per_page=100&page=${page}&sort=created&direction=asc&${query}`);
    out.push(...batch.filter((i) => !i.pull_request));
    if (batch.length < 100) break;
  }
  return out;
}

function quarterOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-T${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

function movementFor(issue: GhIssue, epochOf: (iso: string) => string, projectKey: string): Movement[] {
  const rows: Movement[] = [];
  const created = isoWeek(issue.created_at);
  const issueKey = `${projectKey}-${issue.number}`;
  rows.push({ issueId: String(issue.number), issueKey, week: created, epochId: epochOf(issue.created_at), transitions: 1, commits: 0, closed: false, cycleDays: null, daysSpent: 0, daysSource: 'none' });
  if (issue.closed_at) {
    const cycleDays = Math.max(0, (new Date(issue.closed_at).getTime() - new Date(issue.created_at).getTime()) / DAY_MS);
    rows.push({
      issueId: String(issue.number), issueKey, week: isoWeek(issue.closed_at), epochId: epochOf(issue.closed_at),
      transitions: 1, commits: 0, closed: true, cycleDays: Math.round(cycleDays * 10) / 10,
      daysSpent: Math.round((cycleDays / HOURS_PER_DAY) * 100) / 100, daysSource: 'cycle',
    });
  }
  return rows;
}

/** Deux époques réelles : coupure à la médiane des dates de création. */
export function buildEpochs(dates: string[], now: string): Epoch[] {
  const sorted = [...dates].sort();
  const mid = sorted.length ? sorted[Math.floor(sorted.length / 2)] : now;
  return [
    { id: 'ep-1', startsAt: sorted[0] ?? mid, endsAt: mid, label: 'Avant le point médian d’activité', scopeChange: null },
    { id: 'ep-2', startsAt: mid, endsAt: null, label: 'Après le point médian d’activité', scopeChange: 'Import de données réelles : découpe à la médiane' },
  ];
}

export { fetchIssues, quarterOf, movementFor, gh, DAY_MS };
export type { Objective, KeyResult, KrPoint, ObjectiveLink, Orphan, Checkin };
