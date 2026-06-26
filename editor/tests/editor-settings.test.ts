import { describe, expect, test } from 'vitest';

import {
  createEditorSettingsStore,
  defaultEditorSettings,
  resolveStoredEditorSettings
} from '../src/app/editor-settings';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('editor settings persistence', () => {
  test('loads saved prefix shortcuts', () => {
    const storage = new MemoryStorage();
    const store = createEditorSettingsStore(storage);
    const settings = {
      version: 1 as const,
      prefixShortcuts: ['Btn', 'Img', 'Txt', 'Node', 'Item', 'List', 'VG', 'HG', 'Icon']
    };

    store.save(settings);

    expect(store.load()).toEqual(settings);
  });

  test('falls back to defaults when stored settings are missing or invalid', () => {
    expect(resolveStoredEditorSettings(null)).toEqual(defaultEditorSettings);
    expect(resolveStoredEditorSettings('not-json')).toEqual(defaultEditorSettings);
    expect(resolveStoredEditorSettings(JSON.stringify({ version: 1, prefixShortcuts: ['Btn'] })))
      .toEqual(defaultEditorSettings);
  });
});
