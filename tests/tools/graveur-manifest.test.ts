/**
 * Manifeste du graveur (App 2) — forme réelle du module connecteur.
 *
 * `externalConnector` n'existe pas dans la CLI Forge : le module du connecteur
 * Teamwork Graph est `graph:connector`, avec `key` (^[A-Za-z0-9_-]+$), `name`,
 * `icons.light|dark`, `objectTypes` (catalogue fermé), `capabilities` et
 * `datasource.onConnectionChange.function` (doc Atlassian, avr. 2026).
 * Le handler référencé doit exister dans `graveur/src/index.ts`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const manifest = readFileSync(join(process.cwd(), 'graveur', 'manifest.yml'), 'utf8');
const entry = readFileSync(join(process.cwd(), 'graveur', 'src', 'index.ts'), 'utf8');

/** Le bloc `graph:connector:` (une entrée de module). */
function connectorBlock(): string {
  const m = /\n {2}graph:connector:\n([\s\S]*?)\n {2}\S/.exec(manifest);
  return m ? m[1] : '';
}

const TYPES_SUPPORTÉS = ['atlassian:work-item', 'atlassian:project', 'atlassian:document', 'atlassian:commit'];

describe('graveur : module graph:connector', () => {
  it('le module fantôme externalConnector a disparu', () => {
    // On regarde les CLÉS de modules, pas les commentaires : le manifest
    // explique pourquoi l'ancien nom a été écarté, il ne le déclare plus.
    const modules = /\nmodules:\n([\s\S]*?)\npermissions:/.exec(manifest)?.[1] ?? '';
    expect(modules).not.toMatch(/externalConnector:/);
    expect(modules).toMatch(/\n {2}graph:connector:/);
  });

  it('la clé du connecteur respecte le format exigé', () => {
    const key = /- key: ([A-Za-z0-9_-]+)/.exec(connectorBlock())?.[1] ?? '';
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(key).not.toContain(':');
  });

  it('déclare name, icons light+dark et objectTypes du catalogue fermé', () => {
    const block = connectorBlock();
    expect(block).toMatch(/name: /);
    expect(block).toMatch(/light: /);
    expect(block).toMatch(/dark: /);
    const types = [...block.matchAll(/- (atlassian:[a-z-]+)/g)].map((m) => m[1]);
    expect(types.length).toBeGreaterThan(0);
    for (const t of types) expect(TYPES_SUPPORTÉS).toContain(t);
  });

  it('déclare les trois capabilities (sinon « not declared by developer » chez l\u2019admin)', () => {
    const block = connectorBlock();
    expect(block).toMatch(/replicatesPermissions:/);
    expect(block).toMatch(/syncFidelity: (append|upsert|mirror)/);
    expect(block).toMatch(/supportsIncrementalSync:/);
  });

  it('pointe sur une fonction déclarée, dont le handler existe dans le code', () => {
    const fn = /onConnectionChange:\n +function: (\S+)/.exec(connectorBlock())?.[1] ?? '';
    expect(fn).toBe('onConnectionChange');
    expect(manifest).toMatch(new RegExp(`- key: ${fn}\\n +handler: index\\.${fn}`));
    expect(entry).toMatch(new RegExp(`export async function ${fn}\\(`));
  });

  it('les scopes du connecteur sont ceux de la doc (objets, pas write:graph:*)', () => {
    expect(manifest).toMatch(/- read:object:jira/);
    expect(manifest).toMatch(/- write:object:jira/);
    expect(manifest).not.toMatch(/write:graph:work-item/);
  });
});
