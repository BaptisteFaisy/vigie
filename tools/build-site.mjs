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
import { existsSync, mkdtempSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const ARGS = process.argv.slice(2);
const realArg = ARGS.find((a) => a.startsWith('--real'));
const REAL_REPO = realArg
  ? (realArg.includes('=') ? realArg.split('=').slice(1).join('=') : (process.env.VIGIE_REAL_REPO ?? 'godotengine/godot'))
  : null;
const JIRA = ARGS.includes('--jira');
const ENTRY = JIRA ? join(HERE, 'site-jira.ts') : REAL_REPO ? join(HERE, 'site-real.ts') : join(HERE, 'site-data.ts');
// En mode Jira, la sortie est gitignorée : rien de réel n'est publié sans accord.
const OUT_JSON = join(ROOT, 'site', 'data', JIRA ? 'jira.json' : 'demo.json');
const REAL_STORE = join(ROOT, 'site', 'data', 'real-store.json');

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

async function bundleBrowser() {
  const outfile = join(ROOT, 'site', 'vigie-engine.js');
  await build({
    entryPoints: [join(HERE, 'site-browser.ts')],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    globalName: 'Vigie',
    target: 'es2020',
    minify: true,
    sourcemap: false,
    logLevel: 'warning',
    absWorkingDir: ROOT,
  });
  return outfile;
}

async function main() {
  const { dir, outfile } = await bundleToTemp();
  try {
    const output = execFileSync(process.execPath, [outfile], {
      cwd: ROOT, encoding: 'utf8',
      env: { ...process.env, VIGIE_REAL_REPO: REAL_REPO ?? '' },
    });
    process.stdout.write(output);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (!existsSync(OUT_JSON)) {
    process.stderr.write(`ERREUR : ${OUT_JSON} absent après génération.\n`);
    process.exit(1);
  }
  if (!REAL_REPO && !JIRA && existsSync(REAL_STORE)) {
    unlinkSync(REAL_STORE);
    process.stdout.write('site/data/real-store.json retiré (build synthétique).\n');
  }
  const engine = await bundleBrowser();
  const size = statSync(OUT_JSON).size;
  const engineSize = statSync(engine).size;
  const source = JIRA ? 'données RÉELLES Jira (gitignoré)' : REAL_REPO ? `données RÉELLES de ${REAL_REPO}` : 'trimestre synthétique';
  process.stdout.write(`OK [${source}] : demo.json (${size} o) + vigie-engine.js (${engineSize} o)${existsSync(REAL_STORE) ? ' + real-store.json' : ''}.\n`);
}

await main();
