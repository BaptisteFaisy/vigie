/**
 * Chargeur paresseux du runtime Forge (même motif que `src/db/sql-client.ts`).
 *
 * Les adaptateurs de `src/collect/*` n'importent JAMAIS `@forge/*` de façon
 * statique : ils passent par ces chargeurs, ce qui (1) évite une dépendance de
 * compilation dans les tests et (2) permet d'injecter un faux `request` pour
 * tester la logique sans site Forge. Le runtime réel n'est chargé qu'à l'appel.
 * Les spécificateurs sont LITTÉRAUX : c'est ce qui permet au bundler Forge de
 * les embarquer dans le déploiement (un spécificateur calculé ne serait jamais
 * résolu, et l'app tournerait sans `@forge/api`).
 *
 * Forge API v3 : une URL nue est refusée (« You must create your route using
 * the 'route' export ») — `toForgeRoute` fait la conversion. `route()` est le
 * seul élément importé statiquement : il ne demande rien au runtime, donc les
 * tests le chargent sans rien demander au runtime.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { route as forgeRoute } from '@forge/api';

/** Route sûre forgée par `route()` : l'API v3 refuse une chaîne nue. */
export type ForgeRoute = unknown;

/** Transforme un chemin Atlassian en route sûre (`route()` de `@forge/api`). */
export function toForgeRoute(path: string): ForgeRoute {
  // `route` est une balise de gabarit : on lui passe le chemin entier comme
  // fragment littéral (les paramètres sont déjà encodés par les appelants).
  return forgeRoute([path] as unknown as TemplateStringsArray);
}

/** Forme structurelle documentée de `@forge/api` (Forge API v3). */
export interface ForgeApi {
  asUser(): ForgeApi;
  asApp(): ForgeApi;
  requestJira(path: ForgeRoute, init?: RequestInit & { method?: string }): Promise<Response>;
  requestConfluence(path: ForgeRoute, init?: RequestInit & { method?: string }): Promise<Response>;
  requestGraph?(query: string, variables?: Record<string, unknown>): Promise<unknown>;
  requestTeamworkGraph?(query: string, variables?: Record<string, unknown>): Promise<unknown>;
}

/** Forme structurelle documentée de `@forge/llm`. */
export interface ForgeLlm {
  generateText?(prompt: string, options?: Record<string, unknown>): Promise<string>;
  definePrompt?(model: string, template: unknown): { generate(opts: unknown): Promise<{ output: unknown }> };
}

interface Response {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export type { Response, RequestInit };

let apiPromise: Promise<ForgeApi> | null = null;
let llmPromise: Promise<ForgeLlm> | null = null;

/** Charge `@forge/api` une fois par runtime chaud. */
export function loadApi(): Promise<ForgeApi> {
  apiPromise ??= import('@forge/api').then((mod: unknown) => {
    const m = mod as { default?: ForgeApi; api?: ForgeApi };
    const api = m.default ?? m.api;
    if (!api) throw new Error('@forge/api indisponible (aucun export default/api).');
    return api;
  });
  return apiPromise;
}

/**
 * Vrai quand l'erreur vient de l'absence d'utilisateur dans le contexte.
 *
 * Un déclencheur planifié ou un consumer n'a personne derrière lui : le Forge
 * répond alors 401 `AUTH_TYPE_UNAVAILABLE`. C'est un cas normal, pas une panne.
 */
export function isNoUserContext(error: unknown): boolean {
  const e = error as { status?: number; errorCode?: string; message?: string } | null;
  if (!e) return false;
  if (e.errorCode === 'AUTH_TYPE_UNAVAILABLE') return true;
  if (e.status === 401 && /AUTH_TYPE_UNAVAILABLE/.test(String(e.message ?? ''))) return true;
  return /AUTH_TYPE_UNAVAILABLE/.test(String(e.message ?? ''));
}

/**
 * Exécute une requête au nom de l'utilisateur, et à celui de l'app si aucun
 * utilisateur n'est disponible (recalcul nocturne, consumer).
 */
export async function requestAsUserOrApp<T>(call: (api: ForgeApi) => Promise<T>): Promise<T> {
  const root = await loadApi();
  try {
    return await call(root.asUser());
  } catch (error) {
    if (!isNoUserContext(error)) throw error;
    return call(root.asApp());
  }
}

/** Charge `@forge/llm` une fois par runtime chaud. */
export function loadLlm(): Promise<ForgeLlm> {
  llmPromise ??= import('@forge/llm').then((mod: unknown) => mod as ForgeLlm);
  return llmPromise;
}

/** Permet aux tests d'injecter un faux runtime (jamais appelé en production). */
export function __setRuntimeForTest(api?: ForgeApi | null, llm?: ForgeLlm | null): void {
  apiPromise = api ? Promise.resolve(api) : null;
  llmPromise = llm ? Promise.resolve(llm) : null;
}
