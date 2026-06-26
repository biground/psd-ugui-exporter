export interface EditorSettings {
  version: 1;
  prefixShortcuts: string[];
}

export interface EditorSettingsStore {
  load: () => EditorSettings;
  save: (settings: EditorSettings) => void;
}

const editorSettingsStorageKey = 'psdui.editor.settings.v1';
const prefixShortcutCount = 9;

export const defaultEditorSettings: EditorSettings = {
  version: 1,
  prefixShortcuts: Array.from({ length: prefixShortcutCount }, () => '')
};

export function createEditorSettingsStore(
  storage: Pick<Storage, 'getItem' | 'setItem'>
): EditorSettingsStore {
  return {
    load: () => resolveStoredEditorSettings(storage.getItem(editorSettingsStorageKey)),
    save: (settings) => storage.setItem(editorSettingsStorageKey, JSON.stringify(settings))
  };
}

export function resolveStoredEditorSettings(value: string | null): EditorSettings {
  if (value === null) {
    return defaultEditorSettings;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isEditorSettings(parsed) ? parsed : defaultEditorSettings;
  } catch {
    return defaultEditorSettings;
  }
}

function isEditorSettings(value: unknown): value is EditorSettings {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const settings = value as Partial<EditorSettings>;

  return settings.version === 1
    && Array.isArray(settings.prefixShortcuts)
    && settings.prefixShortcuts.length === prefixShortcutCount
    && settings.prefixShortcuts.every((prefix) => typeof prefix === 'string');
}
