/**
 * Types du graveur (App 2). AGRÉGATS UNIQUEMENT — jamais de donnée personnelle,
 * RH, financière ou de santé (§20, §22). Le payload reçu de l'App 1 est déjà
 * nettoyé (aucun `*_ref`) ; ce fichier ne définit aucun champ d'identité.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */

/** Un résultat clé, réduit à un agrégat. */
export interface KrField {
  title: string;
  value: number | null;
  target: number | null;
  sourceLevel: 'A' | 'B' | 'C';
}

/** Payload signé reçu de l'App 1 (miroir de src/collect/bridge.ts). */
export interface BridgePayload {
  objectiveId: string;
  title: string;
  periodId: string;
  theatreState: string | null;
  degree: string;
  costDays: number;
  keyResults: KrField[];
  linkedIssueKeys: string[];
}

/** Objet externe poussé au graphe (catalogue fermé : work item / project). */
export interface ExternalWorkItem {
  externalId: string;
  name: string;
  description: string;
  periodId: string;
  theatreState: string | null;
  degree: string;
  costDays: number;
  keyResults: KrField[];
  relatedIssueKeys: string[];
}

/** Relation vers une issue Jira, gravée avec l'objet. */
export interface WorkItemRelation {
  externalId: string;
  relatedIssueKey: string;
  relationType: 'serves';
}
/** Notification de changement de connexion (module `graph:connector`). */
export interface ConnectionChange {
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  name: string;
  connectionId: string;
  configProperties?: Record<string, string>;
}
