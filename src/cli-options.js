import path from 'node:path';

export function parseCliOptions(argv) {
  const args = argv.slice(2);
  let sourcePath = null;
  let outputDir = null;
  let assetsDirName = 'layers';

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--out' || arg === '-o') {
      outputDir = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }

    if (arg === '--assets-dir') {
      assetsDirName = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      throw new Error(usage());
    }

    if (!sourcePath) {
      sourcePath = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}\n\n${usage()}`);
  }

  if (!sourcePath) {
    throw new Error(usage());
  }

  if (!outputDir) {
    const parsed = path.parse(sourcePath);
    outputDir = path.join(parsed.dir, `${parsed.name}_export`);
  }

  return { sourcePath, outputDir, assetsDirName };
}

export function usage() {
  return [
    'Usage: npm run preprocess -- <file.psd|file.psb> [--out output-dir] [--assets-dir layers]',
    '',
    'Example:',
    '  npm run preprocess -- ./design/login.psb --out ./tmp/login_export',
  ].join('\n');
}

function readFlagValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    throw new Error(`Missing value for ${flag}\n\n${usage()}`);
  }

  return value;
}
