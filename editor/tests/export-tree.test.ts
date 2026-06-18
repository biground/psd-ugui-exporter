import { describe, expect, test } from 'vitest';

import { createExportNodeFromSources } from '../src/domain/export-tree';
import type { SourceLayer } from '../src/schemas/source';

const baseLayer = {
  kind: 'pixel',
  visible: true,
  opacity: 1,
  blendMode: 'normal',
  text: null,
  children: []
} satisfies Pick<SourceLayer, 'kind' | 'visible' | 'opacity' | 'blendMode' | 'text' | 'children'>;

describe('createExportNodeFromSources', () => {
  test('separates source union rect from image-only raster bounds when merging button layers', () => {
    const sourceLayers: SourceLayer[] = [
      {
        ...baseLayer,
        id: 1,
        name: 'Button background',
        sourceBounds: { x: 10, y: 20, width: 80, height: 30 },
        rasterBounds: { x: 12, y: 22, width: 76, height: 26 },
        image: { path: 'button-bg.png', width: 76, height: 26 }
      },
      {
        ...baseLayer,
        id: 2,
        name: 'Button label',
        kind: 'text',
        sourceBounds: { x: 30, y: 28, width: 42, height: 14 },
        rasterBounds: { x: 0, y: 0, width: 0, height: 0 },
        image: null,
        text: {
          value: 'Start',
          fontFamily: 'Arial',
          fontSize: 14,
          color: '#ffffff'
        }
      }
    ];

    const node = createExportNodeFromSources({
      id: 'button-start',
      name: 'Start Button',
      exportKind: 'button',
      sourceLayers
    });

    expect(node).toMatchObject({
      id: 'button-start',
      name: 'Start Button',
      exportKind: 'button',
      enabled: true,
      sourceLayerIds: [1, 2],
      rect: { x: 10, y: 20, width: 80, height: 30 },
      rasterBounds: { x: 12, y: 22, width: 76, height: 26 },
      list: null,
      children: []
    });
  });

  test('creates independent padding objects for list node defaults', () => {
    const sourceLayers: SourceLayer[] = [
      {
        ...baseLayer,
        id: 1,
        name: 'List',
        sourceBounds: { x: 0, y: 0, width: 100, height: 200 },
        rasterBounds: { x: 0, y: 0, width: 0, height: 0 },
        image: null
      }
    ];

    const firstNode = createExportNodeFromSources({
      id: 'list-first',
      name: 'First List',
      exportKind: 'list',
      sourceLayers
    });
    const secondNode = createExportNodeFromSources({
      id: 'list-second',
      name: 'Second List',
      exportKind: 'list',
      sourceLayers
    });

    firstNode.list!.padding.top = 10;

    expect(secondNode.list!.padding.top).toBe(0);
  });
});
