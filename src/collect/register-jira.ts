/**
 * Peuplement du registre local depuis Jira, côté app FORGE.
 *
 * L'app n'utilise PAS de jeton personnel : elle lit le site par son propre accès
 * (`JiraGateway` → `@forge/api asApp()`), puis délègue le mapping au module
 * partagé `src/import/register-map.ts` (le même que l'outil ligne de commande).
 *
 * Le déclencheur est le recalcul planifié : au premier run sur un registre vide,
 * l'app importe les epics réels, leurs enfants et les fantômes. Les runs suivants
 * ne font que recalculer (idempotent : `syncIfEmpty` ne réimporte pas).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { IssueRef, JiraGateway, RegisterSummary, VigieStore } from '../ports';
import type { RegisterIssue } from '../import/register-map';
import { populateRegister } from '../import/register-map';

export interface RegisterSyncOptions {
  scope?: string;
  /** Identifiant du site pour la source (le cloudId suffit, il est stable et unique). */
  site?: string;
  maxEpics?: number;
  now?: string;
}

/** Un import raté n'est pas rejoué à chaque clic : dix minutes de cooldown. */
const RETRY_MS = 10 * 60_000;
let lastAttempt = 0;

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

/** Récupère les epics, leurs enfants et les fantômes depuis le site Jira réel. */
export async function fetchRegister(jira: JiraGateway, maxEpics: number): Promise<{
  epics: RegisterIssue[];
  childrenByEpic: Map<string, RegisterIssue[]>;
  ghosts: RegisterIssue[];
}> {
  const epics = await search(jira, 'issuetype = Epic ORDER BY updated DESC', maxEpics);
  const childrenByEpic = new Map<string, RegisterIssue[]>();
  for (const epic of epics) {
    childrenByEpic.set(epic.key, await childrenOfAsync(jira, epic.key));
  }
  const ghosts = await search(jira, '"Epic Link" is EMPTY AND issuetype != Epic AND updated >= -90d ORDER BY updated DESC', 150);
  return { epics, childrenByEpic, ghosts };
}

/** Importe le registre réel depuis Jira SI le store est vide ; sinon ne fait rien. */
export async function syncRegisterFromJira(store: VigieStore, jira: JiraGateway, options: RegisterSyncOptions = {}): Promise<RegisterSummary | null> {
  const existing = await store.listObjectives({});
  if (existing.length > 0) return null;
  if (Date.now() - lastAttempt < RETRY_MS) return null;
  lastAttempt = Date.now();
  const input = await fetchRegister(jira, options.maxEpics ?? 8);
  const summary = await populateRegister(store, {
    site: options.site ?? 'jira-cloud',
    epics: input.epics,
    childrenByEpic: input.childrenByEpic,
    ghosts: input.ghosts,
  }, { scope: options.scope, now: options.now });
  return summary;
}