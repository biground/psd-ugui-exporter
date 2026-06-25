import { describe, expect, test } from 'vitest';

import {
  createEditorLayoutStore,
  defaultEditorLayout,
  resolveStoredEditorLayout
} from '../src/app/editor-layout';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('editor layout persistence', () => {
  test('loads the saved editor panel widths', () => {
    const storage = new MemoryStorage();
    const store = createEditorLayoutStore(storage);
    const layout = {
      version: 1 as const,
      treePanelWidths: { sourceWidth: 320, exportWidth: 240 },
      workspacePanelWidths: { treeWidth: 620, previewWidth: 820 }
    };

    store.save(layout);

    expect(store.load()).toEqual(layout);
  });

  test('falls back to defaults when stored layout is missing or invalid', () => {
    expect(resolveStoredEditorLayout(null)).toEqual(defaultEditorLayout);
    expect(resolveStoredEditorLayout('not-json')).toEqual(defaultEditorLayout);
    expect(resolveStoredEditorLayout(JSON.stringify({ version: 99 }))).toEqual(defaultEditorLayout);
  });
});
