# Contrats et découpage en lots — Vigie

Ce document est **opposable** : chaque lot code contre lui. Le contrat de données
fait foi dans `src/types.ts` (vocabulaire SPEC §4) et `src/ports.ts` (frontière
domaine ↔ runtime). Le cahier des charges est `docs/CAHIER-DES-CHARGES.md`
(copié depuis la soumission) ; les `§N` renvoient à ses sections.

## 0. Règles maison (vérifiées par la CI)

- **Fichier < 500 lignes, fonction < 50 lignes.** Au-delà : découper. `wc -l`
  avant de rendre. Gardes : `tools/check-file-limits.py`,
  `tools/check-function-limits.mjs`.
- **Zéro duplication.** Un helper existe une fois. Fakes dans `tests/helpers/`,
  messages dans `src/i18n/`, requêtes SQL dans `src/db/`.
- **Le domaine est pur.** `src/domain/*` n'importe **jamais** `@forge/*`, ni
  `node:fs`, ni le réseau — seulement `../types.js`, `../ports.js`,
  `../defaults.js` et d'autres modules de `src/domain/*`. Les E/S passent par
  les ports.
- **Typage strict** : pas de `any` implicite, pas de `!` non justifié, pas de
  `@ts-ignore` sans raison écrite.
- **Absence normale** : une ligne manquante rend `null`, une liste vide `[]`.
  Jamais d'exception pour « pas encore là ».
- **Rien ne se supprime** : on remplace / détache / écarte, l'historique reste.
- **VG-21 (structurant)** : aucune statistique par personne, nulle part. Les
  `*_ref` (owner, auteur) servent à la responsabilité et à l'audit ; **jamais**
  agrégés, classés, ni renvoyés par un écran, un export, un outil MCP ou
  l'agent. `IssueRef` (ports.ts) ne porte volontairement aucun assigné. La garde
  `tests/acceptance/recette-16` le vérifie sur toutes les sorties.
- **Vocabulaire tenu** (§6, §23) : déclaré / travaillé / avancé / concordant.
  « prouvé » réservé à niveau A + concordance, jamais pour une causalité.
- **Honnêteté** (§23) : aucune projection sans fourchette ni effectif ;
  « pas assez de recul » s'affiche comme les autres conclusions.
- **Tests** : horloge injectée (`Clock`), jamais `Date.now()`. Un test par
  comportement, nommé d'après le comportement.

## 1. Nommage

Dossiers `kebab-case`, fichiers TS `camelCase`, types `PascalCase`, constantes
de domaine `MAJUSCULES_SOUS_TRAITS`, clés i18n `domaine.point`.

## 2. Imports

ESM : **toujours** l'extension `.js` dans les imports relatifs
(`import { x } from './types.js'`), même pour un `.ts`. C'est la convention du
dépôt (`moduleResolution: bundler`).

## 3. Carte des modules et points d'entrée

`src/index.ts` (gelé) câble les modules du manifest :

| Handler | Module manifest | Fichier |
|---|---|---|
| `handler` | globalPage, issuePanel, projectPage, dashboardGadget, projectSettingsPage, confluence:macro | `src/handlers/resolver.ts` |
| `dispatch` | les 15 `action` + `rovo:mcp` | `src/handlers/dispatch.ts` → `src/actions/registry.ts` |
| `onEvent` | `trigger` issue-events | `src/handlers/events.ts` |
| `onScheduled` | `scheduledTrigger` nightly-recalc | `src/handlers/scheduled.ts` |
| `onMessage` | `consumer` vigie-recalc | `src/handlers/consumer.ts` |
| `onBridge` | `webtrigger` graveur-bridge | `src/handlers/bridge.ts` |
| `jqlLinked` / `jqlOrphans` | `jira:jqlFunction` | `src/handlers/jql.ts` |

Le graphe de dépendances est construit **une seule fois** dans `src/deps.ts`
(`createAppDeps(queue): AppDeps`). Les handlers reçoivent `AppDeps` et
n'importent jamais `@forge/*` eux-mêmes.

## 4. Lots, propriété des fichiers, ordre

**L0 (socle, gelé — déjà écrit, ne pas modifier sans PR `CONTRACT-CHANGE`)** :
`src/types.ts`, `src/ports.ts`, `src/defaults.ts`, `src/db/schema.ts`,
`src/db/sql-client.ts`, `src/db/mapping-common.ts`, `manifest.yml`,
`tsconfig.json`, `vitest.config.ts`, `package.json`, `tools/*`.

Chaque lot ci-dessous **possède** ses fichiers (aucun autre lot n'y écrit) :

- **L1 — domaine théâtre** (§6, §7). Fichiers :
  `src/domain/degrees.ts`, `src/domain/theatre-state.ts`,
  `src/domain/signals/*.ts` (un fichier par famille de signaux + `index.ts`),
  `src/domain/concordance.ts`. Tests : `tests/domain/*theatre*`, `*signal*`,
  `*degree*`, `*concordance*`.
- **L2 — domaine mesure** (§8, §10, §11, §16). Fichiers :
  `src/domain/projection.ts`, `src/domain/cost.ts`, `src/domain/movement.ts`,
  `src/domain/epochs.ts`, `src/domain/series.ts`, `src/domain/source-level.ts`.
  Tests : `tests/domain/*projection*`, `*cost*`, `*movement*`, `*epoch*`, `*series*`.
- **L3 — domaine verso/dossier** (§7 verso, §12, §13, §15, §19). Fichiers :
  `src/domain/orphans.ts`, `src/domain/dossier.ts`, `src/domain/postmortem.ts`,
  `src/domain/coverage.ts`, `src/domain/checkin.ts` (pré-remplissage des faits).
  Tests : `tests/domain/*orphan*`, `*dossier*`, `*postmortem*`, `*coverage*`, `*checkin*`.
- **L4 — persistance** (§21). Fichiers : `src/db/repo.ts`, `src/db/mapping*.ts`,
  `src/db/<table>.ts` (un par store). Tests : `tests/db/*` + `tests/helpers/fake-sql.ts`.
- **L5 — collect** (§8, §14, §20). Fichiers : `src/collect/jira.ts`,
  `graph.ts`, `portfolio.ts`, `llm.ts`, `confluence.ts`, `identity.ts`,
  `http.ts`, `bridge.ts` (pont signé). Tests : `tests/collect/*`.
- **L6 — actions/MCP + agent + skill** (§18). Fichiers :
  `src/actions/registry.ts`, `common.ts`, `<15 outils>.ts`,
  `static/agent/prompt.md`, `static/skill/at-quarterly-review.md`.
  Tests : `tests/actions/*`.
- **L7 — viewmodel + UI + i18n** (§19, §23 accessibilité, §24 langues).
  Fichiers : `src/viewmodel/*.ts`, `src/ui/**/*.tsx`, `src/i18n/*.ts`.
  Tests : `tests/viewmodel/*`.
- **L8 — engines + handlers + deps + index** (§20). Fichiers :
  `src/domain/theatre-engine.ts`, `portfolio-engine.ts`, `orphan-engine.ts`,
  `nightly.ts`, `src/handlers/*.ts`, `src/deps.ts`, `src/index.ts`.
  Tests : `tests/handlers/*`. **Dépend de L1/L2/L3** (wave 2).
- **L9 — jeu de démo** (§27, VG-20). Fichiers : `src/sample/*.ts`.
  Tests : `tests/sample/*`.
- **L10 — docs**. Fichiers : `README.md`, `docs/*` (ARCHITECTURE, METHODE,
  JUGES/JUDGES, VIDEO, VALIDATIONS, DEVPOST, MARKETPLACE).
- **L11 — App 2 « Le graveur »** (§20). Fichiers : `graveur/*` (manifest
  connecteur, src, README). Indépendant de L1-L8.
- **L12 — recette §25** (acceptation). Fichiers : `tests/acceptance/recette-XX.test.ts`,
  `tests/acceptance/harness.ts`, `tests/helpers/*`. **Dépend de L1-L8** (wave 3).

## 5. Signature des engines (L8) — ce que les autres lots appellent

Les engines sont déclarés dans `src/ports.ts` (`TheatreEngine`,
`PortfolioEngine`, `OrphanEngine`, `NightlyEngine`). Les actions (L6) et les
handlers ne passent **que** par ces ports, jamais par une fonction de domaine
directement. Le domaine (L1-L3) expose des fonctions **pures** ; L8 les orchestre
(lit via les stores/gateways, appelle le pur, persiste).

Convention pour L1-L3 : chaque module de domaine **exporte** ses fonctions pures
et leurs types d'entrée (interfaces `*Input`) depuis son propre fichier. L8 les
importe. Exemple attendu :

```ts
// src/domain/signals/index.ts  (L1)
export interface SignalInput { /* liens, mouvement, série, pointages, scope, période, seuils, now */ }
export function detectSignals(input: SignalInput): TheatreSignal[];
// src/domain/theatre-state.ts  (L1)
export function qualifyState(active: readonly SignalId[], facts: StateFacts): TheatreState;
// src/domain/projection.ts     (L2)
export function computeProjection(input: ProjectionInput): Projection;
// src/domain/cost.ts           (L2)
export function computeCost(input: CostInput): Cost;
```

## 6. i18n (L7)

Toute chaîne visible passe par `src/i18n/<lot>.ts`, en **anglais et français**
(§24). Un message nomme le fait et le seuil, jamais « une erreur est survenue ».
Les états/signaux/degrés ont une clé par valeur (`theatre.vivant`,
`signal.S2.fact`, `degree.concordant`).

## 7. Intégration

Ordre : L0 → (L1,L2,L3,L4,L5,L6,L7,L9,L10,L11 en parallèle) → L8 → L12.
À chaque wave : `npx tsc --noEmit` puis `npx vitest run` doivent passer. Les
gardes de taille et `node tools/check-manifest.mjs` aussi. Un lot ne modifie pas
un fichier d'un autre lot ; s'il faut toucher le contrat, PR dédiée
`CONTRACT-CHANGE`.
