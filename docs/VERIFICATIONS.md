# Preuves

Chaque étape du projet a **une preuve vérifiable**, pas une affirmation.
Ce ledger est régénéré par `npm run verify` : il rejoue les contrôles et note
la sortie réellement observée. Le site public affiche la même chose, en direct,
dans la section « Preuves » : les 15 outils MCP y sont réellement exécutés
dans votre navigateur, et chaque contrôle affiche sa preuve brute.

Dernière vérification : **2026-11-12 20:17** · commit `b58fee5` · **9/9** contrôles réussis

| Contrôle | Verdict | Preuve observée |
|---|---|---|
| Tests unitaires + recette §25 | ✅ | `   Duration  9.06s (transform 8.16s, setup 0ms, collect 22.85s, tests 2.80s, environment 30ms, prepare 15.23s)` |
| Fichiers < 500 lignes | ✅ | `OK : tous les fichiers tiennent dans la limite.` |
| Fonctions < 50 lignes | ✅ | `82 fichier(s) contrôlé(s) [AST TypeScript], 0 fonction(s) hors limite (50 lignes)` |
| Manifeste conforme (schéma, 15 actions, 15 outils) | ✅ | `OK — manifest conforme (schéma conforme, 15 actions, 15 outils MCP, 23 fonctions, parseur YAML yaml).` |
| Syntaxe des 10 modules du site | ✅ | `10 modules analysés, 0 erreur` |
| Site public — page principale | ✅ | `HTTP 200 · 12719 octets · https://tradoooo.github.io/vigie` |
| Site public — payload des données | ✅ | `HTTP 200 · source=jira:one-atlas-cndz.atlassian.net · 8 objectifs · 150 fantômes` |
| Site public — VG-21 (aucune identité publiée) | ✅ | `0 clé d’identité dans 79092 octets` |
| Site public — moteur embarqué | ✅ | `HTTP 200 · 66501 octets · global Vigie présent` |

## Historique

- 2026-11-12 20:17 · 9/9 · `b58fee5`
- 2026-11-12 17:21 · 9/9 · `f600a6b`
