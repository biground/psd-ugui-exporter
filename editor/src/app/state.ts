import { createExportNodeFromSources } from '../domain/export-tree';
import type { ExportKind, ExportNode, ListSettings, PSDUIProject } from '../schemas/psdui';
import type { SourceLayer } from '../schemas/source';
import { unionRects } from '../domain/rect';

export interface AppState {
  project: PSDUIProject | null;
  selectedSourceLayerIds: number[];
  hiddenSourceLayerIds: number[];
  selectedExportNodeId: string | null;
  selectedExportNodeIds: string[];
  message: string | null;
}

export type SourceDocumentInput = Omit<PSDUIProject, 'exportTree' | 'cache'> & {
  assetsDir: string;
};

type ExportNodeUpdater = Partial<ExportNode> | ((node: ExportNode) => ExportNode);
export type MoveDirection = 'up' | 'down';
export type ExportNodeDropPosition = 'before' | 'inside' | 'after';

export interface ExportNodeDropTarget {
  draggedNodeId: string;
  targetNodeId: string;
  position: ExportNodeDropPosition;
}

export function createEmptyState(): AppState {
  return {
    project: null,
    selectedSourceLayerIds: [],
    hiddenSourceLayerIds: [],
    selectedExportNodeId: null,
    selectedExportNodeIds: [],
    message: null
  };
}

export function selectSourceLayer(state: AppState, layerId: number): AppState {
  return {
    ...state,
    selectedSourceLayerIds: [layerId]
  };
}

export function toggleExportNodeSelection(state: AppState, nodeId: string): AppState {
  const isSelected = state.selectedExportNodeIds.includes(nodeId);

  return {
    ...state,
    selectedExportNodeIds: isSelected
      ? state.selectedExportNodeIds.filter((selectedNodeId) => selectedNodeId !== nodeId)
      : [...state.selectedExportNodeIds, nodeId]
  };
}

export function toggleSourceLayerPreviewVisibility(state: AppState, layerId: number): AppState {
  if (state.project === null) {
    return state;
  }

  const layerIds = collectSourceLayerAndDescendantIds(state.project.sourceTree, layerId);
  const hiddenIds = new Set(state.hiddenSourceLayerIds);
  const shouldShow = hiddenIds.has(layerId);

  for (const id of layerIds) {
    if (shouldShow) {
      hiddenIds.delete(id);
    } else {
      hiddenIds.add(id);
    }
  }

  return {
    ...state,
    hiddenSourceLayerIds: [...hiddenIds]
  };
}

export function flattenSourceLayers(sourceTree: SourceLayer[]): SourceLayer[] {
  return sourceTree.flatMap((layer) => [layer, ...flattenSourceLayers(layer.children)]);
}

export function findSourceLayersByIds(sourceTree: SourceLayer[], layerIds: number[]): SourceLayer[] {
  const selectedIds = new Set(layerIds);

  return flattenSourceLayers(sourceTree).filter((layer) => selectedIds.has(layer.id));
}

export function flattenExportNodes(exportTree: ExportNode[]): ExportNode[] {
  return exportTree.flatMap((node) => [node, ...flattenExportNodes(node.children)]);
}

export function findExportNodeById(exportTree: ExportNode[], nodeId: string | null): ExportNode | null {
  if (nodeId === null) {
    return null;
  }

  return flattenExportNodes(exportTree).find((node) => node.id === nodeId) ?? null;
}

export function createProjectFromSourceDocument(sourceDocument: SourceDocumentInput): PSDUIProject {
  return {
    version: 1,
    source: sourceDocument.source,
    document: sourceDocument.document,
    sourceTree: sourceDocument.sourceTree,
    exportTree: [],
    cache: {
      assetsDir: sourceDocument.assetsDir
    }
  };
}

export function createExportNodeForSources(
  id: string,
  sourceLayers: SourceLayer[],
  exportKind: ExportKind = inferExportKind(sourceLayers[0])
): ExportNode {
  const firstSource = sourceLayers[0];

  return createExportNodeFromSources({
    id,
    name: firstSource?.name ?? 'ExportNode',
    exportKind,
    sourceLayers
  });
}

export function addSourceLayerToExportTree(state: AppState, layerId: number): AppState {
  if (state.project === null) {
    return {
      ...state,
      message: 'Open a PSD/PSB before adding export nodes.'
    };
  }

  const sourceLayer = findSourceLayersByIds(state.project.sourceTree, [layerId])[0];

  if (sourceLayer === undefined) {
    return {
      ...state,
      message: `Source layer "${layerId}" was not found.`
    };
  }

  const sourceLayerIds = flattenSourceLayers([sourceLayer]).map((layer) => layer.id);
  const duplicatedSourceLayerIds = sourceLayerIds.filter((sourceLayerId) =>
    isSourceLayerAlreadyExported(state.project!.exportTree, sourceLayerId)
  );

  if (duplicatedSourceLayerIds.length > 0 && duplicatedSourceLayerIds.includes(layerId)) {
    return {
      ...state,
      message: `Source layer "${sourceLayer.name}" is already in the export tree.`
    };
  }

  if (duplicatedSourceLayerIds.length > 0) {
    return {
      ...state,
      message: `Source layer "${sourceLayer.name}" overlaps with existing export nodes.`
    };
  }

  return appendExportNode(state, createExportNodeFromSourceSubtree(sourceLayer));
}

export function appendExportNode(state: AppState, node: ExportNode): AppState {
  if (state.project === null) {
    return {
      ...state,
      message: 'Open a PSD/PSB before creating export nodes.'
    };
  }

  const duplicatedSourceLayerIds = node.sourceLayerIds.filter((sourceLayerId) =>
    isSourceLayerAlreadyExported(state.project!.exportTree, sourceLayerId)
  );

  if (duplicatedSourceLayerIds.length > 0) {
    return {
      ...state,
      message: `Source layer ids already exist in Export Tree: ${duplicatedSourceLayerIds.join(', ')}.`
    };
  }

  return {
    ...state,
    project: {
      ...state.project,
      exportTree: [...state.project.exportTree, node]
    },
    selectedExportNodeId: node.id,
    selectedExportNodeIds: [],
    message: `Created export node "${node.name}".`
  };
}

export function mergeSelectedExportNodes(
  state: AppState,
  id: string,
  exportKind: ExportKind
): AppState {
  if (state.project === null) {
    return {
      ...state,
      message: 'Open a PSD/PSB before merging export nodes.'
    };
  }

  const selectedNodeIds = new Set(state.selectedExportNodeIds);
  const selectedNodes = flattenExportNodes(state.project.exportTree).filter((node) =>
    selectedNodeIds.has(node.id)
  );
  const selectedNodeCount = selectedNodes.length;
  const canMergeSingleSubtree = selectedNodeCount === 1 && selectedNodes[0]!.children.length > 0;

  if (selectedNodeCount < 2 && !canMergeSingleSubtree) {
    return {
      ...state,
      message: 'Select at least two export nodes before merging.'
    };
  }

  const mergedNode = createExportNodeFromExportNodes(id, selectedNodes, exportKind);

  return {
    ...state,
    project: {
      ...state.project,
      exportTree: [
        ...removeExportNodesFromTree(state.project.exportTree, selectedNodeIds),
        mergedNode
      ]
    },
    selectedExportNodeId: mergedNode.id,
    selectedExportNodeIds: [],
    message: `Merged ${flattenExportNodes(selectedNodes).length} export nodes into "${mergedNode.name}".`
  };
}

export function unmergeExportNode(state: AppState, nodeId: string): AppState {
  if (state.project === null) {
    return state;
  }

  const node = findExportNodeById(state.project.exportTree, nodeId);

  if (node?.mergedFrom === undefined || node.mergedFrom.length === 0) {
    return {
      ...state,
      message: `Export node "${nodeId}" has no merge history.`
    };
  }

  const restoredNodes = node.mergedFrom.map(cloneExportNode);

  return {
    ...state,
    project: {
      ...state.project,
      exportTree: replaceExportNodeWithNodes(state.project.exportTree, nodeId, restoredNodes)
    },
    selectedExportNodeId: restoredNodes[0]?.id ?? null,
    selectedExportNodeIds: [],
    message: `Unmerged export node "${node.name}".`
  };
}

export function updateExportNode(state: AppState, nodeId: string, updater: ExportNodeUpdater): AppState {
  if (state.project === null) {
    return state;
  }

  return {
    ...state,
    project: {
      ...state.project,
      exportTree: updateExportTree(state.project.exportTree, nodeId, updater)
    }
  };
}

export function removeExportNode(state: AppState, nodeId: string): AppState {
  if (state.project === null) {
    return state;
  }

  const removedNode = findExportNodeById(state.project.exportTree, nodeId);
  const removedNodeIds = new Set(
    removedNode === null ? [nodeId] : flattenExportNodes([removedNode]).map((node) => node.id)
  );

  return {
    ...state,
    project: {
      ...state.project,
      exportTree: removeExportNodeFromTree(state.project.exportTree, nodeId)
    },
    selectedExportNodeId:
      state.selectedExportNodeId !== null && removedNodeIds.has(state.selectedExportNodeId)
        ? null
        : state.selectedExportNodeId,
    selectedExportNodeIds: state.selectedExportNodeIds.filter(
      (selectedNodeId) => !removedNodeIds.has(selectedNodeId)
    ),
    message: `Removed export node "${nodeId}".`
  };
}

export function moveExportNode(state: AppState, nodeId: string, direction: MoveDirection): AppState {
  if (state.project === null) {
    return state;
  }

  return {
    ...state,
    project: {
      ...state.project,
      exportTree: moveExportNodeInTree(state.project.exportTree, nodeId, direction)
    },
    selectedExportNodeId: nodeId
  };
}

export function moveExportNodeToDropTarget(
  state: AppState,
  target: ExportNodeDropTarget
): AppState {
  if (state.project === null) {
    return state;
  }

  if (target.draggedNodeId === target.targetNodeId) {
    return {
      ...state,
      message: 'Cannot move an export node into itself.'
    };
  }

  const draggedNode = findExportNodeById(state.project.exportTree, target.draggedNodeId);
  const targetNode = findExportNodeById(state.project.exportTree, target.targetNodeId);

  if (draggedNode === null || targetNode === null) {
    return state;
  }

  const draggedNodeIds = new Set(flattenExportNodes([draggedNode]).map((node) => node.id));
  if (draggedNodeIds.has(target.targetNodeId)) {
    return {
      ...state,
      message: 'Cannot move an export node into itself.'
    };
  }

  const movingNode = cloneExportNode(draggedNode);
  const treeWithoutMovingNode = removeExportNodeFromTree(state.project.exportTree, target.draggedNodeId);

  return {
    ...state,
    project: {
      ...state.project,
      exportTree: insertExportNodeAtDropTarget(treeWithoutMovingNode, movingNode, target)
    },
    selectedExportNodeId: target.draggedNodeId,
    message: `Moved export node "${movingNode.name}".`
  };
}

export function collectExportedSourceLayerIds(exportTree: ExportNode[]): number[] {
  return [...new Set(flattenExportNodes(exportTree).flatMap((node) => node.sourceLayerIds))];
}

export function collectPreviewExportedSourceLayerIds(exportTree: ExportNode[]): number[] {
  return [
    ...new Set(exportTree.flatMap((node) => collectEnabledExportNodeSourceLayerIds(node, true)))
  ];
}

function collectSourceLayerAndDescendantIds(sourceTree: SourceLayer[], layerId: number): number[] {
  for (const layer of sourceTree) {
    if (layer.id === layerId) {
      return flattenSourceLayers([layer]).map((sourceLayer) => sourceLayer.id);
    }

    const childIds = collectSourceLayerAndDescendantIds(layer.children, layerId);
    if (childIds.length > 0) {
      return childIds;
    }
  }

  return [];
}

function collectEnabledExportNodeSourceLayerIds(
  node: ExportNode,
  ancestorsEnabled: boolean
): number[] {
  const isEnabled = ancestorsEnabled && node.enabled;

  if (!isEnabled) {
    return [];
  }

  return [
    ...node.sourceLayerIds,
    ...node.children.flatMap((child) => collectEnabledExportNodeSourceLayerIds(child, isEnabled))
  ];
}

function isSourceLayerAlreadyExported(exportTree: ExportNode[], layerId: number): boolean {
  return collectExportedSourceLayerIds(exportTree).includes(layerId);
}

function updateExportTree(
  exportTree: ExportNode[],
  nodeId: string,
  updater: ExportNodeUpdater
): ExportNode[] {
  return exportTree.map((node) => {
    if (node.id === nodeId) {
      const nextNode = typeof updater === 'function' ? updater(node) : { ...node, ...updater };
      return normalizeExportNode(nextNode);
    }

    return {
      ...node,
      children: updateExportTree(node.children, nodeId, updater)
    };
  });
}

function moveExportNodeInTree(
  exportTree: ExportNode[],
  nodeId: string,
  direction: MoveDirection
): ExportNode[] {
  const index = exportTree.findIndex((node) => node.id === nodeId);

  if (index >= 0) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= exportTree.length) {
      return exportTree;
    }

    const nextTree = [...exportTree];
    const [node] = nextTree.splice(index, 1);
    nextTree.splice(targetIndex, 0, node);
    return nextTree;
  }

  return exportTree.map((node) => ({
    ...node,
    children: moveExportNodeInTree(node.children, nodeId, direction)
  }));
}

function removeExportNodeFromTree(exportTree: ExportNode[], nodeId: string): ExportNode[] {
  return exportTree
    .filter((node) => node.id !== nodeId)
    .map((node) => ({
      ...node,
      children: removeExportNodeFromTree(node.children, nodeId)
    }));
}

function insertExportNodeAtDropTarget(
  exportTree: ExportNode[],
  movingNode: ExportNode,
  target: ExportNodeDropTarget
): ExportNode[] {
  return exportTree.flatMap((node) => {
    if (node.id === target.targetNodeId) {
      if (target.position === 'before') {
        return [movingNode, node];
      }

      if (target.position === 'after') {
        return [node, movingNode];
      }

      return [
        {
          ...node,
          children: [...node.children, movingNode]
        }
      ];
    }

    return {
      ...node,
      children: insertExportNodeAtDropTarget(node.children, movingNode, target)
    };
  });
}

function removeExportNodesFromTree(exportTree: ExportNode[], nodeIds: Set<string>): ExportNode[] {
  return exportTree
    .filter((node) => !nodeIds.has(node.id))
    .map((node) => ({
      ...node,
      children: removeExportNodesFromTree(node.children, nodeIds)
    }));
}

function replaceExportNodeWithNodes(
  exportTree: ExportNode[],
  nodeId: string,
  replacementNodes: ExportNode[]
): ExportNode[] {
  return exportTree.flatMap((node) => {
    if (node.id === nodeId) {
      return replacementNodes;
    }

    return {
      ...node,
      children: replaceExportNodeWithNodes(node.children, nodeId, replacementNodes)
    };
  });
}

function createExportNodeFromExportNodes(
  id: string,
  exportNodes: ExportNode[],
  exportKind: ExportKind
): ExportNode {
  const flattenedNodes = exportNodes.flatMap((node) => flattenExportNodes([node]));
  const sourceLayerIds = [
    ...new Set(flattenedNodes.flatMap((node) => node.sourceLayerIds))
  ];
  const rasterBounds = flattenedNodes
    .map((node) => node.rasterBounds)
    .filter((rect) => rect !== null);

  return normalizeExportNode({
    id,
    name: exportNodes[0]?.name ?? 'Merged Export Node',
    exportKind,
    enabled: true,
    sourceLayerIds,
    rect: unionRects(flattenedNodes.map((node) => node.rect)),
    rasterBounds: rasterBounds.length > 0 ? unionRects(rasterBounds) : null,
    list: null,
    scale9: null,
    children: [],
    mergedFrom: exportNodes.map(cloneExportNode)
  });
}

function cloneExportNode(node: ExportNode): ExportNode {
  return {
    ...node,
    rect: { ...node.rect },
    rasterBounds: node.rasterBounds === null ? null : { ...node.rasterBounds },
    list: node.list === null
      ? null
      : {
          ...node.list,
          padding: { ...node.list.padding }
        },
    scale9: node.scale9 === null || node.scale9 === undefined
      ? null
      : {
          ...node.scale9,
          border: { ...node.scale9.border }
        },
    children: node.children.map(cloneExportNode),
    mergedFrom: node.mergedFrom?.map(cloneExportNode)
  };
}

function inferExportKind(sourceLayer: SourceLayer | undefined): ExportKind {
  if (sourceLayer?.kind === 'group') {
    return 'VGLayout';
  }

  if (sourceLayer?.text !== null && sourceLayer?.text !== undefined) {
    return 'text';
  }

  return 'image';
}

function createExportNodeFromSourceSubtree(sourceLayer: SourceLayer): ExportNode {
  return {
    ...createExportNodeForSources(`source_${sourceLayer.id}`, [sourceLayer]),
    children: sourceLayer.children.map((child) => createExportNodeFromSourceSubtree(child))
  };
}

function normalizeExportNode(node: ExportNode): ExportNode {
  if (node.exportKind === 'list') {
    return {
      ...node,
      list: node.list ?? createDefaultListSettings(),
      scale9: null
    };
  }

  return {
    ...node,
    list: null,
    scale9: node.exportKind === 'image' ? node.scale9 ?? null : null
  };
}

function createDefaultListSettings(): ListSettings {
  return {
    direction: 'vertical',
    cellTemplateNodeId: null,
    spacing: 0,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  };
}
