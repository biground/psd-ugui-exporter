import { describe, expect, test } from 'vitest';

import { createLayoutDocument } from '../src/domain/layout-export';
import type { PSDUIProject } from '../src/schemas/psdui';

describe('createLayoutDocument', () => {
  test('exports enabled layout nodes and omits disabled subtrees', () => {
    const project: PSDUIProject = {
      version: 1,
      source: { path: '/fixtures/reward.psd', fileName: 'reward.psd' },
      document: { width: 320, height: 180 },
      sourceTree: [],
      exportTree: [
        {
          id: 'reward-list',
          name: 'RewardList',
          exportKind: 'list',
          enabled: true,
          sourceLayerIds: [1],
          rect: { x: 12, y: 16, width: 160, height: 120 },
          rasterBounds: null,
          list: {
            direction: 'vertical',
            cellTemplateNodeId: 'reward-cell',
            spacing: 8,
            padding: { top: 4, right: 6, bottom: 4, left: 6 }
          },
          children: []
        },
        {
          id: 'disabled-image',
          name: 'DisabledImage',
          exportKind: 'image',
          enabled: false,
          sourceLayerIds: [2],
          rect: { x: 200, y: 24, width: 64, height: 64 },
          rasterBounds: { x: 200, y: 24, width: 64, height: 64 },
          list: null,
          children: [
            {
              id: 'disabled-child',
              name: 'DisabledChild',
              exportKind: 'image',
              enabled: true,
              sourceLayerIds: [3],
              rect: { x: 204, y: 28, width: 32, height: 32 },
              rasterBounds: { x: 204, y: 28, width: 32, height: 32 },
              list: null,
              children: []
            }
          ]
        }
      ],
      cache: { assetsDir: '/fixtures/.psdui-cache' }
    };

    const layout = createLayoutDocument(project);

    expect(layout.document).toEqual({ width: 320, height: 180 });
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0].name).toBe('RewardList');
    expect(layout.nodes[0].list?.spacing).toBe(8);
  });
});
