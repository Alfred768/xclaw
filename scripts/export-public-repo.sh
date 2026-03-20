#!/usr/bin/env bash
set -euo pipefail

PRIVATE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_ROOT=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      PRIVATE_ROOT="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      PUBLIC_ROOT="$1"
      shift
      ;;
  esac
done

if [[ -z "$PUBLIC_ROOT" ]]; then
  echo "Usage: scripts/export-public-repo.sh [--source /path/to/private] [--dry-run] /path/to/public"
  exit 1
fi

PRIVATE_REAL="$(realpath "$PRIVATE_ROOT")"

# Ensure the destination exists so realpath does not fail on missing paths.
mkdir -p "$PUBLIC_ROOT"
PUBLIC_REAL="$(realpath "$PUBLIC_ROOT")"

if [[ "$PUBLIC_REAL" == "/" ]]; then
  echo "Refusing to export to /"
  exit 2
fi

if [[ "$PUBLIC_REAL" == "$PRIVATE_REAL" ]]; then
  echo "Refusing to export into the private repo root"
  exit 2
fi

if [[ "$PUBLIC_REAL" == "$PRIVATE_REAL/"* || "$PRIVATE_REAL" == "$PUBLIC_REAL/"* ]]; then
  echo "Refusing to export when public/private paths are nested"
  exit 2
fi

RSYNC_ARGS=(-av --delete)
if [[ "$DRY_RUN" -eq 1 ]]; then
  RSYNC_ARGS+=(--dry-run)
fi

rsync "${RSYNC_ARGS[@]}" \
  --exclude ".git" \
  --exclude "supabase" \
  --exclude "alipay-auth" \
  --exclude "auth-site" \
  --exclude "docs/alipay_login.md" \
  --exclude "docs/yunwu-api.md" \
  --exclude "docs/DATABASE_MIGRATION_GUIDE.md" \
  --exclude "docs/avatar_feature.md" \
  --exclude "docs/superpowers" \
  --exclude "Keys" \
  --exclude ".env*" \
  --exclude "scripts/test-*.sh" \
  --exclude "scripts/migrate-*.sh" \
  --exclude "scripts/migrate-*.mjs" \
  --exclude "plan.txt" \
  --exclude ".impeccable.md" \
  "$PRIVATE_REAL/" "$PUBLIC_REAL/"
