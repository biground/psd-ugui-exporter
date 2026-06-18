# psd-ugui-exporter

PSD/PSB preprocessing tool for AZeRoth UI import experiments.

The current tool reads a PSD or PSB file and writes:

- `manifest.json`
- exported PNG files under `layers/`

## Requirements

- Node.js 20+
- Python 3 for the PSD/PSB fallback backend

Install Node dependencies:

```bash
npm ci
```

Install Python fallback dependencies:

```bash
npm run setup:python
```

## Usage

```bash
npm run preprocess -- /path/to/source.psb --out ./psdexport
```

The output directory contains:

```text
psdexport/
├── manifest.json
└── layers/
    ├── 0001_Background.png
    └── 0002_Icon.png
```

## Manifest

`manifest.json` contains:

- `source`: original file path and file name.
- `document`: source canvas size, color mode, and bit depth.
- `layers`: nested layer tree.
- `flatLayers`: depth-first flattened layer list.

Each layer records:

- `id`
- `name`
- `kind`
- `bounds`
- `sourceBounds`
- `opacity`
- `visible`
- `blendMode`
- `text`
- `image`
- `children`

Text layers are recorded as `kind: "text"` and do not export PNG files. Their
`text` block includes recovered text content and style data when available:

- `value`
- `fontName`
- `fontSize`
- `color`
- `alignment`
- `runs`
- `stroke`

PNG exports are cropped to the alpha channel's non-transparent bounds.
`bounds` stores the exported rectangle in document coordinates, and
`sourceBounds` stores the original layer rectangle before cropping.

## Tests

```bash
npm test
```
