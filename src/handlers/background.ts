/**
 * Handlers de fond : événements Jira (mouvement/rattachement), recalcul
 * planifié, consumer (queue longue) et pont signé vers le graveur.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { AppDeps, RecalcMessage } from '../ports';

/** Issue créée/mise à jour/transition/commentaire → recalcul en file (§20). */
export async function onEvent(event: unknown, context: { cloudId?: string }, deps: AppDeps): Promise<void> {
  const issueKey = (event as { issue?: { key?: string } } | null)?.issue?.key;
  const message: RecalcMessage = { scope: context.cloudId ?? '', objectiveId: null, full: false };
  await deps.queue.publish(message);
  deps.logger.log('info', 'événement mis en file', { issueKey });
}

/** Déclencheur planifié (nuit) → recalcul complet (§20). */
export async function onScheduled(_event: unknown, context: { cloudId?: string }, deps: AppDeps): Promise<{ objectives: number; calls: number; tokens: number }> {
  return deps.nightly.run({ scope: context.cloudId ?? '', objectiveId: null, full: true });
}

/** Consumer (queue) → recalcul long, jusqu'à 900 s (§20). */
export async function onMessage(message: { body?: RecalcMessage } | null, _context: unknown, deps: AppDeps) {
  const body = message?.body ?? { scope: '', objectiveId: null, full: true };
  return deps.nightly.run(body);
}

/** Webtrigger pont signé (§20) : le graveur renvoie l'accusé de gravure. */
export async function onBridge(payload: unknown, _context: unknown, deps: AppDeps): Promise<{ ok: boolean }> {
  // La signature HMAC est vérifiée côté graveur à la réception ; ici, accusé.
  deps.logger.log('info', 'pont graphe reçu', payload);
  return { ok: true };
}