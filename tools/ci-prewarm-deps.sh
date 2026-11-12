#!/usr/bin/env bash
# ci-prewarm-deps.sh — préchauffe le magasin de dépendances de la CI sur un
# runner self-hosted (r630), pour que le job `ci` tienne son budget de 5 min.
#
# Pourquoi un script et pas un `npm ci` dans la CI : ce dépôt installe 1 957
# paquets, soit ~420 000 fichiers pour 3,9 Go. À froid, `npm ci` prend ~11 min
# et une copie (même par liens durs) dépasse 4 min — les deux font sauter le
# budget de 5 minutes (règle user du 24 octobre 2026). La CI ne fait donc
# qu'un LIEN SYMBOLIQUE vers un magasin déjà chaud, clé = sha256 du lockfile.
#
# Usage (sur le runner, ou depuis un poste qui y a accès) :
#   bash tools/ci-prewarm-deps.sh              # magasin pour le lock courant
#   bash tools/ci-prewarm-deps.sh --hote r630  # via ssh (hôte au choix)
#
# À lancer après toute modification de package-lock.json : sans magasin pour le
# nouveau hash, la CI retombe sur l'installation à froid et échoue au budget.
set -euo pipefail
export LC_ALL=C

HOTE=
while [ $# -gt 0 ]; do
  case "$1" in
    --hote) HOTE="$2"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "option inconnue : $1" >&2; exit 1 ;;
  esac
done

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_HASH="$(sha256sum "$RACINE/package-lock.json" | cut -d' ' -f1)"
echo "lock hash : $LOCK_HASH"

if [ -n "$HOTE" ]; then
  # Le dépôt distant n'est pas nécessaire : seuls package.json et le lockfile
  # servent à construire le magasin. On les copie, on installe, on range.
  DIST="$HOME/.vigie-ci-deps/$LOCK_HASH"
  ssh -o BatchMode=yes "$HOTE" "mkdir -p /tmp/vigie-prewarm-$LOCK_HASH"
  scp -q "$RACINE/package.json" "$RACINE/package-lock.json" \
    "$HOTE:/tmp/vigie-prewarm-$LOCK_HASH/"
  ssh -o BatchMode=yes "$HOTE" bash -s "$DIST" "$LOCK_HASH" <<'EOF'
set -euo pipefail
DIST="$1"; HASH="$2"
export PATH="$HOME/bin:$PATH"
export NPM_CONFIG_CACHE="$HOME/.npm-ci-cache"
TRAVAIL="/tmp/vigie-prewarm-$HASH"
mkdir -p "$DIST"
cd "$TRAVAIL"
if [ -d "$DIST/node_modules" ]; then
  echo "magasin deja present : $DIST/node_modules"
else
  npm ci --prefer-offline --no-audit --no-fund
  printf '%s' "$HASH" > "node_modules/.vigie-lock-hash"
  # `mv` sur le même système de fichiers = renommage instantané (jamais de
  # copie : 420 000 fichiers).
  mv node_modules "$DIST/node_modules"
  echo "magasin alimente : $DIST/node_modules"
fi
rm -rf "$TRAVAIL"
EOF
  echo "PRECHAUFFE-OK sur $HOTE"
  exit 0
fi

# Mode local : on est déjà sur le runner.
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$HOME/.npm-ci-cache}"
DIST="$HOME/.vigie-ci-deps/$LOCK_HASH"
if [ -d "$DIST/node_modules" ]; then
  echo "magasin deja present : $DIST/node_modules"
  exit 0
fi
mkdir -p "$DIST"
TRAVAIL="$(mktemp -d)"
cp "$RACINE/package.json" "$RACINE/package-lock.json" "$TRAVAIL/"
cd "$TRAVAIL"
npm ci --prefer-offline --no-audit --no-fund
printf '%s' "$LOCK_HASH" > "node_modules/.vigie-lock-hash"
mv node_modules "$DIST/node_modules"
cd / && rm -rf "$TRAVAIL"
echo "PRECHAUFFE-OK : $DIST/node_modules"
