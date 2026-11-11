/**
 * Identité de l'acteur (SPEC §18, VG-21). Un appel issu de `rovo:mcp` ou d'une
 * `action` est toujours un agent. La référence d'acteur sert à l'audit des
 * rattachements et des décisions — elle n'est JAMAIS agrégée ni renvoyée dans une
 * sortie (le registre `redact` la supprime, voir src/actions/common.ts).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Actor, ActorContext, IdentityGateway } from '../ports.js';

/** Crée l'adaptateur d'identité. */
export function createIdentityGateway(): IdentityGateway {
  return {
    async actorOf(context: ActorContext): Promise<Actor> {
      return { ref: context.accountId, isAgent: context.fromMcp };
    },
  };
}
