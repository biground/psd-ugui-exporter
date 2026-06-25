import { describe, expect, test } from 'vitest';

import app from '../src/app/App.tsx?raw';
import {
  defaultTreePanelWidths,
  resizeTreePanelsFromPointer
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
  });
});
