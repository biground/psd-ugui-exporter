import { describe, expect, test } from 'vitest';

import { createProjectAutoSaveScheduler } from '../src/app/auto-save';
import type { PSDUIProject } from '../src/schemas/psdui';

function createProject(name: string): PSDUIProject {
  return {
    version: 1,
    source: { path: `/tmp/${name}.psd`, fileName: `${name}.psd` },
    document: { width: 100, height: 100 },
    sourceTree: [],
    exportTree: [],
    cache: { assetsDir: 'layers' }
  };
}

describe('project auto save scheduler', () => {
  test('debounces project saves and writes only the latest project', async () => {
    const clearedTimers: number[] = [];
    const callbacks = new Map<number, () => void>();
    const saves: Array<{ projectPath: string; project: PSDUIProject }> = [];
    let nextTimerId = 1;

    const scheduler = createProjectAutoSaveScheduler({
      delayMs: 500,
      saveProject: async (request) => {
        saves.push(request);
      },
      timers: {
        setTimeout(callback) {
          const timerId = nextTimerId;
          nextTimerId += 1;
          callbacks.set(timerId, callback);
          return timerId;
        },
        clearTimeout(timerId) {
          clearedTimers.push(timerId);
          callbacks.delete(timerId);
        }
      }
    });

    scheduler.schedule({
      projectPath: '/tmp/first.psdui',
      project: createProject('first')
    });
    scheduler.schedule({
      projectPath: '/tmp/latest.psdui',
      project: createProject('latest')
    });

    expect(clearedTimers).toEqual([1]);
    expect(saves).toEqual([]);

    callbacks.get(2)?.();
    await Promise.resolve();

    expect(saves).toEqual([
      {
        projectPath: '/tmp/latest.psdui',
        project: createProject('latest')
      }
    ]);
  });
});
