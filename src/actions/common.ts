/**
 * Helpers partagés des outils MCP (SPEC §18) — domaine d'application.
 *
 * Deux responsabilités : (1) valider des entrées plates (string/integer/number/
 * boolean, comme l'exige le manifest) ; (2) GARANTIR VG-21 — aucune sortie ne
 * contient de donnée de personne. `redact` supprime récursivement les clés
 * d'identité avant tout renvoi ; le test `tests/actions/no-person.test.ts` le
 * vérifie sur les 15 outils.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ActionResult } from '../types';

/** Clés d'identité à ne JAMAIS renvoyer (VG-21, §5, §18). */
const PERSON_KEYS = new Set([
  'ownerRef', 'byRef', 'linkedByRef', 'accountId', 'assignee', 'assigneeRef',
  'reporter', 'actor', 'actorRef', 'user', 'userRef', 'email', 'displayName',
]);

/** Supprime récursivement toute clé d'identité d'une valeur (VG-21). */
export function redact<T>(value: T): T {
  return strip(value) as T;
}

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (PERSON_KEYS.has(key)) continue;
      out[key] = strip(val);
    }
    return out;
  }
  return value;
}

export function ok<T>(value: T): ActionResult<T> & { ok: true } {
  return { ok: true, value: redact(value) as T };
}

export function fail(error: string, reason?: string): { ok: false; error: string; reason?: string } {
  return reason === undefined ? { ok: false, error } : { ok: false, error, reason };
}

/** Chaîne obligatoire non vide ; `null` si absente/invalide. */
export function getStr(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/** Chaîne optionnelle. */
export function getOptStr(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/** Entier optionnel (accepte un string numérique). */
export function getOptInt(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

/** Nombre optionnel (accepte un string numérique). */
export function getOptNum(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** Nombre obligatoire ; `null` si absent/invalide. */
export function getNum(input: Record<string, unknown>, key: string): number | null {
  const n = getOptNum(input, key);
  return n === undefined ? null : n;
}

/** Clés de tickets séparées par des virgules → liste nettoyée. */
export function parseIssueKeys(raw: string): string[] {
  return raw.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
}

/** Valide un niveau de source (§8). */
export function isSourceLevel(value: string): value is 'A' | 'B' | 'C' {
  return value === 'A' || value === 'B' || value === 'C';
}

/** Valide une décision de revue (§13). */
export function isDecision(value: string): value is 'continue' | 'retarget' | 'abandon' {
  return value === 'continue' || value === 'retarget' || value === 'abandon';
}
