import { describe, expect, test } from 'vitest';

import app from '../src/app/App.tsx?raw';
import {
  defaultWorkspacePanelWidths,
  defaultTreePanelWidths,
  resizeTreePanelsFromPointer,
  resizeWorkspacePanelsFromPointer
} from '../src/domain/tree-panel-resize';

describe('tree panel resizing', () => {
  test('resizes source and export panels while preserving the total tree width', () => {
    const next = resizeTreePanelsFromPointer({
      containerLeft: 100,
      pointerX: 440,
      totalWidth: 560,
      minWidth: 180
    });

    expect(next).toEqual({ sourceWidth: 340, exportWidth: 220 });
  });

  test('clamps either panel to its minimum width', () => {
    expect(
      resizeTreePanelsFromPointer({
        containerLeft: 100,
        pointerX: 200,
        totalWidth: 560,
        minWidth: 180
      })
    ).toEqual({ sourceWidth: 180, exportWidth: 380 });

    expect(
      resizeTreePanelsFromPointer({
        containerLeft: 100,
        pointerX: 900,
        totalWidth: 560,
        minWidth: 180
      })
    ).toEqual({ sourceWidth: 380, exportWidth: 180 });
  });

  test('keeps the default tree panel widths aligned with the existing layout', () => {
    expect(defaultTreePanelWidths).toEqual({ sourceWidth: 280, exportWidth: 280 });
  });
});

describe('tree panel resize handle', () => {
  test('app renders a separator between SourceTree and ExportTree', () => {
    expect(app).toContain('tree-panel-resizer');
    expect(app).toContain('Resize Source Tree and Export Tree panels');
    expect(app).toContain('--source-tree-panel-width');
    expect(app).toContain('--export-tree-panel-width');
    expect(app).toContain('createEditorLayoutStore(window.localStorage)');
    expect(app).toContain('initialEditorLayout.treePanelWidths');
    expect(app).toContain('updateTreePanelWidths(');
  });
});

describe('workspace panel resizing', () => {
  test('resizes tree and preview panels while preserving their measured total width', () => {
    const next = resizeWorkspacePanelsFromPointer({
      containerLeft: 100,
      pointerX: 760,
      totalWidth: 1040,
      minTreeWidth: 420,
      minPreviewWidth: 360
    });

    expect(next).toEqual({ treeWidth: 660, previewWidth: 380 });
  });

  test('clamps tree and preview panels to their minimum widths', () => {
    expect(
      resizeWorkspacePanelsFromPointer({
        containerLeft: 100,
        pointerX: 260,
        totalWidth: 1040,
        minTreeWidth: 420,
        minPreviewWidth: 360
      })
    ).toEqual({ treeWidth: 420, previewWidth: 620 });

    expect(
      resizeWorkspacePanelsFromPointer({
        containerLeft: 100,
        pointerX: 980,
        totalWidth: 1040,
        minTreeWidth: 420,
        minPreviewWidth: 360
      })
    ).toEqual({ treeWidth: 680, previewWidth: 360 });
  });

  test('keeps the default workspace panel widths aligned with the existing layout', () => {
    expect(defaultWorkspacePanelWidths).toEqual({ treeWidth: 568, previewWidth: 720 });
  });
});

describe('workspace panel resize handle', () => {
  test('app renders a separator between ExportTree and CanvasPreview', () => {
    expect(app).toContain('workspace-panel-resizer');
    expect(app).toContain('Resize Export Tree and Preview panels');
    expect(app).toContain('--tree-panel-group-width');
    expect(app).toContain('--preview-panel-width');
    expect(app).toContain('totalWidth: workspacePanelWidths.treeWidth - 8');
    expect(app).toContain('initialEditorLayout.workspacePanelWidths');
    expect(app).toContain('updateWorkspacePanelWidths(');
  });
});
