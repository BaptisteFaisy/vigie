# Pour les juges / For judges

## Mode démonstration (§27)

Le dépôt contient un **trimestre synthétique marqué comme tel** (`src/sample/`,
période `demo-2026-T4`, « now » de démo = 15 déc. 2026) :

- **8 objectifs**, un par état de théâtre (+ une vitrine « concordant ») :
  vivant, narratif, travaillé-muet, décoratif, orphelin, sous-calibré,
  mort-vivant (ce dernier est un reliquat du trimestre T3 clos).
- **60 epics** dont **12 fantômes** (le verso).
- Un **rattachement en masse** (5+ tickets liés le même jour → S1).
- Un **sous-calibrage** (cible atteinte à ~21 % de la période → S8).
- Une **réorganisation mi-période** (2 époques ; les séries ne sont jamais
  mélangées → §25 item 15).
- Des **séries de niveau A** calculées, assez longues pour une projection à
  fourchette (≥ 4 semaines) et assez courtes ailleurs pour un « pas assez de
  recul » assumé.

`seedDemo(store)` peuple n'importe quel `VigieStore` (mémoire pour les tests,
SQL en production).

## Comment tester

1. **Registre + carte des caps** : états, signaux et faits, tri/filtres.
2. **Une fiche de bout en bout** : série, projection (fourchette + effectif),
   coût (méthode + part partagée), journal (faits | interprétation), dossier de
   revue (3 options), décision enregistrée.
3. **Agent Rovo « La vigie »** — les 7 questions du §18, dont :
   - « Quels objectifs du trimestre sont décoratifs, et pourquoi ? »
   - « Quels epics ne servent aucun objectif déclaré ? »
   - « Combien de jours a consommé cet objectif, pour quel mouvement ? »
   - « Quelle part de nos résultats clés est mesurée plutôt que déclarée ? »
4. **Client MCP** (`rovo:mcp`, 15 outils) : `list-objectives`, `count-theatre`,
   `list-goal-orphans`, `get-projection` sur le trimestre de démo.
5. **Données réelles** : sur un site avec Atlassian Goals ou le graphe, l'écran
   de couverture guide les droits, puis le portefeuille se calcule.

## Recette (§25)

Les 18 items de la recette sont couverts par les tests : domaine
(`tests/domain/*`), actions + garde VG-21 (`tests/actions/*`), et bout-en-bout
sur le jeu de démo (`tests/acceptance/recette.test.ts`). Lancer :

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run — 92 tests
npm run check:limits && npm run check:functions && npm run check:manifest
```

## Ce que l'app ne fait pas (§5)

Elle ne note personne (aucune statistique individuelle — VG-21, garanti par
`redact` et une garde SQL), ne décide rien (elle prépare le dossier, la décision
est humaine et enregistrée), n'invente pas de causalité (« concordant », jamais
« causé par »), ne verdit rien (aucune couleur globale ; un RC en baisse et un en
hausse ne se compensent pas), et ne conclut jamais sans effectif (« pas assez de
recul » est une réponse complète).

## Bonus visés

- **Teamwork Graph** : App 1 lit `AtlassianGoal` ; App 2 (`graveur/`) grave les
  objectifs en work items externes (agrégats) via connecteur + pont signé.
- **Agents Rovo** : « La vigie » (7 questions, faits + fourchettes + sources).
- **MCP** : 15 outils (`rovo:mcp`), lectures GET idempotentes.
- **Marketplace** : voir `docs/MARKETPLACE.md` (à rédiger pour la soumission).

Soumission : Codegeist 2026 · Apps for Business Teams · avant le 22 déc. 2026, 21 h (Paris).