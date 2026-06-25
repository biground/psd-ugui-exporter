import {
  defaultTreePanelWidths,
  defaultWorkspacePanelWidths,
  type TreePanelWidths,
  type WorkspacePanelWidths
} from '../domain/tree-panel-resize';

export interface EditorLayout {
  version: 1;
  treePanelWidths: TreePanelWidths;
  workspacePanelWidths: WorkspacePanelWidths;
}

export interface EditorLayoutStore {
  load: () => EditorLayout;
  save: (layout: EditorLayout) => void;
}

const editorLayoutStorageKey = 'psdui.editor.layout.v1';

export const defaultEditorLayout: EditorLayout = {
  version: 1,
  treePanelWidths: defaultTreePanelWidths,
  workspacePanelWidths: defaultWorkspacePanelWidths
};

export function createEditorLayoutStore(
  storage: Pick<Storage, 'getItem' | 'setItem'>
): EditorLayoutStore {
  return {
    load: () => resolveStoredEditorLayout(storage.getItem(editorLayoutStorageKey)),
    save: (layout) => storage.setItem(editorLayoutStorageKey, JSON.stringify(layout))
  };
}

export function resolveStoredEditorLayout(value: string | null): EditorLayout {
  if (value === null) {
    return defaultEditorLayout;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!isEditorLayout(parsed)) {
      return defaultEditorLayout;
    }

    return parsed;
  } catch {
    return defaultEditorLayout;
  }
}

function isEditorLayout(value: unknown): value is EditorLayout {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const layout = value as Partial<EditorLayout>;

  return layout.version === 1
    && isTreePanelWidths(layout.treePanelWidths)
    && isWorkspacePanelWidths(layout.workspacePanelWidths);
}

function isTreePanelWidths(value: unknown): value is TreePanelWidths {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const widths = value as Partial<TreePanelWidths>;
  return isPositiveFiniteNumber(widths.sourceWidth)
    && isPositiveFiniteNumber(widths.exportWidth);
}

function isWorkspacePanelWidths(value: unknown): value is WorkspacePanelWidths {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const widths = value as Partial<WorkspacePanelWidths>;
  return isPositiveFiniteNumber(widths.treeWidth)
    && isPositiveFiniteNumber(widths.previewWidth);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
