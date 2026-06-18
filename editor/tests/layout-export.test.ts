import { describe, expect, test } from 'vitest';

import { createLayoutDocument } from '../src/domain/layout-export';
import type { PSDUIProject } from '../src/schemas/psdui';

function createRewardProject(): PSDUIProject {
  return {
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
}

describe('createLayoutDocument', () => {
  test('exports enabled layout nodes and omits disabled subtrees', () => {
    const project = createRewardProject();

    const layout = createLayoutDocument(project);

    expect(layout.document).toEqual({ width: 320, height: 180 });
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0].name).toBe('RewardList');
    expect(layout.nodes[0].list?.spacing).toBe(8);
  });

  test('omits disabled children under enabled parents', () => {
    const project = createRewardProject();
    project.exportTree[0].children = [
      {
        id: 'enabled-cell',
        name: 'EnabledCell',
        exportKind: 'image',
        enabled: true,
        sourceLayerIds: [4],
        rect: { x: 16, y: 20, width: 48, height: 24 },
        rasterBounds: { x: 16, y: 20, width: 48, height: 24 },
        list: null,
        children: []
      },
      {
        id: 'disabled-cell',
        name: 'DisabledCell',
        exportKind: 'image',
        enabled: false,
        sourceLayerIds: [5],
        rect: { x: 16, y: 48, width: 48, height: 24 },
        rasterBounds: { x: 16, y: 48, width: 48, height: 24 },
        list: null,
        children: []
      }
    ];

    const layout = createLayoutDocument(project);

    expect(layout.nodes[0].children.map((child) => child.name)).toEqual(['EnabledCell']);
  });

  test('exports an independent snapshot of mutable project state', () => {
    const project = createRewardProject();

    const layout = createLayoutDocument(project);

    layout.nodes[0].list!.padding.top = 99;
    layout.nodes[0].sourceLayerIds.push(99);
    layout.document.width = 999;
    layout.nodes[0].rect.x = 999;

    expect(project.exportTree[0].list!.padding.top).toBe(4);
    expect(project.exportTree[0].sourceLayerIds).toEqual([1]);
    expect(project.document.width).toBe(320);
    expect(project.exportTree[0].rect.x).toBe(12);
  });
});
