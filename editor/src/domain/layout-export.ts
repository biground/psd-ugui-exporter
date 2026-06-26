import type { UILayoutDocument, UILayoutNode, UIImageAsset } from '../schemas/layout';
import type { ExportNode, ListSettings, PSDUIProject, Scale9Settings } from '../schemas/psdui';
import type { Rect, SourceLayer, SourceText } from '../schemas/source';
import { resolveLayerImagePath } from './preview-assets';

export interface LayoutExportAsset {
  sourcePath: string;
  outputPath: string;
  scale9Crop?: {
    border: Scale9Settings['border'];
  };
}

export interface LayoutExportPackage {
  layout: UILayoutDocument;
  assets: LayoutExportAsset[];
}

interface LayoutExportContext {
  cacheRoot: string;
  sourceImages: Map<number, SourceLayer>;
  usedAssetPaths: Set<string>;
  assets: LayoutExportAsset[];
}

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

function collectSourceImages(layers: SourceLayer[], images: Map<number, SourceLayer>): void {
  for (const layer of layers) {
    if (layer.image !== null) {
      images.set(layer.id, layer);
    }
    collectSourceImages(layer.children, images);
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

function createLayoutNode(
  node: ExportNode,
  texts: Map<number, SourceText>,
  context: LayoutExportContext
): UILayoutNode | null {
  if (!node.enabled) {
    return null;
  }

  const asset = createImageAsset(node, context);

  return {
    id: node.id,
    name: node.name,
    exportKind: node.exportKind,
    rect: copyRect(node.rect),
    anchor: node.anchor === null || node.anchor === undefined ? null : { ...node.anchor },
    rasterBounds: node.rasterBounds === null ? null : copyRect(node.rasterBounds),
    sourceLayerIds: [...node.sourceLayerIds],
    asset,
    text: resolveLayoutText(node, texts),
    list: copyListSettings(node.list),
    scale9: copyScale9Settings(node.scale9),
    children: node.children.flatMap((child) => {
      const layoutChild = createLayoutNode(child, texts, context);
      return layoutChild === null ? [] : [layoutChild];
    })
  };
}

export function createLayoutDocument(project: PSDUIProject): UILayoutDocument {
  return createLayoutExportPackage(project).layout;
}

export function createLayoutExportPackage(project: PSDUIProject): LayoutExportPackage {
  const texts = new Map<number, SourceText>();
  const sourceImages = new Map<number, SourceLayer>();
  collectSourceTexts(project.sourceTree, texts);
  collectSourceImages(project.sourceTree, sourceImages);

  const context: LayoutExportContext = {
    cacheRoot: project.cache.assetsDir,
    sourceImages,
    usedAssetPaths: new Set(),
    assets: []
  };

  const layout = {
    version: 1 as const,
    document: { ...project.document },
    nodes: project.exportTree.flatMap((child) => {
      const layoutNode = createLayoutNode(child, texts, context);
      return layoutNode === null ? [] : [layoutNode];
    })
  };

  return {
    layout,
    assets: context.assets
  };
}

function createImageAsset(node: ExportNode, context: LayoutExportContext): UIImageAsset | null {
  if (node.exportKind !== 'image') {
    return null;
  }

  const sourceLayer = node.sourceLayerIds
    .map((sourceLayerId) => context.sourceImages.get(sourceLayerId))
    .find((layer) => layer?.image !== null && layer?.image !== undefined);

  if (sourceLayer?.image === null || sourceLayer?.image === undefined) {
    return null;
  }

  const sourcePath = resolveLayerImagePath(sourceLayer, context.cacheRoot);

  if (sourcePath === null) {
    return null;
  }

  const outputPath = allocateImageAssetPath(node, context.usedAssetPaths);
  const compactScale9 = createCompactScale9Asset(node.scale9, sourceLayer.image);
  context.assets.push({
    sourcePath,
    outputPath,
    ...(compactScale9 === null ? {} : { scale9Crop: { border: compactScale9.border } })
  });

  return {
    type: 'image',
    path: outputPath,
    width: compactScale9?.width ?? sourceLayer.image.width,
    height: compactScale9?.height ?? sourceLayer.image.height,
    ...(compactScale9 === null
      ? {}
      : {
          sourceWidth: sourceLayer.image.width,
          sourceHeight: sourceLayer.image.height,
          scale9Packing: 'compact' as const
        })
  };
}

function createCompactScale9Asset(
  scale9: Scale9Settings | null | undefined,
  image: { width: number; height: number }
): { width: number; height: number; border: Scale9Settings['border'] } | null {
  if (scale9?.enabled !== true) {
    return null;
  }

  const border = scale9.border;

  if (
    border.left < 0 ||
    border.right < 0 ||
    border.top < 0 ||
    border.bottom < 0 ||
    border.left + border.right >= image.width ||
    border.top + border.bottom >= image.height
  ) {
    return null;
  }

  return {
    width: border.left + 1 + border.right,
    height: border.top + 1 + border.bottom,
    border: { ...border }
  };
}

function allocateImageAssetPath(node: ExportNode, usedAssetPaths: Set<string>): string {
  const baseName = sanitizeAssetFileName(node.name) || sanitizeAssetFileName(node.id) || 'image';
  let candidate = `images/${baseName}.png`;
  let suffix = 2;

  while (usedAssetPaths.has(candidate)) {
    candidate = `images/${baseName}-${suffix}.png`;
    suffix += 1;
  }

  usedAssetPaths.add(candidate);
  return candidate;
}

function sanitizeAssetFileName(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
