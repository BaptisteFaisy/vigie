#!/usr/bin/env node
/**
 * Build du site public : regroupe `tools/site-data.ts` (TypeScript) avec esbuild,
 * l'exécute, et écrit `site/data/demo.json` — les VRAIES sorties des moteurs sur
 * le jeu de démonstration. Utilisé en local (`node tools/build-site.mjs`) et par
 * le workflow GitHub Pages.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const ENTRY = join(HERE, 'site-data.ts');
const OUT_JSON = join(ROOT, 'site', 'data', 'demo.json');

async function bundleToTemp() {
  const dir = mkdtempSync(join(tmpdir(), 'vigie-site-'));
  const outfile = join(dir, 'site-data.mjs');
  await build({
    entryPoints: [ENTRY],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'warning',
    absWorkingDir: ROOT,
  });
  return { dir, outfile };
}

async function main() {
  const { dir, outfile } = await bundleToTemp();
  try {
    const output = execFileSync(process.execPath, [outfile], { cwd: ROOT, encoding: 'utf8' });
    process.stdout.write(output);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (!existsSync(OUT_JSON)) {
    process.stderr.write(`ERREUR : ${OUT_JSON} absent après génération.\n`);
    process.exit(1);
  }
  const size = statSync(OUT_JSON).size;
  process.stdout.write(`OK : site/data/demo.json (${size} octets).\n`);
}

await main();
