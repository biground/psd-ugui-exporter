import { describe, expect, test } from 'vitest';

import { createLayoutDocument, createLayoutExportPackage } from '../src/domain/layout-export';
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

function createTextProject(): PSDUIProject {
  return {
    version: 1,
    source: { path: '/fixtures/dialog.psd', fileName: 'dialog.psd' },
    document: { width: 640, height: 360 },
    sourceTree: [
      {
        id: 10,
        name: 'Description',
        kind: 'text',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        sourceBounds: { x: 40, y: 80, width: 280, height: 88 },
        rasterBounds: { x: 40, y: 80, width: 280, height: 88 },
        image: null,
        text: {
          value: 'Wrapped PSD text',
          fontName: 'SourceHanSansCN-Heavy',
          fontSize: 24,
          color: { hex: '#665544' },
          tracking: 0,
          lineHeight: 32,
          box: {
            kind: 'paragraph',
            bounds: { x: 40, y: 80, width: 280, height: 88 },
            width: 280,
            height: 88,
            wrap: true,
            transform: [1, 0, 0, 1, 40, 80],
            source: 'layerBounds'
          },
          paragraph: {
            horizontalAlign: { value: 2, name: 'center' },
            verticalAlign: { value: 1, name: 'middle' },
            startIndent: 0,
            endIndent: 0,
            spaceBefore: 0,
            spaceAfter: 0
          },
          alignment: { value: 2, name: 'center' },
          runs: [],
          stroke: { source: 'textStyle', enabled: true, color: { hex: '#ff0000' }, size: null }
        },
        children: []
      }
    ],
    exportTree: [
      {
        id: 'description',
        name: 'Description',
        exportKind: 'text',
        enabled: true,
        sourceLayerIds: [10],
        rect: { x: 40, y: 80, width: 280, height: 88 },
        rasterBounds: { x: 40, y: 80, width: 280, height: 88 },
        list: null,
        children: []
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

  test('exports engine-neutral scale9 metadata for image nodes', () => {
    const project = createRewardProject();
    project.exportTree.push({
      id: 'dialog-bg',
      name: 'DialogBg',
      exportKind: 'image',
      enabled: true,
      sourceLayerIds: [6],
      rect: { x: 20, y: 24, width: 240, height: 120 },
      rasterBounds: { x: 20, y: 24, width: 240, height: 120 },
      list: null,
      scale9: {
        enabled: true,
        mode: 'sliced',
        unit: 'pixel',
        relativeTo: 'asset',
        border: { left: 18, right: 18, top: 12, bottom: 12 }
      },
      children: []
    });

    const layout = createLayoutDocument(project);
    const imageNode = layout.nodes.find((node) => node.id === 'dialog-bg');

    expect(imageNode?.scale9).toEqual({
      enabled: true,
      mode: 'sliced',
      unit: 'pixel',
      relativeTo: 'asset',
      border: { left: 18, right: 18, top: 12, bottom: 12 }
    });

    imageNode!.scale9!.border.left = 99;

    expect(project.exportTree[2].scale9!.border.left).toBe(18);
  });

  test('creates a compact scale9 export package for sliced image assets', () => {
    const project = createRewardProject();
    project.sourceTree = [
      {
        id: 6,
        name: 'DialogBgSource',
        kind: 'pixel',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        sourceBounds: { x: 20, y: 24, width: 240, height: 120 },
        rasterBounds: { x: 20, y: 24, width: 240, height: 120 },
        image: { path: 'layers/dialog-bg.png', width: 240, height: 120 },
        text: null,
        children: []
      }
    ];
    project.exportTree.push({
      id: 'dialog-bg',
      name: 'DialogBg',
      exportKind: 'image',
      enabled: true,
      sourceLayerIds: [6],
      rect: { x: 20, y: 24, width: 240, height: 120 },
      rasterBounds: { x: 20, y: 24, width: 240, height: 120 },
      list: null,
      scale9: {
        enabled: true,
        mode: 'sliced',
        unit: 'pixel',
        relativeTo: 'asset',
        border: { left: 18, right: 18, top: 12, bottom: 12 }
      },
      children: []
    });

    const exportPackage = createLayoutExportPackage(project);
    const imageNode = exportPackage.layout.nodes.find((node) => node.id === 'dialog-bg');

    expect(imageNode?.asset).toEqual({
      type: 'image',
      path: 'images/dialog-bg.png',
      width: 37,
      height: 25,
      sourceWidth: 240,
      sourceHeight: 120,
      scale9Packing: 'compact'
    });
    expect(exportPackage.assets).toEqual([
      {
        sourcePath: '/fixtures/.psdui-cache/layers/dialog-bg.png',
        outputPath: 'images/dialog-bg.png',
        scale9Crop: {
          border: { top: 12, right: 18, bottom: 12, left: 18 }
        }
      }
    ]);
  });

  test('exports text metadata for the first mapped source text layer', () => {
    const project = createTextProject();

    const layout = createLayoutDocument(project);
    const text = layout.nodes[0].text;
    const strokeColor = text?.stroke?.color as { hex: string } | undefined;

    expect(text?.value).toBe('Wrapped PSD text');
    expect(text?.box?.wrap).toBe(true);
    expect(text?.box?.bounds.width).toBe(280);
    expect(text?.paragraph?.horizontalAlign?.name).toBe('center');
    expect(text?.paragraph?.verticalAlign?.name).toBe('middle');
    expect(strokeColor?.hex).toBe('#ff0000');

    text!.box!.bounds.width = 999;

    expect(project.sourceTree[0].text!.box!.bounds.width).toBe(280);
  });
});
