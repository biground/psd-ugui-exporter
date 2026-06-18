import assert from 'node:assert/strict';
import { test } from 'node:test';
import { preprocessPsd } from '../src/preprocess.js';

test('preprocessPsd falls back to Python backend when JS parser rejects a valid PSB block', async () => {
  const calls = [];
  const fallbackManifest = {
    version: 1,
    flatLayers: [{ name: 'Layer 1' }],
  };

  const result = await preprocessPsd({
    sourcePath: '/tmp/ui.psb',
    outputDir: '/tmp/ui_export',
    assetsDirName: 'layers',
    readFile: async () => Buffer.from('8BPS'),
    parsePsd: () => {
      throw new Error('Invalid signature: \\u0007I�@');
    },
    runPythonBackend: async (options) => {
      calls.push(options);
      return {
        manifest: fallbackManifest,
        manifestPath: '/tmp/ui_export/manifest.json',
        assetsDir: '/tmp/ui_export/layers',
      };
    },
  });

  assert.equal(result.manifest, fallbackManifest);
  assert.deepEqual(calls, [
    {
      sourcePath: '/tmp/ui.psb',
      outputDir: '/tmp/ui_export',
      assetsDirName: 'layers',
    },
  ]);
});
