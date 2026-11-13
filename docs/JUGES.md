# Pour les juges / For judges

## Trois jeux de données, un seul site

**<https://tradoooo.github.io/vigie/>** — les vrais moteurs tournent **dans
votre navigateur** : changer un seuil, prendre un pointage ou appeler un des 15
outils MCP recalcule réellement le portefeuille.

## L'app, dans un vrai Jira

Le site ci-dessus est le produit **reproduit** dans un navigateur. Le produit
lui-même est **déployé et installé dans un vrai site Jira Cloud** :

| | |
|---|---|
| Site | `one-atlas-cndz.atlassian.net` |
| Version | 2.4.0 · environnement `development` |
| Ouvrir | <https://one-atlas-cndz.atlassian.net/jira/apps/84d90be8-449a-4860-bcb5-11d3d39043a1/fec35d4b-5f1a-4933-9d09-e2df3025b898> |
| Vérifier | `forge install list --json` (installation + version) · `forge logs -e development` (le recalcul nocturne se termine sur le site réel) · `node tools/prove-deploy.mjs` (la preuve, écrite dans `docs/VERIFICATIONS.md`) |

Les écrans sont des écrans Jira natifs : page globale (**Vigie**), encart sur
ticket (**Goal**), page projet (**Goal alignment**), gadget de tableau de bord
(**Goal theatre**), réglages de projet, deux macros Confluence, l'agent Rovo
**« La vigie »**, les 15 outils MCP et le skill `at-quarterly-review`.

Trois bugs de production sont apparus **seulement** au déploiement — ni les
tests ni le lint du manifeste ne pouvaient les voir ; ils sont consignés dans
[`docs/PREUVES.md`](docs/PREUVES.md) (§29–31).

| Jeu | Contenu | Commande |
|---|---|---|
| **Données Jira réelles** (livré et publié) | Le portefeuille d'un site Jira Cloud vivant : **8 epics = 8 objectifs, 177 tickets, 150 fantômes réels** | `VIGIE_PUBLISH_JIRA=1 node tools/build-site.mjs --jira` |
| **Données GitHub réelles** | Portfolio réel importé d'un dépôt public (`godotengine/godot`) : 6 objectifs, 3 982 tickets, **238 fantômes réels** | `npm run build:site:real` |
| **Trimestre synthétique** (§27) | 8 objectifs couvrant les **sept** états, 60 epics dont 12 fantômes, rattachement en masse, sous-calibrage, réorg | `npm run build:site` |

### Ce que l'app trouve dans un vrai site Jira

Constats **réels**, produits par le moteur, sans mise en scène :

- **15,3 %** du travail est rattaché à un objectif → **84,7 % du travail est
  fantôme** (150 tickets sans epics parent). C'est le verso du site, en vrai.
- **7 objectifs sur 8 sont dormants** : travail gelé (S2) **et** série plate (S4),
  personne n'a écrit de pointage (S10 « silence »). Le 8ᵉ n'a **aucun** ticket (S0).
- Le **coût est 0 jour** : ce site ne saisit aucun temps. La cascade du §11
  (temps saisi → estimation → durée réelle) tombe jusqu'au bout et **l'affiche** —
  elle n'invente pas de nombre.

Le mapping et ses limites sont affichés en permanence sur le site (panneau
« Données réelles (Jira) — … »). La vie privée est **structurelle** : la liste de
champs demandée à l'API ne contient ni `assignee` ni `reporter`, donc aucune
donnée de personne n'entre dans le domaine — et le payload publié est contrôlé
avant commit.

## Mode démonstration (§27)

Le dépôt contient aussi un **trimestre synthétique marqué comme tel**
(`src/sample/`, période `demo-2026-T4`, « maintenant » = 15 déc. 2026) :

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
5. **Données réelles** : le site public tourne déjà sur un vrai Jira Cloud
   (8 epics, 177 tickets, 150 fantômes). Sur un site avec Atlassian Goals ou le
   graphe, l'écran de couverture guide les droits, puis le portefeuille se calcule.

## Recette (§25)

Les 18 items de la recette sont couverts par les tests : domaine
(`tests/domain/*`), actions + garde VG-21 (`tests/actions/*`), et bout-en-bout
sur le jeu de démo (`tests/acceptance/recette.test.ts`). Lancer :

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run — 133 tests
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