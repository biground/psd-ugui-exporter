import path from 'node:path';

export function sanitizeName(name) {
  const source = typeof name === 'string' ? name.trim() : '';
  const normalized = source
    .replace(/[<>:"/\\|?*@#%&{}\[\]$!`'~=+;,]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized.length > 0 ? normalized : 'layer';
}

export function createAssetFileName(layerName, index, usedNames) {
  const prefix = String(index).padStart(4, '0');
  const safeName = sanitizeName(layerName);
  let uniqueName = safeName;
  let duplicateIndex = 2;

  while (usedNames.has(uniqueName)) {
    uniqueName = `${safeName}_${duplicateIndex}`;
    duplicateIndex += 1;
  }

  usedNames.add(uniqueName);
  return `${prefix}_${uniqueName}.png`;
}

export function flattenLayerTree(layers) {
  const result = [];

  function visit(layer, parentPath, depth) {
    const layerPath = parentPath ? `${parentPath}/${layer.name}` : layer.name;
    result.push({
      id: layer.id,
      name: layer.name,
      path: layerPath,
      depth,
      kind: layer.kind,
      bounds: layer.bounds,
      sourceBounds: layer.sourceBounds,
      opacity: layer.opacity,
      visible: layer.visible,
      blendMode: layer.blendMode,
      text: layer.text,
      image: layer.image,
    });

    const children = Array.isArray(layer.children) ? layer.children : [];
    for (let i = 0; i < children.length; i += 1) {
      visit(children[i], layerPath, depth + 1);
    }
  }

  for (let i = 0; i < layers.length; i += 1) {
    visit(layers[i], '', 0);
  }

  return result;
}

export function buildManifest({ sourcePath, document, layers, assetsDirName, generatedAt }) {
  return {
    version: 1,
    generatedAt,
    source: {
      path: sourcePath,
      fileName: path.basename(sourcePath),
    },
    document: {
      width: document.width,
      height: document.height,
      colorMode: document.colorMode ?? null,
      bitsPerChannel: document.bitsPerChannel ?? null,
    },
    assetsDir: assetsDirName,
    layers: attachRelativeAssetPaths(layers, assetsDirName),
    flatLayers: flattenLayerTree(attachRelativeAssetPaths(layers, assetsDirName)),
  };
}

function attachRelativeAssetPaths(layers, assetsDirName) {
  return layers.map((layer) => {
    const image = layer.image
      ? {
          ...layer.image,
          path: path.posix.join(assetsDirName, layer.image.fileName),
        }
      : null;

    return {
      ...layer,
      image,
      children: attachRelativeAssetPaths(layer.children ?? [], assetsDirName),
    };
  });
}
