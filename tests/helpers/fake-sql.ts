/**
 * `SqlClient` en mémoire — infra de test PARTAGÉE pour `src/db/repo.ts`.
 *
 * Ce n'est PAS un moteur SQL général : c'est un interpréteur des formes que
 * `repo.ts` émet réellement (SELECT ... WHERE col=? [AND ...] [ORDER BY] [LIMIT],
 * les deux JOIN sur objective, la sous-requête movement, COUNT(DISTINCT),
 * INSERT ... ON DUPLICATE KEY UPDATE, UPDATE ... WHERE, DELETE ... WHERE).
 * Suffisant pour prouver les allers-retours entité ↔ ligne SQL sans base.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { SqlClient, SqlParam } from '../../src/db/sql-client.js';
import { toSqlTimestamp } from '../../src/db/mapping-common.js';

type Row = Record<string, unknown>;
type RowsOf = (table: string) => Row[];

const PRIMARY_KEYS: Record<string, string[]> = {
  objective: ['id'], key_result: ['id'], kr_point: ['id'], objective_link: ['id'],
  movement: ['issue_id', 'week'], theatre_signal: ['id'], projection: ['id'],
  concordance: ['id'], cost: ['id'], checkin: ['id'], review_decision: ['id'],
  orphan: ['issue_id'], epoch: ['id'], postmortem: ['id'], review_dossier: ['objective_id'],
  coverage: ['scope'], settings: ['scope'], graph_cursor: ['object_type'],
};

export interface FakeSql extends SqlClient {
  tables: Map<string, Row[]>;
}

function nowStr(): string {
  return toSqlTimestamp(new Date().toISOString()) ?? '';
}

function samePk(a: Row, b: Row, table: string): boolean {
  return (PRIMARY_KEYS[table] ?? ['id']).every((k) => a[k] === b[k]);
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const sa = a === null ? '' : String(a);
  const sb = b === null ? '' : String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

interface Condition { test: (row: Row) => boolean }

function parseCondition(part: string, params: readonly SqlParam[], cursor: { i: number }): Condition {
  const trimmed = part.trim();
  let match = /^\(([a-z_]+)\s+IS\s+NULL\s+OR\s+\1\s*<\s*NOW\(\)\)$/.exec(trimmed);
  if (match) {
    const col = match[1]; const now = nowStr();
    return { test: (r) => r[col] === null || String(r[col]) < now };
  }
  match = /^\(([a-z_]+)\s+IS\s+NULL\s+OR\s+\1\s*>\s*\?\)$/.exec(trimmed);
  if (match) {
    const col = match[1]; const value = params[cursor.i]; cursor.i += 1;
    return { test: (r) => r[col] === null || compare(r[col], value) > 0 };
  }
  match = /^([a-z_]+)\s+IS\s+NULL$/.exec(trimmed);
  if (match) {
    const col = match[1];
    return { test: (r) => r[col] === null };
  }
  match = /^([a-z_]+)\s*!=\s*'([^']*)'$/.exec(trimmed);
  if (match) {
    const col = match[1]; const literal = match[2];
    return { test: (r) => r[col] !== literal };
  }
  match = /^([a-z_]+)\s*(>=|<=|=)\s*\?$/.exec(trimmed);
  if (match) {
    const col = match[1]; const op = match[2]; const value = params[cursor.i]; cursor.i += 1;
    return {
      test: (r) => (op === '=' ? compare(r[col], value) === 0 : op === '>=' ? compare(r[col], value) >= 0 : compare(r[col], value) <= 0),
    };
  }
  return { test: () => true };
}

function applyWhere(rows: Row[], where: string, params: readonly SqlParam[]): Row[] {
  if (!where) return rows;
  const cursor = { i: 0 };
  const conditions = where.split(/\s+AND\s+/i).map((part) => parseCondition(part, params, cursor));
  return rows.filter((row) => conditions.every((c) => c.test(row)));
}

function tableAndWhere(stmt: string): { table: string; where: string } {
  const from = /FROM\s+`?([a-z_]+)`?/i.exec(stmt);
  const table = from ? from[1] : '';
  const whereMatch = /\bWHERE\b([\s\S]*?)(?:\bORDER BY\b|\bLIMIT\b|$)/i.exec(stmt);
  return { table, where: whereMatch ? whereMatch[1].trim() : '' };
}

function orderAndLimit(rows: Row[], stmt: string): Row[] {
  const order = /ORDER\s+BY\s+`?([a-z_]+)`?(\s+DESC)?/i.exec(stmt);
  let result = rows;
  if (order) {
    const col = order[1]; const desc = Boolean(order[2]);
    result = [...result].sort((a, b) => (desc ? compare(b[col], a[col]) : compare(a[col], b[col])));
  }
  const limit = /LIMIT\s+(\d+)/i.exec(stmt);
  return limit ? result.slice(0, Number(limit[1])) : result;
}

function selectRows(rowsOf: RowsOf, stmt: string, params: readonly SqlParam[]): Row[] {
  if (/COUNT\(DISTINCT\s+objective_id\)/i.test(stmt)) {
    const { table, where } = tableAndWhere(stmt);
    const filtered = applyWhere(rowsOf(table), where, params);
    return [{ c: new Set(filtered.map((r) => r.objective_id)).size }];
  }
  if (/JOIN\s+objective\s+o\s+ON\s+o\.id\s*=\s*l\.objective_id/i.test(stmt)) {
    const periods = new Map(rowsOf('objective').map((o) => [o.id, o.period_id] as const));
    return rowsOf('objective_link')
      .filter((l) => l.state !== 'detached' && periods.get(String(l.objective_id)) === params[0])
      .map((r) => ({ ...r }));
  }
  if (/JOIN\s+objective\s+o\s+ON\s+o\.id\s*=\s*d\.objective_id/i.test(stmt)) {
    const periods = new Map(rowsOf('objective').map((o) => [o.id, o.period_id] as const));
    return rowsOf('review_decision')
      .filter((d) => d.followed === null && periods.get(String(d.objective_id)) === params[0])
      .map((r) => ({ ...r }));
  }
  if (/m\.issue_id\s+IN\s*\(SELECT/i.test(stmt)) {
    const linked = new Set(rowsOf('objective_link')
      .filter((l) => l.objective_id === params[0] && l.state !== 'detached')
      .map((l) => l.issue_id));
    const extra = /\)\s+AND\s+([\s\S]*?)(?:\bORDER BY\b|$)/i.exec(stmt)?.[1] ?? '';
    const filtered = rowsOf('movement').filter((m) => linked.has(m.issue_id));
    return orderAndLimit(applyWhere(filtered, extra, params.slice(1)), stmt);
  }
  const { table, where } = tableAndWhere(stmt);
  return orderAndLimit(applyWhere(rowsOf(table), where, params), stmt).map((r) => ({ ...r }));
}

function insertRow(rowsOf: RowsOf, stmt: string, params: readonly SqlParam[]): number {
  const head = /INSERT INTO\s+`?([a-z_]+)`?\s*\(([^)]*)\)/i.exec(stmt);
  if (!head) return 0;
  const table = head[1];
  const columns = head[2].split(',').map((c) => c.trim().replace(/`/g, ''));
  const row: Row = {};
  columns.forEach((col, i) => { row[col] = params[i]; });
  const rows = rowsOf(table);
  const existing = rows.find((r) => samePk(r, row, table));
  if (existing) Object.assign(existing, row);
  else rows.push(row);
  return 1;
}

function updateRows(rowsOf: RowsOf, stmt: string, params: readonly SqlParam[]): number {
  const head = /UPDATE\s+`?([a-z_]+)`?\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+)$/i.exec(stmt);
  if (!head) return 0;
  const setCols = [...head[2].matchAll(/`?([a-z_]+)`?\s*=\s*\?/g)].map((m) => m[1]);
  const setValues = setCols.map((_, i) => params[i]);
  const matching = applyWhere(rowsOf(head[1]), head[3], params.slice(setCols.length));
  for (const row of matching) setCols.forEach((col, i) => { row[col] = setValues[i]; });
  return matching.length;
}

function deleteRows(rowsOf: RowsOf, setTable: (t: string, rows: Row[]) => void, stmt: string, params: readonly SqlParam[]): number {
  const head = /DELETE FROM\s+`?([a-z_]+)`?\s+WHERE\s+([\s\S]+)$/i.exec(stmt);
  if (!head) return 0;
  const table = head[1];
  const rows = rowsOf(table);
  const matching = applyWhere(rows, head[2], params);
  setTable(table, rows.filter((r) => !matching.includes(r)));
  return matching.length;
}

/** Crée un `SqlClient` en mémoire couvrant les requêtes de repo.ts. */
export function fakeSql(): FakeSql {
  const tables = new Map<string, Row[]>();
  const rowsOf: RowsOf = (table) => {
    let rows = tables.get(table);
    if (!rows) { rows = []; tables.set(table, rows); }
    return rows;
  };
  const setTable = (table: string, rows: Row[]) => tables.set(table, rows);
  return {
    tables,
    async query<RowOut>(stmt: string, params: readonly SqlParam[] = []): Promise<RowOut[]> {
      return selectRows(rowsOf, stmt, params) as RowOut[];
    },
    async execute(stmt: string, params: readonly SqlParam[] = []): Promise<number> {
      if (/^INSERT INTO/i.test(stmt)) return insertRow(rowsOf, stmt, params);
      if (/^UPDATE\s+/i.test(stmt)) return updateRows(rowsOf, stmt, params);
      if (/^DELETE FROM/i.test(stmt)) return deleteRows(rowsOf, setTable, stmt, params);
      return 0;
    },
  };
}
