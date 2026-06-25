import { describe, expect, test } from 'vitest';

import {
  createRecentFilesStore,
  forgetRecentProject,
  getRecentOpenCandidates,
  recordRecentProject,
  recordRecentSource
} from '../src/app/recent-files';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('recent files', () => {
  test('returns no startup candidates when nothing was recorded', () => {
    const store = createRecentFilesStore(new MemoryStorage());

    expect(getRecentOpenCandidates(store.load())).toEqual([]);
  });

  test('prefers the last psdui project before the last psd source', () => {
    const store = createRecentFilesStore(new MemoryStorage());

    recordRecentSource(store, '/art/main-menu.psb');
    recordRecentProject(store, '/art/main-menu.psdui', '/art/main-menu.psb');

    expect(getRecentOpenCandidates(store.load())).toEqual([
      { kind: 'project', path: '/art/main-menu.psdui' },
      { kind: 'source', path: '/art/main-menu.psb' }
    ]);
  });

  test('keeps the previous source path when recording only a project path', () => {
    const store = createRecentFilesStore(new MemoryStorage());

    recordRecentSource(store, '/art/source.psd');
    recordRecentProject(store, '/art/project.psdui');

    expect(store.load()).toEqual({
      projectPath: '/art/project.psdui',
      sourcePath: '/art/source.psd'
    });
  });

  test('clears the previous project path when a source file becomes current', () => {
    const store = createRecentFilesStore(new MemoryStorage());

    recordRecentProject(store, '/art/old.psdui', '/art/old.psb');
    recordRecentSource(store, '/art/new.psd');

    expect(store.load()).toEqual({
      projectPath: null,
      sourcePath: '/art/new.psd'
    });
  });

  test('can forget a broken project path while keeping the source fallback', () => {
    const store = createRecentFilesStore(new MemoryStorage());

    recordRecentProject(store, '/missing/project.psdui', '/art/source.psb');
    forgetRecentProject(store);

    expect(store.load()).toEqual({
      projectPath: null,
      sourcePath: '/art/source.psb'
    });
  });

  test('ignores malformed stored data', () => {
    const storage = new MemoryStorage();
    storage.setItem('psdui-editor.recentFiles.v1', '{ nope');

    const store = createRecentFilesStore(storage);

    expect(store.load()).toEqual({ projectPath: null, sourcePath: null });
  });
});
