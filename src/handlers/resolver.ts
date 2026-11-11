/**
 * Resolver des modules UI (manifest → `resolver`).
 *
 * Provisoire : renvoie un affichage minimal. Le lot L7 (viewmodel + UI + i18n)
 * remplit ce module avec la vraie interface (carte des caps, fiche, encart,
 * gadget, page projet, verso, couverture, réglages).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { AppDeps } from '../ports.js';

/** Vue du resolver (UI Kit 2) ; null tant que L7 n'est pas branché. */
export async function renderView(_request: unknown, _context: unknown, _deps: AppDeps): Promise<unknown> {
  return null;
}