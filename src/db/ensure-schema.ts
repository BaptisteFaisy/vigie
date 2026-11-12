/**
 * Application du schéma au premier besoin (SPEC §21).
 *
 * Forge SQL ne crée rien tout seul : les dix-huit tables viennent du DDL de
 * `schema.ts`, appliqué par le `migrationRunner`. Sans cette étape, la
 * première lecture échoue sur « table doesn't exist » — c'est exactement ce que
 * le déploiement en développement a montré.
 *
 * L'application est faite UNE fois par runtime chaud et elle est idempotente
 * (`CREATE TABLE IF NOT EXISTS`) : un runtime qui redémarre la refait sans
 * risque. Un échec n'est pas figé : la promesse est remise à zéro pour que le
 * prochain appel réessaie.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { MIGRATIONS } from './schema';
import { forgeDdlRunner } from './sql-client';
import type { DdlRunner } from './sql-client';

let applied: Promise<string[]> | null = null;

/** Applique le schéma une fois par runtime chaud ; renvoie les noms des tables. */
export function ensureSchema(runner: DdlRunner = forgeDdlRunner): Promise<string[]> {
  if (!applied) {
    applied = runner.run(MIGRATIONS).catch((error: unknown) => {
      applied = null;
      throw error;
    });
  }
  return applied;
}
