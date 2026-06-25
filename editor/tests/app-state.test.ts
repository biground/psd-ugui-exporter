import { describe, expect, test } from 'vitest';

import {
  addSourceLayerToExportTree,
  appendExportNode,
  createEmptyState,
  createExportNodeForSources,
  createProjectFromSourceDocument,
  mergeSelectedExportNodes,
  moveExportNode,
  moveExportNodeToDropTarget,
  removeExportNode,
  selectSourceLayer,
  toggleExportNodeSelection,
  toggleSourceLayerPreviewVisibility,
  unmergeExportNode
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

  test('toggles export node selection for multi-node editing', () => {
    const first = toggleExportNodeSelection(createEmptyState(), 'source_12');
    const second = toggleExportNodeSelection(first, 'source_13');
    const third = toggleExportNodeSelection(second, 'source_12');

    expect(first.selectedExportNodeIds).toEqual(['source_12']);
    expect(second.selectedExportNodeIds).toEqual(['source_12', 'source_13']);
    expect(third.selectedExportNodeIds).toEqual(['source_13']);
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
        exportKind: 'VGLayout',
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

  test('merges selected export nodes and restores them when unmerged', () => {
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
            name: 'Button BG',
            sourceBounds: { x: 10, y: 10, width: 80, height: 30 },
            rasterBounds: { x: 12, y: 12, width: 76, height: 26 },
            image: { path: 'cache/bg.png', width: 76, height: 26 }
          },
          {
            ...baseLayer,
            id: 2,
            name: 'Button Label',
            kind: 'text',
            sourceBounds: { x: 30, y: 18, width: 30, height: 14 },
            rasterBounds: { x: 0, y: 0, width: 0, height: 0 },
            text: { value: 'OK' }
          }
        ],
        assetsDir: 'layers'
      })
    };

    const added = addSourceLayerToExportTree(addSourceLayerToExportTree(state, 1), 2);
    const selected = toggleExportNodeSelection(
      toggleExportNodeSelection(added, 'source_1'),
      'source_2'
    );
    const merged = mergeSelectedExportNodes(selected, 'merged_button', 'button');

    expect(merged.selectedExportNodeId).toBe('merged_button');
    expect(merged.selectedExportNodeIds).toEqual([]);
    expect(merged.project?.exportTree).toMatchObject([
      {
        id: 'merged_button',
        exportKind: 'button',
        sourceLayerIds: [1, 2],
        rect: { x: 10, y: 10, width: 80, height: 30 },
        rasterBounds: { x: 12, y: 12, width: 76, height: 26 },
        mergedFrom: [
          { id: 'source_1', sourceLayerIds: [1] },
          { id: 'source_2', sourceLayerIds: [2] }
        ]
      }
    ]);

    const unmerged = unmergeExportNode(merged, 'merged_button');

    expect(unmerged.selectedExportNodeId).toBe('source_1');
    expect(unmerged.project?.exportTree.map((node) => node.id)).toEqual(['source_1', 'source_2']);
  });

  test('merges a single selected export node with its descendants', () => {
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
            sourceBounds: { x: 10, y: 10, width: 100, height: 40 },
            rasterBounds: { x: 0, y: 0, width: 0, height: 0 },
            children: [
              {
                ...baseLayer,
                id: 2,
                name: 'Label',
                kind: 'text',
                sourceBounds: { x: 30, y: 20, width: 40, height: 16 },
                rasterBounds: { x: 0, y: 0, width: 0, height: 0 },
                text: { value: 'Use' }
              }
            ]
          }
        ],
        assetsDir: 'layers'
      })
    };

    const added = addSourceLayerToExportTree(state, 1);
    const selected = toggleExportNodeSelection(added, 'source_1');
    const merged = mergeSelectedExportNodes(selected, 'merged_button', 'button');

    expect(merged.selectedExportNodeId).toBe('merged_button');
    expect(merged.project?.exportTree).toMatchObject([
      {
        id: 'merged_button',
        exportKind: 'button',
        sourceLayerIds: [1, 2],
        children: [],
        mergedFrom: [
          {
            id: 'source_1',
            children: [
              { id: 'source_2', sourceLayerIds: [2] }
            ]
          }
        ]
      }
    ]);
    expect(merged.message).toBe('Merged 2 export nodes into "Button".');

    const unmerged = unmergeExportNode(merged, 'merged_button');

    expect(unmerged.project?.exportTree[0]?.id).toBe('source_1');
    expect(unmerged.project?.exportTree[0]?.children[0]?.id).toBe('source_2');
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

  test('moves export nodes before after and inside arbitrary tree targets', () => {
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
          { ...baseLayer, id: 1, name: 'Root', kind: 'group' },
          { ...baseLayer, id: 2, name: 'Title', text: { value: 'Title' } },
          { ...baseLayer, id: 3, name: 'Icon', image: { path: 'cache/icon.png', width: 10, height: 10 } }
        ],
        assetsDir: 'layers'
      })
    };
    const added = addSourceLayerToExportTree(
      addSourceLayerToExportTree(addSourceLayerToExportTree(state, 1), 2),
      3
    );

    const inside = moveExportNodeToDropTarget(added, {
      draggedNodeId: 'source_2',
      targetNodeId: 'source_1',
      position: 'inside'
    });
    const after = moveExportNodeToDropTarget(inside, {
      draggedNodeId: 'source_3',
      targetNodeId: 'source_1',
      position: 'after'
    });
    const before = moveExportNodeToDropTarget(after, {
      draggedNodeId: 'source_2',
      targetNodeId: 'source_3',
      position: 'before'
    });

    expect(inside.project?.exportTree.map((node) => node.id)).toEqual(['source_1', 'source_3']);
    expect(inside.project?.exportTree[0]?.children.map((node) => node.id)).toEqual(['source_2']);
    expect(after.project?.exportTree.map((node) => node.id)).toEqual(['source_1', 'source_3']);
    expect(before.project?.exportTree.map((node) => node.id)).toEqual(['source_1', 'source_2', 'source_3']);
    expect(before.project?.exportTree[0]?.children).toEqual([]);
    expect(before.selectedExportNodeId).toBe('source_2');
  });

  test('does not move export nodes into their own descendants', () => {
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
            name: 'Root',
            kind: 'group',
            children: [
              { ...baseLayer, id: 2, name: 'Child', text: { value: 'Child' } }
            ]
          }
        ],
        assetsDir: 'layers'
      })
    };
    const added = addSourceLayerToExportTree(state, 1);

    const moved = moveExportNodeToDropTarget(added, {
      draggedNodeId: 'source_1',
      targetNodeId: 'source_2',
      position: 'inside'
    });

    expect(moved.project?.exportTree).toEqual(added.project?.exportTree);
    expect(moved.message).toBe('Cannot move an export node into itself.');
  });
});
