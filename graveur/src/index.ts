/**
 * Point d'entrée Forge du graveur (App 2). Le webtrigger `graveur-ingest`
 * reçoit un payload SIGNÉ de l'App 1, vérifie la signature, mappe en agrégats
 * et pousse au graphe. Une signature invalide est rejetée. Règle : agrégats
 * uniquement, jamais de donnée personnelle/RH/financière.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { BridgePayload } from './types.js';
import { mapBridgePayload } from './mapping.js';
import { pushToGraph } from './connector.js';
import type { ConnectorApi } from './connector.js';
import { openSealed } from './bridge.js';
import type { SealedPayload } from './bridge.js';

export interface IngestContext {
  /** Secret du pont (SecretStorage Forge), injecté depuis la config réelle. */
  secret?: string;
  connector?: ConnectorApi;
}

/** Handler du webtrigger : vérifie, mappe, grave, acquitte. */
export async function onIngest(sealed: SealedPayload | null, context: IngestContext = {}): Promise<{ ok: boolean; error?: string; externalId?: string; related?: number }> {
  const secret = context.secret ?? process.env.VIGIE_BRIDGE_SECRET ?? '';
  const payload = openSealed<BridgePayload>(secret, sealed);
  if (!payload) return { ok: false, error: 'signature invalide : payload rejeté.' };
  const { workItem, relations } = mapBridgePayload(payload);
  if (!context.connector) return { ok: true, externalId: workItem.externalId, related: 0 }; // connecteur à brancher (§22)
  const result = await pushToGraph(context.connector, workItem, relations);
  return { ok: true, externalId: result.externalId, related: result.related };
}