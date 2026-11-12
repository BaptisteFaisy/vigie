/**
 * Harnais de preuve (`npm run verify`).
 *
 * Rejoue les contrôles du dépôt ET du site public, puis écrit un ledger daté
 * `docs/VERIFICATIONS.md` : chaque contrôle avec son verdict et la PREUVE observée
 * (sortie réelle, HTTP status, valeur). Une étape n'est « faite » que si elle
 * est vérifiable ici.
 *
 * Usage :
 *   node tools/verify.mjs                    # tout
 *   VIGIE_SITE_URL=… node tools/verify.mjs   # autre URL de démo
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SITE_URL = (process.env.VIGIE_SITE_URL ?? 'https://baptistefaisy.github.io/vigie/').replace(/\/$/, '');

const results = [];

function record(label, ok, detail) {
  results.push({ label, ok, detail });
  process.stdout.write(`${ok ? 'OK   ' : 'ÉCHEC'} ${label} — ${detail}\n`);
}

function run(label, command, args) {
  try {
    const out = execFileSync(command, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const lines = (out || '').trim().split('\n').filter(Boolean);
    return { ok: true, detail: lines[lines.length - 1] ?? 'ok' };
  } catch (error) {
    const text = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim().split('\n').filter(Boolean);
    return { ok: false, detail: (text[text.length - 1] ?? String(error.message)).slice(0, 200) };
  }
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'vigie-verify' } });
  const body = await res.text();
  return { status: res.status, body };
}

function checkRepo() {
  const vitest = run('Tests', 'npx', ['vitest', 'run']);
  record('Tests unitaires + recette §25', vitest.ok, vitest.detail);

  const limits = run('Tailles de fichiers', 'python3', ['tools/check-file-limits.py']);
  record('Fichiers < 500 lignes', limits.ok, limits.detail);

  const funcs = run('Tailles de fonctions', 'node', ['tools/check-function-limits.mjs']);
  record('Fonctions < 50 lignes', funcs.ok, funcs.detail);

  const manifest = run('Manifeste', 'node', ['tools/check-manifest.mjs']);
  record('Manifeste conforme (schéma, 15 actions, 15 outils)', manifest.ok, manifest.detail);
}

function checkSiteSyntax() {
  const dir = join(ROOT, 'site');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.js')) : [];
  const broken = [];
  for (const file of files) {
    const check = run(`syntaxe ${file}`, 'node', ['--check', join('site', file)]);
    if (!check.ok) broken.push(`${file}: ${check.detail}`);
  }
  record(`Syntaxe des ${files.length} modules du site`, broken.length === 0, broken.length ? broken.join(' | ') : `${files.length} modules analysés, 0 erreur`);
}

async function checkLiveSite() {
  try {
    const index = await fetchText(`${SITE_URL}/`);
    record('Site public — page principale', index.status === 200, `HTTP ${index.status} · ${index.body.length} octets · ${SITE_URL}`);
  } catch (error) {
    record('Site public — page principale', false, `injoignable : ${String(error.message).slice(0, 120)}`);
    return;
  }

  try {
    const payload = await fetchText(`${SITE_URL}/data/demo.json`);
    const data = JSON.parse(payload.body);
    const source = data.source ? `${data.source.kind}:${data.source.label}` : 'aucune';
    record('Site public — payload des données', payload.status === 200 && Array.isArray(data.objectives),
      `HTTP ${payload.status} · source=${source} · ${data.objectives.length} objectifs · ${data.ghosts.length} fantômes`);
    const leak = ['ownerRef', 'byRef', 'linkedBy_ref', 'accountId', 'assignee', 'reporter'].filter((k) => payload.body.includes(k));
    record('Site public — VG-21 (aucune identité publiée)', leak.length === 0, leak.length ? `fuites : ${leak.join(', ')}` : `0 clé d’identité dans ${payload.body.length} octets`);
  } catch (error) {
    record('Site public — payload des données', false, `illisible : ${String(error.message).slice(0, 120)}`);
  }

  try {
    const engine = await fetchText(`${SITE_URL}/vigie-engine.js`);
    record('Site public — moteur embarqué', engine.status === 200 && engine.body.includes('Vigie'), `HTTP ${engine.status} · ${engine.body.length} octets · global Vigie présent`);
  } catch (error) {
    record('Site public — moteur embarqué', false, `injoignable : ${String(error.message).slice(0, 120)}`);
  }
}

function commitSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'inconnu';
  }
}

function writeLedger() {
  const file = join(ROOT, 'docs', 'VERIFICATIONS.md');
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const ok = results.filter((r) => r.ok).length;
  const lines = [
    '# Preuves',
    '',
    'Chaque étape du projet a **une preuve vérifiable**, pas une affirmation.',
    'Ce ledger est régénéré par `npm run verify` : il rejoue les contrôles et note',
    'la sortie réellement observée. Le site public affiche la même chose, en direct,',
    'dans la section « Preuves » : les 15 outils MCP y sont réellement exécutés',
    'dans votre navigateur, et chaque contrôle affiche sa preuve brute.',
    '',
    `Dernière vérification : **${now}** · commit \`${commitSha()}\` · **${ok}/${results.length}** contrôles réussis`,
    '',
    '| Contrôle | Verdict | Preuve observée |',
    '|---|---|---|',
    ...results.map((r) => `| ${r.label} | ${r.ok ? '✅' : '❌'} | \`${r.detail.replace(/\|/g, '/').slice(0, 180)}\` |`),
    '',
    '## Historique',
    '',
  ];
  let history = [];
  if (existsSync(file)) {
    const previous = readFileSync(file, 'utf8');
    const section = previous.split('## Historique')[1] ?? '';
    history = section.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- ')).slice(0, 19);
  }
  history.unshift(`- ${now} · ${ok}/${results.length} · \`${commitSha()}\``);
  lines.push(...history.slice(0, 20), '');
  writeFileSync(file, lines.join('\n'), 'utf8');
  process.stdout.write(`\nLedger écrit : docs/VERIFICATIONS.md (${ok}/${results.length})\n`);
}

async function main() {
  checkRepo();
  checkSiteSyntax();
  await checkLiveSite();
  writeLedger();
  process.exit(results.filter((r) => !r.ok).length === 0 ? 0 : 1);
}

await main();
