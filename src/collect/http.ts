/**
 * Aides HTTP partagées par les adaptateurs Jira et Confluence.
 *
 * Deux leçons apprises sur le VRAI site (invisibles en test, où `request` est
 * injecté) :
 *  1. Jira Cloud REFUSE un POST sans `Content-Type: application/json`
 *     → HTTP 415 « Unsupported Media Type ». Sans cet en-tête, chaque recherche
 *     rendait 0 résultat et le registre restait vide alors que le site a des
 *     epics.
 *  2. Un `!res.ok` doit être VISIBLE : sans journal, un 415 ressemble à « pas de
 *     données » et l'app croit honnêtement qu'il n'y a rien à importer.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Response } from './forge-runtime';

export const JSON_HEADERS: Record<string, string> = { 'Content-Type': 'application/json' };

export interface JsonInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/** Init d'une requête à corps JSON : méthode + en-tête + corps. */
export function jsonBody(method: string, body: string): JsonInit {
  return { method, headers: JSON_HEADERS, body };
}

function snippet(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/** Lit la réponse JSON ; journalise statut et début de corps si elle n'est pas `ok`. */
export async function readJson(res: Response, tag: string, what: string): Promise<unknown> {
  if (!res.ok) {
    let detail = '';
    try { detail = snippet(await res.text()); } catch { detail = ''; }
    console.error(`[${tag}] HTTP ${res.status} sur ${what}${detail ? ` — ${detail}` : ''}`);
    return null;
  }
  try { return await res.json(); } catch { return null; }
}
