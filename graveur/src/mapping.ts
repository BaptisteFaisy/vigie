/**
 * Mapping d'un payload Vigie → work item externe + relations (SPEC §20).
 *
 * Le catalogue d'objets d'un connecteur est FERMÉ (pas de type goal/key-result) :
 * un objectif devient un work item externe, les résultats clés des champs, les
 * issues rattachées des relations `serves`. Aucune donnée de personne ne passe.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { BridgePayload, ExternalWorkItem, WorkItemRelation } from './types.js';

/** Réduit un payload signé en agrégats à graver. */
export function mapBridgePayload(payload: BridgePayload): { workItem: ExternalWorkItem; relations: WorkItemRelation[] } {
  const workItem: ExternalWorkItem = {
    externalId: payload.objectiveId,
    name: payload.title,
    description: `Objectif ${payload.periodId} — état ${payload.theatreState ?? 'n/a'} — degré ${payload.degree} — coût ${payload.costDays} j.`,
    periodId: payload.periodId,
    theatreState: payload.theatreState,
    degree: payload.degree,
    costDays: payload.costDays,
    keyResults: payload.keyResults,
    relatedIssueKeys: payload.linkedIssueKeys,
  };
  const relations: WorkItemRelation[] = payload.linkedIssueKeys.map((key) => ({
    externalId: payload.objectiveId,
    relatedIssueKey: key,
    relationType: 'serves',
  }));
  return { workItem, relations };
}