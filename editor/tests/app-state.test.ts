import { describe, expect, test } from 'vitest';

import {
  addSourceLayerToExportTree,
  appendExportNode,
  createEmptyState,
  createExportNodeForSources,
  createProjectFromSourceDocument,
  moveExportNode,
  removeExportNode,
  selectSourceLayer,
  toggleSourceLayerPreviewVisibility,
  toggleSourceLayerSelection
} from '../src/app/state';
import type { SourceLayer } from '../src/schemas/source';

const baseLayer = {
  kind: 'pixel',
  visible: true,
  opacity: 1,
  blendMode: 'normal',
  sourceBounds: { x: 0, y: 0, width: 10, height: 10 },
  rasterBounds: { x: 0, y: 0, width: 10, height: 10 },
  image: null,
  text: null,
  children: []
} satisfies Omit<SourceLayer, 'id' | 'name'>;

describe('app state', () => {
  test('selects a source layer by id', () => {
    const state = selectSourceLayer(createEmptyState(), 12);

    expect(state.selectedSourceLayerIds).toEqual([12]);
  });

  test('toggles source layer selection for multi-select editing', () => {
    const first = toggleSourceLayerSelection(createEmptyState(), 12);
    const second = toggleSourceLayerSelection(first, 13);
    const third = toggleSourceLayerSelection(second, 12);

    expect(first.selectedSourceLayerIds).toEqual([12]);
    expect(second.selectedSourceLayerIds).toEqual([12, 13]);
    expect(third.selectedSourceLayerIds).toEqual([13]);
  });

  test('toggles source layer preview visibility recursively without changing source metadata', () => {
    const state = {
      ...createEmptyState(),
      project: createProjectFromSourceDocument({
        version: 1 as const,
        source: {
          path: '/tmp/menu.psb',
          fileName: 'menu.psb'
        },
        document: {
          width: 320,
          height: 180
        },
        sourceTree: [
          {
            ...baseLayer,
            id: 1,
            name: 'Button',
            children: [
              {
                ...baseLayer,
                id: 2,
                name: 'Button Glow'
              }
            ]
          }
        ],
        assetsDir: 'layers'
      })
    };

    const hidden = toggleSourceLayerPreviewVisibility(state, 1);

    expect(hidden.hiddenSourceLayerIds).toEqual([1, 2]);
    expect(hidden.project?.sourceTree[0]?.visible).toBe(true);
    expect(hidden.project?.sourceTree[0]?.children[0]?.visible).toBe(true);
    expect(state.project?.sourceTree[0]?.visible).toBe(true);

    const shown = toggleSourceLayerPreviewVisibility(hidden, 1);

    expect(shown.hiddenSourceLayerIds).toEqual([]);
  });

  test('creates a project from a worker source document with an empty export tree', () => {
    const sourceDocument = {
      version: 1 as const,
      source: {
        path: '/tmp/menu.psb',
        fileName: 'menu.psb'
      },
      document: {
        width: 320,
        height: 180
      },
      sourceTree: [
        {
          ...baseLayer,
          id: 1,
          name: 'Logo',
          image: { path: 'cache/logo.png', width: 10, height: 10 }
        }
      ],
      assetsDir: 'layers'
    };

    const project = createProjectFromSourceDocument(sourceDocument);

    expect(project).toMatchObject({
      version: 1,
      source: sourceDocument.source,
      document: sourceDocument.document,
      sourceTree: sourceDocument.sourceTree,
      cache: {
        assetsDir: 'layers'
      },
      exportTree: []
    });
  });

  test('adds a source layer to the export tree once', () => {
    const sourceDocument = {
      version: 1 as const,
      source: {
        path: '/tmp/menu.psb',
        fileName: 'menu.psb'
      },
      document: {
        width: 320,
        height: 180
      },
      sourceTree: [
        {
          ...baseLayer,
          id: 1,
          name: 'Logo',
          image: { path: 'cache/logo.png', width: 10, height: 10 }
        }
      ],
      assetsDir: 'layers'
    };
    const state = {
      ...createEmptyState(),
      project: createProjectFromSourceDocument(sourceDocument)
    };

    const added = addSourceLayerToExportTree(state, 1);
    const duplicate = addSourceLayerToExportTree(added, 1);

    expect(added.project?.exportTree).toMatchObject([
      {
        id: 'source_1',
        name: 'Logo',
        exportKind: 'image',
        sourceLayerIds: [1]
      }
    ]);
    expect(added.selectedExportNodeId).toBe('source_1');
    expect(duplicate.project?.exportTree).toHaveLength(1);
    expect(duplicate.message).toBe('Source layer "Logo" is already in the export tree.');
  });

  test('adds a source subtree to the export tree and prevents parent-child duplicates', () => {
    const state = {
      ...createEmptyState(),
      project: createProjectFromSourceDocument({
        version: 1 as const,
        source: {
          path: '/tmp/menu.psb',
          fileName: 'menu.psb'
        },
        document: {
          width: 320,
          height: 180
        },
        sourceTree: [
          {
            ...baseLayer,
            id: 1,
            name: 'Button',
            kind: 'group',
            children: [
              {
                ...baseLayer,
                id: 2,
                name: 'Button BG',
                image: { path: 'cache/bg.png', width: 10, height: 10 }
              },
              {
                ...baseLayer,
                id: 3,
                name: 'Button Text',
                kind: 'text',
                text: { value: 'OK' }
              }
            ]
          }
        ],
        assetsDir: 'layers'
      })
    };

    const addedParent = addSourceLayerToExportTree(state, 1);
    const duplicateChild = addSourceLayerToExportTree(addedParent, 2);
    const childFirst = addSourceLayerToExportTree(state, 2);
    const duplicateParent = addSourceLayerToExportTree(childFirst, 1);

    expect(addedParent.project?.exportTree).toMatchObject([
      {
        id: 'source_1',
        name: 'Button',
        exportKind: 'group',
        sourceLayerIds: [1],
        children: [
          {
            id: 'source_2',
            name: 'Button BG',
            exportKind: 'image',
            sourceLayerIds: [2]
          },
          {
            id: 'source_3',
            name: 'Button Text',
            exportKind: 'text',
            sourceLayerIds: [3]
          }
        ]
      }
    ]);
    expect(duplicateChild.project?.exportTree).toHaveLength(1);
    expect(duplicateChild.message).toBe('Source layer "Button BG" is already in the export tree.');
    expect(duplicateParent.project?.exportTree).toHaveLength(1);
    expect(duplicateParent.message).toBe('Source layer "Button" overlaps with existing export nodes.');
  });

  test('creates and removes a merged export node from selected source layers', () => {
    const sourceLayers = [
      {
        ...baseLayer,
        id: 1,
        name: 'Button BG',
        image: { path: 'cache/bg.png', width: 10, height: 10 }
      },
      {
        ...baseLayer,
        id: 2,
        name: 'Button Label'
      }
    ];
    const state = {
      ...createEmptyState(),
      project: createProjectFromSourceDocument({
        version: 1 as const,
        source: {
          path: '/tmp/menu.psb',
          fileName: 'menu.psb'
        },
        document: {
          width: 320,
          height: 180
        },
        sourceTree: sourceLayers,
        assetsDir: 'layers'
      })
    };

    const mergedNode = createExportNodeForSources('merged_button', sourceLayers, 'button');
    const appended = appendExportNode(state, mergedNode);

    expect(appended.selectedExportNodeId).toBe('merged_button');
    expect(appended.project?.exportTree[0]?.sourceLayerIds).toEqual([1, 2]);

    const removed = removeExportNode(appended, 'merged_button');

    expect(removed.selectedExportNodeId).toBeNull();
    expect(removed.project?.exportTree.some((node) => node.id === 'merged_button')).toBe(false);
  });

  test('moves export nodes among siblings', () => {
    const state = {
      ...createEmptyState(),
      project: createProjectFromSourceDocument({
      version: 1 as const,
      source: {
        path: '/tmp/menu.psb',
        fileName: 'menu.psb'
      },
      document: {
        width: 320,
        height: 180
      },
      sourceTree: [
        {
          ...baseLayer,
          id: 1,
          name: 'Logo',
          image: { path: 'cache/logo.png', width: 10, height: 10 }
        },
        {
          ...baseLayer,
          id: 2,
          name: 'Title',
          text: { value: 'Title' }
        }
      ],
      assetsDir: 'layers'
      })
    };

    const added = addSourceLayerToExportTree(addSourceLayerToExportTree(state, 1), 2);
    const movedUp = moveExportNode(added, 'source_2', 'up');
    const movedDown = moveExportNode(movedUp, 'source_2', 'down');

    expect(added.project?.exportTree.map((node) => node.id)).toEqual(['source_1', 'source_2']);
    expect(movedUp.project?.exportTree.map((node) => node.id)).toEqual(['source_2', 'source_1']);
    expect(movedDown.project?.exportTree.map((node) => node.id)).toEqual(['source_1', 'source_2']);
  });
});
