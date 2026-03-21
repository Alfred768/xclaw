#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_ROOT="${ROOT}-public"
BUMP="patch"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --public-root)
      PUBLIC_ROOT="$2"
      shift 2
      ;;
    --bump)
      BUMP="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "--bump must be patch|minor|major"
  exit 1
fi

cd "$ROOT"

echo "[1/9] Installing deps..."
pnpm install

echo "[2/9] Bumping version ($BUMP)..."
pnpm version "$BUMP" --no-git-tag-version
VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"

echo "[3/9] Committing private repo..."
git add -A
git commit -m "chore: release ${TAG}"

echo "[4/9] Building mac + win..."
pnpm run uv:download:mac
pnpm run uv:download:win
pnpm run package:mac
pnpm run package:win

echo "[5/9] Preparing public repo workspace..."
if [[ ! -d "$PUBLIC_ROOT/.git" ]]; then
  git clone https://github.com/Alfred768/xclaw.git "$PUBLIC_ROOT"
fi

echo "[6/9] Exporting public repo..."
./scripts/export-public-repo.sh --source "$ROOT" "$PUBLIC_ROOT"

echo "[7/9] Updating public repo..."
pushd "$PUBLIC_ROOT" >/dev/null
git pull origin main --no-rebase --allow-unrelated-histories || true
if git diff --name-only --diff-filter=U | rg -q .; then
  git checkout --ours -- .
fi
git add -A
git commit -m "chore: release ${TAG}" || true
git tag -f "$TAG"
git push origin main
git push origin "$TAG" --force
popd >/dev/null

echo "[8/9] Tagging + pushing private repo..."
git tag -f "$TAG"
git push origin main
git push origin "$TAG" --force

echo "[9/9] Creating releases..."
gh release create "$TAG" \
  --repo Alfred768/ClawX \
  --title "$TAG" \
  --generate-notes \
  release/XClaw-"$VERSION"-mac-x64.dmg \
  release/XClaw-"$VERSION"-mac-x64.dmg.blockmap \
  release/XClaw-"$VERSION"-mac-x64.zip \
  release/XClaw-"$VERSION"-mac-x64.zip.blockmap \
  release/XClaw-"$VERSION"-mac-arm64.dmg \
  release/XClaw-"$VERSION"-mac-arm64.dmg.blockmap \
  release/XClaw-"$VERSION"-mac-arm64.zip \
  release/XClaw-"$VERSION"-mac-arm64.zip.blockmap \
  release/XClaw-"$VERSION"-win.exe \
  release/XClaw-"$VERSION"-win.exe.blockmap \
  release/XClaw-"$VERSION"-win-x64.exe \
  release/XClaw-"$VERSION"-win-x64.exe.blockmap \
  release/XClaw-"$VERSION"-win-arm64.exe \
  release/XClaw-"$VERSION"-win-arm64.exe.blockmap \
  release/latest-mac.yml \
  release/latest.yml

gh release create "$TAG" \
  --repo Alfred768/xclaw \
  --title "$TAG" \
  --generate-notes \
  release/XClaw-"$VERSION"-mac-x64.dmg \
  release/XClaw-"$VERSION"-mac-x64.dmg.blockmap \
  release/XClaw-"$VERSION"-mac-x64.zip \
  release/XClaw-"$VERSION"-mac-x64.zip.blockmap \
  release/XClaw-"$VERSION"-mac-arm64.dmg \
  release/XClaw-"$VERSION"-mac-arm64.dmg.blockmap \
  release/XClaw-"$VERSION"-mac-arm64.zip \
  release/XClaw-"$VERSION"-mac-arm64.zip.blockmap \
  release/XClaw-"$VERSION"-win.exe \
  release/XClaw-"$VERSION"-win.exe.blockmap \
  release/XClaw-"$VERSION"-win-x64.exe \
  release/XClaw-"$VERSION"-win-x64.exe.blockmap \
  release/XClaw-"$VERSION"-win-arm64.exe \
  release/XClaw-"$VERSION"-win-arm64.exe.blockmap \
  release/latest-mac.yml \
  release/latest.yml

echo "Done. Released ${TAG} to private + public."
