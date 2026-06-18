# PSD UGUI Exporter Desktop MVP

This directory contains the desktop MVP editor for building `.psdui` layout
descriptions from PSD/PSB source structure. It is a first-stage vertical slice:
the source file is treated as read-only, and the editor does not generate Unity
Prefabs, write PSD/PSB files, or edit visual content.

## Install

Install the editor Node dependencies from this directory:

```bash
npm install
```

Install the Python worker dependencies from the repository root:

```bash
python3 -m pip install --target .python -r requirements.txt
```

If the repository already has a populated `.python` directory, the Python worker
can use that existing dependency folder.

## Run

Run the full Tauri desktop app from this directory:

```bash
npm run tauri dev
```

This requires the Rust toolchain, Tauri CLI support, and platform system
dependencies such as the macOS developer tools/Xcode components required by
Tauri. If you only need to verify the frontend shell, run:

```bash
npm run dev
```

## MVP Flow

1. Click `Open PSD/PSB` and choose a `.psd` or `.psb` file from the native file
   dialog. The source file remains read-only; raster previews are cached under
   the system temp directory. The default `.psdui` and `ui.layout.json` paths
   are derived automatically from the selected source file.
2. In the Source Tree, select one layer or Cmd/Ctrl-select multiple source
   layers.
3. Click `Create Export Node`. When multiple source layers are selected, they
   are merged into one export node instead of creating one node per source
   layer.
4. Use the Inspector to edit `name`, `enabled`, and `exportKind`.
5. To manually mark a node as a list, set `exportKind` to `list` in the
   Inspector, then configure `direction`, `spacing`, `cellTemplateNodeId`, and
   `padding`.
6. Save the `.psdui` file.
7. Export `ui.layout.json`.

Manual path overrides live in `Project Settings`; the main toolbar keeps the
default workflow focused on choosing a source file and editing export semantics.

## Current Boundaries

- The source PSD/PSB file has read-only semantics in this MVP.
- The editor does not write or mutate PSD/PSB files.
- The editor does not edit visual content.
- The first stage does not generate Unity Prefabs.
- The first stage does not handle Unity `.meta` files or GUID assignment.
