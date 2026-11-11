/**
 * Bootstrap du site public : charge les données réellement calculées par les
 * moteurs (`data/demo.json`, produit par `tools/build-site.mjs`), détecte la
 * langue, rend les écrans et câbre la bascule EN/FR + les fiches dépliables.
 */
import {
  applyStaticText, renderDemoSub, renderKpis, renderStates, renderCoverage,
  renderRegister, renderDetail, renderGhosts, renderModel, renderProblem,
  renderArch, renderFooter,
} from './render.js';

const STORE_KEY = 'vigie-lang';

function detectLang() {
  const saved = localStorage.getItem(STORE_KEY);
  if (saved === 'fr' || saved === 'en') return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('fr') ? 'fr' : 'en';
}

let state = { lang: detectLang(), data: null, openId: null };

function renderAll() {
  const { lang, data } = state;
  applyStaticText(lang);
  renderDemoSub(lang, data);
  renderKpis(lang, data);
  renderStates(lang, data);
  renderCoverage(lang, data);
  renderGhosts(lang, data);
  renderModel(lang);
  renderProblem(lang);
  renderArch(lang);
  renderFooter(lang, data);
  renderRegister(lang, data, toggleDetail);
  const btn = document.getElementById('lang');
  if (btn) {
    btn.textContent = lang === 'fr' ? 'EN' : 'FR';
    btn.setAttribute('aria-label', lang === 'fr' ? 'Switch to English' : 'Basculer en français');
  }
  if (state.openId) showDetail(state.openId);
}

/** Ouvre (ou replie) la fiche d'un objectif sous le registre. */
function toggleDetail(id, button) {
  const box = document.getElementById('detail');
  if (state.openId === id) {
    state.openId = null;
    box.innerHTML = '';
    button.setAttribute('aria-expanded', 'false');
    button.textContent = state.lang === 'fr' ? 'Voir la fiche' : 'Open the sheet';
    return;
  }
  state.openId = id;
  showDetail(id);
  for (const other of document.querySelectorAll('#reg-body button.detail-btn')) {
    const isOpen = other.dataset.id === id;
    other.setAttribute('aria-expanded', String(isOpen));
    other.textContent = isOpen
      ? (state.lang === 'fr' ? 'Replier' : 'Collapse')
      : (state.lang === 'fr' ? 'Voir la fiche' : 'Open the sheet');
  }
}

function showDetail(id) {
  const box = document.getElementById('detail');
  box.innerHTML = renderDetail(state.lang, state.data, id);
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function wireLangToggle() {
  const btn = document.getElementById('lang');
  if (!btn) return;
  btn.addEventListener('click', () => {
    state.lang = state.lang === 'fr' ? 'en' : 'fr';
    localStorage.setItem(STORE_KEY, state.lang);
    renderAll();
  });
}

async function loadData() {
  const res = await fetch('data/demo.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`demo.json introuvable (HTTP ${res.status})`);
  return res.json();
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
    renderError(`Données de démonstration indisponibles : ${error.message}. Lancez « node tools/build-site.mjs » puis servez le dossier site/ en HTTP.`);
    return;
  }
  renderAll();
}

await main();
