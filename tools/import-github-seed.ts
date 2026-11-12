/**
 * Assemblage du portefeuille réel : milestones → objectifs, tickets →
 * rattachements et mouvements, commentaires → pointages, tickets sans milestone
 * → fantômes. Voir `import-github.ts` pour le mapping détaillé.
 *
 * VG-21 / vie privée : aucun auteur n'est lu ; le texte des commentaires n'est
 * PAS importé (seule sa date l'est) — un site public ne republie pas les
 * conversations d'un projet tiers.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { VigieStore } from '../src/ports';
import type { Checkin, Epoch, KeyResult, KrPoint, Movement, Objective, ObjectiveLink, Orphan } from '../src/types';
import { fakeStore } from '../tests/helpers/fake-store';
import { isoWeekToDate, weekRange } from '../src/domain/movement';
import { defaultSettings } from '../src/defaults';
import {
  pickMilestones, milestoneAnchor, fetchIssues, quarterOf, movementFor, buildEpochs, gh,
} from './import-github';
import type { GhComment, GhIssue, GhMilestone, RealImport } from './import-github';

export interface ImportOptions {
  /** Store à peupler (permet d'enregistrer les entités importées). */
  store?: VigieStore;
  maxMilestones?: number;
  scope?: string;
  now?: string;
  /** Pages de 100 tickets à récupérer par milestone. */
  pages?: number;
  /** Nombre de tickets par milestone dont on importe les dates de commentaires. */
  commentIssues?: number;
  ghostPages?: number;
}

function epochPicker(epochs: Epoch[]): (iso: string) => string {
  const second = epochs[1]?.startsAt ?? epochs[0]?.startsAt ?? '';
  return (iso: string) => (iso < second ? 'ep-1' : 'ep-2');
}

function toObjective(milestone: GhMilestone, repo: string, projectKey: string): Objective {
  return {
    id: `obj-${projectKey}-${milestone.number}`,
    source: 'import',
    sourceId: `${repo}#milestone/${milestone.number}`,
    title: milestone.title,
    ownerRef: null, // VG-21 : aucun propriétaire importé
    periodId: quarterOf(milestoneAnchor(milestone) ?? new Date().toISOString()),
    parentId: null,
    state: milestone.state === 'closed' ? 'closed' : 'open',
    scope: { projectKeys: [projectKey], components: [], teams: [] },
    createdAt: milestone.created_at ?? milestoneAnchor(milestone) ?? new Date().toISOString(),
    closedAt: milestone.state === 'closed' ? (milestone.closed_at ?? milestoneAnchor(milestone)) : null,
    theatreState: null,
  };
}

/** RC « part des tickets livrés » : cible 100 %, recalculé par l'app (niveau A). */
function toKeyResult(objective: Objective): KeyResult {
  return {
    id: `kr-${objective.id}`, objectiveId: objective.id, title: 'Part des tickets livrés (%)',
    kind: 'number', unit: '%', direction: 'up', baseline: 0, target: 100,
    current: null, sourceLevel: 'A', proofType: null, computedBy: 'jira', falsifiable: true,
  };
}

/** La valeur DÉCLARÉE par la plateforme (niveau B) : c'est elle que l'app contredit. */
function declaredPoint(krId: string, milestone: GhMilestone, epochId: string, at: string): KrPoint | null {
  const total = milestone.closed_issues + milestone.open_issues;
  if (total === 0) return null;
  const value = Math.round((milestone.closed_issues / total) * 1000) / 10;
  return {
    id: `pt-declared-${krId}`, krId, value, measuredAt: at,
    source: { kind: 'reference', url: milestone.html_url, note: 'compte déclaré par la plateforme (tickets ET pull requests)' },
    sourceLevel: 'B', epochId,
  };
}

/**
 * Série de niveau A RECONSTRUITE depuis les vraies dates de clôture : part
 * cumulée de tickets clos, semaine par semaine. C'est exactement ce que le
 * recalcul nocturne produirait sur un vrai Jira — et c'est ce qui donne une
 * projection (sans historique, la réponse honnête est « pas assez de recul »).
 * Bornée aux `maxWeeks` dernières semaines pour garder le payload raisonnable.
 */
export function buildSeries(krId: string, issues: GhIssue[], toIso: string, epochOf: (iso: string) => string, maxWeeks = 30): KrPoint[] {
  if (issues.length === 0) return [];
  const dates = issues.map((i) => i.created_at).sort();
  const weeks = weekRange(dates[0], toIso).slice(-maxWeeks);
  const closed = issues.filter((i) => i.closed_at).map((i) => i.closed_at as string).sort();
  const total = issues.length;
  return weeks.map((week) => {
    const at = isoWeekToDate(week);
    const done = closed.filter((d) => d <= at).length;
    return {
      id: `pt-${krId}-${week}`, krId, value: Math.round((done / total) * 1000) / 10, measuredAt: at,
      source: { kind: 'computed', computedBy: 'jira' as const, note: `${done}/${total} tickets clos (dates réelles)` },
      sourceLevel: 'A' as const, epochId: epochOf(at),
    };
  });
}

async function seedMilestone(store: VigieStore, repo: string, projectKey: string, milestone: GhMilestone, issues: GhIssue[], epochOf: (iso: string) => string, at: string, commentIssues: number): Promise<number> {
  const objective = toObjective(milestone, repo, projectKey);
  const kr = toKeyResult(objective);
  await store.saveObjective(objective);
  await store.saveKeyResult(kr);
  const declared = declaredPoint(kr.id, milestone, epochOf(at), at);
  if (declared) await store.savePoint(declared);
  for (const point of buildSeries(kr.id, issues, at, epochOf)) await store.savePoint(point);

  let checkins = 0;
  for (const issue of issues) {
    const link: ObjectiveLink = {
      id: `lnk-${objective.id}-${issue.number}`, objectiveId: objective.id, issueId: String(issue.number),
      issueKey: `${projectKey}-${issue.number}`, fraction: 1, reason: `Milestone « ${milestone.title} »`,
      linkedByRef: null, linkedAt: issue.created_at, verifiedAt: null, state: 'active',
    };
    await store.saveLink(link);
    for (const movement of movementFor(issue, epochOf, projectKey)) await store.saveMovement(movement);
    if (checkins < commentIssues && issue.comments > 0) {
      checkins += await seedComments(store, repo, issue, objective.id);
    }
  }
  return issues.length;
}

/** Importe les DATES de commentaires réels comme pointages (jamais le texte). */
async function seedComments(store: VigieStore, repo: string, issue: GhIssue, objectiveId: string): Promise<number> {
  const comments = gh<GhComment[]>(`repos/${repo}/issues/${issue.number}/comments?per_page=5`);
  let n = 0;
  for (const comment of comments.slice(0, 3)) {
    const checkin: Checkin = {
      id: `chk-${objectiveId}-${issue.number}-${n}`, objectiveId, at: comment.created_at,
      facts: { degree: 'declare', theatreState: null, activeSignals: [], weekMovement: null, newPoints: [], projectionPct: null, projectionConclusion: null, costDays: null },
      interpretation: `Commentaire réel sur le ticket #${issue.number} (texte non importé — vie privée).`,
      byRef: null,
    };
    await store.saveCheckin(checkin);
    n += 1;
  }
  return n;
}


async function seedGhosts(store: VigieStore, ghosts: GhIssue[], epochOf: (iso: string) => string, at: string, projectKey: string): Promise<number> {
  let n = 0;
  for (const issue of ghosts) {
    for (const movement of movementFor(issue, epochOf, projectKey)) await store.saveMovement(movement);
    const orphan: Orphan = {
      issueId: String(issue.number), issueKey: `${projectKey}-${issue.number}`, projectKey, detectedAt: at,
      suggestedObjectiveId: null, confidence: 0, reason: 'Aucun milestone : pas d’objectif déclaré — pas assez de recul.',
      daysSpent: 0, resolvedAt: null,
    };
    await store.saveOrphan(orphan);
    n += 1;
  }
  return n;
}

/** Importe un dépôt public GitHub et peuple un store Vigie. */
export async function importGithub(repo: string, opts: ImportOptions = {}): Promise<RealImport> {
  const max = opts.maxMilestones ?? 8;
  const scope = opts.scope ?? 'real-github';
  const now = opts.now ?? new Date().toISOString();
  const store = opts.store ?? fakeStore();
  const projectKey = repo.split('/')[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
  const milestones = pickMilestones(repo, max);

  const perMilestone = new Map<number, GhIssue[]>();
  const all: GhIssue[] = [];
  for (const milestone of milestones) {
    const issues = fetchIssues(repo, `milestone=${milestone.number}`, opts.pages ?? 3);
    perMilestone.set(milestone.number, issues);
    all.push(...issues);
  }
  const ghostIssues = fetchIssues(repo, `milestone=none&sort=updated&direction=desc`, opts.ghostPages ?? 2);

  const epochs = buildEpochs(all.map((i) => i.created_at), now);
  const epochOf = epochPicker(epochs);
  for (const epoch of epochs) await store.saveEpoch(epoch);

  let issueCount = 0;
  for (const milestone of milestones) {
    issueCount += await seedMilestone(store, repo, projectKey, milestone, perMilestone.get(milestone.number) ?? [], epochOf, now, opts.commentIssues ?? 2);
  }
  const ghosts = await seedGhosts(store, ghostIssues, epochOf, now, projectKey);

  const dates = all.map((i) => i.created_at).sort();
  await store.saveSettings(defaultSettings(scope, {
    periodStart: dates[0] ?? now, periodEnd: now, currentEpochId: 'ep-2', language: 'fr',
    sources: { active: 'import', graphEnabled: false, portfolioAppsEnabled: false },
  }));

  return {
    store,
    summary: { objectives: milestones.length, issues: issueCount + ghosts, ghosts, epochs: epochs.length },
    meta: { kind: 'github', repo, fetchedAt: now, milestones: milestones.length, issues: issueCount, ghosts },
    scope, now, period: quarterOf(now),
  };
}

export type { Movement, Epoch };
