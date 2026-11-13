/**
 * Pont signé vers l'app jumelle « Le graveur » (SPEC §20).
 *
 * Une app Forge peut appeler l'API du graphe OU fournir un connecteur, pas les
 * deux : Vigie (app 1) lit le graphe, le graveur (app 2) y écrit. Les deux
 * échangent par un webtrigger dont le payload est signé (HMAC-SHA256) — le motif
 * éprouvé dans `merge-avec-contexte` et `deja-vu-ci`. Le graveur ne reçoit que des
 * AGRÉGATS (objectif, résultat, période, coût en jours, état) : jamais de donnée
 * personnelle, RH ou financière (catégories interdites à l'ingestion, §20/§22).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Payload agrégé poussé au graveur (aucune donnée de personne — VG-21/§20). */
export interface BridgePayload {
  objectiveId: string;
  title: string;
  periodId: string;
  theatreState: string | null;
  degree: string;
  costDays: number;
  keyResults: { title: string; value: number | null; target: number | null; sourceLevel: string }[];
  linkedIssueKeys: string[];
}

/** Signe un payload (HMAC-SHA256, hexadécimal). */
export function signPayload(secret: string, payload: unknown): string {
  return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

/** Vérifie une signature en temps constant ; faux si le payload a été altéré. */
export function verifyPayload(secret: string, payload: unknown, signature: string): boolean {
  const expected = signPayload(secret, payload);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature ?? '', 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Enveloppe signée envoyée au webtrigger du graveur. */
export function sealPayload(secret: string, payload: BridgePayload): { payload: BridgePayload; signature: string } {
  return { payload, signature: signPayload(secret, payload) };
}

/** Ouvre une enveloppe signée ; rend null si la signature est invalide. */
export function openSealed(secret: string, sealed: { payload: BridgePayload; signature: string }): BridgePayload | null {
  if (!sealed || typeof sealed.signature !== 'string') return null;
  return verifyPayload(secret, sealed.payload, sealed.signature) ? sealed.payload : null;
}
