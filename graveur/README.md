# Le graveur — App 2 (connecteur Teamwork Graph)

App Forge jumelle de **Vigie**. Contrainte plateforme vérifiée (§20, §22) : une
app Forge peut **soit** appeler l'API du Teamwork Graph, **soit** fournir un
connecteur — pas les deux. D'où deux apps :

| App | Rôle |
|---|---|
| **App 1 — Vigie** (racine) | le produit : lit le graphe (objectifs natifs), calcule les états/signaux/projections/coûts. |
| **App 2 — Le graveur** (ici) | un **connecteur** qui *écrit* dans le graphe ce que la lecture seule ne donne pas. |

## Ce que le graveur pousse

Les objectifs du registre local, leurs résultats clés, leurs séries et les
résultats de période. Conséquence (§30) : toute l'organisation peut demander à
Rovo « qu'est-ce qui sert cet objectif ? » et croiser objectifs, livraison,
incidents et coûts dans Analytics.

## Règle stricte (§20, §22)

Le graveur n'écrit que des **agrégats** : objectif, résultat, période, coût en
jours, état. **Jamais** de donnée personnelle, RH, financière ou de santé (les
catégories interdites à l'ingestion par le graphe, et contraires au §5). Les
`*_ref` de l'app 1 ne franchissent jamais le pont.

## Mapping (catalogue d'objets FERMÉ)

Le catalogue d'un connecteur est fermé (26 types) : il n'existe **pas** de type
`goal`/`objective`/`key-result`. Le graveur mappe donc :

- un **objectif** → un **work item externe** (ou un project), avec ses relations
  vers les issues Jira rattachées ;
- les **résultats clés** → des champs de cet objet ;
- la **série / état / coût** → des propriétés agrégées.

Deuxième réserve (§22) : tous les types connectés ne sont pas indexés par Rovo
Search/Chat — à tester sur work item avant de promettre la requête en langage
naturel. Repli : démontrer l'usage dans Atlassian Analytics.

## Pont signé (§20)

Le graveur reçoit son payload du webtrigger `graveur-bridge` de l'app 1, signé
en HMAC-SHA256 (`src/bridge.ts`, miroir de l'app 1). Une signature invalide est
rejetée. La forme exacte du module connecteur est **à valider forge lint** (§22).