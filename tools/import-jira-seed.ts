/**
 * Assemblage du portefeuille réel depuis Jira, côté OUTIL (jeton API).
 *
 * Récupère les issues via `readCreds` (JIRA_SITE / JIRA_EMAIL /
 * JIRA_API_TOKEN), puis délègue le mapping à `src/import/register-map.ts` — le
 * même que l'app Forge utilise avec son propre accès Jira. Le mapping et ses
 * garanties VG-21 sont documentés là-bas.
 *
 * Sortie : `site/data/jira.json` + `site/data/jira-store.json` (site statique).
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { VigieStore } from '../src/ports.js';
import type { RegisterIssue } from '../src/import/register-map.js';
import { populateRegister, quarterOf } from '../src/import/register-map.js';
import { jqlAll, childrenOf, readCreds, toLite } from './import-jira.js';
import type { JiraIssueLite } from './import-jira.js';

export interface JiraImportOptions {
  maxEpics?: number;
  childrenPerEpic?: number;
  ghostJql?: string;
  ghostLimit?: number;
  scope?: string;
  now?: string;
  store?: VigieStore;
}

export interface JiraImport {
  store: VigieStore;
  summary: { objectives: number; issues: number; ghosts: number; epochs: number };
  meta: { kind: 'jira'; site: string; fetchedAt: string; epics: number; issues: number; ghosts: number };
  scope: string;
  now: string;
  period: string;
}

/** Importe un site Jira réel et peuple un store Vigie (le mapping est partagé). */
export async function importJira(options: JiraImportOptions = {}): Promise<JiraImport> {
  const creds = readCreds();
  const now = options.now ?? new Date().toISOString();
  const scope = options.scope ?? 'jira-real';
  const store = options.store ?? (await import('../tests/helpers/fake-store.js')).fakeStore();
  const maxEpics = options.maxEpics ?? 8;

  const epicRaws = await jqlAll(creds, 'issuetype = Epic ORDER BY updated DESC', maxEpics);
  const epics = epicRaws.map(toLite).filter((e): e is JiraIssueLite => e !== null).slice(0, maxEpics);

  const childrenByEpic = new Map<string, RegisterIssue[]>();
  for (const epic of epics) {
    const raws = await childrenOf(creds, epic.key, options.childrenPerEpic ?? 200);
    childrenByEpic.set(epic.key, raws.map(toLite).filter((c): c is JiraIssueLite => c !== null) as RegisterIssue[]);
  }

  const ghostJql = options.ghostJql ?? '"Epic Link" is EMPTY AND issuetype != Epic AND updated >= -90d ORDER BY updated DESC';
  const ghostRaws = await jqlAll(creds, ghostJql, options.ghostLimit ?? 150);
  const ghosts = ghostRaws.map(toLite).filter((g): g is JiraIssueLite => g !== null) as RegisterIssue[];

  const linkedCount = [...childrenByEpic.values()].reduce((n, kids) => n + kids.length, 0);
  const summary = await populateRegister(store, {
    site: creds.site, epics: epics as RegisterIssue[], childrenByEpic, ghosts,
  }, { scope, now });

  return {
    store,
    summary,
    meta: { kind: 'jira', site: creds.site, fetchedAt: now, epics: epics.length, issues: linkedCount, ghosts: summary.ghosts },
    scope, now, period: quarterOf(now),
  };
}