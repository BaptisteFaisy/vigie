/**
 * Jeu de démonstration (SPEC §27, VG-20) — un trimestre synthétique marqué
 * comme tel, avec un objectif par état de théâtre (+ une vitrine « concordant »),
 * 60 epics dont 12 fantômes, un rattachement en masse, un sous-calibrage, une
 * réorganisation mi-période (2 époques) et des séries de niveau A.
 *
 * `seedDemo(store)` peuple un `VigieStore` (en mémoire pour les tests, SQL en
 * prod). Les données sont volontairement cohérentes avec la logique des signaux
 * pour que le moteur qualifie chaque objectif vers l'état annoncé — c'est ce que
 * vérifie la recette (§25). Aucune donnée de personne réelle (VG-21) : les
 * `*_ref` sont des identifiants fictifs `demo_*`.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { VigieStore } from '../ports.js';
import type { KeyResult, KrPoint, Movement, Objective, ObjectiveLink } from '../types.js';
import { isoWeek } from '../domain/movement.js';

export const DEMO_NOW = '2026-12-15T12:00:00.000Z';
export const DEMO_PERIOD = 'demo-2026-T4';
export const DEMO_PERIOD_PREV = 'demo-2026-T3';
export const DEMO_SCOPE = 'cloud_test';

const EP1 = 'ep-1'; // avant réorganisation
const EP2 = 'ep-2'; // après réorganisation (courante)

export interface DemoSummary { objectives: number; issues: number; ghosts: number; epochs: number }

interface SeedCtx { store: VigieStore; issueSeq: { n: number } }

function date(weeksFromNow: number): string {
  return new Date(new Date(DEMO_NOW).getTime() - weeksFromNow * 7 * 86_400_000).toISOString();
}

async function addObjective(ctx: SeedCtx, o: Partial<Objective> & { id: string; title: string; periodId?: string; scope?: Objective['scope'] }): Promise<Objective> {
  const objective: Objective = {
    id: o.id, source: 'local', sourceId: o.id.toUpperCase(), title: o.title, ownerRef: `demo_owner_${o.id}`,
    periodId: o.periodId ?? DEMO_PERIOD, parentId: null, state: o.state ?? 'open',
    scope: o.scope ?? { projectKeys: ['PAY'], components: ['payments'], teams: ['team-pay'] },
    createdAt: '2026-10-01T09:00:00.000Z', closedAt: null, theatreState: null,
  };
  await ctx.store.saveObjective(objective);
  return objective;
}

async function addKr(ctx: SeedCtx, kr: Partial<KeyResult> & { id: string; objectiveId: string }): Promise<void> {
  await ctx.store.saveKeyResult({
    id: kr.id, objectiveId: kr.objectiveId, title: kr.title ?? 'Résultat clé', kind: kr.kind ?? 'number',
    unit: kr.unit ?? null, direction: kr.direction ?? 'down', baseline: kr.baseline ?? null, target: kr.target ?? null,
    current: kr.current ?? null, sourceLevel: kr.sourceLevel ?? 'A', proofType: kr.proofType ?? null,
    falsifiable: kr.falsifiable ?? true,
  });
}

async function addSeries(ctx: SeedCtx, krId: string, values: number[], weeksAgo: number[], level: 'A' | 'B' | 'C', epochId: string | null): Promise<void> {
  for (let i = 0; i < values.length; i += 1) {
    const at = date(weeksAgo[i]);
    const point: KrPoint = {
      id: `${krId}_pt_${i}`, krId, value: values[i], measuredAt: at,
      source: level === 'A' ? { kind: 'computed', computedBy: 'jira' } : level === 'B' ? { kind: 'reference', url: 'https://dash/demo' } : { kind: 'declared' },
      sourceLevel: level, epochId,
    };
    await ctx.store.savePoint(point);
  }
}

async function addWork(ctx: SeedCtx, objectiveId: string, project: string, count: number, opts: { moving: boolean; fraction?: number; sameDayActor?: string; commits?: number }): Promise<string[]> {
  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    ctx.issueSeq.n += 1;
    const issueId = `1${String(ctx.issueSeq.n).padStart(4, '0')}`;
    const issueKey = `${project}-${ctx.issueSeq.n}`;
    keys.push(issueKey);
    const link: ObjectiveLink = {
      id: `${objectiveId}_lnk_${i}`, objectiveId, issueId, issueKey, fraction: opts.fraction ?? 1,
      reason: opts.sameDayActor ? null : 'Sert l’objectif (démo).', linkedByRef: opts.sameDayActor ?? `demo_actor_${objectiveId}`,
      linkedAt: opts.sameDayActor ? '2026-10-05T09:00:00.000Z' : new Date(new Date(DEMO_NOW).getTime() - (30 + i) * 86_400_000).toISOString(),
      verifiedAt: null, state: opts.sameDayActor ? 'unmotivated' : 'active',
    };
    await ctx.store.saveLink(link);
    const weeks = opts.moving ? [1, 2] : [9, 10];
    for (const w of weeks) {
      const at = date(w);
      const movement: Movement = {
        issueId, issueKey, week: isoWeek(at), epochId: EP2, transitions: opts.moving ? 2 : 1,
        commits: opts.moving ? (opts.commits ?? 3) : 0, closed: false, cycleDays: null, daysSpent: 1.5, daysSource: 'logged',
      };
      await ctx.store.saveMovement(movement);
    }
  }
  return keys;
}

async function addCheckins(ctx: SeedCtx, objectiveId: string, weeksAgo: number[]): Promise<void> {
  for (let i = 0; i < weeksAgo.length; i += 1) {
    await ctx.store.saveCheckin({
      id: `${objectiveId}_chk_${i}`, objectiveId, at: date(weeksAgo[i]),
      facts: { degree: 'declare', theatreState: null, activeSignals: [], weekMovement: null, newPoints: [], projectionPct: null, projectionConclusion: null, costDays: null },
      interpretation: 'En bonne voie.', byRef: `demo_owner_${objectiveId}`,
    });
  }
}

export { addObjective, addKr, addSeries, addWork, addCheckins, date, EP1, EP2 };
export type { SeedCtx };
