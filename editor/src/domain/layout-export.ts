import type { UILayoutDocument, UILayoutNode } from '../schemas/layout';
import type { ExportNode, ListSettings, PSDUIProject, Scale9Settings } from '../schemas/psdui';
import type { Rect, SourceLayer, SourceText } from '../schemas/source';

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

function copyScale9Settings(scale9: Scale9Settings | null | undefined): Scale9Settings | null {
  if (scale9 === null || scale9 === undefined) {
    return null;
  }

  return {
    enabled: scale9.enabled,
    mode: scale9.mode,
    unit: scale9.unit,
    relativeTo: scale9.relativeTo,
    border: { ...scale9.border }
  };
}

function copyJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectSourceTexts(layers: SourceLayer[], texts: Map<number, SourceText>): void {
  for (const layer of layers) {
    if (layer.text !== null) {
      texts.set(layer.id, layer.text);
    }
    collectSourceTexts(layer.children, texts);
  }
}

function resolveLayoutText(node: ExportNode, texts: Map<number, SourceText>): SourceText | null {
  for (const sourceLayerId of node.sourceLayerIds) {
    const text = texts.get(sourceLayerId);
    if (text !== undefined) {
      return copyJson(text);
    }
  }
  return null;
}

function createLayoutNode(node: ExportNode, texts: Map<number, SourceText>): UILayoutNode | null {
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
    text: resolveLayoutText(node, texts),
    list: copyListSettings(node.list),
    scale9: copyScale9Settings(node.scale9),
    children: node.children.flatMap((child) => {
      const layoutChild = createLayoutNode(child, texts);
      return layoutChild === null ? [] : [layoutChild];
    })
  };
}

export function createLayoutDocument(project: PSDUIProject): UILayoutDocument {
  const texts = new Map<number, SourceText>();
  collectSourceTexts(project.sourceTree, texts);

  return {
    version: 1,
    document: { ...project.document },
    nodes: project.exportTree.flatMap((child) => {
      const layoutNode = createLayoutNode(child, texts);
      return layoutNode === null ? [] : [layoutNode];
    })
  };
}
