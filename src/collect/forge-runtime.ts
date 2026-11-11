/**
 * Chargeur paresseux du runtime Forge (même motif que `src/db/sql-client.ts`).
 *
 * Les adaptateurs de `src/collect/*` n'importent JAMAIS `@forge/*` de façon
 * statique : ils passent par ces chargeurs, ce qui (1) évite une dépendance de
 * compilation dans les tests et (2) permet d'injecter un faux `request` pour
 * tester la logique sans site Forge. Le runtime réel n'est chargé qu'à l'appel.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */

/** Spécificateurs non littéraux : TypeScript ne tente pas de résoudre @forge/*. */
const FORGE_API: string = '@forge/api';
const FORGE_LLM: string = '@forge/llm';

/** Forme structurelle documentée de `@forge/api` (Forge API v3). */
export interface ForgeApi {
  asUser(): ForgeApi;
  asApp(): ForgeApi;
  requestJira(route: string, init?: RequestInit & { method?: string }): Promise<Response>;
  requestConfluence(route: string, init?: RequestInit & { method?: string }): Promise<Response>;
  requestGraph?(query: string, variables?: Record<string, unknown>): Promise<unknown>;
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
  apiPromise ??= import(FORGE_API).then((mod: unknown) => {
    const m = mod as { default?: ForgeApi; api?: ForgeApi };
    const api = m.default ?? m.api;
    if (!api) throw new Error('@forge/api indisponible (aucun export default/api).');
    return api;
  });
  return apiPromise;
}

/** Charge `@forge/llm` une fois par runtime chaud. */
export function loadLlm(): Promise<ForgeLlm> {
  llmPromise ??= import(FORGE_LLM).then((mod: unknown) => mod as ForgeLlm);
  return llmPromise;
}

/** Permet aux tests d'injecter un faux runtime (jamais appelé en production). */
export function __setRuntimeForTest(api?: ForgeApi | null, llm?: ForgeLlm | null): void {
  apiPromise = api ? Promise.resolve(api) : null;
  llmPromise = llm ? Promise.resolve(llm) : null;
}
