/**
 * Dispatch des `action` et des outils `rovo:mcp` (manifest) → `runAction`.
 *
 * Forge passe l'entrée dans `request` et la clé dans `context` (`actionKey` pour
 * une action, `toolKey` pour un outil MCP). On reconstruit un `ActionDeps` avec
 * l'acteur réel (appel MCP = agent), on exécute, et on renvoie la valeur — ou on
 * lève une erreur lisible si l'outil échoue. REDACTION VG-21 : faite au registre.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ActionDeps, AppDeps } from '../ports';
import type { ActionKey } from '../types';
import { runAction } from '../actions/registry';

interface ForgeContext {
  actionKey?: string;
  toolKey?: string;
  accountId?: string;
  moduleId?: string;
  cloudId?: string;
}

function actionKeyOf(payload: unknown, context: ForgeContext): string | null {
  const key = context.actionKey ?? context.toolKey ?? (payload as { __key?: string } | null)?.__key;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

/** Point d'entrée des `action` et outils `rovo:mcp`. */
export async function dispatch(payload: unknown, context: ForgeContext, deps: AppDeps): Promise<unknown> {
  const key = actionKeyOf(payload, context);
  if (!key) throw new Error('Clé d’outil absente du contexte Forge.');
  const input = ((payload as { input?: unknown } | null)?.input ?? payload ?? {}) as Record<string, unknown>;
  const actor = await deps.identity.actorOf({
    accountId: context.accountId ?? '', moduleId: context.moduleId ?? '',
    fromMcp: Boolean(context.toolKey), cloudId: context.cloudId ?? '',
  });
  const actionDeps: ActionDeps = { deps, actor, scope: context.cloudId ?? '' };
  const result = await runAction(key as ActionKey, input, actionDeps);
  if (!result.ok) throw new Error(`${result.error}${result.reason ? ` — ${result.reason}` : ''}`);
  return result.value;
}