import assert from 'node:assert/strict';
import { test } from 'node:test';
import { trimTransparentRgba } from '../src/trim-rgba.js';

test('trimTransparentRgba crops transparent edges and reports offset', () => {
  const rgba = new Uint8ClampedArray([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 10, 20, 30, 255, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 40, 50, 60, 128,
  ]);

  const trimmed = trimTransparentRgba(rgba, 3, 3);

  assert.equal(trimmed.x, 1);
  assert.equal(trimmed.y, 1);
  assert.equal(trimmed.width, 2);
  assert.equal(trimmed.height, 2);
  assert.deepEqual(Array.from(trimmed.rgba), [
    10, 20, 30, 255, 0, 0, 0, 0,
    0, 0, 0, 0, 40, 50, 60, 128,
  ]);
});

test('trimTransparentRgba returns null for fully transparent images', () => {
  assert.equal(trimTransparentRgba(new Uint8ClampedArray(2 * 2 * 4), 2, 2), null);
});
