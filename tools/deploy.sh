#!/usr/bin/env bash
# deploy.sh — déploie les deux apps Forge de Vigie sur un site de démo.
#
# Le déploiement EXIGE un compte Atlassian et `forge login` : c'est un geste
# humain. Ce script ne saisit JAMAIS d'identifiants ; il vérifie la session et
# s'arrête proprement si elle manque (docs/VALIDATIONS.md).
#
# Usage : bash tools/deploy.sh [--app2-seulement]
set -euo pipefail
export LC_ALL=C

die() { echo "ERREUR: $*" >&2; exit 1; }
step() { echo "==> $*"; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

command -v forge >/dev/null 2>&1 || die "la CLI Forge est absente : npm i -g @forge/cli"

step "session Forge"
if ! forge whoami >/dev/null 2>&1; then
  die "pas de session Forge. Lance 'forge login' toi-même (identifiants = geste humain), puis relance."
fi
forge whoami

step "garde-fous avant déploiement"
cd "$ROOT"
npx tsc --noEmit || die "tsc en échec"
node tools/check-manifest.mjs || die "manifest non conforme"
python3 tools/check-file-limits.py || die "garde de taille en échec"

step "App 1 — Vigie (Jira)"
forge deploy

if [ "${1:-}" != "--app2-seulement" ]; then
  step "App 2 — Le graveur (connecteur)"
  cd "$ROOT/graveur"
  forge deploy
fi

step "fait. Ouvre l'écran de couverture sur le site et vérifie qu'il nomme"
step "exactement ce qui manque (droits graphe, licence Goals)."
echo "Voir docs/VALIDATIONS.md pour les 8 points à trancher sur site."
