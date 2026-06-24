import { describe, expect, test } from 'vitest';

import { collectCanvasHighlights } from '../src/domain/preview-highlights';
import type { ExportNode } from '../src/schemas/psdui';
import type { SourceLayer } from '../src/schemas/source';

const baseLayer = {
  kind: 'image',
  visible: true,
  opacity: 1,
  blendMode: 'normal',
  sourceBounds: { x: 4, y: 6, width: 20, height: 12 },
  rasterBounds: { x: 6, y: 8, width: 16, height: 8 },
  image: { path: 'layers/icon.png', width: 16, height: 8 },
  text: null,
  children: []
} satisfies Omit<SourceLayer, 'id' | 'name'>;

const baseExportNode = {
  exportKind: 'image',
  enabled: true,
  sourceLayerIds: [1],
  rect: { x: 10, y: 12, width: 64, height: 32 },
  rasterBounds: { x: 12, y: 14, width: 60, height: 28 },
  list: null,
  children: []
} satisfies Omit<ExportNode, 'id' | 'name'>;

describe('preview highlights', () => {
  test('does not draw export node annotations when no export node is selected', () => {
    const highlights = collectCanvasHighlights({
      mode: 'export',
      sourceTree: [{ ...baseLayer, id: 1, name: 'Button Bg' }],
      exportTree: [
        { ...baseExportNode, id: 'source_1', name: 'Button Bg' },
        { ...baseExportNode, id: 'source_2', name: 'Button Icon', sourceLayerIds: [2] }
      ],
      selectedSourceLayerIds: [],
      selectedExportNodeId: null,
      hiddenSourceLayerIds: []
    });

    expect(highlights).toEqual([]);
  });

  test('highlights selected source layers from their source bounds in source preview', () => {
    const highlights = collectCanvasHighlights({
      mode: 'source',
      sourceTree: [{ ...baseLayer, id: 1, name: 'Button Bg' }],
      exportTree: [],
      selectedSourceLayerIds: [1],
      selectedExportNodeId: null,
      hiddenSourceLayerIds: []
    });

    expect(highlights).toEqual([
      {
        id: 'source_1',
        name: 'Button Bg',
        kind: 'source',
        rect: { x: 4, y: 6, width: 20, height: 12 }
      }
    ]);
  });

  test('highlights only the selected export node in export preview', () => {
    const highlights = collectCanvasHighlights({
      mode: 'export',
      sourceTree: [{ ...baseLayer, id: 1, name: 'Button Bg' }],
      exportTree: [
        { ...baseExportNode, id: 'source_1', name: 'Button Bg' },
        { ...baseExportNode, id: 'source_2', name: 'Button Icon', sourceLayerIds: [2] }
      ],
      selectedSourceLayerIds: [1],
      selectedExportNodeId: 'source_2',
      hiddenSourceLayerIds: []
    });

    expect(highlights).toEqual([
      {
        id: 'source_2',
        name: 'Button Icon',
        kind: 'export',
        rect: { x: 10, y: 12, width: 64, height: 32 }
      }
    ]);
  });
});
