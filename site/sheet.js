/**
 * La fiche d'objectif complète (SPEC §19 écran 2, §12, §13, §15).
 *
 * Tout ce que le produit sait dire d'un objectif, au même endroit : état et
 * signaux avec leurs faits, série et niveaux de source, écart recalculé/recopié,
 * projection avec fourchette et effectif, coût avec méthode et part partagée,
 * concordance avec les autres changements de la fenêtre, journal de bord
 * (faits | interprétation), dossier de revue (trois options chiffrées), décision
 * vérifiée, post-mortem. Aucune couleur globale (§5), aucune personne (VG-21).
 */
import { esc, sparkline, stateBadge, degreeBadge, num } from './render.js';
import { t, STATES, SIGNALS } from './i18n.js';

function section(title, body) {
  return `<div class="sheet-sec"><h5>${esc(title)}</h5>${body}</div>`;
}

function factsList(items) {
  return `<ul class="tight">${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
}

function signalsBlock(lang, signals) {
  if (!signals.length) return `<p class="dim">${esc(t(lang, 'reg.none'))}</p>`;
  return factsList(signals.map((s) => {
    const name = SIGNALS[lang].find((x) => x[0] === s.code)?.[1] ?? s.code;
    return s.facts.map((f) => {
      const detail = lang === 'en' ? (f.detailEn ?? f.detail) : f.detail;
      return `<b>${esc(s.code)}</b> ${esc(name)} — ${esc(detail)} <span class="dim">(${esc(f.at.slice(0, 10))})</span>`;
    }).join('');
  }));
}

function projectionBlock(lang, p) {
  if (!p) return `<p class="fogtext">${esc(t(lang, 'concl.pas-assez-de-recul'))}</p>`;
  if (p.pct === null) {
    return `<p class="fogtext">${esc(t(lang, `concl.${p.conclusion}`))}</p>
      <p class="dim">${esc(t(lang, 'proj.n'))} = ${p.n} · ${esc(t(lang, 'proj.weeks'))} = ${p.weeksUsed}</p>
      <details><summary>${esc(t(lang, 'proj.assumptions'))}</summary>${factsList((lang === 'en' ? p.assumptionsEn : p.assumptions).map(esc))}</details>`;
  }
  return `<p><b>${num(p.pct, 0)} %</b> — ${esc(t(lang, `concl.${p.conclusion}`))}</p>
    <dl class="inline">
      <dt>${esc(t(lang, 'proj.range'))}</dt><dd>[${num(p.ciLow)} ; ${num(p.ciHigh)}]</dd>
      <dt>${esc(t(lang, 'proj.n'))}</dt><dd>${p.n} (${esc(t(lang, 'proj.weeks'))} ${p.weeksUsed})</dd>
      <dt>${esc(t(lang, 'proj.method'))}</dt><dd><code>${esc(p.method)}</code></dd>
    </dl>
    <details><summary>${esc(t(lang, 'proj.assumptions'))}</summary>${factsList((lang === 'en' ? p.assumptionsEn : p.assumptions).map(esc))}</details>
    ${p.levers.length ? `<details><summary>${esc(t(lang, 'proj.levers'))}</summary>${factsList(p.levers.map((l) => esc(lang === 'en' ? (l.textEn ?? l.text) : l.text)))}</details>` : ''}`;
}

function costBlock(lang, c) {
  if (!c) return '<p class="dim">—</p>';
  return `<dl class="inline">
    <dt>${esc(t(lang, 'cost.days'))}</dt><dd><b>${num(c.days)}</b></dd>
    <dt>${esc(t(lang, 'cost.method'))}</dt><dd><code>${esc(c.method)}</code></dd>
    <dt>${esc(t(lang, 'cost.shared'))}</dt><dd>${c.sharedWithCount}</dd>
    <dt>${esc(t(lang, 'sheet.ratio'))}</dt><dd>${c.ratioPerPoint === null ? '—' : `${num(c.ratioPerPoint, 2)} [${num(c.ratioCiLow, 2)} ; ${num(c.ratioCiHigh, 2)}]`}</dd>
  </dl>`;
}

function concordanceBlock(lang, c) {
  if (!c) return `<p class="fogtext">${esc(t(lang, 'sheet.noConcordance'))}</p>`;
  const others = c.otherChanges && c.otherChanges.length
    ? factsList(c.otherChanges.map((o) => `<code>${esc(o.kind)}</code> ${esc(o.label)} <span class="dim">(${esc(o.at.slice(0, 10))})</span>`))
    : `<p class="dim">—</p>`;
  return `<dl class="inline">
      <dt>${esc(t(lang, 'conc.work'))}</dt><dd>${c.workMoved ? '✓' : '✗'}</dd>
      <dt>${esc(t(lang, 'conc.number'))}</dt><dd>${c.numberMoved ? '✓' : '✗'}</dd>
      <dt>${esc(t(lang, 'reg.col.degree'))}</dt><dd>${degreeBadge(lang, c.degree)}</dd>
      <dt>${esc(t(lang, 'conc.window'))}</dt><dd>${esc(c.windowFrom.slice(0, 10))} → ${esc(c.windowTo.slice(0, 10))}</dd>
    </dl>
    <p class="dim">${esc(t(lang, 'sheet.otherChanges'))}</p>${others}`;
}

function logbookBlock(lang, checkins) {
  if (!checkins || !checkins.length) return `<p class="dim">${esc(t(lang, 'checkin.empty'))}</p>`;
  return checkins.map((c) => {
    const f = c.facts ?? {};
    const facts = `${f.degree ?? '—'} · ${(f.activeSignals ?? []).join(', ') || '—'} · ${f.projectionConclusion ?? '—'}`;
    return `<div class="logrow${c.contradicts ? ' contra' : ''}">
      <div class="logfacts"><span class="dim">${esc(c.at.slice(0, 16).replace('T', ' '))}</span><br><code>${esc(facts)}</code></div>
      <div class="loginterp">${esc(c.interpretation)}${c.contradicts ? `<p class="contra-note">⚠ ${esc(t(lang, 'checkin.contradiction'))}</p>` : ''}</div>
    </div>`;
  }).join('');
}

function dossierBlock(lang, dossier) {
  if (!dossier) return '<p class="dim">—</p>';
  return `<ol class="options">${dossier.options.map((o) => `<li>
      <strong>${esc(o.label)}</strong> — ${esc(o.detail)}
      ${o.costDays !== null ? `<span class="dim">· ${num(o.costDays, 0)} ${esc(t(lang, 'cost.days'))}</span>` : ''}
      ${o.suggestedTarget !== null ? `<span class="dim">· ${esc(t(lang, 'kr.target'))} ${num(o.suggestedTarget)}</span>` : ''}
      ${o.orphanedIssueKeys.length ? `<div class="dim">${o.orphanedIssueKeys.map(esc).join(', ')}</div>` : ''}
    </li>`).join('')}</ol>`;
}

function decisionBlock(lang, decision) {
  if (!decision) return `<p class="dim">—</p>`;
  const state = decision.followed === null
    ? t(lang, 'decision.pending')
    : decision.followed ? t(lang, 'decision.followed') : t(lang, 'decision.notFollowed');
  const cls = decision.followed === false ? 'contra-note' : 'dim';
  return `<p><b>${esc(decision.decision)}</b> — ${esc(decision.reason)}</p><p class="${cls}">${esc(state)}</p>`;
}

function postmortemBlock(lang, pm) {
  if (!pm) return '<p class="dim">—</p>';
  return `<p>${esc(t(lang, 'sheet.postmortem'))} : ${pm.moved ? '✓' : '✗'} / ${pm.landed ? '✓' : '✗'}</p>${factsList(pm.learned.map(esc))}`;
}

/** Rend la fiche complète d'un objectif. */
export function renderSheet(lang, o, dossier, pm) {
  const stateName = o.stateCode ? (STATES[lang]?.[o.stateCode]?.[0] ?? o.stateCode) : '—';
  const krRows = o.keyResults.map((k) => `<li>${esc(k.title)} · ${esc(k.direction)} · ${esc(t(lang, 'kr.baseline'))} ${num(k.baseline, 0)} → ${esc(t(lang, 'kr.target'))} ${num(k.target, 0)} · ${esc(t(lang, 'kr.source'))} <b>${esc(k.sourceLevel)}</b>${k.computedBy ? ` · ${esc(t(lang, 'kr.recomputedFrom'))} <code>${esc(k.computedBy)}</code>` : ''}</li>`).join('');
  return `<article class="sheet" aria-label="${esc(o.title)}">
    <header class="sheet-head">
      <h4>${esc(o.title)} <span class="dim"><code>${esc(o.id)}</code> · ${esc(o.periodId)}</span></h4>
      <p>${stateBadge(lang, o.stateCode)} ${degreeBadge(lang, o.degreeCode)} <span class="dim">${esc(stateName)}</span></p>
    </header>
    ${section(t(lang, 'sheet.degreeBasis'), factsList(o.degreeFacts.map(esc)))}
    ${section(t(lang, 'kr.title'), `<ul class="tight">${krRows}</ul>`)}
    ${o.sourceGap ? section(t(lang, 'gap.title'), `<p class="gapbox">${esc(tfGap(lang, o.sourceGap))}</p>`) : ''}
    ${section(t(lang, 'sheet.signals'), signalsBlock(lang, o.signals))}
    ${section(t(lang, 'sheet.series'), `${sparkline(o.series)}<p class="dim">${o.series.map((p) => `${p.at.slice(0, 10)}:${p.value}(${p.level})`).join(' · ')}</p>`)}
    ${section(t(lang, 'sheet.projection'), projectionBlock(lang, o.projection))}
    ${section(t(lang, 'sheet.cost'), costBlock(lang, o.cost))}
    ${section(t(lang, 'sheet.concordance'), concordanceBlock(lang, o.concordance))}
    ${section(t(lang, 'sheet.logbook'), logbookBlock(lang, o.checkins))}
    ${section(t(lang, 'sheet.dossier'), dossierBlock(lang, dossier))}
    ${section(t(lang, 'sheet.decision'), decisionBlock(lang, o.decision))}
    ${section(t(lang, 'sheet.postmortem'), postmortemBlock(lang, pm))}
  </article>`;
}

/** Texte de l'écart valeur recalculée / valeur recopiée (§8, recette item 5). */
function tfGap(lang, gap) {
  return lang === 'en'
    ? `${gap.copied} typed by hand (level ${gap.copiedLevel}) — recomputed to ${gap.recomputed}: a gap of ${gap.gap}.`
    : `${gap.copied} tapé à la main (niveau ${gap.copiedLevel}) — recalculé à ${gap.recomputed} : écart de ${gap.gap}.`;
}
