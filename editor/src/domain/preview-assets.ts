import type { SourceLayer } from '../schemas/source';

export interface PreviewImageLayer {
  layer: SourceLayer;
  imagePath: string;
}

export function collectVisiblePreviewImageLayers(sourceTree: SourceLayer[]): PreviewImageLayer[] {
  return sourceTree.flatMap((layer) => collectVisiblePreviewImageLayer(layer, true));
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
  ancestorsVisible: boolean
): PreviewImageLayer[] {
  const isVisible = ancestorsVisible && layer.visible;
  const children = layer.children.flatMap((child) => collectVisiblePreviewImageLayer(child, isVisible));

  if (!isVisible || layer.image === null) {
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
