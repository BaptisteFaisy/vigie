/**
 * Connecteur Teamwork Graph : pousse des agrégats (work item externe + relations).
 * L'API exacte du connecteur Forge est « à valider » (§22) : la forme est injectée
 * (`ConnectorApi`) pour que la logique soit testable, le branchement réel se fera
 * une fois la forme du module confirmée. Aucun agrégat ne contient de personne.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ExternalWorkItem, WorkItemRelation } from './types.js';

/** Surface minimale du connecteur (à brancher sur l'API réelle). */
export interface ConnectorApi {
  upsertWorkItem(workItem: ExternalWorkItem): Promise<{ id: string }>;
  relate(relation: WorkItemRelation): Promise<void>;
}

/** Pousse un objet et ses relations ; renvoie ce qui a été gravé. */
export async function pushToGraph(api: ConnectorApi, workItem: ExternalWorkItem, relations: WorkItemRelation[]): Promise<{ externalId: string; related: number }> {
  await api.upsertWorkItem(workItem);
  for (const relation of relations) await api.relate(relation);
  return { externalId: workItem.externalId, related: relations.length };
}