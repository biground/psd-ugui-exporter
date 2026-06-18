#!/usr/bin/env node

import { parseCliOptions, usage } from './cli-options.js';
import { preprocessPsd } from './preprocess.js';

async function main() {
  let options;

  try {
    options = parseCliOptions(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : usage();
    console.error(message);
    process.exitCode = message.startsWith('Usage:') ? 0 : 1;
    return;
  }

  try {
    const result = await preprocessPsd(options);
    console.log(`manifest: ${result.manifestPath}`);
    console.log(`assets: ${result.assetsDir}`);
    console.log(`layers: ${result.manifest.flatLayers.length}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

await main();
