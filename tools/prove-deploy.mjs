/**
 * Preuve de déploiement Forge (`node tools/prove-deploy.mjs`).
 *
 * L'étape « l'app est déployée sur un site réel » ne peut être PRUVÉE que par
 * Atlassian. Ce script interroge la CLI Forge (source de vérité : elle liste
 * l'installation et la version réellement servies), double la session par l'API
 * Jira, et consigne le résultat dans `docs/VERIFICATIONS.md`.
 *
 * Identifiants : uniquement l'environnement (JIRA_SITE, JIRA_EMAIL,
 * JIRA_API_TOKEN pour l'API Jira ; FORGE_EMAIL, FORGE_API_TOKEN sinon le login
 * Forge stocké) — jamais le dépôt, jamais affichés.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SITE = (process.env.JIRA_SITE ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Les identifiants d'app déclarés dans les deux manifestes (App 1 et graveur). */
function declaredApps() {
  const ids = [];
  for (const file of ['manifest.yml', 'graveur/manifest.yml']) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    const match = /id:\s*ari:cloud:ecosystem::app\/([0-9a-f-]+)/i.exec(text);
    if (match) ids.push({ file, id: match[1] });
  }
  return ids;
}

/** Session reconnue sur l'API Jira (le même compte que l'importateur réel). */
async function checkJiraAuth() {
  const email = process.env.JIRA_EMAIL ?? '';
  const token = process.env.JIRA_API_TOKEN ?? '';
  if (!SITE || !email || !token) {
    return { ok: false, detail: 'identifiants Jira absents (JIRA_SITE/JIRA_EMAIL/JIRA_API_TOKEN)' };
  }
  const res = await fetch(`https://${SITE}/rest/api/3/myself`, {
    headers: { Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}` },
  });
  return { ok: res.status === 200, detail: res.status === 200 ? 'session reconnue sur l’API Jira' : `HTTP ${res.status}` };
}

/** `forge install list --json` : la liste des installations réellement servies. */
function forgeInstallations() {
  const raw = execFileSync('forge', ['install', 'list', '--json'], {
    encoding: 'utf8', cwd: ROOT,
    env: { ...process.env },
  });
  const list = JSON.parse(raw);
  return Array.isArray(list) ? list : [];
}

function appendLedger(lines) {
  const file = join(ROOT, 'docs', 'VERIFICATIONS.md');
  let text = existsSync(file) ? readFileSync(file, 'utf8') : '# Preuves\n';
  const section = `\n## Déploiement Forge\n\n${lines.join('\n')}\n`;
  if (text.includes('## Déploiement Forge')) {
    text = text.replace(/\n## Déploiement Forge[\s\S]*$/, section);
  } else {
    text = text.replace(/\n## Historique/, `${section}\n## Historique`);
  }
  writeFileSync(file, text, 'utf8');
}

async function main() {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const lines = [`Vérifié le ${now} — \`node tools/prove-deploy.mjs\``, ''];

  const jira = await checkJiraAuth();
  lines.push(`| Session Atlassian (API Jira) | ${jira.ok ? '✅' : '❌'} | ${jira.detail} |`);

  let installations;
  try {
    installations = forgeInstallations();
  } catch (e) {
    installations = null;
    lines.push(`| Installations Forge | ❌ | \`forge install list\` illisible : ${String(e.message ?? e).slice(0, 120)} |`);
  }

  const apps = declaredApps();
  for (const app of apps) {
    const app1 = app.file === 'manifest.yml';
    if (!app1) {
      lines.push(`| ${app.file} (app 2, le graveur) | ℹ️ | app jumelle : son enregistrement et son déploiement sont distincts de ceux de l'App 1 |`);
      continue;
    }
    if (!installations) {
      lines.push(`| ${app.file} | ❌ | installations illisibles |`);
      continue;
    }
    const entry = installations.find((i) => (i.site ?? '') === SITE);
    if (entry) {
      lines.push(`| ${app.file} | ✅ | installé sur ${entry.site} (${entry.product}), ${entry.environment}, version ${entry.appVersion}, ${entry.status} |`);
    } else {
      lines.push(`| ${app.file} | ❌ | aucune installation sur ${SITE || 'le site demandé'} |`);
    }
  }

  appendLedger(lines);
  for (const line of lines) process.stdout.write(`${line}\n`);
  const failed = lines.filter((l) => l.includes('❌')).length;
  process.stdout.write(`\nPreuve de déploiement consignée dans docs/VERIFICATIONS.md (${failed} échec(s))\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main();