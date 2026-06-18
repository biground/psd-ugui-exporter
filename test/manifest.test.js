import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildManifest,
  createAssetFileName,
  flattenLayerTree,
  sanitizeName,
} from '../src/manifest.js';

test('sanitizeName keeps useful layer names filesystem-safe', () => {
  assert.equal(sanitizeName('按钮/关闭@btn'), '按钮_关闭_btn');
  assert.equal(sanitizeName('  layer:name*?  '), 'layer_name');
  assert.equal(sanitizeName(''), 'layer');
});

test('createAssetFileName produces stable names for duplicate layer names', () => {
  const usedNames = new Set();

  assert.equal(createAssetFileName('Start/Button', 3, usedNames), '0003_Start_Button.png');
  assert.equal(createAssetFileName('Start:Button', 4, usedNames), '0004_Start_Button_2.png');
});

test('flattenLayerTree keeps depth-first order and parent paths', () => {
  const tree = [
    {
      id: 1,
      name: 'Root',
      children: [
        { id: 2, name: 'Image', children: [] },
        {
          id: 3,
          name: 'Group',
          children: [{ id: 4, name: 'Text', children: [] }],
        },
      ],
    },
  ];

  assert.deepEqual(
    flattenLayerTree(tree).map((layer) => layer.path),
    ['Root', 'Root/Image', 'Root/Group', 'Root/Group/Text'],
  );
});

test('buildManifest records source, tree, flat layers, and relative asset paths', () => {
  const usedNames = new Set();
  const imageLayer = {
    id: 2,
    name: 'Icon',
    kind: 'pixel',
    bounds: { x: 10, y: 20, width: 64, height: 32 },
    opacity: 0.5,
    visible: true,
    blendMode: 'normal',
    text: null,
    image: {
      width: 64,
      height: 32,
      fileName: createAssetFileName('Icon', 2, usedNames),
    },
    children: [],
  };
  const groupLayer = {
    id: 1,
    name: 'Panel',
    kind: 'group',
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    opacity: 1,
    visible: true,
    blendMode: 'normal',
    text: null,
    image: null,
    children: [imageLayer],
  };

  const manifest = buildManifest({
    sourcePath: '/tmp/ui.psb',
    document: { width: 100, height: 100, colorMode: 'rgb', bitsPerChannel: 8 },
    layers: [groupLayer],
    assetsDirName: 'layers',
    generatedAt: '2026-06-18T00:00:00.000Z',
  });

  assert.equal(manifest.version, 1);
  assert.equal(manifest.source.fileName, 'ui.psb');
  assert.equal(manifest.document.width, 100);
  assert.equal(manifest.layers[0].children[0].image.path, 'layers/0002_Icon.png');
  assert.deepEqual(
    manifest.flatLayers.map((layer) => layer.path),
    ['Panel', 'Panel/Icon'],
  );
});
