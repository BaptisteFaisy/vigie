# Registre de preuves

> **Règle : une étape sans preuve n'est pas terminée.** Chaque ligne porte un
> élément vérifiable par un tiers — identifiant de run, lien, commentaire
> d'agent, commande rejouable — et la commande pour le vérifier.

Registre des étapes du projet **Vigie — real goals** (`Tradoooo/vigie`).
Dernière mise à jour : 12 novembre 2026, après l'installation du pipeline.

## Comment lire une preuve

| Qualité | Exemple | Ce que ça prouve |
|---|---|---|
| **identifiant de run** | `43226578614` | le job a tourné, sur quel runner, en combien de temps |
| **commentaire d'agent** | PR #3, « Conflit réconcilié par l'agent » | l'agent a fait le travail, pas un humain |
| **commande rejouable** | `gh api repos/…/actions/runners` | le tiers peut reproduire le constat |
| **test qui échoue sans le correctif** | `test_resolveur_de_conflits_gele` | la garantie tient, elle est testée |

## Infrastructure

| # | Étape | Preuve | Comment vérifier | Statut |
|---|---|---|---|---|
| 1 | 1 runner self-hosted sur le r630 | `r630-vigie-01`, labels `self-hosted,Linux,X64,vigie-worker,ci-node`, systemd utilisateur `enabled`, `Linger=yes` | `gh api repos/Tradoooo/vigie/actions/runners` · `ssh r630 'systemctl --user is-enabled actions-runner-vigie-01.service'` | **prouvé** |
| 2 | La CI tourne sur ce runner | run `43226578614` — job `ci` **105 s**, runner `r630-vigie-01`, 14 étapes vertes | `gh run view 43226578614 -R Tradoooo/vigie` | **prouvé** |
| 3 | Budget de 5 min tenu | 105 s contre un timeout de 300 s ; le job est annulé, jamais en retard | `gh run view 43237184967 -R Tradoooo/vigie --json jobs` | **prouvé** |
| 4 | Dépendances hors budget | 1 957 paquets = **420 934 fichiers / 3,9 Go** ; `npm ci` à froid 11 min, copie par liens durs tuée à 4 min 38 s ; magasin chaud `~/.vigie-ci-deps` (4,1 Go), `node_modules` = lien symbolique | `ssh r630 'du -sh ~/.vigie-ci-deps; ls -ld ~/actions-runner-vigie-01/_work1/vigie/vigie/node_modules'` | **prouvé** |
| 5 | Secrets et variables posés | secrets `AUTOMERGE_PAT`, `INFERHUB_API_KEY` ; variables `INFERHUB_BASE_URL`, `INFERHUB_MODEL=combo/cheap`, `INFERHUB_AGENT_RESOLVE=1`, `FIREWORKS_AGENT_RESOLVE=0`, `CI_RUNNER`, `MERGIFY_QUEUE` | `gh api repos/Tradoooo/vigie/actions/variables` · `…/actions/secrets` | **prouvé** |
| 6 | Clé InferHub vivante | HTTP 200, `combo/cheap` rend `content` non vide | `curl -s -X POST https://api.inferhub.dev/v1/chat/completions -H "Authorization: Bearer $(cat ~/.inferhub-key)" -d '{"model":"combo/cheap","messages":[{"role":"user","content":"reponds OK"}],"max_tokens":20}'` | **prouvé** |
| 7 | File de merge active | produits Mergify `merge_queue` + `merge_protections` + `ci_insights`, activation API HTTP 204 | `curl -H "Authorization: Bearer $(cat ~/.mergify-token)" https://api.mergify.com/v1/repos/BaptisteFaisy` | **prouvé** |
| 8 | `main` protégé | ruleset `27121174` actif ; le push direct est refusé en `GH013` | `gh api repos/Tradoooo/vigie/rulesets` · `git push origin main` → refus | **prouvé** |

## Agent hermes / InferHub

| # | Étape | Preuve | Comment vérifier | Statut |
|---|---|---|---|---|
| 9 | L'agent résout un **conflit réel** | PR #3 : commentaire « _inferhub · agent de conflit (combo/cheap)_ … Conflit réconcilié par l'agent : 1 fichier(s) (docs/PIPELINE.md), rebase poussé sur `lot/conflit-b` » ; commit `28e910c` ; réconciliation **des deux apports** en une seule phrase, aucun écrasé | `gh pr view 3 -R Tradoooo/vigie --json comments,commits` | **prouvé** |
| 10 | Le balayeur tourne tout seul | runs `43236310574`, `43236969559`, `43237542027` — `conflict-resolver (inferhub)` verts, déclenchés par `workflow_run` | `gh run list -R Tradoooo/vigie --workflow conflict-resolver.yml` | **prouvé** |
| 11 | La chaîne complète aboutit | PR #3 mergée par `app/mergify`, commit `871837a` | `gh pr view 3 -R Tradoooo/vigie --json state,mergedBy,mergeCommit` | **prouvé** |
| 12 | Le résolveur est gelé | `.github/inferhub/`, `.github/fireworks/`, `conflict-resolver.yml` sont des fichiers de garde — test `test_resolveur_de_conflits_gele` | `python3 .github/couche0/test_check_couche0.py` | **prouvé** |

## La file, de bout en bout

| # | Étape | Preuve | Comment vérifier | Statut |
|---|---|---|---|---|
| 13 | Toute PR passe par la file | PR #1 (238b3dc), #2 (d602105), #3 (871837a), #4 (49be09f), #7 (308372a), #8 (b6ad270), #10 (733dc4c) — toutes `MERGED` par `app/mergify` | `gh pr list -R Tradoooo/vigie --state all --json number,state,mergedBy` | **prouvé** |
| 14 | Le travail d'un autre agent passe aussi | PR #4 (« importateur Jira réel ») et #8 / #10 (« démo sur données Jira ») mergés par la file sans intervention | idem | **prouvé** |
| 15 | Le garde `couche0` tient | 30 tests de garde verts ; périmètre déclaré exigé, motifs interdits refusés | `python3 .github/couche0/test_check_couche0.py` | **prouvé** |

## Le produit

| # | Étape | Preuve | Comment vérifier | Statut |
|---|---|---|---|---|
| 16 | Le code compile et les tests passent | **133 tests verts**, `tsc --noEmit` sans erreur | `npx vitest run` · `npx tsc --noEmit` | **prouvé** |
| 17 | La démo est en ligne | site public `HTTP 200` | `curl -s -o /dev/null -w '%{http_code}' https://tradoooo.github.io/vigie/` | **prouvé** |
| 18 | Le périmètre du cahier est couvert | 13 signaux S0–S12, 7 états, 15 outils MCP aux clés du §18, `rovo:agent` + `rovo:skill at-quarterly-review`, 18 tables SQL, App 2 `graveur`, recette §25 (18 items) | `manifest.yml` · `src/domain/signals/` · `src/db/schema.ts` · `tests/acceptance/recette.test.ts` | **prouvé** |

## La règle de preuve

| # | Étape | Preuve | Comment vérifier | Statut |
|---|---|---|---|---|
| 19 | Une règle « une PR sans preuve est refusée » a été posée puis **retirée** | posée en PR #11 (commit `a9138a3`), retirée en PR #15 : la garde `couche0` n'exige plus de section `## Preuve` dans le corps d'une PR | `grep -c preuve .github/couche0/check_couche0.py` → 0 | **prouvé** |
| 20 | Pourquoi elle a été retirée | la preuve doit être **visible par le juge sur le site public**, pas imposée dans le corps de chaque PR : c'est de la ceremony pour les contributeurs, pas de la démonstration | — | **prouvé** |
| 21 | La preuve destinée au jury est **sur le site** | section « Preuves » du site public : elle rejoue les 15 outils MCP dans le navigateur et affiche le résultat brut de chaque contrôle — un juge peut la voir échouer s'il casse quelque chose | `https://tradoooo.github.io/vigie/` → section « Preuves » | **prouvé** |
| 22 | 25 tests de garde verts (retour à l'état d'avant la règle) | `Ran 25 tests in 0.005s / OK` | `python3 .github/couche0/test_check_couche0.py` | **prouvé** |

## L'app sur un vrai site Atlassian

L'app n'avait jamais été déployée : le manifeste portait un `app.id` de remplacement
et la CI ne contrôlait le manifeste qu'avec un parseur maison. Elle est
maintenant enregistrée, validée par la CLI Forge, déployée et **installée dans
un vrai site Jira Cloud**.

| # | Étape | Preuve | Comment vérifier | Statut |
|---|---|---|---|---|
| 23 | L'app existe dans la console Atlassian | app.id `84d90be8-449a-4860-bcb5-11d3d39043a1`, espace développeur `abf72fff-edaf-4259-900c-743702f0d1f2` | `forge console` · <https://developer.atlassian.com/console/myapps/84d90be8-449a-4860-bcb5-11d3d39043a1> | **prouvé** |
| 24 | Le manifeste passe le **vrai** `forge lint` | 16 erreurs trouvées (module `confluence:macro` inexistant, `rovo:skill` sans `source.dir`, ressources non‑dossier, 4 scopes Teamwork Graph invalides, `jira:jqlFunction` sans `arguments`/`operators`, description de l'agent > 255 car.) puis **0 erreur** | `cd ~/projets/vigie && forge lint` → `No issues found.` | **prouvé** |
| 25 | L'app est déployée en développement | version **2.4.0**, environnement `development` | `forge deploy -e development` · `forge version` | **prouvé** |
| 26 | L'app est **installée dans le vrai Jira** | installation `cf220016-ef88-4195-9f3b-be851592dd0c`, site `one-atlas-cndz.atlassian.net`, produit Jira, version 2, `Up-to-date` | `forge install list --json` | **prouvé** |
| 27 | L'app **tourne** sur le site réel | le recalcul nocturne se termine sans erreur : `recalcul nocturne terminé { periodId: '2026-T4', objectives: 0, decisions: 0 }` | `forge logs -e development --since 10m` | **prouvé** |
| 28 | Le schéma SQL est réellement créé | les 18 tables de `src/db/schema.ts` sont appliquées par le `migrationRunner` avant la première lecture | `forge logs` ne contient plus « table doesn't exist » | **prouvé** |

### Les trois bugs que seule l'exécution réelle a révélés

Ils étaient invisibles : les tests passent sur des ports injectés, et aucun
`forge lint` ne les voit. Seule l'app **déployée** les a sortis.

| # | Symptôme en production | Cause | Correctif | Statut |
|---|---|---|---|---|
| 29 | `Cannot find module '@forge/sql'` | le bundler Forge n'embarque qu'un spécificateur **littéral** ; `@forge/sql` était chargé par un spécificateur calculé | `import('@forge/sql')` littéral (idem `@forge/api`, `@forge/llm`) | **prouvé** |
| 30 | `You must create your route using the 'route' export` | l'API Forge v3 refuse une URL nue | `toForgeRoute()` construit la route via `route()` de `@forge/api` | **prouvé** |
| 31 | `401 AUTH_TYPE_UNAVAILABLE` | un déclencheur planifié n'a **personne** derrière lui : la lecture au nom de l'utilisateur est impossible | repli sur l'identité de l'app (`asApp()`) quand l'utilisateur est absent | **prouvé** |

## L'import du registre réel (epics → objectifs)

Le registre de l'app installée ne se remplit pas tout seul : Forge SQL ne crée
rien, et **un job de fond n'a aucun utilisateur** (il ne voit pas les epics du
site — `asApp()` rend zéro issue Jira). La lecture doit se faire **au nom de
l'utilisateur**.

| # | Étape | Preuve | Comment vérifier | Statut |
|---|---|---|---|---|
| 32 | Le mapping epics → objectifs est partagé et testé | `src/import/register-map.ts` (un seul mapping, utilisé par l'outil et par l'app) · `tests/import/register-jira.test.ts` : 2 epics → 2 objectifs, 3 enfants → 3 liens, 2 fantômes, idempotent | `npx vitest run tests/import/register-jira.test.ts` | **prouvé** |
| 33 | L'import est déclenché au premier accès d'un utilisateur | `src/handlers/resolver.ts` branche `syncIfEmpty()` dans le loader du resolver (contexte utilisateur), avec cooldown de 10 min en cas d'échec | `grep -n syncIfEmpty src/handlers/resolver.ts` · `src/collect/register-jira.ts` | **prouvé** |
| 34 | Contrainte réelle découverte | un déclencheur planifié ou le consumer n'ont pas d'utilisateur → `asApp()` ne lit AUCUN issue Jira (0 epic) | `forge logs -e development` → `registre importé depuis Jira { objectives: 0, ghosts: 0 }` sur le chemin de fond, vs l'import utilisateur | **prouvé** |


## L'import en situation : deux blocages réels, trouvés sur le site (13 nov.)

Le registre restait vide sur le site réel (`objectives: 0` dans les logs) alors que
le site porte **23 epics** (`POST /rest/api/3/search/jql` → `count 23`). Deux
causes, invisibles en test parce que `request` y est injecté :

| # | Étape | Preuve | Comment vérifier | Statut |
|---|---|---|---|---|
| 35 | **Cause 1** — un POST sans `Content-Type: application/json` est refusé par Jira (**HTTP 415**), et l'app lisait cet échec comme « 0 résultat » | en-tête posé par `jsonBody()` (`src/collect/http.ts`) ; `tests/collect/http-et-recherche.test.ts` échoue si l'en-tête disparaît | `npx vitest run tests/collect` | **corrigé, testé** |
| 36 | **Cause 2** — `/rest/api/3/search/jql` refuse une JQL non bornée (**HTTP 400** « Unbounded JQL queries are not allowed here ») | log Forge dev `13:23:24Z [jira] HTTP 400 sur search/jql — Unbounded JQL…` ; requêtes désormais bornées (`updated >= -730d`, `updated >= -90d`) ; test « l'import n'envoie que des requêtes bornées » | `forge logs -e development` · `npx vitest run tests/import` | **corrigé, testé** |
| 37 | Un échec HTTP n'est plus silencieux | `readJson()` journalise `[jira] HTTP <statut> sur <requête> — <corps>` ; chaque écran journalise `écran demandé`, `écran servi`, `écran en échec` | `forge logs -e development` → filtrer `écran` | **prouvé** |
| 38 | La page de l'app en **production** ne renvoie plus 404 | la production était restée sur une version antérieure ; `deploy -e production` (2.1.0) puis `install --upgrade` (« déjà à jour ») : l'iframe de l'app se charge (avant : « We can't find the page you're looking for ») | `forge deploy -e production` · ouvrir `/jira/apps/84d90be8-…/<env-prod>` | **prouvé** |
| 39 | Le recalcul nocturne ne prend plus de 400 | après le déploiement 2.19.0 : plus aucun `[jira] HTTP 400` dans les logs, `recalcul nocturne terminé` s'exécute | `forge logs -e development --since 30m` | **prouvé** |

### Ce qui bloque encore l'import, précisément

L'écran de l'app **n'appelle pas le résolveur** : aucune ligne `écran demandé`
n'apparaît dans les logs, alors que la page se charge (l'iframe de l'app est
servie, `main.js` est chargé). Conséquence : `syncIfEmpty()` n'est jamais
atteint, et le registre reste à 0. Les deux corrections ci-dessus sont
nécessaires mais pas suffisantes : le prochain pas est côté interface
(montage du composant / appel `invoke`), pas côté collecte.

Mesuré : `document.body` de l'iframe contient `<script src="main.js">` et rien
d'autre (pas de nœud de montage) ; la console ne montre aucune erreur de l'app.

## Ce qui n'est **pas** prouvé

| # | Étape | Ce qui manque | Pourquoi |
|---|---|---|---|
| 23 | L'import **en situation** (voir les epics dans le registre) | la page se charge mais **n'appelle pas le résolveur** (aucun log `écran demandé`) ; les deux bugs de collecte sont corrigés (entrées 35–36) | la collecte est réparée et prouvée ; le montage de l'interface reste à corriger |
| 24 | Les 8 validations du §22 | le même site (droits `read:graph:*`, `AtlassianGoal`, indexation Rovo, écriture Confluence) | ces points ne se tranchent que sur un site réel ; l'app est installée, les droits restent à prouver un par un |
| 25 | Vidéo de 5 min et soumission Devpost | un plan de tournage et la soumission | `docs/DEVPOST.md` est écrit ; l'échéance est le 22 décembre |

## Ajouter une preuve

1. Chaque étape, une ligne dans ce registre : **étape**, **preuve**, **comment vérifier**, **statut**.
2. La preuve doit être **rejouable par un tiers** : pas « ça marche », mais un identifiant de run, un lien, une commande.
3. La preuve est **visible** : dans le corps de la PR quand elle est technique (identifiant de run, commentaire d'agent), et dans la section « Preuves » du site public quand elle est destinée au juge.
4. Si une étape ne peut pas être prouvée (geste humain, licence absente), elle est **écrite dans la section « ce qui n'est pas prouvé »**, avec la raison. Une étape non prouvée et non signalée n'existe pas.
