import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCliOptions } from '../src/cli-options.js';

test('parseCliOptions accepts source and output flags', () => {
  const options = parseCliOptions([
    'node',
    'cli.js',
    'art/ui.psb',
    '--out',
    'build/ui',
    '--assets-dir',
    'sprites',
  ]);

  assert.equal(options.sourcePath, 'art/ui.psb');
  assert.equal(options.outputDir, 'build/ui');
  assert.equal(options.assetsDirName, 'sprites');
});

test('parseCliOptions rejects missing source files', () => {
  assert.throws(
    () => parseCliOptions(['node', 'cli.js', '--out', 'build/ui']),
    /Usage:/,
  );
});

test('parseCliOptions defaults output directory beside the source file', () => {
  const options = parseCliOptions(['node', 'cli.js', '/tmp/art/ui.psd']);

  assert.equal(options.outputDir, '/tmp/art/ui_export');
  assert.equal(options.assetsDirName, 'layers');
});
