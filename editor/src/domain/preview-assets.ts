import type { SourceLayer } from '../schemas/source';

export interface PreviewImageLayer {
  layer: SourceLayer;
  imagePath: string;
}

export interface PreviewTextLayer {
  layer: SourceLayer;
  value: string;
}

export function collectVisiblePreviewImageLayers(
  sourceTree: SourceLayer[],
  hiddenSourceLayerIds: number[] = [],
  includedSourceLayerIds: number[] | null = null
): PreviewImageLayer[] {
  const hiddenIds = new Set(hiddenSourceLayerIds);
  const includedIds = includedSourceLayerIds === null ? null : new Set(includedSourceLayerIds);
  return sourceTree.flatMap((layer) =>
    collectVisiblePreviewImageLayer(layer, true, hiddenIds, includedIds)
  );
}

export function collectVisiblePreviewTextLayers(
  sourceTree: SourceLayer[],
  hiddenSourceLayerIds: number[] = [],
  includedSourceLayerIds: number[] | null = null
): PreviewTextLayer[] {
  const hiddenIds = new Set(hiddenSourceLayerIds);
  const includedIds = includedSourceLayerIds === null ? null : new Set(includedSourceLayerIds);
  return sourceTree.flatMap((layer) =>
    collectVisiblePreviewTextLayer(layer, true, hiddenIds, includedIds)
  );
}

export function resolveLayerImagePath(layer: SourceLayer, cacheRoot: string): string | null {
  if (layer.image === null) {
    return null;
  }

  if (isAbsoluteOrUrl(layer.image.path)) {
    return layer.image.path;
  }

  return joinPath(cacheRoot, layer.image.path);
}

function collectVisiblePreviewImageLayer(
  layer: SourceLayer,
  ancestorsVisible: boolean,
  hiddenIds: Set<number>,
  includedIds: Set<number> | null
): PreviewImageLayer[] {
  const isVisible = ancestorsVisible && layer.visible && !hiddenIds.has(layer.id);
  const children = layer.children.flatMap((child) =>
    collectVisiblePreviewImageLayer(child, isVisible, hiddenIds, includedIds)
  );

  if (!isVisible || layer.image === null || (includedIds !== null && !includedIds.has(layer.id))) {
    return children;
  }

  return [
    ...children,
    {
      layer,
      imagePath: layer.image.path
    }
  ];
}

function collectVisiblePreviewTextLayer(
  layer: SourceLayer,
  ancestorsVisible: boolean,
  hiddenIds: Set<number>,
  includedIds: Set<number> | null
): PreviewTextLayer[] {
  const isVisible = ancestorsVisible && layer.visible && !hiddenIds.has(layer.id);
  const children = layer.children.flatMap((child) =>
    collectVisiblePreviewTextLayer(child, isVisible, hiddenIds, includedIds)
  );

  if (!isVisible || layer.text === null || (includedIds !== null && !includedIds.has(layer.id))) {
    return children;
  }

  return [
    ...children,
    {
      layer,
      value: layer.text.value
    }
  ];
}

function joinPath(basePath: string, relativePath: string): string {
  const base = basePath.replace(/[\\/]+$/, '');
  const relative = relativePath.replace(/^[\\/]+/, '');

  if (base.length === 0) {
    return relative;
  }

  return `${base}/${relative}`;
}

function isAbsoluteOrUrl(path: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(path)
    || path.startsWith('/')
    || /^[a-z]:[\\/]/i.test(path)
    || path.startsWith('\\\\');
}
