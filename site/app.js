/**
 * Bootstrap du site public.
 *
 * Priorité au MOTEUR RÉEL dans le navigateur (`window.Vigie`, bundlé depuis les
 * moteurs de l'app) : chaque écran, chaque chiffre, chaque réponse MCP est
 * réellement calculé. Repli sur `data/demo.json` (même payload, généré au build)
 * si le bundle n'est pas chargé — le site reste lisible sans JS moteur.
 */
import {
  applyStaticText, renderDemoSub, renderKpis, renderStates, renderCoverage,
  renderRegister, renderGhosts, renderModel, renderProblem, renderArch, renderFooter,
} from './render.js';
import { renderChart } from './chart.js';
import { renderSheet } from './sheet.js';
import { renderAdapters, renderBudget, renderEpochs, renderRecette, renderSource } from './extra.js';
import { initCheckin, initTicket, initSettings, initMcp, initRovo } from './interactive.js';

const STORE_KEY = 'vigie-lang';

function detectLang() {
  const saved = localStorage.getItem(STORE_KEY);
  if (saved === 'fr' || saved === 'en') return saved;
  return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

const state = { lang: detectLang(), data: null, openId: null, live: false };

async function loadData() {
  if (window.Vigie && typeof window.Vigie.snapshot === 'function') {
    await window.Vigie.boot();
    state.live = true;
    return window.Vigie.snapshot();
  }
  const res = await fetch('data/demo.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`demo.json introuvable (HTTP ${res.status})`);
  return res.json();
}

/** Re-calcul et re-rendu complet (après un seuil changé ou un pointage écrit). */
async function refresh() {
  state.data = state.live ? await window.Vigie.snapshot() : state.data;
  renderAll();
}

async function showDetail(id) {
  const box = document.getElementById('detail');
  const objective = state.data.objectives.find((o) => o.id === id);
  if (!objective) return;
  let dossier = null;
  let postmortem = null;
  if (state.live) {
    dossier = await window.Vigie.dossier(id);
    postmortem = await window.Vigie.postmortem(id);
  }
  box.innerHTML = renderSheet(state.lang, objective, dossier, postmortem);
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function toggleDetail(id, button) {
  const box = document.getElementById('detail');
  const closeLabel = state.lang === 'fr' ? 'Replier la fiche' : 'Collapse the sheet';
  const openLabel = state.lang === 'fr' ? 'Voir la fiche' : 'Open the sheet';
  if (state.openId === id) {
    state.openId = null;
    box.innerHTML = '';
    button.setAttribute('aria-expanded', 'false');
    button.textContent = openLabel;
    return;
  }
  state.openId = id;
  for (const other of document.querySelectorAll('#reg-body button.detail-btn')) {
    const isOpen = other.dataset.id === id;
    other.setAttribute('aria-expanded', String(isOpen));
    other.textContent = isOpen ? closeLabel : openLabel;
  }
  void showDetail(id);
}

function renderAll() {
  const { lang, data } = state;
  applyStaticText(lang);
  renderDemoSub(lang, data);
  renderSource(lang, data);
  renderKpis(lang, data);
  renderStates(lang, data);
  renderCoverage(lang, data);
  renderAdapters(lang, data);
  renderBudget(lang, data);
  renderGhosts(lang, data);
  renderModel(lang);
  renderProblem(lang);
  renderArch(lang);
  renderRecette(lang);
  renderEpochs(lang, data);
  renderFooter(lang, data);
  renderRegister(lang, data, toggleDetail);
  renderChart(document.getElementById('chart-container'), data, lang);

  const badge = document.getElementById('engine-badge');
  if (badge) badge.textContent = state.live ? (lang === 'fr' ? 'moteur réel actif' : 'live engine') : (lang === 'fr' ? 'données figées' : 'static data');

  initCheckin(lang, data, refresh);
  initSettings(lang, data, refresh);
  initMcp(lang, data);
  initRovo(lang);
  void initTicket(lang);

  const langButton = document.getElementById('lang');
  if (langButton) {
    langButton.textContent = lang === 'fr' ? 'EN' : 'FR';
    langButton.setAttribute('aria-label', lang === 'fr' ? 'Switch to English' : 'Basculer en français');
  }
  if (state.openId) void showDetail(state.openId);
}

function wireLangToggle() {
  const button = document.getElementById('lang');
  if (!button) return;
  button.addEventListener('click', () => {
    state.lang = state.lang === 'fr' ? 'en' : 'fr';
    localStorage.setItem(STORE_KEY, state.lang);
    renderAll();
  });
}

function renderError(message) {
  const box = document.getElementById('demo-sub');
  if (box) box.textContent = message;
}

async function main() {
  wireLangToggle();
  try {
    state.data = await loadData();
  } catch (error) {
    renderError(`Données indisponibles : ${error.message}. Lancez « npm run build:site » puis servez site/ en HTTP.`);
    return;
  }
  renderAll();
}

await main();
