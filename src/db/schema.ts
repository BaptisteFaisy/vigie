/**
 * Schéma Forge SQL de Vigie (SPEC §21). Le schéma *est* du DDL, appliqué par
 * `migrationRunner` ; il n'y a pas de déclaration de table en TypeScript.
 *
 * Trois faits dictent la forme (comme dans les apps sœurs) :
 * 1. **Pas de clé étrangère** dans Forge SQL : l'intégrité vit dans `repo.ts`,
 *    chaque `*_id` est un `VARCHAR(64)` indexé.
 * 2. **Rien ne se supprime** : un rattachement est `detached`, un signal est
 *    `dismissed_*`, un fantôme est `resolved_at` — l'historique reste (SPEC §23).
 * 3. **JSON en `TEXT`** : le type JSON est en sursis et revient en `string` ;
 *    `mapping.ts` sérialise. Les dates sont des `TIMESTAMP` (conversion dans
 *    `mapping-common.ts`).
 *
 * VG-21 : `owner_ref`, `linked_by_ref`, `by_ref` existent pour la responsabilité
 * et l'audit des décisions. Aucune table ne contient de mesure par personne, et
 * aucune requête de `repo.ts` n'agrège ni ne classe par ces colonnes.
 *
 * Réservés MySQL/TiDB écrits entre backticks : `value`, `commits`, `at`,
 * `current_value`, `key`. Règle : fichiers < 500 lignes.
 */
import type { DdlMigration } from './sql-client.js';

/** Les dix-huit tables : seize au SPEC §21, plus `settings` (§19) et `review_dossier` (§13). */
export const TABLES = [
  'objective', 'key_result', 'kr_point', 'objective_link', 'movement',
  'theatre_signal', 'projection', 'concordance', 'cost', 'checkin',
  'review_decision', 'orphan', 'epoch', 'postmortem', 'coverage',
  'graph_cursor', 'settings', 'review_dossier',
] as const;

export type TableName = (typeof TABLES)[number];

export const CREATE_OBJECTIVE = `
  CREATE TABLE IF NOT EXISTS objective (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    source VARCHAR(16) NOT NULL,
    source_id VARCHAR(191) NOT NULL,
    title VARCHAR(512) NOT NULL,
    owner_ref VARCHAR(191) NULL,
    period_id VARCHAR(64) NOT NULL,
    parent_id VARCHAR(64) NULL,
    state VARCHAR(16) NOT NULL,
    theatre_state VARCHAR(24) NULL,
    scope_json TEXT NULL,
    created_at TIMESTAMP NOT NULL,
    closed_at TIMESTAMP NULL,
    INDEX idx_objective_period (period_id, state),
    INDEX idx_objective_source (source, source_id)
  )`;

export const CREATE_KEY_RESULT = `
  CREATE TABLE IF NOT EXISTS key_result (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL,
    title VARCHAR(512) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    unit VARCHAR(64) NULL,
    direction VARCHAR(8) NOT NULL,
    baseline DOUBLE NULL,
    target DOUBLE NULL,
    current_value DOUBLE NULL,
    source_level VARCHAR(4) NOT NULL,
    proof_type VARCHAR(16) NULL,
    falsifiable TINYINT(1) NOT NULL DEFAULT 1,
    INDEX idx_kr_objective (objective_id)
  )`;

export const CREATE_KR_POINT = `
  CREATE TABLE IF NOT EXISTS kr_point (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    kr_id VARCHAR(64) NOT NULL,
    \`value\` DOUBLE NOT NULL,
    measured_at TIMESTAMP NOT NULL,
    source_json TEXT NULL,
    source_level VARCHAR(4) NOT NULL,
    computed_by VARCHAR(24) NULL,
    epoch_id VARCHAR(64) NULL,
    INDEX idx_point_kr (kr_id, measured_at)
  )`;

export const CREATE_OBJECTIVE_LINK = `
  CREATE TABLE IF NOT EXISTS objective_link (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL,
    issue_id VARCHAR(64) NOT NULL,
    issue_key VARCHAR(64) NOT NULL,
    fraction DOUBLE NOT NULL,
    reason TEXT NULL,
    linked_by_ref VARCHAR(191) NULL,
    linked_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    state VARCHAR(16) NOT NULL,
    INDEX idx_link_objective (objective_id, state),
    INDEX idx_link_issue (issue_id),
    INDEX idx_link_day (linked_by_ref, linked_at)
  )`;

export const CREATE_MOVEMENT = `
  CREATE TABLE IF NOT EXISTS movement (
    issue_id VARCHAR(64) NOT NULL,
    issue_key VARCHAR(64) NOT NULL,
    week VARCHAR(16) NOT NULL,
    epoch_id VARCHAR(64) NULL,
    transitions INT NOT NULL DEFAULT 0,
    \`commits\` INT NOT NULL DEFAULT 0,
    closed TINYINT(1) NOT NULL DEFAULT 0,
    cycle_days DOUBLE NULL,
    days_spent DOUBLE NOT NULL DEFAULT 0,
    days_source VARCHAR(16) NOT NULL,
    PRIMARY KEY (issue_id, week),
    INDEX idx_movement_week (week)
  )`;

export const CREATE_THEATRE_SIGNAL = `
  CREATE TABLE IF NOT EXISTS theatre_signal (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL,
    signal VARCHAR(8) NOT NULL,
    facts_json TEXT NULL,
    fired_at TIMESTAMP NOT NULL,
    dismissed_reason TEXT NULL,
    dismissed_until TIMESTAMP NULL,
    INDEX idx_signal_objective (objective_id, signal)
  )`;

export const CREATE_PROJECTION = `
  CREATE TABLE IF NOT EXISTS projection (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    kr_id VARCHAR(64) NOT NULL,
    computed_at TIMESTAMP NOT NULL,
    method VARCHAR(64) NOT NULL,
    weeks_used INT NOT NULL DEFAULT 0,
    n INT NOT NULL DEFAULT 0,
    pct DOUBLE NULL,
    ci_low DOUBLE NULL,
    ci_high DOUBLE NULL,
    conclusion VARCHAR(32) NOT NULL,
    assumptions_json TEXT NULL,
    levers_json TEXT NULL,
    epoch_id VARCHAR(64) NULL,
    INDEX idx_projection_kr (kr_id, computed_at)
  )`;

export const CREATE_CONCORDANCE = `
  CREATE TABLE IF NOT EXISTS concordance (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    kr_id VARCHAR(64) NOT NULL,
    window_from TIMESTAMP NOT NULL,
    window_to TIMESTAMP NOT NULL,
    work_moved TINYINT(1) NOT NULL DEFAULT 0,
    number_moved TINYINT(1) NOT NULL DEFAULT 0,
    other_changes_json TEXT NULL,
    degree VARCHAR(16) NOT NULL,
    computed_at TIMESTAMP NOT NULL,
    INDEX idx_concordance_kr (kr_id, computed_at)
  )`;

export const CREATE_COST = `
  CREATE TABLE IF NOT EXISTS cost (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL,
    period_id VARCHAR(64) NOT NULL,
    days DOUBLE NOT NULL DEFAULT 0,
    method VARCHAR(16) NOT NULL,
    shared_with_count INT NOT NULL DEFAULT 1,
    unattributed_days DOUBLE NOT NULL DEFAULT 0,
    ratio_per_point DOUBLE NULL,
    ratio_ci_low DOUBLE NULL,
    ratio_ci_high DOUBLE NULL,
    computed_at TIMESTAMP NOT NULL,
    INDEX idx_cost_objective (objective_id, period_id)
  )`;

export const CREATE_CHECKIN = `
  CREATE TABLE IF NOT EXISTS checkin (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL,
    \`at\` TIMESTAMP NOT NULL,
    facts_json TEXT NULL,
    interpretation TEXT NOT NULL,
    by_ref VARCHAR(191) NULL,
    INDEX idx_checkin_objective (objective_id, \`at\`)
  )`;

export const CREATE_REVIEW_DECISION = `
  CREATE TABLE IF NOT EXISTS review_decision (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL,
    decision VARCHAR(16) NOT NULL,
    reason TEXT NOT NULL,
    \`at\` TIMESTAMP NOT NULL,
    by_ref VARCHAR(191) NULL,
    followed TINYINT(1) NULL,
    verified_at TIMESTAMP NULL,
    INDEX idx_decision_objective (objective_id, \`at\`)
  )`;

export const CREATE_ORPHAN = `
  CREATE TABLE IF NOT EXISTS orphan (
    issue_id VARCHAR(64) NOT NULL PRIMARY KEY,
    issue_key VARCHAR(64) NOT NULL,
    project_key VARCHAR(64) NULL,
    detected_at TIMESTAMP NOT NULL,
    suggested_objective_id VARCHAR(64) NULL,
    confidence DOUBLE NOT NULL DEFAULT 0,
    reason TEXT NULL,
    days_spent DOUBLE NOT NULL DEFAULT 0,
    resolved_at TIMESTAMP NULL,
    INDEX idx_orphan_project (project_key, resolved_at)
  )`;

export const CREATE_EPOCH = `
  CREATE TABLE IF NOT EXISTS epoch (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NULL,
    label VARCHAR(191) NOT NULL,
    scope_change_json TEXT NULL,
    INDEX idx_epoch_starts (starts_at)
  )`;

export const CREATE_POSTMORTEM = `
  CREATE TABLE IF NOT EXISTS postmortem (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL,
    page_ari VARCHAR(191) NULL,
    issued_at TIMESTAMP NOT NULL,
    moved TINYINT(1) NOT NULL DEFAULT 0,
    landed TINYINT(1) NOT NULL DEFAULT 0,
    learned_json TEXT NULL,
    INDEX idx_postmortem_objective (objective_id, issued_at)
  )`;

export const CREATE_COVERAGE = `
  CREATE TABLE IF NOT EXISTS coverage (
    scope VARCHAR(64) NOT NULL PRIMARY KEY,
    source_active VARCHAR(16) NOT NULL,
    rights_missing_json TEXT NULL,
    work_linked_pct DOUBLE NOT NULL DEFAULT 0,
    kr_level_a_pct DOUBLE NOT NULL DEFAULT 0,
    computed_at TIMESTAMP NOT NULL
  )`;

export const CREATE_GRAPH_CURSOR = `
  CREATE TABLE IF NOT EXISTS graph_cursor (
    object_type VARCHAR(64) NOT NULL PRIMARY KEY,
    last_id VARCHAR(191) NULL,
    last_run_at TIMESTAMP NULL
  )`;

export const CREATE_SETTINGS = `
  CREATE TABLE IF NOT EXISTS settings (
    scope VARCHAR(64) NOT NULL PRIMARY KEY,
    thresholds_json TEXT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    current_epoch_id VARCHAR(64) NULL,
    sources_json TEXT NULL,
    attribution_json TEXT NULL,
    language VARCHAR(4) NOT NULL DEFAULT 'fr'
  )`;

export const CREATE_REVIEW_DOSSIER = `
  CREATE TABLE IF NOT EXISTS review_dossier (
    objective_id VARCHAR(64) NOT NULL PRIMARY KEY,
    page_ari VARCHAR(191) NULL,
    generated_at TIMESTAMP NOT NULL,
    options_json TEXT NULL,
    decision_id VARCHAR(64) NULL
  )`;

/** Toutes les étapes DDL, dans l'ordre, idempotentes (`IF NOT EXISTS`). */
export const MIGRATIONS: readonly DdlMigration[] = [
  { name: 'objective', ddl: CREATE_OBJECTIVE },
  { name: 'key_result', ddl: CREATE_KEY_RESULT },
  { name: 'kr_point', ddl: CREATE_KR_POINT },
  { name: 'objective_link', ddl: CREATE_OBJECTIVE_LINK },
  { name: 'movement', ddl: CREATE_MOVEMENT },
  { name: 'theatre_signal', ddl: CREATE_THEATRE_SIGNAL },
  { name: 'projection', ddl: CREATE_PROJECTION },
  { name: 'concordance', ddl: CREATE_CONCORDANCE },
  { name: 'cost', ddl: CREATE_COST },
  { name: 'checkin', ddl: CREATE_CHECKIN },
  { name: 'review_decision', ddl: CREATE_REVIEW_DECISION },
  { name: 'orphan', ddl: CREATE_ORPHAN },
  { name: 'epoch', ddl: CREATE_EPOCH },
  { name: 'postmortem', ddl: CREATE_POSTMORTEM },
  { name: 'coverage', ddl: CREATE_COVERAGE },
  { name: 'graph_cursor', ddl: CREATE_GRAPH_CURSOR },
  { name: 'settings', ddl: CREATE_SETTINGS },
  { name: 'review_dossier', ddl: CREATE_REVIEW_DOSSIER },
];
