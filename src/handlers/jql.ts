/**
 * Fonctions JQL (SPEC §20, VG-24 · S) : `goalLinked`, `goalOrphans`.
 *
 * Renvoient des clés de tickets. VG-24 est souhaitable (S) : les deux existent
 * pour que le manifest soit complet et le produit déployable ; l'enrichissement
 * complet (périmètre de la requête, cache) peut venir après le hackathon.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { AppDeps } from '../ports.js';

/** Issues rattachées à un objectif déclaré. */
export async function jqlLinked(_input: unknown, _context: unknown, deps: AppDeps): Promise<string[]> {
  const objectives = await deps.store.listObjectives({});
  const keys = new Set<string>();
  for (const objective of objectives) {
    const links = await deps.store.listLinksByObjective(objective.id);
    for (const link of links) if (link.state !== 'detached') keys.add(link.issueKey);
  }
  return [...keys];
}

/** Issues qui bougent sans servir d'objectif déclaré (les fantômes). */
export async function jqlOrphans(_input: unknown, _context: unknown, deps: AppDeps): Promise<string[]> {
  const orphans = await deps.store.listOrphans({});
  return orphans.map((o) => o.issueKey);
}