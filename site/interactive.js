/**
 * Les fonctionnalités INTERACTIVES du site : elles appellent le vrai moteur
 * (`window.Vigie`) — rien n'est simulé. Un pointage est réellement écrit, un
 * seuil modifié recalcule réellement le portefeuille, un outil MCP répond
 * réellement, et la réponse est vérifiée sans donnée de personne (VG-21).
 */
import { esc, num, stateBadge } from './render.js';
import { t, tf, ROVO, SIGNALS } from './i18n.js';

const PERSON_KEYS = ['ownerRef', 'byRef', 'linkedByRef', 'accountId', 'assignee', 'reporter'];

/** Entrées de chaque outil (§18) : nom, type, valeur par défaut pour la démo. */
export const TOOL_INPUTS = {
  'get-objective': [['objectiveId', 'string', 'obj-narratif']],
  'list-objectives': [['period', 'string', ''], ['state', 'string', ''], ['limit', 'integer', '']],
  'count-theatre': [['period', 'string', '']],
  'get-kr-series': [['krId', 'string', 'kr-vivant']],
  'get-projection': [['objectiveId', 'string', 'obj-vivant']],
  'get-goal-cost': [['objectiveId', 'string', 'obj-vivant']],
  'list-goal-orphans': [['projectKey', 'string', ''], ['limit', 'integer', '']],
  'get-concordance': [['krId', 'string', 'kr-concordant']],
  'get-review-dossier': [['objectiveId', 'string', 'obj-narratif']],
  'get-portfolio-brief': [['period', 'string', 'demo-2026-T4']],
  'link-work': [['objectiveId', 'string', 'obj-orphelin'], ['issueKeys', 'string', 'PAY-51'], ['reason', 'string', 'Sert l’expansion internationale.'], ['fraction', 'number', '']],
  'record-kr-number': [['krId', 'string', 'kr-orphelin'], ['value', 'number', '1'], ['sourceRef', 'string', 'https://dash.example/pays'], ['sourceLevel', 'string', 'B']],
  'record-checkin': [['objectiveId', 'string', 'obj-narratif'], ['interpretation', 'string', 'En bonne voie']],
  'record-decision': [['objectiveId', 'string', 'obj-narratif'], ['decision', 'string', 'abandon'], ['reason', 'string', 'Aucun chantier derrière le récit.']],
  'open-postmortem': [['objectiveId', 'string', 'obj-mortvivant']],
};

function hasPersonKey(json) {
  return PERSON_KEYS.some((key) => json.includes(key));
}

function statusText(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.className = `status ${isError ? 'err' : 'ok'}`;
}

/* ------------------------------------------------------- pointage inversé */

function factsHtml(lang, facts) {
  const signals = (facts.activeSignals ?? []).join(', ') || '—';
  return `<dl class="inline">
    <dt>${esc(t(lang, 'reg.col.degree'))}</dt><dd>${esc(facts.degree ?? '—')}</dd>
    <dt>${esc(t(lang, 'reg.col.state'))}</dt><dd>${esc(facts.theatreState ?? '—')}</dd>
    <dt>${esc(t(lang, 'reg.col.signals'))}</dt><dd><code>${esc(signals)}</code></dd>
    <dt>${esc(t(lang, 'reg.col.projection'))}</dt><dd>${facts.projectionPct === null || facts.projectionPct === undefined ? esc(t(lang, 'concl.pas-assez-de-recul')) : `${facts.projectionPct} %`}</dd>
    <dt>${esc(t(lang, 'reg.col.cost'))}</dt><dd>${facts.costDays === null || facts.costDays === undefined ? '—' : num(facts.costDays)}</dd>
  </dl>`;
}

export function initCheckin(lang, data, refresh) {
  const select = document.getElementById('checkin-objective');
  const factsBox = document.getElementById('checkin-facts');
  const logBox = document.getElementById('checkin-log');
  const button = document.getElementById('checkin-submit');
  const status = document.getElementById('checkin-status');
  const textarea = document.getElementById('checkin-text');
  if (!select || !button) return;

  const draw = () => {
    const objective = data.objectives.find((o) => o.id === select.value) ?? data.objectives[0];
    if (!objective) return;
    factsBox.innerHTML = `<h5>${esc(t(lang, 'checkin.factsTitle'))}</h5>${factsHtml(lang, {
      degree: objective.degreeCode, theatreState: objective.stateCode,
      activeSignals: objective.signals.map((s) => s.code),
      projectionPct: objective.projection?.pct ?? null, costDays: objective.cost?.days ?? null,
    })}`;
    logBox.innerHTML = `<h5>${esc(t(lang, 'checkin.logTitle'))}</h5>` + (objective.checkins.length
      ? objective.checkins.map((c) => `<div class="logrow${c.contradicts ? ' contra' : ''}"><div class="logfacts"><code>${esc((c.facts?.activeSignals ?? []).join(', ') || '—')}</code></div><div class="loginterp">${esc(c.interpretation)}${c.contradicts ? `<p class="contra-note">⚠ ${esc(t(lang, 'checkin.contradiction'))}</p>` : ''}</div></div>`).join('')
      : `<p class="dim">${esc(t(lang, 'checkin.empty'))}</p>`);
  };

  select.innerHTML = data.objectives.map((o) => `<option value="${esc(o.id)}">${esc(o.title)}</option>`).join('');
  select.onchange = draw;
  draw();

  button.onclick = async () => {
    const interpretation = textarea.value.trim();
    if (!interpretation) return;
    statusText(status, '…', false);
    const result = await window.Vigie.callTool('record-checkin', { objectiveId: select.value, interpretation });
    if (!result.ok) { statusText(status, result.error, true); return; }
    statusText(status, t(lang, 'checkin.saved'), false);
    textarea.value = '';
    await refresh();
  };
}

/* --------------------------------------------------------- encart ticket */

export async function initTicket(lang) {
  const select = document.getElementById('ticket-select');
  const panel = document.getElementById('ticket-panel');
  if (!select) return;
  const issues = await window.Vigie.issues();
  select.innerHTML = issues.map((i) => `<option value="${esc(i.issueKey)}">${esc(i.issueKey)}</option>`).join('');

  const draw = () => {
    const issue = issues.find((i) => i.issueKey === select.value);
    if (!issue) return;
    if (issue.ghost) {
      panel.innerHTML = `<p class="ghostbox">👻 ${esc(t(lang, 'ticket.ghost'))}</p><p class="dim">${num(issue.daysSpent, 0)} ${esc(t(lang, 'cost.days'))}</p>`;
      return;
    }
    if (!issue.objectives.length) { panel.innerHTML = `<p class="dim">${esc(t(lang, 'ticket.none'))}</p>`; return; }
    panel.innerHTML = `<p><strong>${esc(t(lang, 'ticket.serves'))}</strong></p><ul class="tight">${issue.objectives.map((o) => `<li>${esc(o.title)} — ${esc(t(lang, 'ticket.fraction'))} <b>${Math.round(o.fraction * 100)} %</b></li>`).join('')}</ul>`;
  };
  select.onchange = draw;
  draw();
}

/* ------------------------------------------------------------- réglages */

export function initSettings(lang, data, refresh) {
  const box = document.getElementById('thresholds');
  const reset = document.getElementById('thresholds-reset');
  const status = document.getElementById('settings-status');
  if (!box || !data.thresholds) return;

  box.innerHTML = Object.entries(data.thresholds).map(([signal, value]) => {
    const name = SIGNALS[lang].find((s) => s[0] === signal)?.[1] ?? signal;
    return `<label class="thr"><span><b>${esc(signal)}</b> ${esc(name)}</span>
      <input type="number" step="any" value="${value}" data-signal="${esc(signal)}" aria-label="${esc(t(lang, 'settings.thresholdFor'))} ${esc(signal)}"></label>`;
  }).join('');

  box.onchange = async (event) => {
    const input = event.target;
    if (!input.dataset || !input.dataset.signal) return;
    statusText(status, '…', false);
    await window.Vigie.setThreshold(input.dataset.signal, Number(input.value));
    statusText(status, t(lang, 'settings.applied'), false);
    await refresh();
  };
  if (reset) reset.onclick = async () => { window.location.reload(); };
}

/* -------------------------------------------------------- console MCP */

function renderToolInputs(tool) {
  const box = document.getElementById('mcp-inputs');
  const spec = TOOL_INPUTS[tool] ?? [];
  box.innerHTML = spec.map(([name, type, value]) => `<label class="field"><span>${esc(name)} <code>${esc(type)}</code></span>
    <input type="text" data-name="${esc(name)}" value="${esc(value)}"></label>`).join('');
}

export function initMcp(lang, data) {
  const select = document.getElementById('mcp-tool');
  const run = document.getElementById('mcp-run');
  const out = document.getElementById('mcp-out');
  const status = document.getElementById('mcp-status');
  if (!select || !run) return;

  select.innerHTML = window.Vigie.ACTION_KEYS.map((key) => `<option value="${esc(key)}">${esc(key)}</option>`).join('');
  select.onchange = () => renderToolInputs(select.value);
  renderToolInputs(select.value);

  run.onclick = async () => {
    const input = {};
    for (const el of document.querySelectorAll('#mcp-inputs input')) {
      const raw = el.value.trim();
      if (raw === '') continue;
      input[el.dataset.name] = el.type === 'number' ? Number(raw) : raw;
    }
    statusText(status, '…', false);
    const result = await window.Vigie.callTool(select.value, input);
    const json = JSON.stringify(result, null, 2);
    out.textContent = json;
    const leak = hasPersonKey(json);
    statusText(status, `${result.ok ? t(lang, 'mcp.ok') : t(lang, 'mcp.error')} · ${leak ? '⚠ VG-21' : t(lang, 'mcp.noPerson')}`, !result.ok || leak);
  };
}

/* ------------------------------------------------------------- Rovo */

const ROVO_TOOLS = [
  ['list-objectives', { state: 'decoratif' }],
  ['get-concordance', { krId: 'kr-concordant' }],
  ['get-goal-cost', { objectiveId: 'obj-vivant' }],
  ['list-goal-orphans', {}],
  ['get-review-dossier', { objectiveId: 'obj-narratif' }],
  ['get-review-dossier', { objectiveId: 'obj-narratif' }],
  ['get-portfolio-brief', { period: 'demo-2026-T4' }],
];

export function initRovo(lang) {
  const box = document.getElementById('rovo-qa');
  if (!box) return;
  box.innerHTML = ROVO[lang].map((question, i) => `<details class="qa-item"><summary>${esc(question)}</summary>
    <div class="qa-body"><button type="button" class="btn ghost" data-i="${i}">${esc(t(lang, 'mcp.ask'))}</button><pre class="json" tabindex="0"></pre></div></details>`).join('');
  box.onclick = async (event) => {
    const button = event.target.closest('button[data-i]');
    if (!button) return;
    const [tool, input] = ROVO_TOOLS[Number(button.dataset.i)];
    const pre = button.parentElement.querySelector('pre');
    pre.textContent = '…';
    const result = await window.Vigie.callTool(tool, input);
    pre.textContent = `${tool} ${JSON.stringify(input)}\n\n${JSON.stringify(result, null, 2)}`;
  };
}

export { tf, stateBadge };
