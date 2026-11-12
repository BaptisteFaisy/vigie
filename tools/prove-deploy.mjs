/**
 * Preuve de déploiement Forge (`node tools/prove-deploy.mjs`).
 *
 * L'étape « l'app est déployée sur un site réel » ne peut être PRUVÉE que par
 * Atlassian : ce script interroge l'API avec les mêmes identifiants que
 * l'importateur, vérifie que l'app est bien installée (installations Forge),
 * relève la version déployée, et consigne le résultat dans `docs/VERIFICATIONS.md`.
 *
 * Les identifiants viennent de l'environnement uniquement (JIRA_SITE,
 * JIRA_EMAIL, JIRA_API_TOKEN) — jamais du dépôt, jamais affichés.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

function creds() {
  const site = (process.env.JIRA_SITE ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL ?? '';
  const token = process.env.JIRA_API_TOKEN ?? '';
  if (!site || !email || !token) {
    throw new Error('Identifiants absents : JIRA_SITE, JIRA_EMAIL, JIRA_API_TOKEN doivent être dans l’environnement.');
  }
  return { site, email, token };
}

async function api(path) {
  const { site, email, token } = creds();
  const res = await fetch(`https://${site}${path}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`, Accept: 'application/json' },
  });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = null; }
  return { status: res.status, body };
}

/** Les identifiants d'app déclarés dans les deux manifestes. */
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

async function checkAuth() {
  const { status, body } = await api('/rest/api/3/myself');
  return { ok: status === 200, detail: status === 200 ? 'session reconnue sur l’API Jira' : `HTTP ${status}` };
}

async function checkInstallations() {
  // Deux endpoints : le moderne (/forge/rest/v1) et le classique (/myapps).
  const modern = await api('/forge/rest/v1/installations');
  if (modern.status === 200 && modern.body) {
    const list = Array.isArray(modern.body) ? modern.body : (modern.body.installations ?? []);
    return { ok: true, detail: `${list.length} installation(s) Forge visible(s)`, installations: list };
  }
  const classic = await api('/rest/api/3/myapps');
  if (classic.status === 200 && classic.body) {
    const list = Array.isArray(classic.body) ? classic.body : [];
    const installations = list.map((app) => ({
      appId: String(app.id ?? '').replace(/^ari:cloud:ecosystem::app\//, ''),
      siteUrl: app.self ?? '',
    }));
    return { ok: true, detail: `${installations.length} app(s) installé(s) sur ce site`, installations };
  }
  return { ok: false, detail: `installations illisibles (HTTP ${modern.status} / ${classic.status})`, installations: [] };
}

async function checkDeployments(appId) {
  const { status, body } = await api(`/forge/rest/v1/apps/${appId}/deployments`);
  if (status !== 200 || !body) return { ok: false, detail: `historique indisponible (HTTP ${status})` };
  const list = Array.isArray(body) ? body : (body.deployments ?? []);
  const last = list[0];
  return {
    ok: list.length > 0,
    detail: list.length > 0
      ? `dernier déploiement : version ${last.deployVersion ?? last.version ?? '?'} · ${last.deploymentStatus ?? last.status ?? '?'} · ${last.deployedAt ?? last.createdAt ?? '?'}`
      : 'aucun déploiement enregistré',
  };
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

  const auth = await checkAuth();
  lines.push(`| Session Atlassian | ${auth.ok ? '✅' : '❌'} | ${auth.detail} |`);
  if (!auth.ok) {
    appendLedger(lines);
    process.stderr.write(`ÉCHEC : ${auth.detail}\n`);
    process.exit(1);
  }

  const apps = declaredApps();
  const installations = await checkInstallations();
  lines.push(`| Installations Forge visibles | ${installations.ok ? '✅' : '❌'} | ${installations.detail} |`);

  const installedIds = new Set((installations.installations ?? []).map((i) => String(i.appId ?? i.id ?? '')));
  for (const app of apps) {
    const present = installedIds.has(app.id);
    const deploy = present ? await checkDeployments(app.id) : { ok: false, detail: 'app non installé sur ce site' };
    lines.push(`| ${app.file} (${app.id.slice(0, 8)}…) | ${present && deploy.ok ? '✅' : '❌'} | installé=${present ? 'oui' : 'non'} · ${deploy.detail} |`);
  }

  appendLedger(lines);
  for (const line of lines) process.stdout.write(`${line}\n`);
  const failed = lines.filter((l) => l.includes('❌')).length;
  process.stdout.write(`\nPreuve de déploiement consignée dans docs/VERIFICATIONS.md (${failed} échec(s))\n`);
  process.exit(failed === 0 ? 0 : 1);
}

await main();
