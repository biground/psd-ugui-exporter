# PSDUI Tauri MVP 实施计划

> **给 AI 智能体工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施此计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 在现有 `psd-ugui-exporter` 基础上新增独立 Tauri 桌面客户端，跑通 PSD/PSB 只读解析、source tree、`.psdui` 工程保存、export node 创建和 `ui.layout.json` 导出的 MVP 垂直切片。

**架构：** 采用方案 B：新增 `editor/` Tauri 应用，保留现有 Node CLI 和测试作为回归基线。Rust 负责桌面命令、文件 IO 和 Python worker 调用；Python `psd-tools` 负责只读解析 PSD/PSB 和 alpha 裁剪资产；TypeScript 负责编辑器状态、source/export tree 转换、`.psdui` 和 layout schema。

**技术栈：** Tauri + Rust + TypeScript + Vite + React + Python `psd-tools`。第一阶段不生成 Unity Prefab、不处理 `.meta`/GUID/Prefab YAML、不编辑 Photoshop 源内容。

---

## 证据与约束

- 父项目规则：`/Volumes/ExtremeSSD/WorkSpace/azeroth-client/AGENTS.md` 要求先读规则、保留 Unity 2022.3.62f3 边界、避免无关 Unity 资产改动。
- 当前工具：`src/cli.js` 调 `src/preprocess.js`，输出 `manifest.json` 与 `layers/*.png`。
- Python fallback：`src/psd_tools_backend.py` 已能读取 PSD/PSB、文本 runs、字体、字号、颜色、对齐和描边，并保存 alpha 裁剪 PNG。
- 当前 bounds 语义：`bounds` 是 alpha 裁剪后的图片矩形，`sourceBounds` 是图层原始矩形；MVP 要升级命名为 `rasterBounds` 与 `rect` 的明确分离。
- UI/Unity 后续约束：`Docs/Module/界面/UI.md`、`skills/azeroth-client/references/node-tree-debug.md`、`skills/azeroth-client/references/scroller-list.md` 说明后续 Bridge 需要稳定节点名、`Btn`/`E_`/`r_` 命名和 list/EnhancedScroller 信息，但第一阶段只导出语义 JSON。
- 基线验证：`npm test` 当前通过 15 个 Node 测试和 1 个 Python 测试。

## 文件结构

```text
Tools/psd-ugui-exporter/
├── src/                              # 保留现有 Node CLI
├── test/                             # 保留现有 Node/Python 回归测试
├── editor/
│   ├── package.json                  # Tauri/Vite/React 脚本
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx                  # React 入口
│   │   ├── app/App.tsx               # 三栏 shell 和命令编排
│   │   ├── app/state.ts              # MVP 内存状态 reducer
│   │   ├── components/SourceTree.tsx # 只读 source tree
│   │   ├── components/ExportTree.tsx # export tree 和节点选择
│   │   ├── components/CanvasPreview.tsx
│   │   ├── components/Inspector.tsx
│   │   ├── domain/source-tree.ts     # visible/default export 过滤
│   │   ├── domain/export-tree.ts     # 创建/合并/重命名/exportKind/list
│   │   ├── domain/layout-export.ts   # `.psdui` -> `ui.layout.json`
│   │   ├── domain/rect.ts            # union rect/bounds 工具
│   │   └── schemas/
│   │       ├── source.ts             # SourceDocument/SourceLayer 类型
│   │       ├── psdui.ts              # PSDUIProject/ExportNode 类型
│   │       └── layout.ts             # UILayoutDocument 类型
│   ├── tests/
│   │   ├── export-tree.test.ts
│   │   ├── layout-export.test.ts
│   │   └── source-tree.test.ts
│   └── src-tauri/
│       ├── Cargo.toml
│       ├── tauri.conf.json
│       ├── src/main.rs
│       ├── src/commands.rs           # open_psd/save_project/export_layout
│       ├── src/project_io.rs         # JSON 读写
│       ├── src/python_worker.rs      # 调 Python worker
│       ├── tests/project_io_test.rs
│       └── python/psd_worker.py      # 新 worker，先从现有 backend 迁移
└── docs/superpowers/plans/2026-06-18-psdui-tauri-mvp.md
```

## 数据契约

Source layer 只读：

```ts
export interface SourceLayer {
  id: number;
  name: string;
  kind: 'group' | 'image' | 'text' | 'pixel' | string;
  visible: boolean;
  opacity: number;
  blendMode: string | null;
  sourceBounds: Rect;
  rasterBounds: Rect;
  image: { path: string; width: number; height: number } | null;
  text: SourceText | null;
  children: SourceLayer[];
}
```

`.psdui` 工程：

```ts
export interface PSDUIProject {
  version: 1;
  source: { path: string; fileName: string };
  document: { width: number; height: number };
  sourceTree: SourceLayer[];
  exportTree: ExportNode[];
  cache: { assetsDir: string };
}
```

Export node 可编辑组织和语义，不编辑视觉内容：

```ts
export interface ExportNode {
  id: string;
  name: string;
  exportKind: 'group' | 'image' | 'text' | 'button' | 'list';
  enabled: boolean;
  sourceLayerIds: number[];
  rect: Rect;
  rasterBounds: Rect | null;
  list: ListSettings | null;
  children: ExportNode[];
}
```

Layout 导出：

```ts
export interface UILayoutDocument {
  version: 1;
  document: { width: number; height: number };
  nodes: UILayoutNode[];
}
```

## 任务 1：创建 TypeScript schema 与纯 domain 测试

**文件：**
- 创建：`editor/package.json`
- 创建：`editor/tsconfig.json`
- 创建：`editor/src/schemas/source.ts`
- 创建：`editor/src/schemas/psdui.ts`
- 创建：`editor/src/schemas/layout.ts`
- 创建：`editor/src/domain/rect.ts`
- 创建：`editor/src/domain/export-tree.ts`
- 创建：`editor/tests/export-tree.test.ts`

- [ ] **步骤 1：写失败测试**

在 `editor/tests/export-tree.test.ts` 写：

```ts
import { describe, expect, it } from 'vitest';
import { createExportNodeFromSources } from '../src/domain/export-tree';
import type { SourceLayer } from '../src/schemas/source';

const sourceLayers: SourceLayer[] = [
  {
    id: 1,
    name: '按钮底',
    kind: 'image',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    sourceBounds: { x: 10, y: 20, width: 100, height: 60 },
    rasterBounds: { x: 15, y: 24, width: 90, height: 50 },
    image: { path: 'layers/0001_button.png', width: 90, height: 50 },
    text: null,
    children: [],
  },
  {
    id: 2,
    name: '按钮文字',
    kind: 'text',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    sourceBounds: { x: 40, y: 36, width: 50, height: 20 },
    rasterBounds: { x: 40, y: 36, width: 50, height: 20 },
    image: null,
    text: { value: '确认' },
    children: [],
  },
];

describe('createExportNodeFromSources', () => {
  it('separates export rect from raster bounds for merged layers', () => {
    const node = createExportNodeFromSources({
      id: 'node_1',
      name: 'BtnConfirm',
      exportKind: 'button',
      sourceLayers,
    });

    expect(node.sourceLayerIds).toEqual([1, 2]);
    expect(node.rect).toEqual({ x: 10, y: 20, width: 100, height: 60 });
    expect(node.rasterBounds).toEqual({ x: 15, y: 24, width: 90, height: 50 });
    expect(node.enabled).toBe(true);
    expect(node.children).toEqual([]);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
cd editor
npm test -- export-tree.test.ts
```

预期：FAIL，提示找不到 `vitest`、schema 文件或 `createExportNodeFromSources`。

- [ ] **步骤 3：添加最小 TS 工程配置**

`editor/package.json`：

```json
{
  "name": "psdui-editor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "tauri": "tauri",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tauri-apps/api": "^2.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

`editor/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "tests"]
}
```

- [ ] **步骤 4：添加 schema 与实现**

`editor/src/schemas/source.ts`：

```ts
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SourceText {
  value: string;
  fontName?: string | null;
  fontSize?: number | null;
  color?: unknown;
  alignment?: unknown;
  runs?: unknown[];
  stroke?: unknown;
}

export interface SourceLayer {
  id: number;
  name: string;
  kind: 'group' | 'image' | 'text' | 'pixel' | string;
  visible: boolean;
  opacity: number;
  blendMode: string | null;
  sourceBounds: Rect;
  rasterBounds: Rect;
  image: { path: string; width: number; height: number } | null;
  text: SourceText | null;
  children: SourceLayer[];
}
```

`editor/src/schemas/psdui.ts`：

```ts
import type { Rect, SourceLayer } from './source';

export type ExportKind = 'group' | 'image' | 'text' | 'button' | 'list';

export interface ListSettings {
  direction: 'horizontal' | 'vertical';
  cellTemplateNodeId: string | null;
  spacing: number;
  padding: { left: number; right: number; top: number; bottom: number };
}

export interface ExportNode {
  id: string;
  name: string;
  exportKind: ExportKind;
  enabled: boolean;
  sourceLayerIds: number[];
  rect: Rect;
  rasterBounds: Rect | null;
  list: ListSettings | null;
  children: ExportNode[];
}

export interface PSDUIProject {
  version: 1;
  source: { path: string; fileName: string };
  document: { width: number; height: number };
  sourceTree: SourceLayer[];
  exportTree: ExportNode[];
  cache: { assetsDir: string };
}
```

`editor/src/schemas/layout.ts`：

```ts
import type { ExportKind, ListSettings } from './psdui';
import type { Rect } from './source';

export interface UILayoutNode {
  id: string;
  name: string;
  exportKind: ExportKind;
  rect: Rect;
  rasterBounds: Rect | null;
  sourceLayerIds: number[];
  list: ListSettings | null;
  children: UILayoutNode[];
}

export interface UILayoutDocument {
  version: 1;
  document: { width: number; height: number };
  nodes: UILayoutNode[];
}
```

`editor/src/domain/rect.ts`：

```ts
import type { Rect } from '../schemas/source';

export function unionRects(rects: Rect[]): Rect {
  if (rects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width;
  let maxY = rects[0].y + rects[0].height;

  for (let i = 1; i < rects.length; i += 1) {
    const rect = rects[i];
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
```

`editor/src/domain/export-tree.ts`：

```ts
import type { ExportKind, ExportNode } from '../schemas/psdui';
import type { SourceLayer } from '../schemas/source';
import { unionRects } from './rect';

export function createExportNodeFromSources({
  id,
  name,
  exportKind,
  sourceLayers,
}: {
  id: string;
  name: string;
  exportKind: ExportKind;
  sourceLayers: SourceLayer[];
}): ExportNode {
  const imageLayers = sourceLayers.filter((layer) => layer.image !== null);

  return {
    id,
    name,
    exportKind,
    enabled: true,
    sourceLayerIds: sourceLayers.map((layer) => layer.id),
    rect: unionRects(sourceLayers.map((layer) => layer.sourceBounds)),
    rasterBounds: imageLayers.length > 0
      ? unionRects(imageLayers.map((layer) => layer.rasterBounds))
      : null,
    list: exportKind === 'list'
      ? {
          direction: 'vertical',
          cellTemplateNodeId: null,
          spacing: 0,
          padding: { left: 0, right: 0, top: 0, bottom: 0 },
        }
      : null,
    children: [],
  };
}
```

- [ ] **步骤 5：运行测试和类型检查**

运行：

```bash
cd editor
npm install
npm test -- export-tree.test.ts
npm run typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 6：提交**

```bash
git add editor/package.json editor/package-lock.json editor/tsconfig.json editor/src editor/tests
git commit -m "feat(psdui编辑器): 新增导出节点领域模型"
```

## 任务 2：新增 Python source worker

**文件：**
- 创建：`editor/src-tauri/python/psd_worker.py`
- 创建：`editor/src-tauri/python/psd_worker_test.py`
- 参考：`src/psd_tools_backend.py`

- [ ] **步骤 1：写失败测试**

在 `editor/src-tauri/python/psd_worker_test.py` 写：

```py
import tempfile
import unittest
from pathlib import Path

from PIL import Image
import psd_worker


class FakeImageLayer:
    kind = "pixel"
    name = "Icon"
    bbox = (10, 20, 14, 24)
    opacity = 255
    visible = True
    blend_mode = "normal"

    def is_group(self):
        return False

    def composite(self):
        image = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
        image.putpixel((1, 1), (255, 0, 0, 255))
        image.putpixel((2, 1), (255, 0, 0, 255))
        return image


class PsdWorkerTest(unittest.TestCase):
    def test_convert_layer_outputs_source_and_raster_bounds(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            state = {"layer_index": 0, "used_asset_names": set()}
            layer = psd_worker.convert_layer(
                FakeImageLayer(),
                Path(temp_dir) / "layers",
                "layers",
                state,
            )

            self.assertEqual(layer["kind"], "image")
            self.assertEqual(layer["sourceBounds"], {"x": 10, "y": 20, "width": 4, "height": 4})
            self.assertEqual(layer["rasterBounds"], {"x": 11, "y": 21, "width": 2, "height": 1})
            self.assertEqual(layer["image"]["path"], "layers/0001_Icon.png")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
PYTHONPATH=.python:editor/src-tauri/python python3 -m unittest editor/src-tauri/python/psd_worker_test.py
```

预期：FAIL，提示找不到 `psd_worker` 或 `convert_layer`。

- [ ] **步骤 3：实现 worker 最小解析接口**

从 `src/psd_tools_backend.py` 复制必要函数到 `editor/src-tauri/python/psd_worker.py`，并做这些定向调整：

```py
def resolve_layer_kind(layer, text, is_group):
    if is_group:
        return "group"
    if text is not None:
        return "text"
    return "image"
```

`convert_layer` 返回字段必须包含：

```py
return {
    "id": layer_id,
    "name": layer.name or f"Layer {layer_id}",
    "kind": resolve_layer_kind(layer, text, is_group),
    "sourceBounds": source_bounds,
    "rasterBounds": raster_bounds,
    "opacity": normalize_opacity(getattr(layer, "opacity", 255)),
    "visible": bool(getattr(layer, "visible", True)),
    "blendMode": str(getattr(layer, "blend_mode", "")) or None,
    "text": text,
    "image": image,
    "children": children,
}
```

CLI 参数：

```text
--source <file.psd|file.psb>
--out <cache-dir>
--assets-dir layers
```

stdout 输出完整 JSON，包含：

```json
{
  "version": 1,
  "source": { "path": "...", "fileName": "..." },
  "document": { "width": 0, "height": 0 },
  "assetsDir": "layers",
  "sourceTree": []
}
```

- [ ] **步骤 4：运行 Python 测试**

运行：

```bash
PYTHONPATH=.python:editor/src-tauri/python python3 -m unittest editor/src-tauri/python/psd_worker_test.py
PYTHONPATH=.python python3 -m unittest discover -s test -p '*_test.py'
```

预期：两个命令 PASS。

- [ ] **步骤 5：提交**

```bash
git add editor/src-tauri/python/psd_worker.py editor/src-tauri/python/psd_worker_test.py
git commit -m "feat(psdui编辑器): 新增 PSD 只读解析 worker"
```

## 任务 3：Rust Tauri 命令与工程 IO

**文件：**
- 创建：`editor/src-tauri/Cargo.toml`
- 创建：`editor/src-tauri/tauri.conf.json`
- 创建：`editor/src-tauri/src/main.rs`
- 创建：`editor/src-tauri/src/commands.rs`
- 创建：`editor/src-tauri/src/project_io.rs`
- 创建：`editor/src-tauri/src/python_worker.rs`
- 创建：`editor/src-tauri/tests/project_io_test.rs`

- [ ] **步骤 1：写失败测试**

在 `editor/src-tauri/tests/project_io_test.rs` 写：

```rust
use psdui_editor::project_io::{read_json_file, write_json_file};
use serde_json::json;

#[test]
fn writes_and_reads_pretty_json() {
    let temp_dir = tempfile::tempdir().unwrap();
    let file_path = temp_dir.path().join("sample.psdui");
    let value = json!({"version": 1, "exportTree": []});

    write_json_file(&file_path, &value).unwrap();
    let loaded = read_json_file(&file_path).unwrap();

    assert_eq!(loaded, value);
}
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
cd editor/src-tauri
cargo test
```

预期：FAIL，提示缺少 crate、module 或函数。

- [ ] **步骤 3：添加 Cargo 与模块**

`editor/src-tauri/Cargo.toml`：

```toml
[package]
name = "psdui-editor"
version = "0.1.0"
edition = "2021"

[lib]
name = "psdui_editor"
path = "src/lib.rs"

[[bin]]
name = "psdui-editor"
path = "src/main.rs"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri = { version = "2", features = [] }
thiserror = "2"

[dev-dependencies]
tempfile = "3"
```

`editor/src-tauri/tauri.conf.json`：

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "PSDUI Editor",
  "version": "0.1.0",
  "identifier": "com.azeroth.psdui-editor",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "PSDUI Editor",
        "width": 1280,
        "height": 800,
        "resizable": true
      }
    ]
  }
}
```

`editor/src-tauri/src/lib.rs`：

```rust
pub mod commands;
pub mod project_io;
pub mod python_worker;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::open_psd,
            commands::save_project,
            commands::export_layout
        ])
        .run(tauri::generate_context!())
        .expect("error while running psdui editor");
}
```

`editor/src-tauri/src/project_io.rs`：

```rust
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::Path;

pub fn write_json_file(path: &Path, value: &impl Serialize) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let text = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
    fs::write(path, format!("{text}\n")).map_err(|error| error.to_string())
}

pub fn read_json_file(path: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&text).map_err(|error| error.to_string())
}
```

- [ ] **步骤 4：添加命令占位实现**

`editor/src-tauri/src/commands.rs`：

```rust
use crate::project_io::write_json_file;
use crate::python_worker::open_psd_with_worker;
use serde_json::Value;
use std::path::PathBuf;

#[tauri::command]
pub fn open_psd(source_path: String, cache_dir: String) -> Result<Value, String> {
    open_psd_with_worker(PathBuf::from(source_path), PathBuf::from(cache_dir))
}

#[tauri::command]
pub fn save_project(project_path: String, project: Value) -> Result<(), String> {
    write_json_file(&PathBuf::from(project_path), &project)
}

#[tauri::command]
pub fn export_layout(layout_path: String, layout: Value) -> Result<(), String> {
    write_json_file(&PathBuf::from(layout_path), &layout)
}
```

`editor/src-tauri/src/python_worker.rs`：

```rust
use serde_json::Value;
use std::path::PathBuf;
use std::process::Command;

pub fn open_psd_with_worker(source_path: PathBuf, cache_dir: PathBuf) -> Result<Value, String> {
    let worker_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("python/psd_worker.py");
    let output = Command::new("python3")
        .arg(worker_path)
        .arg("--source")
        .arg(source_path)
        .arg("--out")
        .arg(cache_dir)
        .arg("--assets-dir")
        .arg("layers")
        .output()
        .map_err(|error| error.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    serde_json::from_slice(&output.stdout).map_err(|error| error.to_string())
}
```

`editor/src-tauri/src/main.rs`：

```rust
fn main() {
    psdui_editor::run();
}
```

- [ ] **步骤 5：运行 Rust 测试**

运行：

```bash
cd editor/src-tauri
cargo test
```

预期：PASS。

- [ ] **步骤 6：提交**

```bash
git add editor/src-tauri
git commit -m "feat(psdui编辑器): 新增 Tauri 后端工程 IO 命令"
```

## 任务 4：默认 Source Tree 到 Export Tree

**文件：**
- 创建：`editor/src/domain/source-tree.ts`
- 创建：`editor/tests/source-tree.test.ts`
- 修改：`editor/src/domain/export-tree.ts`

- [ ] **步骤 1：写失败测试**

在 `editor/tests/source-tree.test.ts` 写：

```ts
import { describe, expect, it } from 'vitest';
import { createDefaultExportTree } from '../src/domain/source-tree';
import type { SourceLayer } from '../src/schemas/source';

const sourceTree: SourceLayer[] = [
  {
    id: 1,
    name: 'Root',
    kind: 'group',
    visible: true,
    opacity: 1,
    blendMode: null,
    sourceBounds: { x: 0, y: 0, width: 200, height: 100 },
    rasterBounds: { x: 0, y: 0, width: 200, height: 100 },
    image: null,
    text: null,
    children: [
      {
        id: 2,
        name: 'Hidden',
        kind: 'image',
        visible: false,
        opacity: 1,
        blendMode: null,
        sourceBounds: { x: 0, y: 0, width: 10, height: 10 },
        rasterBounds: { x: 0, y: 0, width: 10, height: 10 },
        image: { path: 'layers/hidden.png', width: 10, height: 10 },
        text: null,
        children: [],
      },
      {
        id: 3,
        name: 'Title',
        kind: 'text',
        visible: true,
        opacity: 1,
        blendMode: null,
        sourceBounds: { x: 20, y: 20, width: 80, height: 20 },
        rasterBounds: { x: 20, y: 20, width: 80, height: 20 },
        image: null,
        text: { value: '标题' },
        children: [],
      },
    ],
  },
];

describe('createDefaultExportTree', () => {
  it('omits invisible source layers from default export tree but keeps visible children', () => {
    const exportTree = createDefaultExportTree(sourceTree);
    expect(exportTree).toHaveLength(1);
    expect(exportTree[0].name).toBe('Root');
    expect(exportTree[0].children.map((node) => node.name)).toEqual(['Title']);
    expect(exportTree[0].children[0].exportKind).toBe('text');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
cd editor
npm test -- source-tree.test.ts
```

预期：FAIL，提示 `createDefaultExportTree` 不存在。

- [ ] **步骤 3：实现默认导出树**

`editor/src/domain/source-tree.ts`：

```ts
import type { ExportKind, ExportNode } from '../schemas/psdui';
import type { SourceLayer } from '../schemas/source';
import { createExportNodeFromSources } from './export-tree';

export function createDefaultExportTree(sourceTree: SourceLayer[]): ExportNode[] {
  const result: ExportNode[] = [];

  for (let i = 0; i < sourceTree.length; i += 1) {
    const node = createDefaultExportNode(sourceTree[i]);
    if (node) {
      result.push(node);
    }
  }

  return result;
}

function createDefaultExportNode(layer: SourceLayer): ExportNode | null {
  if (!layer.visible) {
    return null;
  }

  const node = createExportNodeFromSources({
    id: `source_${layer.id}`,
    name: layer.name,
    exportKind: inferExportKind(layer),
    sourceLayers: [layer],
  });

  node.children = layer.children
    .map((child) => createDefaultExportNode(child))
    .filter((child): child is ExportNode => child !== null);

  return node;
}

function inferExportKind(layer: SourceLayer): ExportKind {
  if (layer.kind === 'group') {
    return 'group';
  }
  if (layer.text) {
    return 'text';
  }
  return 'image';
}
```

- [ ] **步骤 4：运行测试和类型检查**

运行：

```bash
cd editor
npm test -- source-tree.test.ts export-tree.test.ts
npm run typecheck
```

预期：PASS。

- [ ] **步骤 5：提交**

```bash
git add editor/src/domain/source-tree.ts editor/tests/source-tree.test.ts editor/src/domain/export-tree.ts
git commit -m "feat(psdui编辑器): 根据可见图层生成默认导出树"
```

## 任务 5：layout JSON 导出

**文件：**
- 创建：`editor/src/domain/layout-export.ts`
- 创建：`editor/tests/layout-export.test.ts`

- [ ] **步骤 1：写失败测试**

在 `editor/tests/layout-export.test.ts` 写：

```ts
import { describe, expect, it } from 'vitest';
import { createLayoutDocument } from '../src/domain/layout-export';
import type { PSDUIProject } from '../src/schemas/psdui';

describe('createLayoutDocument', () => {
  it('exports enabled nodes and keeps list settings', () => {
    const project: PSDUIProject = {
      version: 1,
      source: { path: '/tmp/ui.psb', fileName: 'ui.psb' },
      document: { width: 320, height: 180 },
      sourceTree: [],
      cache: { assetsDir: '.psdui-cache/layers' },
      exportTree: [
        {
          id: 'list_1',
          name: 'RewardList',
          exportKind: 'list',
          enabled: true,
          sourceLayerIds: [1],
          rect: { x: 10, y: 20, width: 100, height: 120 },
          rasterBounds: null,
          list: {
            direction: 'vertical',
            cellTemplateNodeId: 'cell_1',
            spacing: 8,
            padding: { left: 1, right: 2, top: 3, bottom: 4 },
          },
          children: [],
        },
        {
          id: 'disabled_1',
          name: 'Disabled',
          exportKind: 'image',
          enabled: false,
          sourceLayerIds: [2],
          rect: { x: 0, y: 0, width: 1, height: 1 },
          rasterBounds: { x: 0, y: 0, width: 1, height: 1 },
          list: null,
          children: [],
        },
      ],
    };

    const layout = createLayoutDocument(project);

    expect(layout.document).toEqual({ width: 320, height: 180 });
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0].name).toBe('RewardList');
    expect(layout.nodes[0].list?.spacing).toBe(8);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
cd editor
npm test -- layout-export.test.ts
```

预期：FAIL，提示 `createLayoutDocument` 不存在。

- [ ] **步骤 3：实现 layout 导出**

`editor/src/domain/layout-export.ts`：

```ts
import type { UILayoutDocument, UILayoutNode } from '../schemas/layout';
import type { ExportNode, PSDUIProject } from '../schemas/psdui';

export function createLayoutDocument(project: PSDUIProject): UILayoutDocument {
  return {
    version: 1,
    document: project.document,
    nodes: project.exportTree
      .map(toLayoutNode)
      .filter((node): node is UILayoutNode => node !== null),
  };
}

function toLayoutNode(node: ExportNode): UILayoutNode | null {
  if (!node.enabled) {
    return null;
  }

  return {
    id: node.id,
    name: node.name,
    exportKind: node.exportKind,
    rect: node.rect,
    rasterBounds: node.rasterBounds,
    sourceLayerIds: node.sourceLayerIds,
    list: node.list,
    children: node.children
      .map(toLayoutNode)
      .filter((child): child is UILayoutNode => child !== null),
  };
}
```

- [ ] **步骤 4：运行测试和类型检查**

运行：

```bash
cd editor
npm test -- layout-export.test.ts
npm run typecheck
```

预期：PASS。

- [ ] **步骤 5：提交**

```bash
git add editor/src/domain/layout-export.ts editor/tests/layout-export.test.ts
git commit -m "feat(psdui编辑器): 导出 UI layout JSON"
```

## 任务 6：Tauri/React 三栏 MVP UI

**文件：**
- 创建：`editor/index.html`
- 创建：`editor/vite.config.ts`
- 创建：`editor/src/main.tsx`
- 创建：`editor/src/app/App.tsx`
- 创建：`editor/src/app/state.ts`
- 创建：`editor/src/components/SourceTree.tsx`
- 创建：`editor/src/components/ExportTree.tsx`
- 创建：`editor/src/components/CanvasPreview.tsx`
- 创建：`editor/src/components/Inspector.tsx`

- [ ] **步骤 1：写最小状态测试**

在 `editor/tests/app-state.test.ts` 写：

```ts
import { describe, expect, it } from 'vitest';
import { createEmptyState, selectSourceLayer } from '../src/app/state';

describe('app state', () => {
  it('tracks selected source layer ids', () => {
    const state = selectSourceLayer(createEmptyState(), 12);
    expect(state.selectedSourceLayerIds).toEqual([12]);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
cd editor
npm test -- app-state.test.ts
```

预期：FAIL，提示 `app/state` 不存在。

- [ ] **步骤 3：实现状态与 UI 骨架**

`editor/src/app/state.ts`：

```ts
import type { PSDUIProject } from '../schemas/psdui';

export interface AppState {
  project: PSDUIProject | null;
  selectedSourceLayerIds: number[];
  selectedExportNodeId: string | null;
  message: string | null;
}

export function createEmptyState(): AppState {
  return {
    project: null,
    selectedSourceLayerIds: [],
    selectedExportNodeId: null,
    message: null,
  };
}

export function selectSourceLayer(state: AppState, layerId: number): AppState {
  return {
    ...state,
    selectedSourceLayerIds: [layerId],
  };
}
```

`editor/src/app/App.tsx` 使用 CSS grid 创建三栏：左侧 Source/Export Tree，中间 CanvasPreview，右侧 Inspector。按钮只放 MVP 必需命令：Open PSD/PSB、Save `.psdui`、Create Export Node、Export Layout。

- [ ] **步骤 4：实现组件最小展示**

`SourceTree.tsx` 递归展示 source layer 名称和 visible 状态。

`ExportTree.tsx` 递归展示 export node 名称、exportKind 和 enabled 状态。

`CanvasPreview.tsx` 用 document 宽高比例绘制边框和 export rect outline，不要求像 Photoshop 一样精确。

`Inspector.tsx` 支持编辑选中 export node 的 `name`、`enabled`、`exportKind`；当 `exportKind === 'list'` 时显示 direction、spacing、padding、cellTemplateNodeId。

- [ ] **步骤 5：接 Tauri invoke**

在 `App.tsx` 中调用：

```ts
import { invoke } from '@tauri-apps/api/core';

const sourceDocument = await invoke('open_psd', {
  sourcePath,
  cacheDir,
});
await invoke('save_project', { projectPath, project });
await invoke('export_layout', { layoutPath, layout });
```

MVP 可先使用文本输入路径，不必在此任务引入系统文件选择器。

- [ ] **步骤 6：运行前端测试和类型检查**

运行：

```bash
cd editor
npm test
npm run typecheck
```

预期：PASS。

- [ ] **步骤 7：提交**

```bash
git add editor/index.html editor/vite.config.ts editor/src editor/tests/app-state.test.ts
git commit -m "feat(psdui编辑器): 新增三栏编辑器 MVP 界面"
```

## 任务 7：端到端垂直切片验证

**文件：**
- 修改：`README.md`
- 创建：`editor/README.md`

- [ ] **步骤 1：补充桌面客户端运行说明**

`editor/README.md` 写明：

```md
# PSDUI Editor MVP

## Install

```bash
npm install
cd src-tauri
cargo test
```

## Run

```bash
npm run tauri dev
```

## MVP Flow

1. 输入 PSD/PSB 路径和 cache 目录。
2. 点击 Open PSD/PSB。
3. 在 Source Tree 选择一个或多个 source layer。
4. 点击 Create Export Node。
5. 在 Inspector 修改 name、enabled、exportKind 或 list 设置。
6. 保存 `.psdui`。
7. 导出 `ui.layout.json`。
```

根 `README.md` 增加一小节链接 `editor/README.md`，保留现有 CLI 文档。

- [ ] **步骤 2：运行完整验证**

运行：

```bash
npm test
cd editor
npm test
npm run typecheck
cd src-tauri
cargo test
PYTHONPATH=../../.python:python python3 -m unittest python/psd_worker_test.py
```

预期：全部 PASS。

- [ ] **步骤 3：手动垂直流程**

使用一个本地测试 PSD/PSB：

```bash
cd editor
npm run tauri dev
```

验收：

- 能输入 PSD/PSB 路径并打开。
- Source Tree 显示图层树、visible、文本/图片基本信息。
- 默认 Export Tree 不包含 invisible 节点。
- 能从至少一个 source layer 创建 export node。
- 能保存 `.psdui` JSON。
- 能导出 `ui.layout.json`。
- 源 PSD/PSB 文件修改时间不变。

- [ ] **步骤 4：提交**

```bash
git add README.md editor/README.md
git commit -m "docs(psdui编辑器): 补充 MVP 运行与验证说明"
```

## 非目标

- 不生成 Unity Prefab。
- 不生成或修改 `.meta`、GUID、Prefab YAML。
- 不写回 PSD/PSB。
- 不编辑图片像素、文本内容、字体、字号、颜色、对齐、描边。
- 不自动识别 list；只支持手动标注 list 语义。
- 不在第一阶段做复杂视觉还原、拖拽排序、多平台安装包或 Python 打包。

## 最终验收命令

```bash
npm test
cd editor
npm test
npm run typecheck
cd src-tauri
cargo test
PYTHONPATH=../../.python:python python3 -m unittest python/psd_worker_test.py
```

## 实施顺序建议

1. 先做任务 1、4、5，完成纯 TypeScript 数据模型闭环。
2. 再做任务 2、3，打通 Python/Rust 后端。
3. 最后做任务 6、7，把 UI 接到已经稳定的 domain 与命令上。

这样即使 UI 还粗糙，也能尽早验证核心数据流：PSD/PSB -> source tree -> `.psdui` -> export tree -> `ui.layout.json`。
