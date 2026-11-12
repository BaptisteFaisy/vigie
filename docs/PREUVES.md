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

## Ce qui n'est **pas** prouvé

| # | Étape | Ce qui manque | Pourquoi |
|---|---|---|---|
| 23 | Déploiement sur un site Atlassian | un compte + `forge login` | geste humain : je ne saisis pas d'identifiants sans demande explicite |
| 24 | Les 8 validations du §22 | le même site (droits `read:graph:*`, `AtlassianGoal`, indexation Rovo, écriture Confluence) | ces points ne se tranchent que sur un site réel |
| 25 | Vidéo de 5 min et soumission Devpost | un plan de tournage et la soumission | `docs/DEVPOST.md` est écrit ; l'échéance est le 22 décembre |

## Ajouter une preuve

1. Chaque étape, une ligne dans ce registre : **étape**, **preuve**, **comment vérifier**, **statut**.
2. La preuve doit être **rejouable par un tiers** : pas « ça marche », mais un identifiant de run, un lien, une commande.
3. La preuve est **visible** : dans le corps de la PR quand elle est technique (identifiant de run, commentaire d'agent), et dans la section « Preuves » du site public quand elle est destinée au juge.
4. Si une étape ne peut pas être prouvée (geste humain, licence absente), elle est **écrite dans la section « ce qui n'est pas prouvé »**, avec la raison. Une étape non prouvée et non signalée n'existe pas.
