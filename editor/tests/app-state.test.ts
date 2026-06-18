import { describe, expect, test } from 'vitest';

import {
  createEmptyState,
  createProjectFromSourceDocument,
  selectSourceLayer,
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

  test('creates a project from a worker source document with default export nodes', () => {
    const sourceDocument = {
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
      cache: {
        assetsDir: '/tmp/cache'
      }
    };

    const project = createProjectFromSourceDocument(sourceDocument);

    expect(project).toMatchObject({
      version: 1,
      source: sourceDocument.source,
      document: sourceDocument.document,
      sourceTree: sourceDocument.sourceTree,
      cache: sourceDocument.cache,
      exportTree: [
        {
          id: 'source_1',
          name: 'Logo',
          exportKind: 'image',
          sourceLayerIds: [1]
        }
      ]
    });
  });
});
