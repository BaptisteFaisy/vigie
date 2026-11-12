# Vigie — real goals *(Objectifs réels)*

![Codegeist 2026](https://img.shields.io/badge/Codegeist-2026-0052CC)
![Category](https://img.shields.io/badge/category-Apps%20for%20Business%20Teams-57606A)
![Platform](https://img.shields.io/badge/Forge-Jira-2684FF)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6)
![Tests](https://img.shields.io/badge/tests-vitest-6E9F18)

> **An objective is real only if work is attached to it AND the number that
> measures it moved in a way traceable to that work.** Vigie links goals to
> epics, recomputes movement every week, says whether the target is reachable
> and what it costs in days, and names the *goal theatre* plainly — objectives
> that look alive and are not. (SPEC §1)

Atlassian Forge app for Jira · Codegeist 2026 · **Apps for Business Teams**.
Targeted bonuses: Teamwork Graph, Rovo Agents, MCP, Marketplace.
Submission deadline: Tuesday 22 December 2026, 21:00 (Paris).

`§N` references point to [`docs/CAHIER-DES-CHARGES.md`](docs/CAHIER-DES-CHARGES.md),
the full product spec. The build contract is [`docs/CONTRACTS.md`](docs/CONTRACTS.md).

---

## Preuves — chaque étape est vérifiable

Le projet n'affirme rien sans preuve. Trois niveaux, du plus local au plus visible :

| Niveau | Commande / lieu | Ce qu'il prouve |
|---|---|---|
| **Dépôt** | `npm run verify` | Rejoue tests, gardes de taille, manifeste, syntaxe du site **et** le site public en ligne (HTTP, payload, VG-21, moteur embarqué). Écrit `docs/VERIFICATIONS.md` : chaque contrôle avec son verdict et la **sortie réellement observée**. |
| **Site public** | section « Preuves » du site | Les 15 outils MCP sont **exécutés dans votre navigateur** et chaque contrôle affiche sa preuve brute (état, projection avec fourchette, coût, concordance, verso, dossier, écriture réelle, scan VG-21 sur les 15 sorties). Bouton « Rejouer les contrôles ». |
| **Déploiement Forge** | `node tools/prove-deploy.mjs` | Interroge Atlassian : session reconnue, app installée sur le site, version déployée. Consigné dans `docs/VERIFICATIONS.md`. **Échoue aujourd'hui** — l'app n'est pas encore déployée sur le site : le ledger le dit. |

Le ledger `docs/VERIFICATIONS.md` conserve l'historique des vérifications (date, score, commit),
donc on voit ce qui a été vérifié et quand.

## Live demo — no install needed

**<https://baptistefaisy.github.io/vigie/>** (public, English + French toggle)

The site is **not a mock-up**: the real Vigie engines are bundled and run **in
your browser**. Change a signal threshold, record a check-in, call any of the 15
MCP tools — everything is really computed, nothing is pre-baked.

Three datasets, one command apart:

| Dataset | Command | What it shows |
|---|---|---|
| **Real Jira data** (shipped, **published**) | `VIGIE_PUBLISH_JIRA=1 node tools/build-site.mjs --jira` | The portfolio of a live Jira Cloud site: **8 epics as objectives, 177 real tickets, 150 real ghosts**. Real findings — 15.3 % of the work is attached (84.7 % is ghost work), 7 objectives are dormant (frozen work + flat series), 1 has no ticket at all, and the cost is 0 days because nobody logs time (the §11 cascade says so instead of inventing a number). |
| **Real GitHub data** | `npm run build:site:real` | A real portfolio imported from a public repository (`godotengine/godot` by default): 6 real objectives, 3 982 real tickets, **238 real ghosts**. Milestone `3.7` is declared 83.2 % delivered while the recompute says 71.1 % — the platform's count includes pull requests. |
| **Synthetic quarter** (§27) | `npm run build:site` | 8 objectives covering **all seven** theatre states, 60 epics of which 12 ghosts, a bulk attachment, an under-calibrated target, a mid-period reorganisation. Pedagogically complete — a real site rarely contains every state. |

All three write `site/data/demo.json`; the real builds also write
`site/data/real-store.json`, which **hydrates the in-browser engine** so the site
stays interactive on real data. The site always states which dataset it shows and
explains the mapping and its limits (panel “Real data — …”). GitHub Pages
redeploys on every push to `main`.

**Privacy is structural, not a promise.** The field list sent to the Jira API
contains neither `assignee` nor `reporter`: no personal data enters the domain,
and the published payload is checked for identity keys before it is committed.

---

## The problem: goal theatre (§2)

Objectives are written at the start of the quarter, reviewed at the end, and in
between they live in a spreadsheet nobody opens. Three drifts, always the same:

1. **Decoration.** The objective exists, fifteen tickets are "linked" to it, the
   check-in says "on track". Nothing measurable moved. The linking is
   decorative: it shows the objective is served, it does not serve it.
2. **Narrative without work.** The objective is checked in every week with rich
   sentences while its epics are frozen. The visible activity is the comment's,
   not the work's.
3. **Work without objective.** Conversely, epics move that serve no declared
   objective — either the objective list is wrong, or that work was never
   decided. Nobody sees it, because nobody looks in that direction.

And the root problem: **a key result's number is typed by hand**. The real
number already exists — in Jira, in JSM incidents, in deployments, in costed
debt. Nobody connects the two. So management asks "where are we?" and gets a
colour — green, red or orange, picked by whoever has the most interest in green.

## What the app does NOT do (§5)

- it **rates nobody**: no per-person statistic, no ranking; signals are about the
  work — never about the quality of a check-in's prose;
- it **decides nothing**: it prepares the abandon/retarget dossier, the decision
  is human and recorded;
- it **invents no causality**: it says "concordant", never "caused by";
- it **greens nothing**: no global colour per objective; a falling KR and a
  rising KR never cancel out;
- it **never concludes without a sample size**: below the threshold the answer
  is "not enough data", displayed like any other conclusion;
- it **requires no licence**: it reads native goals in the Teamwork Graph when
  they exist, otherwise it runs on a local Jira registry, with spreadsheet
  import (§20).

## The four degrees (§6)

"A goal is moving" means four different things. Vigie separates them and always
shows the reached degree with its basis:

| Degree | Requires | The app shows |
|---|---|---|
| **Declared** | Someone wrote "on track" | Date and author of the check-in — nothing else |
| **Worked** | Linked work moved: transitions, commits, closures | The week's movement, ticket by ticket |
| **Advanced** | The KR series moved in the expected direction, from a level A or B source | Series points, their source, their level |
| **Concordant** | Advanced **and** work movement precedes number movement, same scope | Both series overlaid, the concordance window, **and what else changed** in the window |

The fourth degree is not proof of causality, and the UI says so: "concordant"
means nothing observed contradicts the attribution. The app always lists the
other movements of the same window (other objectives, releases, incidents,
campaigns) so the reader sees what it cannot rule out.

## Seven states, thirteen signals (§7)

Each state results from signals. Each signal is a dated fact with an adjustable
threshold. Nothing is asserted without the fact that grounds it.

| State | Produced by |
|---|---|
| **Vivant** (alive) | Level A/B series moving + linked work moving + recent check-in |
| **Narratif** (narrative) | Frequent check-ins (S5) + frozen work (S2) + level-C number (S3) |
| **Travaillé-muet** (worked-mute) | Work moving + non-falsifiable KR (S6) or flat series (S4) |
| **Décoratif** (decorative) | Mass linking (S1) + out-of-scope linking (S7) + no commits on linked tickets |
| **Orphelin** (orphan) | No linked work (S0) |
| **Sous-calibré** (under-calibrated) | Target reached before mid-period (S8) or same target as previous period (S9) |
| **Mort-vivant** (undead) | Period closed, objective not closed, untouched (S11) |

The thirteen signals (S0–S12 — the twelve of §7 plus S0), all measurable facts,
default thresholds in [`src/defaults.ts`](src/defaults.ts), all adjustable:

| # | Signal | Triggering fact (default threshold) |
|---|---|---|
| S0 | No link at all | 0 linked tickets |
| S1 | Mass linking | ≥ 5 tickets linked the same day by the same actor |
| S2 | Frozen work | No transition or commit on linked tickets for 21 days |
| S3 | Number without source | A level-C KR |
| S4 | Flat series | No variation over 6 weeks of measurements |
| S5 | Narrative without work | ≥ 3 check-ins during a frozen period (S2 active) |
| S6 | Non-falsifiable objective | KR with no number and no declared proof type |
| S7 | Out-of-scope linking | Components/projects of linked tickets unrelated to the declared scope |
| S8 | Early reach | Target reached before 50 % of the period |
| S9 | Repeated target | Target identical to the previous period's |
| S10 | Silence | No check-in for 45 days while work moves |
| S11 | Undead | Period closed 30 days ago, objective still open |
| S12 | Double counting | Same ticket linked to ≥ 3 objectives without a declared fraction |

A signal can be dismissed — with a written reason and a re-examination date;
a dismissal is never eternal.

**The flip side: work without objectives.** The same reading in the other
direction produces the **ghost** list: epics and tickets that move, burn days,
and serve no declared objective. For each, the app proposes a plausible
objective (component, team, title words, graph) with a confidence — and says
"not enough data" when it cannot. It is the most useful screen of the product:
it reveals the *executed* strategy against the declared one.

## Source levels A / B / C (§8)

Three levels, displayed everywhere a value appears. This is the centrepiece: an
objective whose KRs are all level C cannot rise above "declared".

| Level | What it is | Examples |
|---|---|---|
| **A — computed** | The app recomputes the value from Atlassian data, on demand and nightly | % of linked epics Done; median lead time; JSM incident count; JSM CSAT; successful deployments; debt cost (`laddition`); proven-criteria rate (`preuve-a-l-appui`) |
| **B — referenced** | Value entered by a person, with a verifiable reference and a date | Link to a dashboard, an export, a vendor report, a measurement page |
| **C — declared** | Value entered with no source | A number typed in a box |

Rules: a level-A KR is **recomputed, never copied**; a fall from A to C is
flagged (source regression); a binary KR requires a **proof type** and reuses
the strength grid of `preuve-a-l-appui` (machine / attested / declared). Every
series point keeps its level: you can watch a measurement degrade over a quarter.

## Architecture: two twin apps, three adapters (§20)

A Forge app can **either** call the Teamwork Graph API **or** provide a
connector — never both (verified constraint, §22). Hence two twin apps joined by
a **signed bridge** (the pattern proven in `merge-avec-contexte` and `deja-vu-ci`):

- **App 1 — Vigie (Jira)**: the whole product — screens, computations, 15 MCP
  tools, Rovo agent, review dossier. This repository.
- **App 2 — Le graveur** (the engraver, `graveur/`): a Teamwork Graph connector
  that pushes into the graph what read-only access cannot: local-registry
  objectives, their key results, series and period outcomes — mapped to external
  **work items** with relations (the connector object catalogue is closed: no
  `goal` type exists). Strict rule: **aggregates only** — never personal, HR or
  financial data.

Objectives come from **three adapters** — the product is identical on all three,
and the coverage screen says which is active and what the app cannot see:

| Adapter | Condition | Provides |
|---|---|---|
| **Teamwork Graph** | `read:graph` rights granted; org uses Atlassian Goals | Native goals via `AtlassianGoal` / `AtlassianGoalUpdate` objects |
| **Local registry** | Always available, zero licence | A Jira issue type "Objective"; KRs as fields; links as issue links |
| **Import** | Objectives live in a spreadsheet or page | One-shot import into the local registry, with provenance and date |

Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
[`docs/VALIDATIONS.md`](docs/VALIDATIONS.md).

## Screens and modules (§19)

The visual map is a **nautical chart**: every element carries data, nothing is
decorative — a *cape* is an objective, *reefs* are theatre signals, *fog* is
"not enough data" (grey, never coloured), a *ghost ship* is a ticket with no
objective, an *anchor* is an undead one. The **ship's register** (table view)
carries the identical information, WCAG AA.

| # | Screen | Manifest module |
|---|---|---|
| 1 | Chart of capes (portfolio, flip side, coverage — one page, four tabs) | `jira:globalPage` |
| 2 | Objective sheet (state, signals + facts, series, projection, cost, log, decision) | `jira:globalPage` |
| 3 | Ticket insert: "which objective does this ticket serve?", fraction, or "ghost" | `jira:issuePanel` |
| 4 | Dashboard gadget: theatre counter of the period | `jira:dashboardGadget` |
| 5 | Project page: linked-work share, ghosts | `jira:projectPage` |
| 6 | Flip side: the ghosts | `jira:globalPage` |
| 7 | Review dossier & post-mortem (generated Confluence pages) | `confluence:macro` |
| 8 | Coverage screen: active source, missing rights, linked share | `jira:globalPage` |
| 9 | Settings: signal thresholds, periods, epochs, number sources, attribution | `jira:projectSettingsPage` |

Plus: custom fields "Goal"/"Goal fraction", JQL functions `goalLinked()` and
`goalOrphans()` (§17, VG-24), Jira triggers, a nightly `scheduledTrigger`, a
`consumer` for long recalcs (up to 900 s), and a `webtrigger` for the signed
bridge to App 2.

## The 15 MCP tools (§18)

Exposed via `rovo:mcp` (max 50 tools per server; 15 here). **No tool accepts a
person's name as a filter; none returns one.** Reads are `GET`s, so an
automation can compute the portfolio when a review opens.

| Key | Verb | Purpose |
|---|---|---|
| `get-objective` | GET | State, signals + facts, series, projection, cost, decision |
| `list-objectives` | GET | Portfolio summary by period/team/state |
| `count-theatre` | GET | Objectives per state, dominant signals |
| `get-kr-series` | GET | Points with date, value, source, level |
| `get-projection` | GET | Percentage, range, sample size, assumptions, conclusion |
| `get-goal-cost` | GET | Days, method, shared part, ratio per point gained |
| `list-goal-orphans` | GET | Ghost tickets, plausible objective, confidence |
| `get-concordance` | GET | Work ↔ number concordance + other changes in the window |
| `get-review-dossier` | GET | The full review dossier |
| `get-portfolio-brief` | GET | First page of a management review |
| `link-work` | CREATE | Motivated attachment (reason required, fraction optional) |
| `record-kr-number` | CREATE | One series point with source reference and level |
| `record-checkin` | CREATE | Check-in with pre-filled facts |
| `record-decision` | CREATE | Recorded review decision |
| `open-postmortem` | CREATE | Generated Confluence post-mortem page |

Also shipped: the Rovo agent **"La vigie"** (answers with facts, ranges and
sample sizes, cites the source of every number, says "not enough data" when
honest) and the open-source skill **`at-quarterly-review`** (how to run a
quarterly review). Full contract in `manifest.yml`.

## Getting started

Requirements: Node.js (runtime `nodejs22.x`), the Forge CLI, a Jira Cloud
development site. If `node`/`forge` are installed under `~/.local/bin`:
`export PATH="$HOME/.local/bin:$PATH"`.

```bash
npm install            # dependencies
npm run typecheck      # tsc --noEmit, strict
npm test               # vitest run (unit + acceptance)
npm run lint           # forge lint
npm run check:limits   # guard: no file > 500 lines
npm run check:functions # guard: no function > 50 lines
npm run check:manifest # offline manifest guard

forge deploy           # deploy App 1 to the dev site
```

The demo dataset (a synthetic quarter, §27) is produced by lot L9
(`src/sample/`); see [`docs/DEMO-DATA.md`](docs/DEMO-DATA.md).
Judge instructions: [`docs/JUGES.md`](docs/JUGES.md).

## Lot map (CONTRACTS §4)

| Lot | Content | Files |
|---|---|---|
| **L0** | Frozen foundation: contracts, SQL schema, manifest, CI guards | `src/types.ts`, `src/ports.ts`, `src/defaults.ts`, `src/db/schema.ts`, `src/db/sql-client.ts`, `src/db/mapping-common.ts`, `manifest.yml`, `tools/*` |
| **L1** | Theatre domain: degrees, states, 13 signals, concordance (§6–7) | `src/domain/degrees.ts`, `theatre-state.ts`, `signals/*`, `concordance.ts` |
| **L2** | Measurement domain: projection, cost, movement, epochs, series, source levels (§8, §10–11, §16) | `src/domain/projection.ts`, `cost.ts`, `movement.ts`, `epochs.ts`, `series.ts`, `source-level.ts` |
| **L3** | Flip side & dossiers: orphans, dossier, post-mortem, coverage, reverse check-in (§7, §12–13, §15) | `src/domain/orphans.ts`, `dossier.ts`, `postmortem.ts`, `coverage.ts`, `checkin.ts` |
| **L4** | Persistence: stores over Forge SQL (§21) | `src/db/repo.ts`, `mapping*.ts`, `<table>.ts` |
| **L5** | Collect: Jira, graph, portfolio apps, LLM, Confluence, identity, signed bridge | `src/collect/*` |
| **L6** | Actions/MCP (15 tools) + Rovo agent prompt + skill (§18) | `src/actions/*`, `static/agent/prompt.md`, `static/skill/at-quarterly-review.md` |
| **L7** | Viewmodels + UI + i18n (EN/FR, WCAG AA) (§19, §23) | `src/viewmodel/*`, `src/ui/**`, `src/i18n/*` |
| **L8** | Engines, handlers, deps, index (§20) — wave 2, needs L1–L3 | `src/domain/*-engine.ts`, `nightly.ts`, `src/handlers/*`, `src/deps.ts`, `src/index.ts` |
| **L9** | Synthetic demo quarter (§27, VG-20) | `src/sample/*` |
| **L10** | Documentation (this lot) | `README.md`, `docs/*` |
| **L11** | App 2 "Le graveur" — Teamwork Graph connector (§20) | `graveur/*` |
| **L12** | Acceptance: the 18-item recette (§25) — wave 3, needs L1–L8 | `tests/acceptance/recette-XX.test.ts`, `harness.ts` |

Integration order: **L0 → (L1…L7, L9, L10, L11 in parallel) → L8 → L12**; at
each wave `tsc --noEmit` and `vitest run` must pass. A lot never edits another
lot's files; contract changes go through a dedicated `CONTRACT-CHANGE` PR.

## Progress

*As of 11 November 2026 (week 1 of the §28 plan):*

- ✅ **L0 — frozen foundation**: data contract (`src/types.ts`), ports
  (`src/ports.ts`), defaults and thresholds (`src/defaults.ts`), 18-table SQL
  schema (`src/db/schema.ts`), full manifest (18 module kinds, 15 actions,
  agent, MCP server, skill), CI guards, shared test helpers (`tests/helpers/`).
- ✅ **L10 — documentation**: this README and `docs/*`.
- 🔄 **Week 1 target (§28)**: the eight platform validations of §22 by
  prototype — see [`docs/VALIDATIONS.md`](docs/VALIDATIONS.md) — and a working
  local-registry adapter.
- ⏳ Next (§28): links/fractions/movements/series → signals/states/ghosts →
  projection/cost/concordance/dossier → MCP/agent/skill (feature freeze
  15 Dec) → recette, connector app, video, submission (22 Dec, 21:00 Paris).

Sacrificables, in order (§28): the nautical chart (the register carries the same
information), the connector app (the TWG bonus stays defensible through API
consumption), the Confluence post-mortem.

## Documentation

| File | Content |
|---|---|
| [`docs/CAHIER-DES-CHARGES.md`](docs/CAHIER-DES-CHARGES.md) | The full spec, §1–§32 (source of truth) |
| [`docs/CONTRACTS.md`](docs/CONTRACTS.md) | Build contract, house rules, 12 lots |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layers, 18 tables, engines, adapters, platform constraints |
| [`docs/METHODE.md`](docs/METHODE.md) | The honesty discipline, VG-21, size rules |
| [`docs/JUGES.md`](docs/JUGES.md) | How judges test the app (EN/FR) |
| [`docs/VIDEO.md`](docs/VIDEO.md) | The <5-minute video script (EN) |
| [`docs/VALIDATIONS.md`](docs/VALIDATIONS.md) | The 8 first-week validations + verified constraints |
| [`docs/DEVPOST.md`](docs/DEVPOST.md) | Devpost submission text (EN) |
| [`docs/MARKETPLACE.md`](docs/MARKETPLACE.md) | Marketplace listing sheet |
| [`docs/RECETTE.md`](docs/RECETTE.md) | Acceptance matrix: 18 items → tests |
| [`docs/DEMO-DATA.md`](docs/DEMO-DATA.md) | The synthetic demo quarter |

## Licence

The repository is published as open source, consistent with the team's practice —
the skill `at-quarterly-review` is explicitly published open source for
third-party agents (§18). The `LICENSE` file is finalised before the Marketplace
submission (§32); until then the code is © its authors, all rights reserved.

---

## Résumé en français

**Vigie — real goals (Objectifs réels)** · app Atlassian Forge pour Jira ·
Codegeist 2026, catégorie *Apps for Business Teams*.

Un objectif n'est réel que si du travail y est rattaché **et** si le nombre qui
le mesure a bougé d'une façon qu'on peut rattacher à ce travail (§1). Vigie
relie les objectifs aux epics, recompte le mouvement chaque semaine, dit si la
cible est atteignable et ce qu'elle coûte en jours — et nomme sans détour le
**théâtre des objectifs** : décoratifs, narratifs, travaillés-muets, orphelins,
sous-calibrés, mort-vivants. Chaque état repose sur des **signaux** (13, de S0 à
S12), faits datés à seuils réglables. Chaque nombre porte son **niveau de
source** : A calculé, B référencé, C déclaré. Quatre degrés séparent « déclaré »
de « concordant » — jamais de causalité affirmée, jamais de projection sans
fourchette ni effectif, jamais de statistique par personne (VG-21). Le **verso**
liste les fantômes : le travail qui ne sert aucun objectif déclaré.

Architecture : **deux apps jumelles** reliées par un pont signé — Vigie (Jira :
écrans, calculs, 15 outils MCP, agent Rovo « La vigie », skill) et **Le graveur**
(connecteur Teamwork Graph, agrégats uniquement) — et **trois adaptateurs** de
source d'objectifs (graphe, registre local Jira, import tableur), pour que la
démo fonctionne quel que soit le niveau de licence. Les onze apps sœurs du
portefeuille (`laddition`, `problemes-caches`, `rayon-impact`,
`preuve-a-l-appui`, `delegable-ou-pas`, `placard-wiki`…) alimentent les RC de
niveau A : Vigie en est le toit (§14).

Soumission avant le mardi 22 décembre 2026, 21 h (Paris), en anglais.
