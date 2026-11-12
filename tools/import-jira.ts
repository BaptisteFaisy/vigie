/**
 * Importateur de DONNÉES RÉELLES depuis un site Jira Cloud.
 *
 * Mapping (documenté, aucune invention) :
 *   objectif        = un EPIC réel (registre local §20 : l'epic porte l'objectif)
 *   résultat clé    = « part des tickets enfants livrés » — niveau A, RECALCULÉ
 *                     depuis les statusCategory réelles (`computedBy: 'jira'`)
 *   valeur recopiée = la progression de temps déclarée par la plateforme
 *                     (aggregprogress.percent), niveau B avec référence. Quand
 *                     elle diffère du recalcul, l'écart est affiché : c'est une
 *                     différence de méthode, pas une erreur (§8).
 *   rattachement    = les tickets enfants de l'epic, fraction 1
 *   jours           = cascade du §11 : temps saisi → estimation → durée réelle
 *   fantôme         = ticket récent sans epic : du travail sans objectif déclaré
 *   époques         = 2, coupées à la médiane des dates de création
 *
 * VG-21 / vie privée : AUCUN assigné, reporter ni acteur n'est demandé à l'API —
 * la liste de champs ne les contient pas. Les identifiants viennent de
 * l'environnement (JIRA_SITE / JIRA_EMAIL / JIRA_API_TOKEN), jamais du dépôt.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */

/** Champs demandés — volontairement SANS assignee/reporter (VG-21). */
export const FIELDS = [
  'summary', 'project', 'issuetype', 'status', 'created', 'updated',
  'resolutiondate', 'duedate', 'timetracking', 'aggregprogress', 'components', 'labels', 'parent',
];

export interface JiraCreds { site: string; email: string; token: string }

export function readCreds(env: NodeJS.ProcessEnv = process.env): JiraCreds {
  const site = env.JIRA_SITE;
  const email = env.JIRA_EMAIL;
  const token = env.JIRA_API_TOKEN;
  if (!site || !email || !token) {
    throw new Error('Identifiants Jira absents : JIRA_SITE, JIRA_EMAIL et JIRA_API_TOKEN doivent être dans l’environnement (jamais dans le dépôt).');
  }
  return { site: site.replace(/^https?:\/\//, '').replace(/\/$/, ''), email, token };
}

type Json = Record<string, unknown>;

function authHeader(creds: JiraCreds): string {
  return `Basic ${Buffer.from(`${creds.email}:${creds.token}`).toString('base64')}`;
}

/** Recherche JQL paginée (POST /rest/api/3/search/jql — l'ancien /search est supprimé). */
export async function jqlSearch(creds: JiraCreds, jql: string, maxResults = 50): Promise<Json[]> {
  const res = await fetch(`https://${creds.site}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: authHeader(creds) },
    body: JSON.stringify({ jql, maxResults, fields: FIELDS }),
  });
  if (!res.ok) throw new Error(`JQL « ${jql} » → HTTP ${res.status}`);
  const data = (await res.json()) as Json;
  const issues = Array.isArray(data.issues) ? (data.issues as Json[]) : [];
  return issues;
}

/** Récupère jusqu'à `limit` issues en paginant (nextPageToken). */
export async function jqlAll(creds: JiraCreds, jql: string, limit: number): Promise<Json[]> {
  const out: Json[] = [];
  let token: string | undefined;
  while (out.length < limit) {
    const body: Json = { jql, maxResults: Math.min(100, limit - out.length), fields: FIELDS };
    if (token) body.nextPageToken = token;
    const res = await fetch(`https://${creds.site}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: authHeader(creds) },
      body: JSON.stringify(body),
    });
    if (!res.ok) break;
    const data = (await res.json()) as Json;
    const batch = Array.isArray(data.issues) ? (data.issues as Json[]) : [];
    out.push(...batch);
    token = typeof data.nextPageToken === 'string' ? data.nextPageToken : undefined;
    if (data.isLast === true || !token || batch.length === 0) break;
  }
  return out;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});

/** Enfants d'un epic : « Epic Link » (company-managed) puis repli `parent` (team-managed). */
export async function childrenOf(creds: JiraCreds, epicKey: string, limit: number): Promise<Json[]> {
  try {
    const found = await jqlAll(creds, `"Epic Link" = ${epicKey} ORDER BY created ASC`, limit);
    if (found.length > 0) return found;
  } catch { /* repli ci-dessous */ }
  try {
    return await jqlAll(creds, `parent = ${epicKey} ORDER BY created ASC`, limit);
  } catch {
    return [];
  }
}

export interface JiraIssueLite {
  id: string; key: string; projectKey: string; summary: string; issueType: string;
  status: string; statusCategory: 'new' | 'indeterminate' | 'done';
  created: string; updated: string; resolutionDate: string | null; components: string[];
  spentSeconds: number | null; estimateSeconds: number | null; progressPercent: number | null;
}

/** Mappe un issue Jira SANS aucune donnée de personne (VG-21). */
export function toLite(raw: Json): JiraIssueLite | null {
  const key = str(raw.key);
  if (!key) return null;
  const f = obj(raw.fields);
  const status = obj(f.status);
  const category = str(obj(status.statusCategory).key) ?? 'new';
  const tt = obj(f.timetracking);
  const agg = obj(f.aggregprogress);
  return {
    id: str(raw.id) ?? key,
    key,
    projectKey: str(obj(f.project).key) ?? key.split('-')[0],
    summary: str(f.summary) ?? '',
    issueType: str(obj(f.issuetype).name) ?? '',
    status: str(status.name) ?? '',
    statusCategory: category === 'done' ? 'done' : category === 'indeterminate' ? 'indeterminate' : 'new',
    created: str(f.created) ?? new Date(0).toISOString(),
    updated: str(f.updated) ?? str(f.created) ?? new Date(0).toISOString(),
    resolutionDate: str(f.resolutiondate),
    components: Array.isArray(f.components) ? (f.components as Json[]).map((c) => str(obj(c).name) ?? '').filter(Boolean) : [],
    spentSeconds: num(tt.timeSpentSeconds),
    estimateSeconds: num(tt.originalEstimateSeconds),
    progressPercent: num(agg.percent),
  };
}
