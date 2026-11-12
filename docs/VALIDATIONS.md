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