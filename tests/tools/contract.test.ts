/**
 * Contrat manifest ↔ registre d'actions ↔ type ActionKey (SPEC §18).
 *
 * Les 15 outils déclarés au manifest (`action:` et `rovo:mcp.tools`) doivent
 * exister exactement une fois dans le registre (`ACTION_KEYS`) et réciproquement.
 * Un outil déclaré sans handler, ou un handler non déclaré, casse la CI ici.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACTION_KEYS } from '../../src/actions/registry.js';

const manifestPath = join(process.cwd(), 'manifest.yml');
const manifest = readFileSync(manifestPath, 'utf8');

function actionKeys(): string[] {
  const block = /\n {2}action:\n([\s\S]*?)\n {2}rovo:agent:/.exec(manifest);
  if (!block) return [];
  return [...block[1].matchAll(/^ {4}- key: ([a-z0-9-]+)$/gm)].map((m) => m[1]);
}

function mcpTools(): string[] {
  const block = /\n {2}rovo:mcp:\n[\s\S]*?tools:\n((?: {8}- [a-z0-9-]+\n)+)/.exec(manifest);
  if (!block) return [];
  return [...block[1].matchAll(/^ {8}- ([a-z0-9-]+)$/gm)].map((m) => m[1]);
}

function functionKeys(): string[] {
  const block = /\n {2}function:\n([\s\S]*?)\n {2}action:/.exec(manifest);
  if (!block) return [];
  return [...block[1].matchAll(/^ {4}- key: ([a-z0-9-]+)$/gm)].map((m) => m[1]);
}

describe('contrat manifest ↔ registre (§18)', () => {
  it('le manifest déclare exactement 15 actions', () => {
    expect(actionKeys()).toHaveLength(15);
  });

  it('chaque action du manifest a un handler dans le registre', () => {
    for (const key of actionKeys()) expect(ACTION_KEYS as readonly string[]).toContain(key);
  });

  it('chaque handler du registre est déclaré au manifest', () => {
    for (const key of ACTION_KEYS) expect(actionKeys()).toContain(key);
  });

  it('rovo:mcp expose exactement les mêmes 15 outils', () => {
    expect(mcpTools().sort()).toEqual([...ACTION_KEYS].sort());
  });

  it('chaque action pointe vers une function fn-<key> déclarée', () => {
    const fns = functionKeys();
    for (const key of actionKeys()) expect(fns).toContain(`fn-${key}`);
  });

  it('aucun doublon parmi les clés d’action', () => {
    const keys = actionKeys();
    expect(new Set(keys).size).toBe(keys.length);
  });
});
