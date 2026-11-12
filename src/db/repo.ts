/**
 * Store Forge SQL (SPEC §21) — implémentation réelle de `VigieStore`.
 *
 * Même sémantique que `tests/helpers/fake-store.ts` (testé), mais contre
 * `SqlClient` : upsert idempotent (`ON DUPLICATE KEY UPDATE`), lectures qui ne
 * lèvent jamais (absent → null, liste → []), rien ne se supprime. Les jointures
 * objective↔period et link↔movement sont faites en SQL.
 *
 * VG-21 : aucune requête n'agrège ni ne trie par owner_ref / linked_by_ref /
 * by_ref (garde : tests/db/no-person-stats.test.ts).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { SqlClient, SqlParam } from './sql-client.js';
import type { VigieStore, DossierRecord } from '../ports.js';
import type {
  Checkin, Concordance, Cost, Coverage, Epoch, GraphCursor, KeyResult, KrPoint, Movement,
  Objective, ObjectiveLink, Orphan, Postmortem, Projection, ReviewDecision, Settings, TheatreSignal,
} from '../types.js';
import { toSqlTimestamp, toSqlBoolean, jsonText } from './mapping-common.js';
import * as M from './mapping.js';

type Row = Record<string, unknown>;

/** Crée le store SQL complet. */
export function createStore(sql: SqlClient): VigieStore {
  async function upsert(table: string, pk: string[], row: Record<string, SqlParam>): Promise<void> {
    const cols = Object.keys(row);
    const updates = cols.filter((c) => !pk.includes(c)).map((c) => `\`${c}\`=VALUES(\`${c}\`)`).join(', ');
    const stmt = `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
      + (updates ? ` ON DUPLICATE KEY UPDATE ${updates}` : '');
    await sql.execute(stmt, cols.map((c) => row[c]));
  }
  const all = async <T>(stmt: string, params: SqlParam[], map: (r: Row) => T): Promise<T[]> => (await sql.query<Row>(stmt, params)).map(map);
  const one = async <T>(stmt: string, params: SqlParam[], map: (r: Row) => T): Promise<T | null> => (await all(stmt, params, map))[0] ?? null;

  return {
    /* objective */
    getObjective: (id) => one('SELECT * FROM objective WHERE id=?', [id], M.rowObjective),
    async listObjectives(filter = {}) {
      const where: string[] = []; const params: SqlParam[] = [];
      if (filter.periodId) { where.push('period_id=?'); params.push(filter.periodId); }
      if (filter.state) { where.push('state=?'); params.push(filter.state); }
      if (filter.source) { where.push('source=?'); params.push(filter.source); }
      const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
      const limit = filter.limit ? ` LIMIT ${Number(filter.limit)}` : '';
      return all(`SELECT * FROM objective${clause} ORDER BY title${limit}`, params, M.rowObjective);
    },
    findObjectiveBySource: (source, sourceId) => one('SELECT * FROM objective WHERE source=? AND source_id=?', [source, sourceId], M.rowObjective),
    saveObjective: (o: Objective) => upsert('objective', ['id'], {
      id: o.id, source: o.source, source_id: o.sourceId, title: o.title, owner_ref: o.ownerRef, period_id: o.periodId,
      parent_id: o.parentId, state: o.state, theatre_state: o.theatreState, scope_json: jsonText(o.scope),
      created_at: toSqlTimestamp(o.createdAt), closed_at: toSqlTimestamp(o.closedAt),
    }),

    /* key_result */
    listKeyResultsByObjective: (id) => all('SELECT * FROM key_result WHERE objective_id=?', [id], M.rowKeyResult),
    getKeyResult: (id) => one('SELECT * FROM key_result WHERE id=?', [id], M.rowKeyResult),
    saveKeyResult: (k: KeyResult) => upsert('key_result', ['id'], {
      id: k.id, objective_id: k.objectiveId, title: k.title, kind: k.kind, unit: k.unit, direction: k.direction,
      baseline: k.baseline, target: k.target, current_value: k.current, source_level: k.sourceLevel,
      proof_type: k.proofType, computed_by: k.computedBy ?? null, falsifiable: toSqlBoolean(k.falsifiable),
    }),

    /* kr_point */
    async listPointsByKr(krId, from, to) {
      const where = ['kr_id=?']; const params: SqlParam[] = [krId];
      if (from) { where.push('measured_at>=?'); params.push(toSqlTimestamp(from)); }
      if (to) { where.push('measured_at<=?'); params.push(toSqlTimestamp(to)); }
      return all(`SELECT * FROM kr_point WHERE ${where.join(' AND ')} ORDER BY measured_at`, params, M.rowPoint);
    },
    latestPointForKr: (krId) => one('SELECT * FROM kr_point WHERE kr_id=? ORDER BY measured_at DESC LIMIT 1', [krId], M.rowPoint),
    savePoint: (p: KrPoint) => upsert('kr_point', ['id'], {
      id: p.id, kr_id: p.krId, value: p.value, measured_at: toSqlTimestamp(p.measuredAt), source_json: jsonText(p.source),
      source_level: p.sourceLevel, computed_by: p.source.computedBy ?? null, epoch_id: p.epochId,
    }),

    /* objective_link */
    async listLinksByObjective(objectiveId, state) {
      const params: SqlParam[] = [objectiveId];
      const clause = state ? ' AND state=?' : '';
      if (state) params.push(state);
      return all(`SELECT * FROM objective_link WHERE objective_id=?${clause}`, params, M.rowLink);
    },
    listLinksByIssue: (issueId) => all('SELECT * FROM objective_link WHERE issue_id=?', [issueId], M.rowLink),
    listActiveLinksByPeriod: (periodId) => all(
      "SELECT l.* FROM objective_link l JOIN objective o ON o.id=l.objective_id WHERE o.period_id=? AND l.state!='detached'", [periodId], M.rowLink),
    async countObjectivesForIssue(issueId) {
      const rows = await sql.query<Row>("SELECT COUNT(DISTINCT objective_id) AS c FROM objective_link WHERE issue_id=? AND state!='detached'", [issueId]);
      return Number(rows[0]?.c ?? 0);
    },
    saveLink: (l: ObjectiveLink) => upsert('objective_link', ['id'], {
      id: l.id, objective_id: l.objectiveId, issue_id: l.issueId, issue_key: l.issueKey, fraction: l.fraction, reason: l.reason,
      linked_by_ref: l.linkedByRef, linked_at: toSqlTimestamp(l.linkedAt), verified_at: toSqlTimestamp(l.verifiedAt), state: l.state,
    }),

    /* movement */
    async listMovementsByObjective(objectiveId, fromWeek, toWeek) {
      const where = ["m.issue_id IN (SELECT issue_id FROM objective_link WHERE objective_id=? AND state!='detached')"];
      const params: SqlParam[] = [objectiveId];
      if (fromWeek) { where.push('m.week>=?'); params.push(fromWeek); }
      if (toWeek) { where.push('m.week<=?'); params.push(toWeek); }
      return all(`SELECT m.* FROM movement m WHERE ${where.join(' AND ')} ORDER BY m.week`, params, M.rowMovement);
    },
    listMovementsByIssue: (issueId) => all('SELECT * FROM movement WHERE issue_id=? ORDER BY week', [issueId], M.rowMovement),
    saveMovement: (m: Movement) => upsert('movement', ['issue_id', 'week'], {
      issue_id: m.issueId, issue_key: m.issueKey, week: m.week, epoch_id: m.epochId, transitions: m.transitions,
      commits: m.commits, closed: toSqlBoolean(m.closed), cycle_days: m.cycleDays, days_spent: m.daysSpent, days_source: m.daysSource,
    }),

    /* theatre_signal */
    async listSignalsByObjective(objectiveId, activeOnly) {
      const clause = activeOnly ? ' AND (dismissed_until IS NULL OR dismissed_until < NOW())' : '';
      return all(`SELECT * FROM theatre_signal WHERE objective_id=?${clause}`, [objectiveId], M.rowSignal);
    },
    saveSignal: (s: TheatreSignal) => upsert('theatre_signal', ['id'], {
      id: s.id, objective_id: s.objectiveId, signal: s.signal, facts_json: jsonText(s.facts),
      fired_at: toSqlTimestamp(s.firedAt), dismissed_reason: s.dismissedReason, dismissed_until: toSqlTimestamp(s.dismissedUntil),
    }),
    async replaceSignalsForObjective(objectiveId, signals) {
      // Les signaux sont recalculés (pas des données utilisateur) : on remplace.
      await sql.execute('DELETE FROM theatre_signal WHERE objective_id=?', [objectiveId]);
      for (const s of signals) await this.saveSignal(s);
    },
    async dismissSignal(id, reason, until) {
      const n = await sql.execute('UPDATE theatre_signal SET dismissed_reason=?, dismissed_until=? WHERE id=?', [reason, toSqlTimestamp(until), id]);
      return n > 0;
    },

    /* projection / concordance / cost */
    latestProjectionForKr: (krId) => one('SELECT * FROM projection WHERE kr_id=? ORDER BY computed_at DESC LIMIT 1', [krId], M.rowProjection),
    saveProjection: (p: Projection) => upsert('projection', ['id'], {
      id: p.id, kr_id: p.krId, computed_at: toSqlTimestamp(p.computedAt), method: p.method, weeks_used: p.weeksUsed, n: p.n,
      pct: p.pct, ci_low: p.ciLow, ci_high: p.ciHigh, conclusion: p.conclusion,
      assumptions_json: jsonText({ fr: p.assumptions, en: p.assumptionsEn }),
      levers_json: jsonText(p.levers), epoch_id: p.epochId,
    }),
    latestConcordanceForKr: (krId) => one('SELECT * FROM concordance WHERE kr_id=? ORDER BY computed_at DESC LIMIT 1', [krId], M.rowConcordance),
    saveConcordance: (c: Concordance) => upsert('concordance', ['id'], {
      id: c.id, kr_id: c.krId, window_from: toSqlTimestamp(c.windowFrom), window_to: toSqlTimestamp(c.windowTo),
      work_moved: toSqlBoolean(c.workMoved), number_moved: toSqlBoolean(c.numberMoved), other_changes_json: jsonText(c.otherChanges),
      degree: c.degree, computed_at: toSqlTimestamp(c.computedAt),
    }),
    latestCostForObjective: (objectiveId, periodId) => one('SELECT * FROM cost WHERE objective_id=? AND period_id=? ORDER BY computed_at DESC LIMIT 1', [objectiveId, periodId], M.rowCost),
    async portfolioCostTotals(periodId) {
      const rows = await all('SELECT * FROM cost WHERE period_id=? ORDER BY computed_at', [periodId], M.rowCost);
      const latest = new Map<string, Cost>();
      for (const c of rows) latest.set(c.objectiveId, c);
      let totalDays = 0; let unattributedDays = 0;
      for (const c of latest.values()) { totalDays += c.days; unattributedDays += c.unattributedDays; }
      return { totalDays, unattributedDays };
    },
    saveCost: (c: Cost) => upsert('cost', ['id'], {
      id: c.id, objective_id: c.objectiveId, period_id: c.periodId, days: c.days, method: c.method, shared_with_count: c.sharedWithCount,
      unattributed_days: c.unattributedDays, ratio_per_point: c.ratioPerPoint, ratio_ci_low: c.ratioCiLow, ratio_ci_high: c.ratioCiHigh,
      computed_at: toSqlTimestamp(c.computedAt),
    }),

    /* checkin / decision */
    listCheckinsByObjective: (id) => all('SELECT * FROM checkin WHERE objective_id=? ORDER BY `at`', [id], M.rowCheckin),
    saveCheckin: (c: Checkin) => upsert('checkin', ['id'], {
      id: c.id, objective_id: c.objectiveId, at: toSqlTimestamp(c.at), facts_json: jsonText(c.facts), interpretation: c.interpretation, by_ref: c.byRef,
    }),
    latestDecisionForObjective: (id) => one('SELECT * FROM review_decision WHERE objective_id=? ORDER BY `at` DESC LIMIT 1', [id], M.rowDecision),
    listDecisionsToVerify: (periodId) => all(
      'SELECT d.* FROM review_decision d JOIN objective o ON o.id=d.objective_id WHERE d.followed IS NULL AND o.period_id=?', [periodId], M.rowDecision),
    saveDecision: (d: ReviewDecision) => upsert('review_decision', ['id'], {
      id: d.id, objective_id: d.objectiveId, decision: d.decision, reason: d.reason, at: toSqlTimestamp(d.at),
      by_ref: d.byRef, followed: d.followed === null ? null : toSqlBoolean(d.followed), verified_at: toSqlTimestamp(d.verifiedAt),
    }),

    /* orphan / epoch / postmortem / dossier */
    async listOrphans(filter = {}) {
      const where = ['resolved_at IS NULL']; const params: SqlParam[] = [];
      if (filter.projectKey) { where.push('project_key=?'); params.push(filter.projectKey); }
      const limit = filter.limit ? ` LIMIT ${Number(filter.limit)}` : '';
      return all(`SELECT * FROM orphan WHERE ${where.join(' AND ')} ORDER BY days_spent DESC${limit}`, params, M.rowOrphan);
    },
    saveOrphan: (o: Orphan) => upsert('orphan', ['issue_id'], {
      issue_id: o.issueId, issue_key: o.issueKey, project_key: o.projectKey, detected_at: toSqlTimestamp(o.detectedAt),
      suggested_objective_id: o.suggestedObjectiveId, confidence: o.confidence, reason: o.reason, days_spent: o.daysSpent, resolved_at: toSqlTimestamp(o.resolvedAt),
    }),
    async resolveOrphan(issueId, at) {
      const n = await sql.execute('UPDATE orphan SET resolved_at=? WHERE issue_id=?', [toSqlTimestamp(at), issueId]);
      return n > 0;
    },
    listEpochs: () => all('SELECT * FROM epoch ORDER BY starts_at', [], M.rowEpoch),
    currentEpoch: (at) => one('SELECT * FROM epoch WHERE starts_at<=? AND (ends_at IS NULL OR ends_at>?) LIMIT 1', [toSqlTimestamp(at), toSqlTimestamp(at)], M.rowEpoch),
    saveEpoch: (e: Epoch) => upsert('epoch', ['id'], {
      id: e.id, starts_at: toSqlTimestamp(e.startsAt), ends_at: toSqlTimestamp(e.endsAt), label: e.label, scope_change_json: jsonText(e.scopeChange),
    }),
    latestPostmortemForObjective: (id) => one('SELECT * FROM postmortem WHERE objective_id=? ORDER BY issued_at DESC LIMIT 1', [id], M.rowPostmortem),
    savePostmortem: (p: Postmortem) => upsert('postmortem', ['id'], {
      id: p.id, objective_id: p.objectiveId, page_ari: p.pageAri, issued_at: toSqlTimestamp(p.issuedAt),
      moved: toSqlBoolean(p.moved), landed: toSqlBoolean(p.landed), learned_json: jsonText(p.learned),
    }),
    getDossierRecord: (id) => one('SELECT * FROM review_dossier WHERE objective_id=?', [id], M.rowDossier),
    saveDossierRecord: (r: DossierRecord) => upsert('review_dossier', ['objective_id'], {
      objective_id: r.objectiveId, page_ari: r.pageAri, generated_at: toSqlTimestamp(r.generatedAt), decision_id: r.decisionId,
    }),

    /* coverage / settings / cursor */
    getCoverage: (scope) => one('SELECT * FROM coverage WHERE scope=?', [scope], M.rowCoverage),
    saveCoverage: (c: Coverage) => upsert('coverage', ['scope'], {
      scope: c.scope, source_active: c.sourceActive, rights_missing_json: jsonText(c.rightsMissing),
      work_linked_pct: c.workLinkedPct, kr_level_a_pct: c.krLevelAPct, computed_at: toSqlTimestamp(c.computedAt),
    }),
    getSettings: (scope) => one('SELECT * FROM settings WHERE scope=?', [scope], M.rowSettings),
    saveSettings: (s: Settings) => upsert('settings', ['scope'], {
      scope: s.scope, thresholds_json: jsonText(s.thresholds), period_start: toSqlTimestamp(s.periodStart), period_end: toSqlTimestamp(s.periodEnd),
      current_epoch_id: s.currentEpochId, sources_json: jsonText(s.sources), attribution_json: jsonText(s.attribution), language: s.language,
    }),
    getCursor: (t) => one('SELECT * FROM graph_cursor WHERE object_type=?', [t], M.rowCursor),
    saveCursor: (c: GraphCursor) => upsert('graph_cursor', ['object_type'], {
      object_type: c.objectType, last_id: c.lastId, last_run_at: toSqlTimestamp(c.lastRunAt),
    }),
  };
}
