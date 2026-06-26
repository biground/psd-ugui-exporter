---
name: package-psdui-release
description: Build and verify the real PSD UGUI Exporter Tauri GUI release package. Use when the user says 打包, release 包, 发版, 构建安装包, 生成 macOS .app, 双击可用 app, or asks whether the PSD/PSB annotation tool package is out-of-box and should include the actual UI rather than a CLI wrapper.
---

# Package PSD UI Release

## Core Rule

Package the actual Tauri editor UI, not the root CLI exporter and not a thin file-picker wrapper.

The real GUI app currently lives under `editor/` when present, otherwise under `.worktrees/ai-psdui-tauri-mvp/editor/`. It contains `src-tauri/tauri.conf.json` and builds `PSD UGUI Exporter.app`.

## macOS Workflow

1. Confirm the request target. If the user only says "打包", default to macOS `.app` for the current machine and say so briefly.
2. Use `scripts/package_macos_app.sh` from this skill unless the user asks for a different target.
3. Do not leave stale extracted apps or old zips in `release/`.
4. Report the final zip path, zip size, extracted `.app` size, and validation commands.

Run:

```bash
bash .codex/skills/package-psdui-release/scripts/package_macos_app.sh
```

Optional launch smoke test:

```bash
SMOKE_LAUNCH=1 bash .codex/skills/package-psdui-release/scripts/package_macos_app.sh
```

## Verification Expectations

The package is not done until the script verifies:

- `npm run typecheck`
- `npm test`
- `cargo test`
- `npm run tauri -- build --bundles app`
- zip integrity with `unzip -tqq`
- final zip extraction into a temp directory
- bundled `python-runtime` can import `psd_tools`
- optional app launch smoke test when `SMOKE_LAUNCH=1`

If any step fails, debug the root cause before claiming the package is ready.

## Size Notes

Tauri itself is small. A large `.app` is expected when shipping the Python PSD parser stack out of the box:

- Tauri binary is roughly single-digit MB.
- Frontend assets are tiny.
- Most size comes from bundled `python-runtime` and `python-packages`, especially `scipy`, `skimage`, `numpy`, and `PIL`.

Do not remove `scipy` or `skimage` just to reduce size unless you also verify PSD opening/compositing paths that use `psd_tools.composite`.
