import type { ExportNode } from '../schemas/psdui';
import type { Rect, SourceLayer } from '../schemas/source';

export type PreviewMode = 'source' | 'export';

export interface CanvasHighlight {
  id: string;
  name: string;
  kind: 'source' | 'export';
  rect: Rect;
}

interface CollectCanvasHighlightsOptions {
  mode: PreviewMode;
  sourceTree: SourceLayer[];
  exportTree: ExportNode[];
  selectedSourceLayerIds: number[];
  selectedExportNodeId: string | null;
  hiddenSourceLayerIds: number[];
}

export function collectCanvasHighlights({
  mode,
  sourceTree,
  exportTree,
  selectedSourceLayerIds,
  selectedExportNodeId,
  hiddenSourceLayerIds
}: CollectCanvasHighlightsOptions): CanvasHighlight[] {
  if (mode === 'source') {
    return collectSourceHighlights(sourceTree, selectedSourceLayerIds, hiddenSourceLayerIds);
  }

  if (selectedExportNodeId === null) {
    return [];
  }

  const hiddenIds = new Set(hiddenSourceLayerIds);
  const selectedNode = findVisibleExportNodeById(exportTree, selectedExportNodeId, hiddenIds, true);

  if (selectedNode === null) {
    return [];
  }

  return [
    {
      id: selectedNode.id,
      name: selectedNode.name,
      kind: 'export',
      rect: selectedNode.rect
    }
  ];
}

function collectSourceHighlights(
  sourceTree: SourceLayer[],
  selectedSourceLayerIds: number[],
  hiddenSourceLayerIds: number[]
): CanvasHighlight[] {
  const selectedIds = new Set(selectedSourceLayerIds);
  const hiddenIds = new Set(hiddenSourceLayerIds);

  return collectSourceHighlightsRecursive(sourceTree, selectedIds, hiddenIds, true);
}

function collectSourceHighlightsRecursive(
  sourceTree: SourceLayer[],
  selectedIds: Set<number>,
  hiddenIds: Set<number>,
  ancestorsVisible: boolean
): CanvasHighlight[] {
  return sourceTree.flatMap((layer) => {
    const isPreviewVisible = ancestorsVisible && layer.visible && !hiddenIds.has(layer.id);
    const ownHighlight =
      isPreviewVisible && selectedIds.has(layer.id)
        ? [
            {
              id: `source_${layer.id}`,
              name: layer.name,
              kind: 'source' as const,
              rect: layer.sourceBounds
            }
          ]
        : [];

    return [
      ...ownHighlight,
      ...collectSourceHighlightsRecursive(layer.children, selectedIds, hiddenIds, isPreviewVisible)
    ];
  });
}

function findVisibleExportNodeById(
  exportTree: ExportNode[],
  nodeId: string,
  hiddenSourceLayerIds: Set<number>,
  ancestorsEnabled: boolean
): ExportNode | null {
  for (const node of exportTree) {
    const isVisible = ancestorsEnabled
      && node.enabled
      && isExportNodePreviewVisible(node, hiddenSourceLayerIds);

    if (node.id === nodeId) {
      return isVisible ? node : null;
    }

    const childMatch = findVisibleExportNodeById(
      node.children,
      nodeId,
      hiddenSourceLayerIds,
      isVisible
    );

    if (childMatch !== null) {
      return childMatch;
    }
  }

  return null;
}

function isExportNodePreviewVisible(node: ExportNode, hiddenSourceLayerIds: Set<number>): boolean {
  return (
    node.sourceLayerIds.length === 0
    || node.sourceLayerIds.some((sourceLayerId) => !hiddenSourceLayerIds.has(sourceLayerId))
  );
}
