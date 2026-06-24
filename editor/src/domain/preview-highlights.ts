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
  const selectedNode = flattenExportNodes(exportTree).find((node) => node.id === selectedExportNodeId);

  if (selectedNode === undefined || !isExportNodePreviewVisible(selectedNode, hiddenIds)) {
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

function isExportNodePreviewVisible(node: ExportNode, hiddenSourceLayerIds: Set<number>): boolean {
  return (
    node.sourceLayerIds.length === 0
    || node.sourceLayerIds.some((sourceLayerId) => !hiddenSourceLayerIds.has(sourceLayerId))
  );
}

function flattenExportNodes(exportTree: ExportNode[]): ExportNode[] {
  return exportTree.flatMap((node) => [node, ...flattenExportNodes(node.children)]);
}
