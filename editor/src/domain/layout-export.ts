import type { UILayoutDocument, UILayoutNode } from '../schemas/layout';
import type { ExportNode, PSDUIProject } from '../schemas/psdui';

function createLayoutNode(node: ExportNode): UILayoutNode | null {
  if (!node.enabled) {
    return null;
  }

  return {
    id: node.id,
    name: node.name,
    exportKind: node.exportKind,
    rect: node.rect,
    rasterBounds: node.rasterBounds,
    sourceLayerIds: node.sourceLayerIds,
    list: node.list,
    children: node.children.flatMap((child) => {
      const layoutChild = createLayoutNode(child);
      return layoutChild === null ? [] : [layoutChild];
    })
  };
}

export function createLayoutDocument(project: PSDUIProject): UILayoutDocument {
  return {
    version: 1,
    document: project.document,
    nodes: project.exportTree.flatMap((child) => {
      const layoutNode = createLayoutNode(child);
      return layoutNode === null ? [] : [layoutNode];
    })
  };
}
