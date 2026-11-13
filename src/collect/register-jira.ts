/**
 * Peuplement du registre local depuis Jira, côté app FORGE.
 *
 * L'app n'utilise PAS de jeton personnel : elle lit le site par son propre accès
 * (`JiraGateway` → `@forge/api asApp()`), puis délègue le mapping au module
 * partagé `src/import/register-map.ts` (le même que l'outil ligne de commande).
 *
 * L'import se fait PAR TRANCHES : une invocation Forge a un budget de temps, on
 * n'importe donc que 8 epics par appel et l'appel suivant continue (le
 * registre se remplit jusqu'à contenir tous les epics du site). Les époques
 * sont calculées sur tous les epics, pas sur la tranche : elles ne bougent pas
 * d'un appel à l'autre.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { IssueRef, JiraGateway, RegisterSummary, VigieStore } from '../ports';
import type { Orphan } from '../types';
import type { RegisterIssue } from '../import/register-map';
import { buildEpochs, populateRegister } from '../import/register-map';

export interface RegisterSyncOptions {
  scope?: string;
  /** Identifiant du site pour la source (le cloudId suffit, il est stable et unique). */
  site?: string;
  maxEpics?: number;
  /** Nombre d'epics importés par invocation (tranches). */
  chunk?: number;
  now?: string;
}

/** Un import raté n'est pas rejoué à chaque clic : dix minutes de cooldown. */
const RETRY_MS = 10 * 60_000;
let lastFailure = 0;
/**
 * Verrou d'import : il vit dans la **base**, pas en mémoire.
 *
 * Chaque invocation Forge a son propre runtime : un verrou en mémoire ne
 * verrouille rien, les trois écrans d'une page importaient donc en parallèle
 * et tous expiraient (25 s). Le curseur est partagé par tous les runtimes.
 */
const LOCK_CURSOR = 'register-import';
const LOCK_MS = 30_000;

/** Prend le verrou d'import (faux si un import tourne déjà). */
async function acquireLock(store: VigieStore, now: string): Promise<boolean> {
  const cursor = await store.getCursor(LOCK_CURSOR);
  const started = cursor?.lastRunAt ? Date.parse(cursor.lastRunAt) : 0;
  if (cursor?.lastId === 'running' && started && Date.now() - started < LOCK_MS) return false;
  await store.saveCursor({ objectType: LOCK_CURSOR, lastId: 'running', lastRunAt: now });
  return true;
}

/** Relâche le verrou d'import. */
async function releaseLock(store: VigieStore, now: string): Promise<void> {
  await store.saveCursor({ objectType: LOCK_CURSOR, lastId: 'idle', lastRunAt: now });
}

function refToIssue(ref: IssueRef): RegisterIssue {
  return {
    id: ref.id,
    key: ref.key,
    projectKey: ref.projectKey,
    summary: ref.summary,
    issueType: ref.issueType,
    statusCategory: ref.statusCategory,
    created: ref.created,
    resolutionDate: ref.resolutionDate,
    components: [...ref.components],
    spentSeconds: ref.spentSeconds,
    estimateSeconds: ref.estimateSeconds,
  };
}

/** Un searchIssues qui dégrade en tableau vide : un droit manquant n'interrompt pas l'import. */
async function search(jira: JiraGateway, jql: string, limit: number): Promise<RegisterIssue[]> {
  try {
    const rows = await jira.searchIssues(jql, limit);
    if (rows.length === 0) console.log('[register-jira] 0 résultat pour :', jql.slice(0, 80));
    return rows.map(refToIssue);
  } catch (error) {
    console.error('[register-jira] search échec :', jql.slice(0, 80), String((error as { message?: string })?.message ?? error).slice(0, 200));
    return [];
  }
}

/** Enfants d'un epic : « Epic Link » (company-managed) puis `parent` (team-managed). */
async function childrenOfAsync(jira: JiraGateway, epicKey: string): Promise<RegisterIssue[]> {
  const viaLink = await search(jira, `"Epic Link" = ${epicKey} ORDER BY created ASC`, 200);
  if (viaLink.length > 0) return viaLink;
  return search(jira, `parent = ${epicKey} ORDER BY created ASC`, 200);
}

/** JQL des epics : bornée (Atlassian refuse une requête sans restriction). */
const EPIC_JQL = 'issuetype = Epic AND updated >= -1825d ORDER BY updated DESC';
/** JQL des fantômes : tickets récents sans epic rattaché. */
const GHOST_JQL = '"Epic Link" is EMPTY AND issuetype != Epic AND updated >= -90d ORDER BY updated DESC';
/** Nombre d'epics ramenés par lecture (le site réel en a 23). */
const MAX_EPICS = 25;
/**
 * Une tranche par invocation : le temps d'une invocation Forge est borné
 * (25 s sur le site réel, mesuré) et l'import des epics **et** des 100
 * fantômes dépasse ce budget si on en prend trop à la fois.
 */
export const IMPORT_CHUNK = 6;

/** Récupère les epics, leurs enfants et les fantômes depuis le site Jira réel. */
export async function fetchRegister(jira: JiraGateway, maxEpics: number): Promise<{
  epics: RegisterIssue[];
  childrenByEpic: Map<string, RegisterIssue[]>;
  ghosts: RegisterIssue[];
}> {
  // JQL BORNÉE : `/rest/api/3/search/jql` refuse une requête sans restriction
  // (HTTP 400 « Unbounded JQL queries are not allowed here »), et c'est ce que
  // l'app recevait sur le vrai site. La fenêtre borne la lecture.
  const epics = await search(jira, EPIC_JQL, maxEpics);
  const childrenByEpic = new Map<string, RegisterIssue[]>();
  for (const epic of epics) {
    childrenByEpic.set(epic.key, await childrenOfAsync(jira, epic.key));
  }
  const ghosts = await search(jira, GHOST_JQL, 150);
  return { epics, childrenByEpic, ghosts };
}

/** Clés des epics déjà présents dans le registre (l'objectif a pour id `obj-<clé>`). */
async function importedKeys(store: VigieStore): Promise<Set<string>> {
  const objectives = await store.listObjectives({});
  return new Set(objectives.map((o) => o.id.replace(/^obj-/, '')));
}

/** Un ticket rattaché à un epic n'est plus un fantôme : on le résout. */
async function resolveLinkedOrphans(store: VigieStore, children: RegisterIssue[], orphans: Orphan[], now: string): Promise<void> {
  const known = new Set(orphans.map((o) => o.issueId));
  for (const child of children) {
    if (known.has(child.id)) await store.resolveOrphan(child.id, now);
  }
}

/**
 * Importe la tranche suivante d'epics manquants (et les fantômes, une fois).
 *
 * Une invocation Forge a un budget de temps (25 s, mesuré sur le site) :
 * chaque appel ramène donc une tranche d'epics, l'appel suivant continue où le
 * précédent s'est arrêté, jusqu'à ce que le registre contienne TOUS les epics
 * du site. Les phases sont chronométrées : le journal dit où part le temps.
 */
async function importNextChunk(store: VigieStore, jira: JiraGateway, options: RegisterSyncOptions): Promise<RegisterSummary | null> {
  const now = options.now ?? new Date().toISOString();
  const started = Date.now();
  const epics = await search(jira, EPIC_JQL, options.maxEpics ?? MAX_EPICS);
  const imported = await importedKeys(store);
  const chunk = epics.filter((e) => !imported.has(e.key)).slice(0, options.chunk ?? IMPORT_CHUNK);
  const orphans = await store.listOrphans({});
  // Les fantômes sont importés une fois, pendant les tranches d'epics : ensuite
  // ils sont là, et le registre est complet quand plus aucun epic ne manque.
  const withGhosts = chunk.length > 0 && orphans.length === 0;
  if (chunk.length === 0 && !withGhosts) return null;

  const childrenByEpic = new Map<string, RegisterIssue[]>();
  for (const epic of chunk) childrenByEpic.set(epic.key, await childrenOfAsync(jira, epic.key));
  const ghosts = withGhosts ? await search(jira, GHOST_JQL, 150) : [];
  // Époques stables : calculées sur TOUS les epics, pas sur la seule tranche.
  const epochs = buildEpochs(epics.map((e) => e.created), now);
  const read = Date.now();
  const summary = await populateRegister(store, {
    site: options.site ?? 'jira-cloud',
    epics: chunk,
    childrenByEpic,
    ghosts,
  }, { scope: options.scope, now, epochs });
  await resolveLinkedOrphans(store, [...childrenByEpic.values()].flat(), orphans, now);
  console.log('[register-jira] tranche importée', {
    epics: chunk.length, fantomes: ghosts.length, enfants: [...childrenByEpic.values()].flat().length,
    lecture_ms: read - started, ecriture_ms: Date.now() - read, total_ms: Date.now() - started,
  });
  return summary;
}

/**
 * Importe le registre réel depuis Jira, par tranches, tant qu'il est incomplet.
 *
 * Rend `null` quand il n'y a plus rien à importer (registre complet), quand un
 * import tourne déjà (verrou en base) ou après un échec (cooldown : dix
 * minutes sans réessayer le même échec).
 */
export async function syncRegisterFromJira(store: VigieStore, jira: JiraGateway, options: RegisterSyncOptions = {}): Promise<RegisterSummary | null> {
  if (Date.now() - lastFailure < RETRY_MS) return null;
  const now = options.now ?? new Date().toISOString();
  if (!(await acquireLock(store, now))) return null;
  try {
    const summary = await importNextChunk(store, jira, options);
    lastFailure = 0;
    return summary;
  } catch (error) {
    lastFailure = Date.now();
    console.error('[register-jira] import échoué :', String((error as { message?: string })?.message ?? error).slice(0, 200));
    return null;
  } finally {
    await releaseLock(store, new Date().toISOString());
  }
}