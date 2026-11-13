/**
 * Peuplement du registre local depuis un site Jira réel (SPEC §20).
 *
 * Le mapping est ICI une bonne fois, utilisé par deux sources :
 *   - l'outil `tools/import-jira-seed.ts` (jeton API, pour le site statique) ;
 *   - l'app Forge (`src/collect/register-jira.ts`, accès Jira de l'app).
 *
 * Mapping (documenté, aucune invention) :
 *   objectif     = un EPIC réel (registre local §20 : l'epic porte l'objectif)
 *   résultat clé = « part des tickets enfants livrés », niveau A, RECALCULÉ
 *                  depuis les statusCategory réelles ;
 *   rattachement = les tickets enfants de l'epic, fraction 1 ;
 *   jours        = cascade du §11 : temps saisi → estimation → durée réelle ;
 *   fantôme      = ticket récent sans epic : du travail sans objectif déclaré ;
 *   époques      = 2, coupées à la médiane des dates de création.
 *
 * VG-21 : `RegisterIssue` ne porte AUCUN assigné/reporter — aucune donnée de
 * personne n'entre dans le domaine.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { RegisterSummary, VigieStore } from '../ports';
import type { Checkin, Epoch, KeyResult, KrPoint, Movement, Objective, ObjectiveLink, Orphan } from '../types';
import { isoWeek, isoWeekToDate, weekRange, resolveDays } from '../domain/movement';
import { defaultSettings } from '../defaults';

/** Issue réel réduit, sans aucune donnée de personne (VG-21). */
export interface RegisterIssue {
  id: string;
  key: string;
  projectKey: string;
  summary: string;
  issueType: string;
  statusCategory: 'new' | 'indeterminate' | 'done';
  created: string;
  resolutionDate: string | null;
  components: string[];
  spentSeconds: number | null;
  estimateSeconds: number | null;
  /** Progression de temps déclarée par la plateforme ; absente pour l'accès Forge. */
  progressPercent?: number | null;
}

export interface RegisterInput {
  site: string;
  epics: RegisterIssue[];
  childrenByEpic: Map<string, RegisterIssue[]>;
  ghosts: RegisterIssue[];
}

export interface RegisterOptions {
  scope?: string;
  now?: string;
  /** Époques déjà calculées (import par tranches) : on ne les recalcule pas. */
  epochs?: Epoch[];
}

export function quarterOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-T${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

function quarterStart(iso: string): string {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1)).toISOString();
}

/**
 * Découpe en deux époques à la médiane des dates de création.
 *
 * Exportée : un import **par tranches** doit garder la même découpe d'époques
 * d'une tranche à l'autre, sinon les mouvements déjà posés référenceraient
 * des époques aux bornes changeantes.
 */
export function buildEpochs(dates: string[], now: string): Epoch[] {
  const sorted = [...dates].sort();
  const mid = sorted.length ? sorted[Math.floor(sorted.length / 2)] : now;
  return [
    { id: 'ep-1', startsAt: sorted[0] ?? mid, endsAt: mid, label: 'Avant le point médian d’activité', scopeChange: null },
    { id: 'ep-2', startsAt: mid, endsAt: null, label: 'Après le point médian d’activité', scopeChange: 'Import Jira réel : découpe à la médiane' },
  ];
}

function epochPicker(epochs: Epoch[]): (iso: string) => string {
  const second = epochs[1]?.startsAt ?? epochs[0]?.startsAt ?? '';
  return (iso: string) => (iso < second ? 'ep-1' : 'ep-2');
}

/** Mouvements hebdomadaires réels + jours selon la cascade du §11. */
function movementsFor(issue: RegisterIssue, epochOf: (iso: string) => string): Movement[] {
  const rows: Movement[] = [];
  const createdWeek = isoWeek(issue.created);
  rows.push({
    issueId: issue.id, issueKey: issue.key, week: createdWeek, epochId: epochOf(issue.created),
    transitions: 1, commits: 0, closed: false, cycleDays: null, daysSpent: 0, daysSource: 'none',
  });
  if (!issue.resolutionDate) return rows;
  const cycleDays = Math.max(0, (new Date(issue.resolutionDate).getTime() - new Date(issue.created).getTime()) / 86_400_000);
  const days = resolveDays({ spentSeconds: issue.spentSeconds, estimateSeconds: issue.estimateSeconds, cycleDays });
  rows.push({
    issueId: issue.id, issueKey: issue.key, week: isoWeek(issue.resolutionDate), epochId: epochOf(issue.resolutionDate),
    transitions: 1, commits: 0, closed: true, cycleDays: Math.round(cycleDays * 10) / 10,
    daysSpent: Math.round(days.days * 100) / 100, daysSource: days.source,
  });
  return rows;
}

/** Série niveau A reconstruite : part cumulée d'enfants livrés, semaine par semaine. */
function buildSeries(krId: string, children: RegisterIssue[], toIso: string, epochOf: (iso: string) => string, maxWeeks = 30): KrPoint[] {
  if (children.length === 0) return [];
  const starts = children.map((c) => c.created).sort();
  const weeks = weekRange(starts[0], toIso).slice(-maxWeeks);
  const resolved = children.filter((c) => c.resolutionDate).map((c) => c.resolutionDate as string).sort();
  const total = children.length;
  return weeks.map((week) => {
    const at = isoWeekToDate(week);
    const done = resolved.filter((d) => d <= at).length;
    return {
      id: `pt-${krId}-${week}`, krId, value: Math.round((done / total) * 1000) / 10, measuredAt: at,
      source: { kind: 'computed', computedBy: 'jira' as const, note: `${done}/${total} enfants livrés (dates réelles)` },
      sourceLevel: 'A' as const, epochId: epochOf(at),
    };
  });
}

function toObjective(epic: RegisterIssue, site: string, now: string): Objective {
  return {
    id: `obj-${epic.key}`, source: 'local', sourceId: `https://${site}/browse/${epic.key}`,
    title: epic.summary || epic.key, ownerRef: null,
    periodId: quarterOf(now), parentId: null,
    state: epic.statusCategory === 'done' ? 'closed' : 'open',
    scope: { projectKeys: [epic.projectKey], components: epic.components, teams: [] },
    createdAt: epic.created, closedAt: epic.resolutionDate, theatreState: null,
  };
}

async function seedEpic(store: VigieStore, epic: RegisterIssue, children: RegisterIssue[], site: string, epochOf: (iso: string) => string, now: string): Promise<number> {
  const objective = toObjective(epic, site, now);
  const kr: KeyResult = {
    id: `kr-${epic.key}`, objectiveId: objective.id, title: 'Part des tickets enfants livrés (%)',
    kind: 'number', unit: '%', direction: 'up', baseline: 0, target: 100, current: null,
    sourceLevel: 'A', proofType: null, computedBy: 'jira', falsifiable: true,
  };
  await store.saveObjective(objective);
  await store.saveKeyResult(kr);
  if (epic.progressPercent != null && epic.progressPercent > 0) {
    const declared: KrPoint = {
      id: `pt-declared-${kr.id}`, krId: kr.id, value: epic.progressPercent, measuredAt: now,
      source: { kind: 'reference', url: objective.sourceId, note: 'progression de temps déclarée par la plateforme (aggregprogress)' },
      sourceLevel: 'B', epochId: epochOf(now),
    };
    await store.savePoint(declared);
  }
  for (const point of buildSeries(kr.id, children, now, epochOf)) await store.savePoint(point);
  for (const child of children) {
    const link: ObjectiveLink = {
      id: `lnk-${objective.id}-${child.key}`, objectiveId: objective.id, issueId: child.id, issueKey: child.key,
      fraction: 1, reason: `Enfant de l’epic ${epic.key}`, linkedByRef: null, linkedAt: child.created,
      verifiedAt: null, state: 'active',
    };
    await store.saveLink(link);
    for (const movement of movementsFor(child, epochOf)) await store.saveMovement(movement);
  }
  return children.length;
}

/** Importe des issues déjà lues dans un store Vigie, et rend un résumé. */
export async function populateRegister(store: VigieStore, input: RegisterInput, options: RegisterOptions = {}): Promise<RegisterSummary> {
  const now = options.now ?? new Date().toISOString();
  const scope = options.scope ?? 'jira-real';
  const { epics, childrenByEpic, ghosts } = input;

  const allChildren = [...childrenByEpic.values()].flat();
  // Époques stables : si l'appelant les fournit (import par tranches), on les
  // réutilise telles quelles — les mouvements déjà posés pointent dessus.
  const epochs = options.epochs?.length ? options.epochs : buildEpochs([...epics, ...allChildren].map((i) => i.created), now);
  const epochOf = epochPicker(epochs);
  for (const epoch of epochs) await store.saveEpoch(epoch);

  let issueCount = 0;
  for (const epic of epics) issueCount += await seedEpic(store, epic, childrenByEpic.get(epic.key) ?? [], input.site, epochOf, now);

  const linkedIds = new Set(allChildren.map((c) => c.id));
  let ghostCount = 0;
  for (const ghost of ghosts) {
    if (linkedIds.has(ghost.id)) continue;
    for (const movement of movementsFor(ghost, epochOf)) await store.saveMovement(movement);
    const orphan: Orphan = {
      issueId: ghost.id, issueKey: ghost.key, projectKey: ghost.projectKey, detectedAt: now,
      suggestedObjectiveId: null, confidence: 0,
      reason: 'Aucun epic parent : du travail qui ne sert aucun objectif déclaré.',
      daysSpent: Math.round(resolveDays({ spentSeconds: ghost.spentSeconds, estimateSeconds: ghost.estimateSeconds }).days * 100) / 100,
      resolvedAt: null,
    };
    await store.saveOrphan(orphan);
    ghostCount += 1;
  }

  await store.saveSettings(defaultSettings(scope, {
    periodStart: quarterStart(now), periodEnd: now, currentEpochId: 'ep-2', language: 'fr',
    sources: { active: 'local', graphEnabled: false, portfolioAppsEnabled: false },
  }));

  return { objectives: epics.length, issues: issueCount + ghostCount, ghosts: ghostCount, epochs: epochs.length };
}

export type { Checkin };