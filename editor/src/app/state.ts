import { createExportNodeFromSources } from '../domain/export-tree';
import { createDefaultExportTree } from '../domain/source-tree';
import type { ExportKind, ExportNode, ListSettings, PSDUIProject } from '../schemas/psdui';
import type { SourceLayer } from '../schemas/source';

export interface AppState {
  project: PSDUIProject | null;
  selectedSourceLayerIds: number[];
  hiddenSourceLayerIds: number[];
  selectedExportNodeId: string | null;
  message: string | null;
}

export type SourceDocumentInput = Omit<PSDUIProject, 'exportTree' | 'cache'> & {
  assetsDir: string;
};

type ExportNodeUpdater = Partial<ExportNode> | ((node: ExportNode) => ExportNode);

export function createEmptyState(): AppState {
  return {
    project: null,
    selectedSourceLayerIds: [],
    hiddenSourceLayerIds: [],
    selectedExportNodeId: null,
    message: null
  };
}

export function selectSourceLayer(state: AppState, layerId: number): AppState {
  return {
    ...state,
    selectedSourceLayerIds: [layerId]
  };
}

export function toggleSourceLayerSelection(state: AppState, layerId: number): AppState {
  const isSelected = state.selectedSourceLayerIds.includes(layerId);

  return {
    ...state,
    selectedSourceLayerIds: isSelected
      ? state.selectedSourceLayerIds.filter((selectedLayerId) => selectedLayerId !== layerId)
      : [...state.selectedSourceLayerIds, layerId]
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
    exportTree: createDefaultExportTree(sourceDocument.sourceTree),
    cache: {
      assetsDir: sourceDocument.assetsDir
    }
  };
}

export function createExportNodeForSources(
  id: string,
  sourceLayers: SourceLayer[],
  exportKind: ExportKind = 'image'
): ExportNode {
  const firstSource = sourceLayers[0];

  return createExportNodeFromSources({
    id,
    name: firstSource?.name ?? 'ExportNode',
    exportKind,
    sourceLayers
  });
}

export function appendExportNode(state: AppState, node: ExportNode): AppState {
  if (state.project === null) {
    return {
      ...state,
      message: 'Open a PSD/PSB before creating export nodes.'
    };
  }

  return {
    ...state,
    project: {
      ...state.project,
      exportTree: [...state.project.exportTree, node]
    },
    selectedExportNodeId: node.id,
    message: `Created export node "${node.name}".`
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

  return {
    ...state,
    project: {
      ...state.project,
      exportTree: removeExportNodeFromTree(state.project.exportTree, nodeId)
    },
    selectedExportNodeId: state.selectedExportNodeId === nodeId ? null : state.selectedExportNodeId,
    message: `Unmerged export node "${nodeId}".`
  };
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

function removeExportNodeFromTree(exportTree: ExportNode[], nodeId: string): ExportNode[] {
  return exportTree
    .filter((node) => node.id !== nodeId)
    .map((node) => ({
      ...node,
      children: removeExportNodeFromTree(node.children, nodeId)
    }));
}

function normalizeExportNode(node: ExportNode): ExportNode {
  if (node.exportKind === 'list') {
    return {
      ...node,
      list: node.list ?? createDefaultListSettings()
    };
  }

  return {
    ...node,
    list: null
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
