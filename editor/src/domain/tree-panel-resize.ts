export interface TreePanelWidths {
  sourceWidth: number;
  exportWidth: number;
}

export interface TreePanelResizeInput {
  containerLeft: number;
  pointerX: number;
  totalWidth?: number;
  minWidth?: number;
}

export const defaultTreePanelWidths: TreePanelWidths = {
  sourceWidth: 280,
  exportWidth: 280
};

export const treePanelMinWidth = 180;

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
