import { describe, expect, test } from 'vitest';

import { createDefaultExportTree } from '../src/domain/source-tree';
import type { SourceLayer } from '../src/schemas/source';

const baseLayer = {
  visible: true,
  opacity: 1,
  blendMode: 'normal',
  sourceBounds: { x: 0, y: 0, width: 100, height: 100 },
  rasterBounds: { x: 0, y: 0, width: 100, height: 100 },
  image: null,
  text: null,
  children: []
} satisfies Pick<
  SourceLayer,
  | 'visible'
  | 'opacity'
  | 'blendMode'
  | 'sourceBounds'
  | 'rasterBounds'
  | 'image'
  | 'text'
  | 'children'
>;

describe('createDefaultExportTree', () => {
  test('omits hidden source layers and infers text nodes from visible source text', () => {
    const sourceTree: SourceLayer[] = [
      {
        ...baseLayer,
        id: 1,
        name: 'Root',
        kind: 'group',
        children: [
          {
            ...baseLayer,
            id: 2,
            name: 'Hidden',
            kind: 'pixel',
            visible: false,
            image: { path: 'hidden.png', width: 100, height: 100 }
          },
          {
            ...baseLayer,
            id: 3,
            name: 'Title',
            kind: 'text',
            rasterBounds: { x: 10, y: 20, width: 80, height: 24 },
            text: {
              value: 'Title',
              fontName: 'Arial',
              fontSize: 24,
              color: { hex: '#ffffff' }
            }
          }
        ]
      }
    ];

    const exportTree = createDefaultExportTree(sourceTree);

    expect(exportTree).toHaveLength(1);
    expect(exportTree[0].name).toBe('Root');
    expect(exportTree[0].children).toHaveLength(1);
    expect(exportTree[0].children.map((child) => child.name)).toEqual(['Title']);
    expect(exportTree[0].children[0].exportKind).toBe('text');
  });
});
