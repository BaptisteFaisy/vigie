/**
 * Garde du montage de l'UI Forge et des clés i18n.
 *
 * 1. Montage : l'entrée `src/ui/frontend/index.tsx` DOIT appeler
 *    `ForgeReconciler.render(...)`. Sans cet appel, le bundle se charge mais
 *    l'écran reste vide et le resolver n'est jamais invoqué — c'est ce qui a
 *    fait le registre vide sur le déploiement de développement (13/11/2026).
 * 2. Clés i18n : chaque `t(language, 'clé')` de l'UI doit exister dans le
 *    catalogue, sinon l'écran affiche la clé brute (« reg.title »).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { t } from '../../src/i18n/index';

const { renderSpy } = vi.hoisted(() => ({ renderSpy: vi.fn() }));

vi.mock('@forge/react', () => ({
  default: { render: renderSpy },
  Box: 'Box',
  Spinner: 'Spinner',
  Stack: 'Stack',
  Text: 'Text',
  useProductContext: () => ({ locale: 'fr', moduleKey: 'vigie-global' }),
}));

vi.mock('@forge/bridge', () => ({ invoke: vi.fn().mockResolvedValue({}) }));

/** Tous les sources TypeScript de l'UI. */
function uiSources(): string[] {
  const files: string[] = [];
  const walk = (path: string): void => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full.endsWith('.ts') || full.endsWith('.tsx')) files.push(full);
    }
  };
  walk(join(process.cwd(), 'src/ui'));
  return files;
}

/** Clés i18n utilisées par l'UI (`t(language, 'clé')`). */
function usedKeys(): string[] {
  const keys = new Set<string>();
  for (const file of uiSources()) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/t\(\s*language\s*,\s*'([^']+)'\s*\)/g)) keys.add(match[1]);
  }
  return [...keys];
}

describe("montage de l'UI Forge", () => {
  it("l'entrée appelle ForgeReconciler.render (sinon l'écran reste vide)", async () => {
    await import('../../src/ui/frontend/index');
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});

describe("clés i18n de l'UI", () => {
  it('toute clé utilisée existe dans le catalogue', () => {
    const keys = usedKeys();
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(t('en', key), `clé absente : ${key}`).not.toBe(key);
      expect(t('fr', key), `clé absente : ${key}`).not.toBe(key);
    }
  });
});
