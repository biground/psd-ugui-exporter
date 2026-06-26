#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
VERSION="${VERSION:-0.1.0}"
APP_NAME="PSD UGUI Exporter.app"
ZIP_NAME="psd-ugui-exporter-v${VERSION}-macos-arm64-app.zip"
RELEASE_DIR="$ROOT_DIR/release"
ZIP_PATH="$RELEASE_DIR/$ZIP_NAME"
SHA_PATH="$RELEASE_DIR/SHA256SUMS.txt"

find_editor_dir() {
  if [[ -f "$ROOT_DIR/editor/src-tauri/tauri.conf.json" ]]; then
    printf '%s\n' "$ROOT_DIR/editor"
    return 0
  fi

  if [[ -f "$ROOT_DIR/.worktrees/ai-psdui-tauri-mvp/editor/src-tauri/tauri.conf.json" ]]; then
    printf '%s\n' "$ROOT_DIR/.worktrees/ai-psdui-tauri-mvp/editor"
    return 0
  fi

  local candidate
  candidate="$(find "$ROOT_DIR/.worktrees" -path '*/editor/src-tauri/tauri.conf.json' -print -quit 2>/dev/null || true)"
  if [[ -n "$candidate" ]]; then
    dirname "$(dirname "$candidate")"
    return 0
  fi

  return 1
}

EDITOR_DIR="$(find_editor_dir)" || {
  echo "Could not find the Tauri editor project. Expected editor/src-tauri/tauri.conf.json." >&2
  exit 1
}

TAURI_DIR="$EDITOR_DIR/src-tauri"
BUNDLE_DIR="$TAURI_DIR/target/release/bundle/macos"
APP_PATH="$BUNDLE_DIR/$APP_NAME"

require_path() {
  if [[ ! -e "$1" ]]; then
    echo "Missing required path: $1" >&2
    exit 1
  fi
}

require_path "$TAURI_DIR/python/psd_worker.py"
require_path "$TAURI_DIR/python-runtime/bin/python3"
require_path "$TAURI_DIR/python-packages/psd_tools"

echo "Editor: $EDITOR_DIR"
echo "Release: $ZIP_PATH"

(cd "$EDITOR_DIR" && npm run typecheck)
(cd "$EDITOR_DIR" && npm test)
(cd "$TAURI_DIR" && cargo test)
(cd "$EDITOR_DIR" && npm run tauri -- build --bundles app)

require_path "$APP_PATH/Contents/MacOS/psdui-editor"
require_path "$APP_PATH/Contents/Resources/python-runtime/bin/python3"
require_path "$APP_PATH/Contents/Resources/python-packages/psd_tools"

mkdir -p "$RELEASE_DIR"
rm -f "$ZIP_PATH" "$SHA_PATH"
find "$RELEASE_DIR" -maxdepth 1 -name 'PSD UGUI Exporter.app' -exec rm -rf {} +

(cd "$BUNDLE_DIR" && ditto -c -k --sequesterRsrc --keepParent "$APP_NAME" "$ZIP_PATH")
(cd "$ROOT_DIR" && shasum -a 256 "release/$ZIP_NAME" > "$SHA_PATH")
(cd "$ROOT_DIR" && unzip -tqq "release/$ZIP_NAME")

CHECK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/psdui-release-check.XXXXXX")"
trap 'rm -rf "$CHECK_DIR"' EXIT
unzip -q "$ZIP_PATH" -d "$CHECK_DIR"

CHECK_APP="$CHECK_DIR/$APP_NAME"
PYTHON_HOME="$CHECK_APP/Contents/Resources/python-runtime"
PYTHON_PACKAGES="$CHECK_APP/Contents/Resources/python-packages"

plutil -lint "$CHECK_APP/Contents/Info.plist"
env PYTHONHOME="$PYTHON_HOME" PYTHONPATH="$PYTHON_PACKAGES" \
  "$PYTHON_HOME/bin/python3" -c 'from psd_tools import PSDImage; print("psd_tools ok")'

if [[ "${SMOKE_LAUNCH:-0}" == "1" ]]; then
  open -n "$CHECK_APP"
  sleep 2
  pgrep -fl "$CHECK_APP/Contents/MacOS/psdui-editor"
  pkill -f "$CHECK_APP/Contents/MacOS/psdui-editor" || true
fi

du -sh "$ZIP_PATH" "$CHECK_APP"
cat "$SHA_PATH"
