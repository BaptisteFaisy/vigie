# Pipeline — CI, file de merge et agent de conflits

Ce dépôt tourne sur l'infrastructure standard de la flotte : **1 runner
self-hosted sur le r630**, une **file de merge Mergify**, et un **agent de
conflits hermes branché sur InferHub**. Rien ne se pousse directement sur
`main` : le ruleset l'interdit.

## 1. Le runner

| Élément | Valeur |
|---|---|
| Nom | `r630-vigie-01` |
| Hôte | r630 (Debian 13, `baptiste@100.124.18.48`, Tailscale) |
| Labels | `self-hosted`, `Linux`, `X64`, `vigie-worker`, `ci-node` |
| Service | `actions-runner-vigie-01.service` (systemd **utilisateur**, sans sudo, linger actif) |
| Dossier | `~/actions-runner-vigie-01` |

`node`, `npm`, `gh` et `jq` vivent dans `~/bin` sur le r630 : les workflows qui
en ont besoin ajoutent `$HOME/bin` au `PATH` (un garde placé **avant**
`actions/setup-node` échoue en `127` sinon).

Commandes utiles :

```bash
ssh baptiste@100.124.18.48 'systemctl --user status actions-runner-vigie-01'
gh api repos/BaptisteFaisy/vigie/actions/runners \
  --jq '.runners[] | "\(.name) \(.status) busy=\(.busy)"'
```

## 2. Le budget de dépendances — le piège à connaître

L'app installe **1 957 paquets, soit ~420 000 fichiers pour 3,9 Go**. Deux
conséquences mesurées sur le disque du r630 :

- `npm ci` à froid : **11 minutes** ;
- une copie de `node_modules`, même par liens durs (`cp -al`) : **plus de 4 min**.

Les deux font sauter le budget CI de 5 minutes (règle du 24 octobre 2026 : on
n'allonge jamais un timeout, on optimise). La solution retenue :

- les dépendances vivent dans un **magasin chaud** hors du workspace,
  `~/.vigie-ci-deps/<sha256(package-lock.json)>/node_modules` ;
- dans le workspace, `node_modules` est un **lien symbolique** vers ce magasin —
  sa création est instantanée ;
- la construction du magasin se fait **hors CI**, par renommage (`mv`, même
  système de fichiers) : `bash tools/ci-prewarm-deps.sh --hote <runner>`.

> Après toute modification de `package-lock.json`, préchauffer le magasin pour
> le nouveau hash. Sans magasin, la CI retombe sur l'installation à froid,
> dépasse les 5 minutes et échoue — le message d'avertissement le dit.

Résultat mesuré : job `ci` en **105 s** au lieu d'un dépassement de budget.

## 3. Les checks requis

Le ruleset de `main` (`PR obligatoire, checks requis`) exige trois checks, tous
produits sur le runner :

| Check | Workflow | Ce qu'il contrôle |
|---|---|---|
| `ci` | `.github/workflows/ci.yml` | `tsc --noEmit`, `vitest`, gardes de taille (< 500 lignes par fichier, < 50 par fonction), manifeste Forge, YAML des workflows, sanity docs, tests des gardes CI |
| `ci-budget` | `.github/workflows/ci-budget.yml` | aucun job au-delà de 5 min sur les workflows de PR |
| `couche0` | `.github/workflows/couche0.yml` | périmètre déclaré dans le corps de PR + motifs interdits |

S'y ajoutent, non requis : `conflict-resolver`, `pr-auto-merge` (balayeur de
file), `stale-base-guard`, `triage-rouge`, `pages` (site public).

`cancel-in-progress: false` sur les checks requis : **un check annulé bloque la
file** (leçon du 11 novembre 2026).

## 4. Travailler sur le dépôt

1. branche `lot/<sujet>`, commits normaux ;
2. PR vers `main` avec, dans le corps, une section `## Scope` listant **tous**
   les fichiers ou dossiers touchés (la garde `couche0` les compare au diff ;
   toute déclaration inutile est refusée aussi) ;
3. recopier les chemins avec `git -c core.quotepath=off diff --name-only
   origin/main...` — sinon les chemins accentués arrivent échappés et la garde
   ne les reconnaît plus ;
4. ne rien faire d'autre : le balayeur embarque la PR dans la file dès que les
   trois checks sont verts, et Mergify merge en `rebase`.

Modifier un **fichier de garde** (`.github/ci-budget/`, `.github/couche0/`,
`couche0.yml`, `ci.yml`, `ci-native.yml`, `pr-auto-merge.yml`) exige la mention
`SAMVISION_ALLOW_GUARD_BUMP` dans le corps de la PR — en texte libre, jamais
dans une puce du `## Scope`.

Motifs interdits dans les lignes ajoutées, quel que soit le périmètre : prise de
côté forcée d'un conflit, push forcé sans bail, déclencheur à privilèges sur
l'événement de PR tiers, clé d'API ou jeton en clair, `sdk.dir=` en dur, et les
dates antérieures au 26 octobre 2026 (écrire « relevé antérieur, hors de cet
arbre »). La liste exacte est dans `.github/couche0/check_couche0.py`
(`FORBIDDEN_PATTERNS`) — elle n'est pas recopiée ici pour ne pas déclencher la
garde elle-même.

## 5. L'agent de conflits hermes / InferHub

Mergify met en file, met à jour et merge tant que la PR est `CLEAN` ou `BEHIND`.
Ce qu'elle ne sait pas faire, c'est **résoudre un conflit** : une PR `DIRTY`
attend son auteur. Le balayeur `.github/workflows/conflict-resolver.yml` prend
le relais — toutes les 10 minutes, à la fin d'un run de `ci`, et sur demande —
et il réconcilie les deux apports au lieu d'en choisir un :

```bash
gh workflow run conflict-resolver.yml -f pr=<numéro>
```

Chaîne : liste des PR `CONFLICTING` → clone → `rebase` sur `main` → chaque
conflit élémentaire est confié à `.github/inferhub/conflict_agent.py` → push
`--force-with-lease` → commentaire sur la PR → la file reprend.

Le modèle est **`combo/cheap` sur `api.inferhub.dev`** (le compte Fireworks est
suspendu ; le balayeur `pr-auto-merge` garde donc `FIREWORKS_AGENT_RESOLVE=0` —
**un seul résolveur à la fois**).

Garde-fous de l'agent :

- **porte de compilation** : une résolution qui ne compile pas n'est jamais
  poussée ;
- **plafond de saisines** et **cooldown** par PR et par SHA de tête ;
- `REFUSED_PREFIXES` : l'agent ne touche jamais `.github/` ni `.mergify.yml` ;
- les labels `hold` et `intervention-humaine` coupent tout ;
- sans secret `INFERHUB_API_KEY`, le balayeur saute proprement (l'auteur rebase
  à la main) ;
- **normalisation d'URL** : `INFERHUB_BASE_URL` est utilisée comme URL complète
  d'endpoint — base nue, base en `/v1`, slash final ou endpoint complet sont
  tous acceptés (sans ça, chaque résolution mourait en HTTP 404) ;
- **réponse vide** : `combo/cheap` rute vers un modèle de raisonnement ; si tout
  le budget part en `reasoning_content` et que `message.content` est vide,
  l'agent lève une erreur nette au lieu de pousser un fichier vidé ;
- **empreinte libérée sur erreur de transport** : un 404 ou un fournisseur HS ne
  grille plus le cooldown de 20 min pour une raison administrative.

Le push part avec `AUTOMERGE_PAT` (jeton du propriétaire) : un push signé
`github-actions[bot]` met les workflows en `action_required` et la PR reste
`BLOCKED` sans aucun check requis.

### Configuration

| Type | Nom | Valeur |
|---|---|---|
| secret | `INFERHUB_API_KEY` | clé InferHub (jamais affichée) |
| secret | `AUTOMERGE_PAT` | jeton `gh` du propriétaire, réutilisé |
| variable | `INFERHUB_BASE_URL` | `https://api.inferhub.dev/v1/chat/completions` |
| variable | `INFERHUB_MODEL` | `combo/cheap` |
| variable | `INFERHUB_AGENT_RESOLVE` | `1` (coupe-circuit : `0`) |
| variable | `FIREWORKS_AGENT_RESOLVE` | `0` (résolution désactivée) |
| variable | `CI_RUNNER` | `["self-hosted","vigie-worker"]` |
| variable | `MERGIFY_QUEUE` | `1` |

## 6. Dépannage

| Symptôme | Cause probable | Réponse |
|---|---|---|
| `ci` annulé à ~5 min | magasin de dépendances absent pour ce lock | `bash tools/ci-prewarm-deps.sh --hote baptiste@100.124.18.48` |
| jobs `queued` alors que le runner est `online` | un seul worker : un run long occupe la place | attendre, ou vérifier `busy=true` sur le runner |
| PR `DIRTY` qui ne bouge pas | agent en cooldown sur ce SHA | pousser un commit (nouveau SHA) ou `gh workflow run conflict-resolver.yml -f pr=N` |
| `couche0` rouge sur le périmètre | chemins accentués échappés dans le corps | recopier via `git -c core.quotepath=off diff --name-only` |
| checks `cancelled` comptés rouges | `cancel-in-progress: true` sur un check requis | laisser `false` (déjà le cas ici) |
| `Verdict`/`hermes-lite` bloque la PR | deux pilotes de merge | `HERMES_LITE_DRY_RUN` supprimée : Mergify est le seul pilote |
