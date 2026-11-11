/**
 * Pont signé (miroir de l'App 1) — vérifie la signature HMAC-SHA256 d'un
 * payload reçu. Une signature invalide est rejetée : le graphe n'accepte que des
 * agrégats authentiques produits par Vigie.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export function signPayload(secret: string, payload: unknown): string {
  return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

export function verifyPayload(secret: string, payload: unknown, signature: string): boolean {
  const expected = signPayload(secret, payload);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature ?? '', 'utf8');
  return a.length === b.length ? timingSafeEqual(a, b) : false;
}

/** Enveloppe signée reçue du webtrigger de l'App 1. */
export interface SealedPayload {
  payload: unknown;
  signature: string;
}

export function openSealed<T>(secret: string, sealed: Partial<SealedPayload> | null | undefined): T | null {
  if (!sealed || typeof sealed.signature !== 'string' || sealed.payload == null) return null;
  return verifyPayload(secret, sealed.payload, sealed.signature) ? (sealed.payload as T) : null;
}