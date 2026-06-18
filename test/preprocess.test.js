import assert from 'node:assert/strict';
import { test } from 'node:test';
import { preprocessPsd } from '../src/preprocess.js';

test('preprocessPsd reads source, parses PSD, extracts layers, and writes manifest', async () => {
  const calls = [];
  const manifest = { version: 1, layers: [] };
  const result = await preprocessPsd({
    sourcePath: '/tmp/ui.psb',
    outputDir: '/tmp/ui_export',
    assetsDirName: 'layers',
    readFile: async (filePath) => {
      calls.push(['readFile', filePath]);
      return Buffer.from([1, 2, 3]);
    },
    parsePsd: (arrayBuffer) => {
      calls.push(['parsePsd', arrayBuffer.byteLength]);
      return { width: 1, height: 1, children: [] };
    },
    extractDocument: async ({ sourcePath, outputDir, assetsDirName }) => {
      calls.push(['extractDocument', sourcePath, outputDir, assetsDirName]);
      return { manifest, assetsDir: '/tmp/ui_export/layers' };
    },
    writeManifest: async (filePath, data) => {
      calls.push(['writeManifest', filePath, data.version]);
    },
  });

  assert.equal(result.manifestPath, '/tmp/ui_export/manifest.json');
  assert.deepEqual(calls, [
    ['readFile', '/tmp/ui.psb'],
    ['parsePsd', 3],
    ['extractDocument', '/tmp/ui.psb', '/tmp/ui_export', 'layers'],
    ['writeManifest', '/tmp/ui_export/manifest.json', 1],
  ]);
});
