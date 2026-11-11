/**
 * Point d'entrée Forge : câblage seul, aucune logique métier.
 *
 * Les modules du manifest arrivent ici et repartent aussitôt vers leur handler :
 *   handler    → resolver UI (globalPage, issuePanel, projectPage, gadget, macro)
 *   dispatch   → les 15 `action` + les outils `rovo:mcp`
 *   onEvent    → `trigger` avi:jira:*
 *   onScheduled→ `scheduledTrigger` (recalcul nocturne)
 *   onMessage  → `consumer` vigie-recalc
 *   onBridge   → `webtrigger` graveur-bridge (pont signé)
 *   jqlLinked / jqlOrphans → `jira:jqlFunction`
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { Queue } from '@forge/events';
import Resolver from '@forge/resolver';
import { createAppDeps } from './deps.js';
import { registerResolvers } from './handlers/resolver.js';
import type { AppDeps, JobQueue, RecalcMessage } from './ports.js';
import { dispatch as dispatchAction } from './handlers/dispatch.js';
import { onEvent as handleEvent, onScheduled as handleScheduled, onMessage as handleMessage, onBridge as handleBridge } from './handlers/background.js';
import { jqlLinked as runJqlLinked, jqlOrphans as runJqlOrphans } from './handlers/jql.js';

const QUEUE_KEY = 'vigie-recalc';

/** La clé de file doit être celle du module `consumer` du manifest. */
const queue = new Queue({ key: QUEUE_KEY });

const jobQueue: JobQueue = {
  async publish(message: RecalcMessage) {
    await queue.push({ body: message as unknown as Record<string, unknown> });
  },
};

const deps: AppDeps = createAppDeps(jobQueue);

type Ctx = { cloudId?: string; accountId?: string; moduleId?: string };

/** Resolver des modules UI (manifest → `resolver`) : les fonctions `invoke`. */
const resolver = new Resolver();
registerResolvers(resolver, deps);
export const handler = resolver.getDefinitions();

/** Les 15 actions et les outils `rovo:mcp`. */
export function dispatch(request: unknown, context: unknown): Promise<unknown> {
  return dispatchAction(request, context as never, deps);
}

export function onEvent(event: unknown, context: Ctx): Promise<void> {
  return handleEvent(event, context, deps);
}

export function onScheduled(event: unknown, context: Ctx): Promise<{ objectives: number; calls: number; tokens: number }> {
  return handleScheduled(event, context, deps);
}

export function onMessage(message: unknown, context: unknown): Promise<unknown> {
  return handleMessage(message as never, context, deps);
}

export function onBridge(payload: unknown, context: unknown): Promise<{ ok: boolean }> {
  return handleBridge(payload, context, deps);
}

export function jqlLinked(input: unknown, context: unknown): Promise<string[]> {
  return runJqlLinked(input, context, deps);
}

export function jqlOrphans(input: unknown, context: unknown): Promise<string[]> {
  return runJqlOrphans(input, context, deps);
}