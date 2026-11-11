# Architecture — Vigie

Deux apps Forge jumelles + un cœur de calcul pur. Les `§N` renvoient au
[cahier des charges](CAHIER-DES-CHARGES.md).

## Pourquoi deux apps (§20, §22)

Une app Forge peut **soit** appeler l'API du Teamwork Graph, **soit** fournir un
connecteur — pas les deux (exclusion mutuelle vérifiée). D'où :

- **App 1 — Vigie** (racine) : le produit. Lit le graphe (objectifs natifs
  `AtlassianGoal`), calcule états/signaux/projections/coûts, expose 15 outils MCP,
  l'agent Rovo « La vigie » et les écrans.
- **App 2 — Le graveur** (`graveur/`) : un connecteur qui *écrit* les objectifs du
  registre local dans le graphe, en **agrégats** uniquement (work item externe +
  relations), via un pont signé HMAC.

## Couches (App 1)

```
src/
  types.ts        contrat de données GELÉ (vocabulaire §4, degrés §6, états §7…)
  ports.ts        frontière domaine↔runtime GELÉE (gateways, stores, engines)
  defaults.ts     seuils réglables des 13 signaux, constantes projection/coût
  domain/         PUR (jamais @forge) : le cœur
    degrees, theatre-state, signals/*, concordance      (§6, §7)  — L1
    series, source-level, movement, epochs, projection, cost (§8,10,11,16) — L2
    orphans, checkin, dossier, postmortem, coverage     (§7v,12,13,15,19) — L3
    theatre-engine, portfolio-engine, orphan-engine, nightly  (orchestration) — L8
  db/             persistance Forge SQL : schema (18 tables §21), mapping, repo — L4
  collect/        adaptateurs @forge (lazy) : jira, graph, portfolio, llm,
                  confluence, identity, bridge (pont signé) — L5
  actions/        les 15 outils MCP (§18) + registre (redaction VG-21) — L6
  handlers/       resolver (UI), dispatch (actions/MCP), background (events/
                  scheduled/consumer/bridge), jql — câblage Forge
  viewmodel/, ui/, i18n/  écrans (§19), registre WCAG AA, en+fr — L7
  sample/         trimestre de démonstration synthétique (§27) — L9
  deps.ts, index.ts  graphe de dépendances + entrée Forge
```

## Le point de calcul unique

`TheatreEngine.qualify(objectiveId)` est le SEUL endroit qui qualifie un objectif :
il lit le travail et les séries via le store, détecte les signaux (`detectSignals`),
qualifie l'état (`qualifyState`), calcule le degré (`computeDegree`), la projection
(`computeProjection`), le coût (`computeCost`) et la concordance
(`computeConcordance`), persiste, et rend une `ObjectiveView`. Les écrans, le MCP,
l'agent et le recalcul nocturne lisent tous la même ligne — jamais de recalcul
divergent.

## Trois adaptateurs de source (§20)

| Adaptateur | Condition | Donne |
|---|---|---|
| Teamwork Graph | droits `read:graph:*` + Atlassian Goals | objectifs natifs (`AtlassianGoal`/`AtlassianGoalUpdate`) |
| Registre local | toujours, zéro licence | type de ticket « Objectif », RC en champs, liens |
| Import | tableur/page | one-shot dans le registre, avec provenance |

L'écran de couverture dit lequel est actif et distingue « pas de droit » de
« pas de données » (§19, VG-19).

## Contraintes plateforme (§20, §22)

- Fonctions interactives 55 s ; recalcul long via `consumer`/`scheduledTrigger`
  (≤ 900 s), par tranches avec curseur (`graph_cursor`).
- 5 déclencheurs planifiés max, un seul à 5 min.
- LLM hébergé : rattachements candidats + synthèse de dossier SEULEMENT, caché,
  jamais pour juger un pointage.
- Payload 5 Mo : les écrans lisent le cache SQL, pas de recalcul en direct.

## VG-21 (structurel)

`IssueRef` ne porte aucun assigné ; `redact` supprime tout `*_ref`/accountId des
sorties MCP ; aucune requête SQL n'agrège ni ne trie par identité (garde
`tests/db/schema.test.ts`) ; le registre UI n'affiche aucune personne. Les
`*_ref` servent à l'audit des rattachements et des décisions, jamais à un classement.