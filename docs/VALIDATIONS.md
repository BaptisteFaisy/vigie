# Validations §22 — statut et replis

Huit points du cahier (§22) ne peuvent être tranchés que sur un site Atlassian
réel. Ce document tient leur statut à jour : **fait en local**, **à valider sur
site**, ou **repli appliqué**. Aucun n'est laissé silencieux : quand une
validation manque, l'app dégrade vers son repli et l'écran de couverture le dit.

| # | Point | Statut | Repli si échec |
|---|---|---|---|
| 1 | Requête prête / Cypher persisté sur `AtlassianGoal` + relations vers les issues | **À valider sur site.** Forme GraphQL écrite dans `src/collect/graph.ts` (requêtes prêtes, pas de Cypher brut — refusé aux nouvelles apps). | Registre local + import tableur (toujours disponibles). |
| 2 | Droits `read:graph:*` accordés sur le site de démo | **À valider sur site.** `graph.availability()` distingue « pas de droit » de « pas de données ». | Mouvement lu dans Jira seul ; l'écran de couverture liste les droits manquants. |
| 3 | Mapping objectif → work item externe + relations (connecteur) | **Écrit, à brancher.** `graveur/src/mapping.ts` + `connector.ts` (API injectable). | Connecteur limité aux résultats de période. |
| 4 | Objets connectés indexés par Rovo Search/Chat | **À valider sur site** (work item). | Démontrer l'usage dans Atlassian Analytics seulement. |
| 5 | Volume : 500 objectifs × 6 semaines, temps de recalcul | **À mesurer sur site.** Le nightly est déjà borné (tranches, curseur `graph_cursor`). | Tranches par équipe, calcul à la demande. |
| 6 | Temps saisi réellement rempli chez un client typique | **Géré.** Cascade logged → estimated → cycle ; la source retenue est affichée (`cost.method`). | Estimation puis cycle time, source affichée. |
| 7 | Détection hors périmètre (S7) | **Fait en local** (projets + composants, sans le graphe) ; enrichissable par le graphe. | Composants/projets seuls (déjà le cas). |
| 8 | Écriture d'une page Confluence depuis une app Jira | **Écrit, à valider sur site.** `src/collect/confluence.ts` (REST v1 storage). | Page générée dans l'app, export à la demande. |

## Ce qui est déjà prouvé en local (sans site)

- Les 13 signaux, les 7 états, les 4 degrés, la concordance : 15+13 tests domaine.
- Projection honnête (fourchette, effectif, « pas assez de recul ») : tests §25 items 6, 7.
- Coût partagé, non-double-comptage : test §25 item 8.
- Époques, séries jamais mélangées : test §25 item 15.
- Fantômes + objectif plausible + confiance : test §25 item 9.
- VG-21 (aucune donnée de personne) : garde sur les 15 sorties MCP + garde SQL.
- Persistance SQL : 17 tests d'aller-retour sur `fake-sql`.
- Recette §25 de bout en bout sur le jeu de démo : 13 tests d'acceptation.

## Déployer sur un site de démo

Le déploiement exige un compte Atlassian et `forge login` : **c'est un geste
humain**, jamais automatisé ici (pas d'identifiants saisis sans demande
explicite). Une fois connecté :

```bash
bash tools/deploy.sh        # vérifie forge, déploie App 1 puis App 2
```

Puis, sur le site : installer l'app, accorder (ou refuser, pour tester le repli)
les scopes `read:graph:*`, ouvrir l'écran de couverture et vérifier qu'il nomme
exactement ce qui manque.

### État réel (12 novembre 2026, site `one-atlas-cndz.atlassian.net`)

L'app **App 1 — Vigie** est créée, déployée en production et installée en
production sur **Jira** et **Confluence** :

- ARI : `ari:cloud:ecosystem::app/d934d4d0-76fe-4374-b669-a3a993cf3e88` (version 2.0.0) ;
- scopes du graphe **réels** (le suffixe fournisseur est obligatoire — les noms
  du cahier, sans suffixe, sont refusés par `forge lint`) :
  `read:graph:goal:atlassian`, `read:graph:goal-update:atlassian`,
  `read:graph:issue:jira`, `read:graph:project:jira`, `read:graph:commit:external`,
  `read:graph:service:external` ;
- le manifeste passe `forge lint` (0 erreur) après corrections de conformité :
  gadgoun backend (`function`), arguments/opérateurs des fonctions JQL, `rovo:skill`
  en `source.dir`, description `rovo:agent` ≤ 255 caractères ;
- **retiré du manifeste** : les deux macros Confluence (`confluence:contentAction`
  exige une ressource Custom UI — un dossier avec `index.html` — que l'app ne
  construit pas encore). Le dossier de revue reste accessible par l'outil MCP
  `get-review-dossier` et dans l'app. C'est le point sacrificable prévu par le
  cahier (§23) ;
- le code source (TS) a été remis au style d'import **sans extension** (bundler),
  exigé par le bundler de Forge, et `noEmit` retiré du `tsconfig.json` (le
  drapeau `--noEmit` de la CI suffit au typecheck).

Restent à trancher **sur site** (ouvrir l'écran de couverture connecté à Jira) :
la présence réelle des objectifs `AtlassianGoal` dans le graphe, l'indexation
Rovo des objets connectés, le volume de calcul nocturne, et l'écriture de pages
Confluence. Voir les 8 lignes du tableau plus haut.