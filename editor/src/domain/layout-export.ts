import type { ExportKind, ListSettings, PSDUIProject } from '../schemas/psdui';
import type { Rect } from '../schemas/source';

interface LayoutDocumentSize {
  width: number;
  height: number;
}

type ProjectWithDocument = PSDUIProject & {
  document: LayoutDocumentSize;
};

export interface UILayoutNode {
  id: string;
  name: string;
  exportKind: ExportKind;
  rect: Rect;
  rasterBounds: Rect | null;
  sourceLayerIds: number[];
  list: ListSettings | null;
  children: UILayoutNode[];
}

export interface UILayoutDocument {
  version: 1;
  document: LayoutDocumentSize;
  nodes: UILayoutNode[];
}

function createLayoutNode(node: ProjectWithDocument['root']): UILayoutNode | null {
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
  const projectWithDocument = project as ProjectWithDocument;

  return {
    version: 1,
    document: projectWithDocument.document,
    nodes: projectWithDocument.root.children.flatMap((child) => {
      const layoutNode = createLayoutNode(child);
      return layoutNode === null ? [] : [layoutNode];
    })
  };
}
