/**
 * La carte marine (SPEC §19) — SVG pur, aucune dépendance.
 *
 * Chaque élément porte une donnée, rien n'est décoratif :
 *   un cap            = un objectif (position sur l'arc, cible au sommet)
 *   la route tracée   = le travail rattaché (longueur = nb de tickets, épaisseur = jours)
 *   le point          = la dernière mesure du RC, colorée par niveau de source A/B/C
 *   l'écart de route  = l'écart entre projection et cible (segment pointillé chiffré)
 *   un récif          = un signal de théâtre (taille = valeur/seuil, forme = famille)
 *   un bateau fantôme = un ticket qui avance sans objectif (voile = jours consommés)
 *   l'ancre           = un objectif mort-vivant (période close, jamais refermé)
 *   la brume          = « pas assez de recul » : gris ET écrit (§23)
 *
 * Accessibilité : `role="img"` + `aria-label`, un `<title>` par élément, et un
 * équivalent textuel complet sous la carte. Aucune information par la couleur seule.
 */
import { esc } from './render.js';
import { STATES } from './i18n.js';

const W = 1000;
const H = 700;
const CX = 500;
const CY = 300;
const R = 215;

const LABELS = {
  fr: { chart: 'Carte des caps du portefeuille', alt: 'Équivalent textuel de la carte', tickets: 'tickets', days: 'jours', fog: 'pas assez de recul', gap: 'écart', ghosts: 'Bateaux fantômes — travail sans objectif déclaré', target: 'cible', state: 'état' },
  en: { chart: 'Portfolio headland chart', alt: 'Text equivalent of the chart', tickets: 'tickets', days: 'days', fog: 'not enough data', gap: 'gap', ghosts: 'Ghost ships — work with no declared objective', target: 'target', state: 'state' },
};

function labels(lang) { return LABELS[lang] ?? LABELS.en; }

function stateColor(code) {
  if (code === 'vivant') return 'var(--alive)';
  if (code === 'sous-calibre') return 'var(--gold)';
  if (code === 'mort-vivant') return 'var(--brume)';
  return 'var(--reef)';
}

function levelColor(level) {
  if (level === 'A') return 'var(--alive)';
  if (level === 'B') return 'var(--gold)';
  return 'var(--brume)';
}

/** Trois familles de récifs (§7) : rattachement, travail, mesure/cycle de vie. */
function signalFamily(code) {
  if (['S0', 'S1', 'S7', 'S12'].includes(code)) return 'attachment';
  if (['S2', 'S5', 'S10'].includes(code)) return 'work';
  return 'measure';
}

function truncate(text, max = 26) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function polar(angle, radius) {
  return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

/** Un récif : triangle (rattachement), carré (travail), losange (mesure/cycle). */
function reef(family, x, y, size) {
  const s = size;
  if (family === 'attachment') return `<path class="chart-reef" d="M${x} ${y - s} L${x + s} ${y + s} L${x - s} ${y + s} Z"/>`;
  if (family === 'work') return `<rect class="chart-reef" x="${x - s}" y="${y - s}" width="${s * 2}" height="${s * 2}"/>`;
  return `<path class="chart-reef" d="M${x} ${y - s} L${x + s} ${y} L${x} ${y + s} L${x - s} ${y} Z"/>`;
}

/** L'ancre d'un objectif mort-vivant. */
function anchor(x, y) {
  return `<g class="chart-anchor" transform="translate(${x} ${y})">
    <circle cx="0" cy="-9" r="3.2"/>
    <path d="M0 -6 V8 M-8 2 Q0 12 8 2"/>
  </g>`;
}

/** Un bateau fantôme : la voile porte les jours consommés. */
function ghost(x, y, days, title) {
  const sail = clamp(8 + days * 1.6, 8, 30);
  return `<g class="chart-ghost" transform="translate(${x} ${y})"><title>${esc(title)}</title>
    <path class="chart-hull" d="M-13 6 L13 6 L9 13 L-9 13 Z"/>
    <path class="chart-sail" d="M0 4 L0 ${4 - sail} L${sail * 0.62} 4 Z"/>
  </g>`;
}

/** Brume : ce que l'app refuse de conclure — gris ET écrit. */
function fog(x, y, text) {
  return `<g class="chart-fog"><circle cx="${x}" cy="${y}" r="30"/>
    <text x="${x}" y="${y + 44}" text-anchor="middle">${esc(text)}</text></g>`;
}

function routeGeometry(index, total, objective) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  const cap = polar(angle, R);
  const tickets = objective.links.length;
  const days = objective.cost ? objective.cost.days : 0;
  const length = 28 + clamp(tickets, 0, 12) * 6;
  const width = 1.2 + clamp(days, 0, 40) / 7;
  const ux = (CX - cap.x) / R;
  const uy = (CY - cap.y) / R;
  const point = { x: cap.x + ux * length, y: cap.y + uy * length };
  return { angle, cap, point, ux, uy, length, width, tickets, days };
}

function drawObjective(objective, index, total, lang) {
  const L = labels(lang);
  const geo = routeGeometry(index, total, objective);
  const state = objective.stateCode;
  const stateName = state ? (STATES[lang]?.[state]?.[0] ?? state) : '—';
  const color = stateColor(state);
  const lastPoint = objective.series.length ? objective.series[objective.series.length - 1] : null;
  const proj = objective.projection;
  const title = `${objective.title} — ${L.state} : ${stateName}`;

  const parts = [`<g class="chart-objective"><title>${esc(title)}</title>`];
  parts.push(`<line class="chart-route" x1="${geo.point.x}" y1="${geo.point.y}" x2="${geo.cap.x}" y2="${geo.cap.y}" stroke-width="${geo.width.toFixed(1)}"><title>${esc(`${geo.tickets} ${L.tickets} · ${geo.days} ${L.days}`)}</title></line>`);

  const pct = proj && proj.pct !== null ? clamp(proj.pct, 0, 100) : null;
  if (pct === null) {
    parts.push(fog(geo.point.x, geo.point.y, L.fog));
  } else {
    const projected = { x: geo.point.x + (geo.cap.x - geo.point.x) * (pct / 100), y: geo.point.y + (geo.cap.y - geo.point.y) * (pct / 100) };
    parts.push(`<line class="chart-deviation" x1="${projected.x}" y1="${projected.y}" x2="${geo.cap.x}" y2="${geo.cap.y}"><title>${esc(`${L.gap} : ${proj.pct}%`)}</title></line>`);
    parts.push(`<text class="chart-gap" x="${(projected.x + geo.cap.x) / 2}" y="${(projected.y + geo.cap.y) / 2 - 6}" text-anchor="middle">${Math.round(100 - proj.pct)}%</text>`);
    parts.push(`<circle class="chart-projected" cx="${projected.x}" cy="${projected.y}" r="3.4"/>`);
  }

  const capAngle = (geo.angle * 180) / Math.PI + 90;
  parts.push(`<path class="chart-cap" style="fill:${color}" d="M0 -11 L9 8 L-9 8 Z" transform="translate(${geo.cap.x} ${geo.cap.y}) rotate(${capAngle.toFixed(1)})"><title>${esc(title)}</title></path>`);
  if (state === 'mort-vivant') parts.push(anchor(geo.cap.x, geo.cap.y + 20));
  if (lastPoint) {
    parts.push(`<circle class="chart-point" style="fill:${levelColor(lastPoint.level)}" cx="${geo.point.x}" cy="${geo.point.y}" r="5"><title>${esc(`${L.target} ${lastPoint.value} · ${lastPoint.level}`)}</title></circle>`);
  }

  objective.signals.slice(0, 4).forEach((signal, i) => {
    const fact = signal.facts[0] ?? {};
    const severity = fact.threshold ? clamp(Math.abs(fact.value) / fact.threshold, 0.4, 3) : 1;
    const size = 4 + severity * 3;
    const offset = (i - (Math.min(objective.signals.length, 4) - 1) / 2) * 17;
    const px = geo.cap.x - geo.uy * 26 + geo.ux * offset;
    const py = geo.cap.y + geo.ux * 26 + geo.uy * offset;
    const detail = lang === 'en' ? (fact.detailEn ?? fact.detail) : fact.detail;
    parts.push(`<g transform="translate(${px} ${py})"><title>${esc(`${signal.code} — ${detail ?? ''}`)}</title>${reef(signalFamily(signal.code), 0, 0, size)}</g>`);
  });

  const labelY = geo.cap.y < CY ? geo.cap.y - 24 : geo.cap.y + 34;
  parts.push(`<text class="chart-label" x="${geo.cap.x}" y="${labelY}" text-anchor="middle">${esc(truncate(objective.title))}</text>`);
  parts.push(`<text class="chart-sublabel" x="${geo.cap.x}" y="${labelY + 15}" text-anchor="middle" style="fill:${color}">${esc(stateName)}</text>`);
  parts.push('</g>');
  return parts.join('');
}

function drawGhosts(data, lang) {
  const L = labels(lang);
  const ghosts = data.ghosts ?? [];
  if (!ghosts.length) return '';
  const y = H - 78;
  const step = Math.min(70, (W - 120) / ghosts.length);
  const startX = CX - ((ghosts.length - 1) * step) / 2;
  const items = ghosts.map((g, i) => {
    const label = g.suggestedTitle ?? L.fog;
    return ghost(startX + i * step, y, g.daysSpent, `${g.issueKey} · ${g.daysSpent} ${L.days} · ${Math.round(g.confidence * 100)}% · ${label}`);
  }).join('');
  return `<g class="chart-ghosts"><text class="chart-legend" x="${CX}" y="${y - 42}" text-anchor="middle">${esc(L.ghosts)} (${ghosts.length})</text>${items}</g>`;
}

function legend(lang) {
  const L = labels(lang);
  const items = [
    ['chart-route', L.tickets],
    ['chart-point', 'A/B/C'],
    ['chart-reef', 'signal'],
    ['chart-deviation', L.gap],
  ];
  return `<g class="chart-key">${items.map(([cls, text], i) => `<g transform="translate(${40 + i * 150} 34)"><rect class="${cls}-key" x="-12" y="-7" width="14" height="14"/><text x="8" y="4">${esc(text)}</text></g>`).join('')}</g>`;
}

/** Équivalent textuel de la carte (§23 : le registre reste la référence accessible). */
function textEquivalent(data, lang) {
  const L = labels(lang);
  const rows = data.objectives.map((o) => {
    const state = o.stateCode ? (STATES[lang]?.[o.stateCode]?.[0] ?? o.stateCode) : '—';
    const proj = o.projection
      ? (o.projection.pct === null ? L.fog : `${o.projection.pct}% [${o.projection.ciLow}; ${o.projection.ciHigh}] n=${o.projection.n}`)
      : L.fog;
    const signals = o.signals.map((s) => s.code).join(', ') || '—';
    return `<li><strong>${esc(o.title)}</strong> — ${esc(state)} · ${o.links.length} ${esc(L.tickets)} · ${o.cost ? `${o.cost.days} ${esc(L.days)}` : '—'} · ${esc(proj)} · ${esc(signals)}</li>`;
  }).join('');
  return `<details class="chart-alt"><summary>${esc(L.alt)}</summary><ul>${rows}</ul></details>`;
}

/** Rend la carte marine dans `container`. Ré-appelable (changement de langue). */
export function renderChart(container, data, lang) {
  if (!container || !data) return;
  const L = labels(lang);
  const svg = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(L.chart)}" preserveAspectRatio="xMidYMid meet">
    <desc>${esc(L.chart)}</desc>
    <circle class="chart-compass" cx="${CX}" cy="${CY}" r="${R}"/>
    <circle class="chart-compass" cx="${CX}" cy="${CY}" r="${R * 0.55}"/>
    ${legend(lang)}
    ${data.objectives.map((o, i) => drawObjective(o, i, data.objectives.length, lang)).join('')}
    ${drawGhosts(data, lang)}
  </svg>`;
  container.innerHTML = `<div class="chart-frame">${svg}</div>${textEquivalent(data, lang)}`;
}
