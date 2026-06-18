import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { buildManifest, createAssetFileName } from './manifest.js';
import { trimTransparentRgba } from './trim-rgba.js';

export async function extractPsdDocument({
  psd,
  sourcePath,
  outputDir,
  assetsDirName,
  writePng,
  generatedAt = new Date().toISOString(),
}) {
  const assetsDir = path.join(outputDir, assetsDirName);
  await mkdir(assetsDir, { recursive: true });

  const usedAssetNames = new Set();
  let layerIndex = 0;

  async function convertNode(node) {
    layerIndex += 1;
    const id = layerIndex;
    const children = [];
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;

    if (hasChildren) {
      for (let i = 0; i < node.children.length; i += 1) {
        children.push(await convertNode(node.children[i]));
      }
    }

    const sourceBounds = getBounds(node);
    let bounds = sourceBounds;
    const text = readText(node);
    let image = null;

    if (node.type === 'Layer' && !text && bounds.width > 0 && bounds.height > 0) {
      const rgba = await node.composite(false, true);
      const trimmed = trimTransparentRgba(rgba, bounds.width, bounds.height);

      if (trimmed) {
        bounds = {
          x: sourceBounds.x + trimmed.x,
          y: sourceBounds.y + trimmed.y,
          width: trimmed.width,
          height: trimmed.height,
        };

        const fileName = createAssetFileName(node.name, id, usedAssetNames);
        const filePath = path.join(assetsDir, fileName);
        await writePng(filePath, trimmed.width, trimmed.height, trimmed.rgba);
        image = {
          fileName,
          width: trimmed.width,
          height: trimmed.height,
        };
      } else {
        bounds = {
          x: sourceBounds.x,
          y: sourceBounds.y,
          width: 0,
          height: 0,
        };
      }
    }

    return {
      id,
      name: node.name || `Layer ${id}`,
      kind: resolveLayerKind(node, text, hasChildren),
      bounds,
      sourceBounds,
      opacity: normalizeOpacity(node.opacity),
      visible: !node.isHidden,
      blendMode: node.blendMode ?? null,
      text,
      image,
      children,
    };
  }

  const layers = [];
  for (let i = 0; i < psd.children.length; i += 1) {
    layers.push(await convertNode(psd.children[i]));
  }

  const manifest = buildManifest({
    sourcePath,
    document: {
      width: psd.width,
      height: psd.height,
      colorMode: psd.colorMode,
      bitsPerChannel: psd.depth,
    },
    layers,
    assetsDirName,
    generatedAt,
  });

  return { manifest, assetsDir };
}

function getBounds(node) {
  return {
    x: Number.isFinite(node.left) ? node.left : 0,
    y: Number.isFinite(node.top) ? node.top : 0,
    width: Number.isFinite(node.width) ? node.width : 0,
    height: Number.isFinite(node.height) ? node.height : 0,
  };
}

function normalizeOpacity(opacity) {
  if (!Number.isFinite(opacity)) {
    return 1;
  }

  return opacity > 1 ? opacity / 255 : opacity;
}

function resolveLayerKind(node, text, hasChildren) {
  if (hasChildren || node.type === 'Group') {
    return 'group';
  }

  if (text) {
    return 'text';
  }

  return 'pixel';
}

function readText(node) {
  if (typeof node.text !== 'string') {
    return null;
  }

  return { value: node.text };
}
