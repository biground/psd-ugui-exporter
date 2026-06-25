export interface TreePanelWidths {
  sourceWidth: number;
  exportWidth: number;
}

export interface WorkspacePanelWidths {
  treeWidth: number;
  previewWidth: number;
}

export interface TreePanelResizeInput {
  containerLeft: number;
  pointerX: number;
  totalWidth?: number;
  minWidth?: number;
}

export interface WorkspacePanelResizeInput {
  containerLeft: number;
  pointerX: number;
  totalWidth?: number;
  minTreeWidth?: number;
  minPreviewWidth?: number;
}

export const defaultTreePanelWidths: TreePanelWidths = {
  sourceWidth: 280,
  exportWidth: 280
};

export const defaultWorkspacePanelWidths: WorkspacePanelWidths = {
  treeWidth: 568,
  previewWidth: 720
};

export const treePanelMinWidth = 180;
export const workspaceTreePanelMinWidth = 420;
export const workspacePreviewPanelMinWidth = 360;

export function resizeTreePanelsFromPointer({
  containerLeft,
  pointerX,
  totalWidth = defaultTreePanelWidths.sourceWidth + defaultTreePanelWidths.exportWidth,
  minWidth = treePanelMinWidth
}: TreePanelResizeInput): TreePanelWidths {
  const maxSourceWidth = Math.max(minWidth, totalWidth - minWidth);
  const sourceWidth = clamp(Math.round(pointerX - containerLeft), minWidth, maxSourceWidth);

  return {
    sourceWidth,
    exportWidth: totalWidth - sourceWidth
  };
}

export function resizeWorkspacePanelsFromPointer({
  containerLeft,
  pointerX,
  totalWidth = defaultWorkspacePanelWidths.treeWidth + defaultWorkspacePanelWidths.previewWidth,
  minTreeWidth = workspaceTreePanelMinWidth,
  minPreviewWidth = workspacePreviewPanelMinWidth
}: WorkspacePanelResizeInput): WorkspacePanelWidths {
  const maxTreeWidth = Math.max(minTreeWidth, totalWidth - minPreviewWidth);
  const treeWidth = clamp(Math.round(pointerX - containerLeft), minTreeWidth, maxTreeWidth);

  return {
    treeWidth,
    previewWidth: totalWidth - treeWidth
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
