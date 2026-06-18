import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { extractPsdDocument } from '../src/psd-adapter.js';

test('extractPsdDocument converts PSD nodes and exports only image layers', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'psd-preprocessor-'));
  const writes = [];
  const psd = {
    width: 320,
    height: 180,
    colorMode: 3,
    depth: 8,
    children: [
      {
        type: 'Group',
        name: 'Panel',
        opacity: 255,
        composedOpacity: 1,
        children: [
          {
            type: 'Layer',
            name: 'Icon@lab',
            left: 12,
            top: 24,
            width: 120,
            height: 32,
            opacity: 128,
            composedOpacity: 0.5,
            isHidden: false,
            composite: async () => {
              const rgba = new Uint8ClampedArray(120 * 32 * 4);
              for (let i = 3; i < rgba.length; i += 4) {
                rgba[i] = 255;
              }
              return rgba;
            },
          },
        ],
      },
    ],
  };

  try {
    const result = await extractPsdDocument({
      psd,
      sourcePath: '/tmp/source.psd',
      outputDir: tempDir,
      assetsDirName: 'layers',
      writePng: async (filePath, width, height, rgba) => {
        writes.push({ filePath, width, height, byteLength: rgba.length });
      },
      generatedAt: '2026-06-18T00:00:00.000Z',
    });

    assert.equal(writes.length, 1);
    assert.equal(writes[0].width, 120);
    assert.equal(writes[0].height, 32);
    assert.equal(result.manifest.layers[0].kind, 'group');
    assert.equal(result.manifest.layers[0].children[0].kind, 'pixel');
    assert.equal(result.manifest.layers[0].children[0].text, null);
    assert.equal(result.manifest.layers[0].children[0].image.path, 'layers/0002_Icon_lab.png');
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});

test('extractPsdDocument records text layers without exporting PNGs', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'psd-preprocessor-text-'));
  const writes = [];
  const psd = {
    width: 320,
    height: 180,
    colorMode: 3,
    depth: 8,
    children: [
      {
        type: 'Layer',
        name: 'Title',
        left: 12,
        top: 24,
        width: 120,
        height: 32,
        opacity: 255,
        isHidden: false,
        text: 'Hello',
        composite: async () => {
          const rgba = new Uint8ClampedArray(120 * 32 * 4);
          for (let i = 3; i < rgba.length; i += 4) {
            rgba[i] = 255;
          }
          return rgba;
        },
      },
    ],
  };

  try {
    const result = await extractPsdDocument({
      psd,
      sourcePath: '/tmp/source.psd',
      outputDir: tempDir,
      assetsDirName: 'layers',
      writePng: async (filePath, width, height, rgba) => {
        writes.push({ filePath, width, height, byteLength: rgba.length });
      },
      generatedAt: '2026-06-18T00:00:00.000Z',
    });

    const layer = result.manifest.layers[0];
    assert.equal(writes.length, 0);
    assert.equal(layer.kind, 'text');
    assert.equal(layer.image, null);
    assert.equal(layer.text.value, 'Hello');
    assert.deepEqual(layer.bounds, { x: 12, y: 24, width: 120, height: 32 });
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});

test('extractPsdDocument trims transparent image edges and records source bounds', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'psd-preprocessor-trim-'));
  const writes = [];
  const rgba = new Uint8ClampedArray([
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 255, 0, 0, 255,
  ]);
  const psd = {
    width: 2,
    height: 2,
    colorMode: 3,
    depth: 8,
    children: [
      {
        type: 'Layer',
        name: 'Icon',
        left: 10,
        top: 20,
        width: 2,
        height: 2,
        opacity: 255,
        isHidden: false,
        composite: async () => rgba,
      },
    ],
  };

  try {
    const result = await extractPsdDocument({
      psd,
      sourcePath: '/tmp/source.psd',
      outputDir: tempDir,
      assetsDirName: 'layers',
      writePng: async (filePath, width, height, rgba) => {
        writes.push({ filePath, width, height, rgba: Array.from(rgba) });
      },
      generatedAt: '2026-06-18T00:00:00.000Z',
    });

    const layer = result.manifest.layers[0];
    assert.equal(writes[0].width, 1);
    assert.equal(writes[0].height, 1);
    assert.deepEqual(writes[0].rgba, [255, 0, 0, 255]);
    assert.deepEqual(layer.sourceBounds, { x: 10, y: 20, width: 2, height: 2 });
    assert.deepEqual(layer.bounds, { x: 11, y: 21, width: 1, height: 1 });
    assert.deepEqual(result.manifest.flatLayers[0].sourceBounds, layer.sourceBounds);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});
