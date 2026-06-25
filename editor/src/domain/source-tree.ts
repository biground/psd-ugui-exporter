import type { ExportKind, ExportNode } from '../schemas/psdui';
import type { SourceLayer } from '../schemas/source';
import { createExportNodeFromSources } from './export-tree';

export function createDefaultExportTree(sourceTree: SourceLayer[]): ExportNode[] {
  return sourceTree.flatMap((layer) => {
    const node = createDefaultExportNode(layer);
    return node === null ? [] : [node];
  });
}

function createDefaultExportNode(layer: SourceLayer): ExportNode | null {
  if (!layer.visible) {
    return null;
  }

  const node = createExportNodeFromSources({
    id: `source_${layer.id}`,
    name: layer.name,
    exportKind: inferExportKind(layer),
    sourceLayers: [layer]
  });

  node.children = createDefaultExportTree(layer.children);

  return node;
}

function inferExportKind(layer: SourceLayer): ExportKind {
  if (layer.kind === 'group') {
    return 'VGLayout';
  }

  if (layer.text) {
    return 'text';
  }

  return 'image';
}
