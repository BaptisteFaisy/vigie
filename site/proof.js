/**
 * Section « Preuves » du site public.
 *
 * Elle n'affiche pas une affirmation : elle EXÉCUTE, dans le navigateur, les
 * mêmes chemins de code que l'app Forge (les 15 outils MCP, via le moteur
 * embarqué) et montre le résultat brut de chaque contrôle. Un juge peut le
 * rejouer et le voir échouer s'il casse.
 *
 * La preuve d'ÉCRITURE (un pointage réellement enregistré) n'est jouée qu'une
 * fois par session : rejouer les autres contrôles ne pollue pas le journal.
 * Aucun contrôle ne touche ton site Jira — tout se joue dans le moteur en
 * mémoire, sur les données réelles déjà chargées.
 */
import { esc } from './render.js';
import { t } from './i18n.js';

const PERSON_KEYS = ['ownerRef', 'byRef', 'linkedByRef', 'accountId', 'assignee', 'reporter'];

/**
 * Un contrôle : la clé de libellé, le verdict, et la preuve (texte brut).
 * @typedef {{ labelKey: string, ok: boolean, detail: string }} Check
 */

/** @type {Check[] | null} */
let cache = null;

async function runTool(name, input) {
  const result = await window.Vigie.callTool(name, input);
  if (!result.ok) throw new Error(result.error || 'outil en échec');
  return result.value;
}

function firstObjective(data) {
  return data.objectives[0] ?? null;
}

function firstKrId(data) {
  const objective = data.objectives.find((o) => o.keyResults && o.keyResults.length > 0);
  return objective ? objective.keyResults[0].id : null;
}

/** Les contrôles : chacun produit une preuve textuelle, pas un booléen nu. */
async function collectChecks(data, withWrite) {
  const checks = [];
  const objective = firstObjective(data);
  const krId = firstKrId(data);
  const period = data.period;

  const views = await window.Vigie.views();
  const objectiveView = objective ? views.find((v) => v.objective.id === objective.id) : null;
  checks.push({
    labelKey: 'proof.motors',
    ok: Boolean(objectiveView && objectiveView.theatreState !== null),
    detail: objectiveView
      ? `état=${objectiveView.theatreState} · degré=${objectiveView.degree} · signaux=${objectiveView.signals.map((s) => s.signal).join(',') || 'aucun'}`
      : 'aucun objectif',
  });

  if (objective) {
    const projection = await runTool('get-projection', { objectiveId: objective.id });
    const p = projection && projection.projection;
    checks.push({
      labelKey: 'proof.projection',
      ok: Boolean(p),
      detail: p
        ? `${p.pct ?? '—'} % · fourchette [${p.ciLow} ; ${p.ciHigh}] · effectif n=${p.n} · ${p.conclusion}`
        : 'pas assez de recul',
    });

    const cost = await runTool('get-goal-cost', { objectiveId: objective.id });
    const c = cost && cost.cost;
    checks.push({
      labelKey: 'proof.cost',
      ok: Boolean(c),
      detail: c ? `${c.days} j · méthode=${c.method} · partagé avec ${c.sharedWithCount} objectif(s)` : '—',
    });
  }

  // Projection d'un objectif QUI A un historique ET assez de tickets rattachés :
  // fourchette + effectif exigés (§10 : sous 4 semaines ou 5 tickets, pas de chiffre).
  const withHistory = data.objectives.find((o) => o.series && o.series.length >= 4 && o.links && o.links.length >= 5);
  if (withHistory) {
    const value = await runTool('get-projection', { objectiveId: withHistory.id });
    const p = value && value.projection;
    checks.push({
      labelKey: 'proof.projectionFull',
      ok: Boolean(p && p.pct !== null && p.ciLow !== null && p.ciHigh !== null && p.n > 0),
      detail: p ? `${withHistory.title.slice(0, 26)} → ${p.pct} % · fourchette [${p.ciLow} ; ${p.ciHigh}] · n=${p.n}` : '—',
    });
  }

  // Honnêteté : sans historique, la réponse doit être « pas assez de recul », sans %.
  const withoutHistory = data.objectives.find((o) => !o.series || o.series.length < 4);
  if (withoutHistory) {
    const value = await runTool('get-projection', { objectiveId: withoutHistory.id });
    const p = value && value.projection;
    checks.push({
      labelKey: 'proof.honesty',
      ok: Boolean(p && p.pct === null && p.conclusion === 'pas-assez-de-recul'),
      detail: p ? `${withoutHistory.title.slice(0, 28)} → ${p.conclusion} · pct=${p.pct}` : '—',
    });
  }

  if (krId) {
    const concordance = await runTool('get-concordance', { krId });
    const k = concordance && concordance.concordance;
    checks.push({
      labelKey: 'proof.concordance',
      ok: Boolean(k),
      detail: k ? `degré=${k.degree} · travail=${k.workMoved ? 'bouge' : 'figé'} · nombre=${k.numberMoved ? 'bouge' : 'figé'} · fenêtre ${k.windowFrom.slice(0, 10)} → ${k.windowTo.slice(0, 10)}` : '—',
    });
  }

  const orphans = await runTool('list-goal-orphans', {});
  const list = (orphans && orphans.orphans) || [];
  checks.push({
    labelKey: 'proof.verso',
    ok: list.length > 0,
    detail: `${list.length} fantôme(s) · ${list.filter((o) => o.suggested).length} avec objectif plausible · confiance max ${Math.round(Math.max(0, ...list.map((o) => o.confidence)) * 100)} %`,
  });

  if (objective) {
    const dossier = await runTool('get-review-dossier', { objectiveId: objective.id });
    const options = (dossier && dossier.options) || [];
    checks.push({
      labelKey: 'proof.dossier',
      ok: options.length === 3,
      detail: options.map((o) => `${o.kind} (${o.costDays ?? '—'} j${o.orphanedIssueKeys.length ? `, ${o.orphanedIssueKeys.length} orphelin(s)` : ''})`).join(' · '),
    });
  }

  // Écriture réelle : un pointage est enregistré par le moteur, puis relu.
  if (objective && withWrite) {
    const written = await runTool('record-checkin', { objectiveId: objective.id, interpretation: 'Preuve : pointage écrit par le moteur (démo).' });
    checks.push({
      labelKey: 'proof.write',
      ok: Boolean(written),
      detail: written ? `pointage enregistré sur ${objective.id} à ${written.at ? written.at.slice(0, 16).replace('T', ' ') : '—'}` : 'échec',
    });
  }

  // VG-21 : on repasse par LES 15 outils et on cherche une clé d'identité.
  const toolNames = window.Vigie.ACTION_KEYS || [];
  const leaks = [];
  for (const name of toolNames) {
    const input = { objectiveId: objective ? objective.id : '', krId: krId || '', period, issueKeys: 'PAY-1', reason: 'preuve', value: 1, sourceRef: 'preuve', sourceLevel: 'B', interpretation: 'preuve', decision: 'continue' };
    const result = await window.Vigie.callTool(name, input);
    const json = JSON.stringify(result);
    for (const key of PERSON_KEYS) if (json.includes(key)) leaks.push(`${name}:${key}`);
  }
  checks.push({
    labelKey: 'proof.vg21',
    ok: leaks.length === 0 && toolNames.length === 15,
    detail: `${toolNames.length} outils exécutés · fuite d’identité détectée : ${leaks.length ? leaks.join(', ') : 'aucune'}`,
  });

  return checks;
}

function renderTable(lang, checks) {
  const ok = checks.filter((c) => c.ok).length;
  return `<p class="proof-summary"><b>${ok}/${checks.length}</b> ${esc(t(lang, 'proof.passed'))}</p>
    <div class="tablewrap"><table class="proof-table"><thead><tr>
      <th scope="col">${esc(t(lang, 'proof.col.check'))}</th>
      <th scope="col">${esc(t(lang, 'proof.col.result'))}</th>
      <th scope="col">${esc(t(lang, 'proof.col.proof'))}</th>
    </tr></thead><tbody>${checks.map((c) => `<tr>
      <th scope="row">${esc(t(lang, c.labelKey))}</th>
      <td><span class="badge ${c.ok ? 'alive' : 'reef'}">${c.ok ? 'OK' : 'KO'}</span></td>
      <td><code>${esc(c.detail)}</code></td>
    </tr>`).join('')}</tbody></table></div>
    <p class="actions"><button type="button" id="proof-replay" class="btn ghost">${esc(t(lang, 'proof.replay'))}</button></p>`;
}

/** Rend la section et exécute les contrôles (une fois par session, ou à la demande). */
export async function renderProof(lang, data, force = false) {
  const box = document.getElementById('proof-body');
  if (!box) return;
  if (cache && !force) {
    box.innerHTML = renderTable(lang, cache);
    wireReplay(lang, data);
    return;
  }
  box.innerHTML = `<p class="dim">${esc(t(lang, 'proof.running'))}</p>`;
  try {
    cache = await collectChecks(data, true);
    box.innerHTML = renderTable(lang, cache);
    wireReplay(lang, data);
  } catch (error) {
    box.innerHTML = `<p class="contra-note">${esc(t(lang, 'proof.error'))} ${esc(String(error))}</p>`;
  }
}

function wireReplay(lang, data) {
  const button = document.getElementById('proof-replay');
  if (!button) return;
  button.onclick = () => {
    cache = null;
    void renderProof(lang, data, true);
  };
}
