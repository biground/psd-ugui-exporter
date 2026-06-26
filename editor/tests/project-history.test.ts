import { describe, expect, test } from 'vitest';

import {
  createEmptyProjectHistory,
  recordProjectHistory,
  redoProject,
  undoProject
} from '../src/app/project-history';
import type { PSDUIProject } from '../src/schemas/psdui';

function createProject(nodeName: string): PSDUIProject {
  return {
    version: 1,
    source: { path: '/tmp/menu.psd', fileName: 'menu.psd' },
    document: { width: 100, height: 100 },
    sourceTree: [],
    exportTree: [
      {
        id: 'source_1',
        name: nodeName,
        exportKind: 'image',
        enabled: true,
        sourceLayerIds: [1],
        rect: { x: 0, y: 0, width: 10, height: 10 },
        rasterBounds: null,
        list: null,
        scale9: null,
        children: []
      }
    ],
    cache: { assetsDir: 'layers' }
  };
}

describe('project history', () => {
  test('undoes and redoes project snapshots', () => {
    const before = createProject('Before');
    const after = createProject('After');
    const recorded = recordProjectHistory(createEmptyProjectHistory(), before, after);

    const undone = undoProject(recorded, after);
    const redone = undone === null ? null : redoProject(undone.history, undone.project);

    expect(undone?.project.exportTree[0]?.name).toBe('Before');
    expect(redone?.project.exportTree[0]?.name).toBe('After');
  });

  test('does not record unchanged projects and clears redo on a new edit', () => {
    const first = createProject('First');
    const second = createProject('Second');
    const third = createProject('Third');
    const unchanged = recordProjectHistory(createEmptyProjectHistory(), first, first);
    const recorded = recordProjectHistory(unchanged, first, second);
    const undone = undoProject(recorded, second);

    expect(unchanged.past).toEqual([]);
    expect(undone?.history.future).toHaveLength(1);

    const next = recordProjectHistory(undone!.history, first, third);

    expect(next.future).toEqual([]);
    expect(next.past).toHaveLength(1);
  });
});
