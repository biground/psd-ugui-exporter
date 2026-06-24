import { describe, expect, test } from 'vitest';

import { collectVisiblePreviewImageLayers, resolveLayerImagePath } from '../src/domain/preview-assets';
import type { SourceLayer } from '../src/schemas/source';

const baseLayer = {
  kind: 'image',
  visible: true,
  opacity: 1,
  blendMode: 'normal',
  sourceBounds: { x: 0, y: 0, width: 10, height: 10 },
  rasterBounds: { x: 0, y: 0, width: 10, height: 10 },
  image: { path: 'layers/icon.png', width: 10, height: 10 },
  text: null,
  children: []
} satisfies Omit<SourceLayer, 'id' | 'name'>;

describe('preview assets', () => {
  test('collects visible image layers and skips hidden subtrees', () => {
    const layers: SourceLayer[] = [
      { ...baseLayer, id: 1, name: 'Visible' },
      {
        ...baseLayer,
        id: 2,
        name: 'Hidden Group',
        kind: 'group',
        visible: false,
        image: null,
        children: [{ ...baseLayer, id: 3, name: 'Hidden Child' }]
      }
    ];

    expect(collectVisiblePreviewImageLayers(layers).map(({ layer }) => layer.name)).toEqual(['Visible']);
  });

  test('skips preview-hidden subtrees without changing source visibility', () => {
    const layers: SourceLayer[] = [
      {
        ...baseLayer,
        id: 1,
        name: 'Button',
        kind: 'group',
        image: null,
        children: [{ ...baseLayer, id: 2, name: 'Button BG' }]
      }
    ];

    expect(collectVisiblePreviewImageLayers(layers, [1, 2]).map(({ layer }) => layer.name)).toEqual([]);
    expect(layers[0].visible).toBe(true);
    expect(layers[0].children[0]?.visible).toBe(true);
  });

  test('resolves relative layer image paths under the cache root', () => {
    const layer: SourceLayer = { ...baseLayer, id: 1, name: 'Icon' };

    expect(resolveLayerImagePath(layer, '/tmp/psdui-cache')).toBe('/tmp/psdui-cache/layers/icon.png');
  });

  test('keeps absolute layer image paths unchanged', () => {
    const layer: SourceLayer = {
      ...baseLayer,
      id: 1,
      name: 'Icon',
      image: { path: '/tmp/layers/icon.png', width: 10, height: 10 }
    };

    expect(resolveLayerImagePath(layer, '/tmp/psdui-cache')).toBe('/tmp/layers/icon.png');
  });
});
