import assert from 'node:assert/strict';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { test } from 'node:test';
import { writePng } from '../src/png-writer.js';

test('writePng writes an RGBA PNG file', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'psd-preprocessor-png-'));
  const filePath = path.join(tempDir, 'pixel.png');

  try {
    await writePng(filePath, 1, 1, new Uint8ClampedArray([255, 0, 128, 255]));
    const png = PNG.sync.read(await readFile(filePath));

    assert.equal(png.width, 1);
    assert.equal(png.height, 1);
    assert.deepEqual(Array.from(png.data), [255, 0, 128, 255]);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});
