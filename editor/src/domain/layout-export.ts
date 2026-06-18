import type { UILayoutDocument, UILayoutNode } from '../schemas/layout';
import type { ExportNode, ListSettings, PSDUIProject } from '../schemas/psdui';
import type { Rect } from '../schemas/source';

function copyRect(rect: Rect): Rect {
  return { ...rect };
}

function copyListSettings(list: ListSettings | null): ListSettings | null {
  if (list === null) {
    return null;
  }

  return {
    direction: list.direction,
    cellTemplateNodeId: list.cellTemplateNodeId,
    spacing: list.spacing,
    padding: { ...list.padding }
  };
}

function createLayoutNode(node: ExportNode): UILayoutNode | null {
  if (!node.enabled) {
    return null;
  }

  return {
    id: node.id,
    name: node.name,
    exportKind: node.exportKind,
    rect: copyRect(node.rect),
    rasterBounds: node.rasterBounds === null ? null : copyRect(node.rasterBounds),
    sourceLayerIds: [...node.sourceLayerIds],
    list: copyListSettings(node.list),
    children: node.children.flatMap((child) => {
      const layoutChild = createLayoutNode(child);
      return layoutChild === null ? [] : [layoutChild];
    })
  };
}

export function createLayoutDocument(project: PSDUIProject): UILayoutDocument {
  return {
    version: 1,
    document: { ...project.document },
    nodes: project.exportTree.flatMap((child) => {
      const layoutNode = createLayoutNode(child);
      return layoutNode === null ? [] : [layoutNode];
    })
  };
}
