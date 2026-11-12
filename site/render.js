/**
 * Rendu du site public. Lit `data/demo.json` (sortie réelle des moteurs) et
 * l'affiche : registre accessible, fiche d'objectif, verso, KPI, modèle.
 * Aucune information n'est portée par la couleur seule (§23) : chaque état,
 * degré et « pas assez de recul » est aussi écrit.
 */
import { t, tf, STATES, DEGREES, SIGNALS, PROBLEM, NEVER, ARCH, TOOLS } from './i18n.js';

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const STATE_CLASS = { vivant: 'alive', 'sous-calibre': 'gold' };

export function stateBadge(lang, code) {
  if (!code) return `<span class="badge fog">${esc(t(lang, 'concl.pas-assez-de-recul'))}</span>`;
  const name = STATES[lang]?.[code]?.[0] ?? code;
  const cls = STATE_CLASS[code] ?? 'reef';
  return `<span class="badge ${cls}">${esc(name)}</span>`;
}

export function degreeBadge(lang, code) {
  const entry = DEGREES[lang].find((d) => d[0] === code);
  const cls = code === 'concordant' ? 'alive' : code === 'avance' ? 'gold' : code === 'travaille' ? '' : 'fog';
  return `<span class="badge ${cls}">${esc(entry?.[1] ?? code)}</span>`;
}

export function num(value, digits = 1) {
  return typeof value === 'number' ? value.toFixed(digits).replace(/\.0$/, '') : '—';
}

/** Applique le dictionnaire à tous les éléments portant `data-i18n`. */
export function applyStaticText(lang) {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.innerHTML = t(lang, el.dataset.i18n);
  }
  document.documentElement.lang = lang;
}

function kpi(label, value, method) {
  return `<div class="kpi"><div class="v">${esc(value)}</div><div class="l">${esc(label)}</div>${method ? `<div class="m">${esc(method)}</div>` : ''}</div>`;
}

export function renderDemoSub(lang, data) {
  const el = document.getElementById('demo-sub');
  if (!el) return;
  el.textContent = tf(lang, 'demo.sub', {
    period: data.period, now: data.demoNow.slice(0, 10), objectives: data.summary.objectives,
    issues: data.summary.issues, ghosts: data.summary.ghosts, epochs: data.summary.epochs,
  });
}

export function renderKpis(lang, data) {
  const p = data.portfolio;
  const objectives = data.objectives.filter((o) => o.periodId === data.period).length;
  document.getElementById('kpis').innerHTML = [
    kpi(t(lang, 'kpi.linked'), `${num(p.workLinkedPct, 0)} %`),
    kpi(t(lang, 'kpi.ghost'), `${num(p.ghostPct, 0)} %`),
    kpi(t(lang, 'kpi.days'), num(p.totalDays, 0), t(lang, 'kpi.method')),
    kpi(t(lang, 'kpi.levelA'), `${num(p.krLevelAPct, 0)} %`),
    kpi(t(lang, 'kpi.objectives'), String(objectives)),
  ].join('');
}

export function renderStates(lang, data) {
  const box = document.getElementById('states');
  const counts = data.theatreCount.byState;
  const zombie = data.objectives.find((o) => o.stateCode === 'mort-vivant');
  const chips = Object.entries(STATES[lang]).map(([code, [name]]) =>
    `<span class="statechip">${esc(name)} <b>${counts[code] ?? 0}</b></span>`).join('');
  const extra = zombie
    ? `<span class="statechip fog">${esc(STATES[lang]['mort-vivant'][0])} <b>1</b> · ${esc(tf(lang, 'period.note', { p: zombie.periodId }))}</span>`
    : '';
  box.innerHTML = `<span class="statechip" style="border:0;background:none;color:var(--ink-dim)">${esc(t(lang, 'states.title'))}</span>${chips}${extra}`;
}

export function renderCoverage(lang, data) {
  const c = data.coverage;
  document.getElementById('coverage').innerHTML = `
    <h3>${esc(t(lang, 'cover.title'))}</h3>
    <dl>
      <dt>${esc(t(lang, 'cover.source'))}</dt><dd><code>${esc(c.sourceActive)}</code></dd>
      <dt>${esc(t(lang, 'cover.linked'))}</dt><dd>${num(c.workLinkedPct, 0)} %</dd>
      <dt>${esc(t(lang, 'cover.levelA'))}</dt><dd>${num(c.krLevelAPct, 0)} %</dd>
      <dt>${esc(t(lang, 'cover.rights'))}</dt><dd>${c.rightsMissing.length ? c.rightsMissing.map((r) => `<code>${esc(r)}</code>`).join(' ') : '—'}</dd>
    </dl>
    <p class="sub" style="margin:.7rem 0 0">${esc(t(lang, 'cover.note'))}</p>`;
}

function projectionCell(lang, p) {
  if (!p) return `<span class="fogtext">${esc(t(lang, 'concl.pas-assez-de-recul'))}</span>`;
  if (p.pct === null) return `<span class="fogtext">${esc(t(lang, `concl.${p.conclusion}`))}</span> <span class="sig">${esc(t(lang, 'proj.n'))} = ${p.n}</span>`;
  return `<b>${num(p.pct, 0)} %</b> <span class="sig">${esc(t(lang, `concl.${p.conclusion}`))}</span>
    <span class="sig">${esc(t(lang, 'proj.range'))} [${num(p.ciLow)} ; ${num(p.ciHigh)}] · ${esc(t(lang, 'proj.n'))} ${p.n}</span>`;
}

function signalsCell(lang, signals) {
  if (!signals.length) return `<span class="fogtext">${esc(t(lang, 'reg.none'))}</span>`;
  return signals.map((s) => {
    const name = SIGNALS[lang].find((x) => x[0] === s.code)?.[1] ?? s.code;
    const fact = s.facts[0] ? (lang === 'en' ? (s.facts[0].detailEn ?? s.facts[0].detail) : s.facts[0].detail) : '';
    return `<span class="sig"><b>${esc(s.code)}</b> ${esc(name)} — ${esc(fact)}</span>`;
  }).join('');
}

export function renderRegister(lang, data, onOpen) {
  const body = document.getElementById('reg-body');
  body.innerHTML = data.objectives.map((o) => `
    <tr>
      <th scope="row">${esc(o.title)}<br><span class="sig"><code>${esc(o.id)}</code> · ${esc(o.periodId)}</span></th>
      <td>${stateBadge(lang, o.stateCode)}</td>
      <td>${degreeBadge(lang, o.degreeCode)}</td>
      <td>${signalsCell(lang, o.signals)}</td>
      <td class="num">${o.cost ? `${num(o.cost.days, 0)} ${esc(t(lang, 'cost.days'))}` : '—'}</td>
      <td>${projectionCell(lang, o.projection)}</td>
      <td><button type="button" class="detail-btn" data-id="${esc(o.id)}" aria-expanded="false">${esc(t(lang, 'reg.show'))}</button></td>
    </tr>`).join('');
  for (const btn of body.querySelectorAll('button.detail-btn')) {
    btn.addEventListener('click', () => onOpen(btn.dataset.id, btn));
  }
}

/** Sparkline SVG de la série d'un résultat clé. */
export function sparkline(series) {
  if (!series || series.length < 2) return '';
  const w = 320; const h = 70; const pad = 8;
  const values = series.map((p) => p.value);
  const min = Math.min(...values); const max = Math.max(...values);
  const span = max - min || 1;
  const pts = series.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / (series.length - 1);
    const y = h - pad - ((p.value - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const dots = series.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / (series.length - 1);
    const y = h - pad - ((p.value - min) / span) * (h - pad * 2);
    const fill = p.level === 'A' ? '#8ce0b0' : p.level === 'B' ? '#ffd98e' : '#8fa8b0';
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${fill}"><title>${esc(p.at.slice(0, 10))} · ${p.value} · ${p.level}</title></circle>`;
  }).join('');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="series">
    <polyline points="${pts}" fill="none" stroke="#eaf4f7" stroke-width="1.6"/>${dots}</svg>`;
}

export function renderGhosts(lang, data) {
  document.getElementById('ghost-body').innerHTML = data.ghosts.map((g) => `
    <tr>
      <th scope="row"><code>${esc(g.issueKey)}</code></th>
      <td class="num">${num(g.daysSpent, 0)}</td>
      <td>${g.suggestedTitle ? esc(g.suggestedTitle) : `<span class="fogtext">${esc(t(lang, 'verso.none'))}</span>`}</td>
      <td class="num">${num(g.confidence * 100, 0)} %</td>
      <td>${esc(g.reason ?? '')}</td>
    </tr>`).join('');
}

export function renderModel(lang) {
  document.getElementById('degrees-body').innerHTML = DEGREES[lang]
    .map(([, name, needs]) => `<tr><th scope="row">${name}</th><td>${needs}</td></tr>`).join('');
  document.getElementById('signals-body').innerHTML = SIGNALS[lang]
    .map(([code, name, fact]) => `<tr><td><b>${esc(code)}</b></td><th scope="row">${esc(name)}</th><td>${esc(fact)}</td></tr>`).join('');
}

export function renderProblem(lang) {
  document.getElementById('problem-cards').innerHTML = PROBLEM[lang]
    .map(([title, body]) => `<div class="card"><h4>${esc(title)}</h4><p>${esc(body)}</p></div>`).join('');
  document.getElementById('never-list').innerHTML = NEVER[lang].map((x) => `<li>${esc(x)}</li>`).join('');
}

export function renderArch(lang) {
  document.getElementById('arch-cards').innerHTML = ARCH[lang]
    .map(([title, body]) => `<div class="card"><h4>${esc(title)}</h4><p>${esc(body)}</p></div>`).join('');
  document.getElementById('tools-list').innerHTML = TOOLS.map(([name, verb]) => `<li>${esc(name)} <span class="fogtext">${esc(verb)}</span></li>`).join('');
}

export function renderFooter(lang, data) {
  document.getElementById('generated').textContent = tf(lang, 'foot.generated', { at: data.generatedAt.slice(0, 16).replace('T', ' ') });
}
