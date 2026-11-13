/**
 * Sections complémentaires du site : les trois adaptateurs de source (§20), le
 * budget de calcul (§23 sobriété), les époques (§16) et la recette (§25).
 */
import { esc, num } from './render.js';
import { t } from './i18n.js';
import { RECETTE, SOURCE_MAP } from './recette.js';

/** Provenance des données et limites du mapping — rien n'est affirmé sans sa source (§23). */
export function renderSource(lang, data) {
  const box = document.getElementById('source');
  if (!box) return;
  const src = data.source ?? { kind: 'synthetic', label: data.period };
  const rows = SOURCE_MAP[lang]?.[src.kind] ?? SOURCE_MAP.en[src.kind] ?? [];
  const day = (src.fetchedAt ?? data.generatedAt ?? '').slice(0, 10);
  const real = src.kind === 'github' || src.kind === 'jira';
  const via = src.kind === 'jira' ? 'Jira' : 'GitHub';
  const title = real
    ? (lang === 'fr' ? `Données réelles (${via}) — ${src.label}, importées le ${day}` : `Real data (${via}) — ${src.label}, imported on ${day}`)
    : (lang === 'fr' ? 'Trimestre synthétique (§27)' : 'Synthetic quarter (§27)');
  box.innerHTML = `<h3>${esc(title)}</h3><dl class="inline">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
}

/** Les trois adaptateurs, celui qui est actif, et ce que l'app ne voit pas. */
export function renderAdapters(lang, data) {
  const box = document.getElementById('adapters');
  if (!box) return;
  const active = data.coverage.sourceActive;
  const rows = [
    ['graph', t(lang, 'adapters.graph')],
    ['local', t(lang, 'adapters.local')],
    ['import', t(lang, 'adapters.import')],
  ];
  box.innerHTML = `<h3>${esc(t(lang, 'adapters.title'))}</h3>
    <ul class="adapters">${rows.map(([key, label]) => `<li class="${key === active ? 'on' : 'off'}">
      <span class="dot" aria-hidden="true"></span>${esc(label)}${key === active ? ` <b>· ${esc(t(lang, 'adapters.active'))}</b>` : ''}</li>`).join('')}</ul>
    ${data.coverage.rightsMissing.length ? `<p class="dim">${esc(t(lang, 'adapters.missing'))} :</p><ul class="tight">${data.coverage.rightsMissing.map((r) => `<li><code>${esc(r)}</code></li>`).join('')}</ul>` : ''}`;
}

/** Budget de calcul : objectifs, appels, jetons — la sobriété est affichée (§23). */
export function renderBudget(lang, data) {
  const box = document.getElementById('budget');
  if (!box || !data.budget) return;
  box.innerHTML = `<h3>${esc(t(lang, 'budget.title'))}</h3>
    <p class="budget-nums"><b>${data.budget.objectives}</b> ${esc(t(lang, 'budget.objectives'))} · <b>${data.budget.calls}</b> ${esc(t(lang, 'budget.calls'))} · <b>${data.budget.tokens}</b> ${esc(t(lang, 'budget.tokens'))}</p>
    <p class="dim">${esc(t(lang, 'budget.note'))}</p>`;
}

/** Époques : la réorganisation coupe les séries, et la projection le prouve (§16). */
export function renderEpochs(lang, data) {
  const list = document.getElementById('epochs-list');
  const proof = document.getElementById('epoch-proof');
  if (!list) return;
  list.innerHTML = (data.epochs ?? []).map((e) => `<div class="card"><h4>${esc(e.label)}</h4>
    <p><code>${esc(e.id)}</code> · ${esc(e.startsAt.slice(0, 10))} → ${e.endsAt ? esc(e.endsAt.slice(0, 10)) : esc(t(lang, 'epochs.open'))}</p>
    <p class="dim">${e.endsAt ? esc(t(lang, 'epochs.closed')) : esc(t(lang, 'epochs.open'))}</p></div>`).join('');

  if (!proof) return;
  const cut = data.objectives.filter((o) => o.projection && o.projection.epochId && o.projection.conclusion === 'pas-assez-de-recul' && o.series.length >= 2);
  const example = cut[0] ?? data.objectives.find((o) => o.series.length >= 2);
  const levels = example ? [...new Set(example.series.map((p) => p.at.slice(0, 7)))] : [];
  proof.innerHTML = `<h3>${esc(t(lang, 'epochs.proofTitle'))}</h3>
    ${example ? `<p>${esc(example.title)} — <code>${esc(example.id)}</code></p>
      <p class="dim">${example.series.length} points mesurés (${levels.length} mois distincts), projection sur l'époque <code>${esc(example.projection?.epochId ?? '—')}</code> :
      <b>${esc(t(lang, `concl.${example.projection?.conclusion ?? 'pas-assez-de-recul'}`))}</b> ${example.projection?.pct === null ? '' : `(${num(example.projection.pct, 0)} %)`}</p>
      <p class="dim">${esc(t(lang, 'epochs.sub'))}</p>` : ''}`;
}

/** La recette §25 : les 18 items et l'endroit où chacun est prouvé. */
export function renderRecette(lang) {
  const body = document.getElementById('recette-body');
  if (!body) return;
  const rows = RECETTE[lang] ?? RECETTE.en;
  body.innerHTML = rows.map(([item, where], i) => `<tr><td class="num">${i + 1}</td><td>${esc(item)}</td><td><code>${esc(where)}</code></td></tr>`).join('');
}
