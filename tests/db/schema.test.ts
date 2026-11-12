/**
 * Garde VG-21 au niveau SQL (SPEC §5, §21) : aucune requête n'agrège ni ne trie
 * par une colonne d'identité (owner_ref, linked_by_ref, by_ref). Ces colonnes
 * existent pour l'audit des décisions, jamais pour un classement.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TABLES, MIGRATIONS } from '../../src/db/schema';

const DB_DIR = join(process.cwd(), 'src', 'db');
const FORBIDDEN = ['owner_ref', 'linked_by_ref', 'by_ref'];

function sqlFiles(): string[] {
  return readdirSync(DB_DIR).filter((f) => f.endsWith('.ts')).map((f) => join(DB_DIR, f));
}

describe('VG-21 — aucune agrégation/tri par identité dans le SQL', () => {
  it('aucun GROUP BY / ORDER BY sur owner_ref, linked_by_ref ou by_ref', () => {
    const violations: string[] = [];
    for (const file of sqlFiles()) {
      const content = readFileSync(file, 'utf8');
      for (const col of FORBIDDEN) {
        const re = new RegExp(`(GROUP\\s+BY|ORDER\\s+BY)[^\\n]*\\b${col}\\b`, 'gi');
        if (re.test(content)) violations.push(`${file}: ${col}`);
      }
    }
    expect(violations, `agrégations interdites : ${violations.join(', ')}`).toEqual([]);
  });
});

describe('schéma SQL (§21)', () => {
  it('chaque table a une migration et un CREATE', () => {
    const migrationNames = MIGRATIONS.map((m) => m.name);
    for (const table of TABLES) {
      expect(migrationNames, `table sans migration : ${table}`).toContain(table);
    }
    expect(MIGRATIONS).toHaveLength(TABLES.length);
    for (const migration of MIGRATIONS) {
      expect(migration.ddl).toContain('CREATE TABLE IF NOT EXISTS');
      expect(migration.ddl).toContain(migration.name);
    }
  });

  it('aucune colonne d’identité n’est indexée pour un tri (VG-21)', () => {
    const allDdl = MIGRATIONS.map((m) => m.ddl).join('\n');
    for (const col of FORBIDDEN) {
      const re = new RegExp(`INDEX[^)]*\\b${col}\\b`, 'gi');
      expect(re.test(allDdl), `index sur ${col}`).toBe(false);
    }
  });
});
