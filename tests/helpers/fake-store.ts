/**
 * `VigieStore` en mémoire (sans SQL) — infra de test PARTAGÉE.
 *
 * Implémente fidèlement l'interface `VigieStore` de `src/ports.ts` avec des
 * `Map`, pour tester les couches hautes (actions L6, viewmodel L7, engines L8,
 * recette L12) sans dépendre de Forge SQL. La persistance réelle (L4) est
 * testée séparément via `tests/helpers/fake-sql.ts`.
 *
 * Sémantique alignée sur le contrat : une lecture ne lève jamais (absent →
 * `null`, liste → `[]`) ; `save*` est un upsert par clé primaire ; rien ne se
 * supprime. Les jointures (objective↔period, link↔movement) sont faites ici
 * comme le fera `repo.ts`. Découpé en fabriques par store (fonctions < 50 l.).
 */
import type {
  Checkin, Concordance, Cost, Coverage, Epoch, GraphCursor, KeyResult, KrPoint,
  Movement, Objective, ObjectiveLink, Orphan, Postmortem, Projection,
  ReviewDecision, Settings, TheatreSignal,
} from '../../src/types.js';
import type {
  CheckinStore, ConcordanceStore, CostStore, CoverageStore, CursorStore,
  DecisionStore, DossierRecord, DossierStore, EpochStore, KeyResultStore,
  LinkStore, MovementStore, ObjectiveStore, OrphanStore, PointStore,
  PostmortemStore, ProjectionStore, SettingsStore, SignalStore, VigieStore,
} from '../../src/ports.js';

/** Le faisceau de `Map` partagé par toutes les fabriques de store. */
interface Maps {
  objectives: Map<string, Objective>;
  keyResults: Map<string, KeyResult>;
  points: Map<string, KrPoint>;
  links: Map<string, ObjectiveLink>;
  movements: Map<string, Movement>;
  signals: Map<string, TheatreSignal>;
  projections: Map<string, Projection>;
  concordances: Map<string, Concordance>;
  costs: Map<string, Cost>;
  checkins: Map<string, Checkin>;
  decisions: Map<string, ReviewDecision>;
  orphans: Map<string, Orphan>;
  epochs: Map<string, Epoch>;
  postmortems: Map<string, Postmortem>;
  dossiers: Map<string, DossierRecord>;
  coverages: Map<string, Coverage>;
  settings: Map<string, Settings>;
  cursors: Map<string, GraphCursor>;
}

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

function last<T>(items: T[], key: (x: T) => string): T | null {
  if (items.length === 0) return null;
  return items.slice().sort((a, b) => (key(a) < key(b) ? -1 : 1))[items.length - 1];
}

function newMaps(): Maps {
  return {
    objectives: new Map(), keyResults: new Map(), points: new Map(), links: new Map(),
    movements: new Map(), signals: new Map(), projections: new Map(), concordances: new Map(),
    costs: new Map(), checkins: new Map(), decisions: new Map(), orphans: new Map(),
    epochs: new Map(), postmortems: new Map(), dossiers: new Map(), coverages: new Map(),
    settings: new Map(), cursors: new Map(),
  };
}

function objectiveStore(m: Maps): ObjectiveStore {
  return {
    async getObjective(id) { return m.objectives.get(id) ?? null; },
    async listObjectives(filter = {}) {
      let rows = [...m.objectives.values()];
      if (filter.periodId) rows = rows.filter((o) => o.periodId === filter.periodId);
      if (filter.state) rows = rows.filter((o) => o.state === filter.state);
      if (filter.source) rows = rows.filter((o) => o.source === filter.source);
      rows.sort((a, b) => (a.title < b.title ? -1 : 1));
      return filter.limit ? rows.slice(0, filter.limit) : rows;
    },
    async findObjectiveBySource(source, sourceId) {
      return [...m.objectives.values()].find((o) => o.source === source && o.sourceId === sourceId) ?? null;
    },
    async saveObjective(o) { m.objectives.set(o.id, o); },
  };
}

function keyResultStore(m: Maps): KeyResultStore {
  return {
    async listKeyResultsByObjective(id) { return [...m.keyResults.values()].filter((k) => k.objectiveId === id); },
    async getKeyResult(id) { return m.keyResults.get(id) ?? null; },
    async saveKeyResult(kr) { m.keyResults.set(kr.id, kr); },
  };
}

function pointStore(m: Maps): PointStore {
  return {
    async listPointsByKr(krId, from, to) {
      return [...m.points.values()]
        .filter((p) => p.krId === krId)
        .filter((p) => (from ? p.measuredAt >= from : true))
        .filter((p) => (to ? p.measuredAt <= to : true))
        .sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1));
    },
    async latestPointForKr(krId) { return last([...m.points.values()].filter((p) => p.krId === krId), (p) => p.measuredAt); },
    async savePoint(p) { m.points.set(p.id, p); },
  };
}

function linkStore(m: Maps): LinkStore {
  return {
    async listLinksByObjective(id, state) {
      return [...m.links.values()].filter((l) => l.objectiveId === id).filter((l) => (state ? l.state === state : true));
    },
    async listLinksByIssue(issueId) { return [...m.links.values()].filter((l) => l.issueId === issueId); },
    async listActiveLinksByPeriod(periodId) {
      const ids = new Set([...m.objectives.values()].filter((o) => o.periodId === periodId).map((o) => o.id));
      return [...m.links.values()].filter((l) => l.state !== 'detached' && ids.has(l.objectiveId));
    },
    async countObjectivesForIssue(issueId) {
      return new Set([...m.links.values()].filter((l) => l.issueId === issueId && l.state !== 'detached').map((l) => l.objectiveId)).size;
    },
    async countObjectivesForIssues(issueIds) {
      const counts: Record<string, number> = {};
      for (const issueId of issueIds) counts[issueId] = await this.countObjectivesForIssue(issueId);
      return counts;
    },
    async saveLink(l) { m.links.set(l.id, l); },
  };
}

function movementStore(m: Maps): MovementStore {
  return {
    async listMovementsByObjective(objectiveId, fromWeek, toWeek) {
      const ids = new Set([...m.links.values()].filter((l) => l.objectiveId === objectiveId && l.state !== 'detached').map((l) => l.issueId));
      return [...m.movements.values()]
        .filter((x) => ids.has(x.issueId))
        .filter((x) => (fromWeek ? x.week >= fromWeek : true))
        .filter((x) => (toWeek ? x.week <= toWeek : true))
        .sort((a, b) => (a.week < b.week ? -1 : 1));
    },
    async listMovementsByIssue(issueId) {
      return [...m.movements.values()].filter((x) => x.issueId === issueId).sort((a, b) => (a.week < b.week ? -1 : 1));
    },
    async saveMovement(x) { m.movements.set(`${x.issueId}|${x.week}`, x); },
  };
}

function signalStore(m: Maps): SignalStore {
  return {
    async listSignalsByObjective(objectiveId, activeOnly) {
      const now = new Date().toISOString();
      return [...m.signals.values()]
        .filter((s) => s.objectiveId === objectiveId)
        .filter((s) => (activeOnly ? s.dismissedUntil === null || s.dismissedUntil < now : true));
    },
    async saveSignal(s) { m.signals.set(s.id, s); },
    async replaceSignalsForObjective(objectiveId, next) {
      for (const [id, s] of m.signals) if (s.objectiveId === objectiveId) m.signals.delete(id);
      for (const s of next) m.signals.set(s.id, s);
    },
    async dismissSignal(id, reason, until) {
      const s = m.signals.get(id);
      if (!s) return false;
      m.signals.set(id, { ...s, dismissedReason: reason, dismissedUntil: until });
      return true;
    },
  };
}

function projectionStore(m: Maps): ProjectionStore {
  return {
    async latestProjectionForKr(krId) { return last([...m.projections.values()].filter((p) => p.krId === krId), (p) => p.computedAt); },
    async saveProjection(p) { m.projections.set(p.id, p); },
  };
}

function concordanceStore(m: Maps): ConcordanceStore {
  return {
    async latestConcordanceForKr(krId) { return last([...m.concordances.values()].filter((c) => c.krId === krId), (c) => c.computedAt); },
    async saveConcordance(c) { m.concordances.set(c.id, c); },
  };
}

function costStore(m: Maps): CostStore {
  return {
    async latestCostForObjective(objectiveId, periodId) {
      return last([...m.costs.values()].filter((c) => c.objectiveId === objectiveId && c.periodId === periodId), (c) => c.computedAt);
    },
    async portfolioCostTotals(periodId) {
      const byObjective = new Map<string, Cost>();
      for (const c of m.costs.values()) {
        if (c.periodId !== periodId) continue;
        const prev = byObjective.get(c.objectiveId);
        if (!prev || prev.computedAt < c.computedAt) byObjective.set(c.objectiveId, c);
      }
      let totalDays = 0, unattributedDays = 0;
      for (const c of byObjective.values()) { totalDays += num(c.days); unattributedDays += num(c.unattributedDays); }
      return { totalDays, unattributedDays };
    },
    async saveCost(c) { m.costs.set(c.id, c); },
  };
}

function checkinStore(m: Maps): CheckinStore {
  return {
    async listCheckinsByObjective(id) { return [...m.checkins.values()].filter((c) => c.objectiveId === id).sort((a, b) => (a.at < b.at ? -1 : 1)); },
    async saveCheckin(c) { m.checkins.set(c.id, c); },
  };
}

function decisionStore(m: Maps): DecisionStore {
  return {
    async latestDecisionForObjective(id) { return last([...m.decisions.values()].filter((d) => d.objectiveId === id), (d) => d.at); },
    async listDecisionsToVerify(periodId) {
      const period = (oid: string) => m.objectives.get(oid)?.periodId ?? null;
      return [...m.decisions.values()].filter((d) => d.followed === null && period(d.objectiveId) === periodId);
    },
    async saveDecision(d) { m.decisions.set(d.id, d); },
  };
}

function orphanStore(m: Maps): OrphanStore {
  return {
    async listOrphans(filter = {}) {
      let rows = [...m.orphans.values()].filter((o) => o.resolvedAt === null);
      if (filter.projectKey) rows = rows.filter((o) => o.projectKey === filter.projectKey);
      rows.sort((a, b) => num(b.daysSpent) - num(a.daysSpent));
      return filter.limit ? rows.slice(0, filter.limit) : rows;
    },
    async saveOrphan(o) { m.orphans.set(o.issueId, o); },
    async resolveOrphan(issueId, at) {
      const o = m.orphans.get(issueId);
      if (!o) return false;
      m.orphans.set(issueId, { ...o, resolvedAt: at });
      return true;
    },
  };
}

function epochStore(m: Maps): EpochStore {
  return {
    async listEpochs() { return [...m.epochs.values()].sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1)); },
    async currentEpoch(at) { return [...m.epochs.values()].find((e) => e.startsAt <= at && (e.endsAt === null || e.endsAt > at)) ?? null; },
    async saveEpoch(e) { m.epochs.set(e.id, e); },
  };
}

function postmortemStore(m: Maps): PostmortemStore {
  return {
    async latestPostmortemForObjective(id) { return last([...m.postmortems.values()].filter((p) => p.objectiveId === id), (p) => p.issuedAt); },
    async savePostmortem(p) { m.postmortems.set(p.id, p); },
  };
}

function dossierStore(m: Maps): DossierStore {
  return {
    async getDossierRecord(id) { return m.dossiers.get(id) ?? null; },
    async saveDossierRecord(r) { m.dossiers.set(r.objectiveId, r); },
  };
}

function coverageStore(m: Maps): CoverageStore {
  return {
    async getCoverage(scope) { return m.coverages.get(scope) ?? null; },
    async saveCoverage(c) { m.coverages.set(c.scope, c); },
  };
}

function settingsStore(m: Maps): SettingsStore {
  return {
    async getSettings(scope) { return m.settings.get(scope) ?? null; },
    async saveSettings(s) { m.settings.set(s.scope, s); },
  };
}

function cursorStore(m: Maps): CursorStore {
  return {
    async getCursor(objectType) { return m.cursors.get(objectType) ?? null; },
    async saveCursor(c) { m.cursors.set(c.objectType, c); },
  };
}

/** Assemble le `VigieStore` en mémoire complet. */
export function fakeStore(): VigieStore {
  const m = newMaps();
  return {
    ...objectiveStore(m), ...keyResultStore(m), ...pointStore(m), ...linkStore(m),
    ...movementStore(m), ...signalStore(m), ...projectionStore(m), ...concordanceStore(m),
    ...costStore(m), ...checkinStore(m), ...decisionStore(m), ...orphanStore(m),
    ...epochStore(m), ...postmortemStore(m), ...dossierStore(m), ...coverageStore(m),
    ...settingsStore(m), ...cursorStore(m),
  };
}
