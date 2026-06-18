import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function runPythonBackend({ sourcePath, outputDir, assetsDirName }) {
  const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'psd_tools_backend.py');
  const pythonPath = resolvePythonPath();

  try {
    await execFileAsync(
      'python3',
      [
        scriptPath,
        '--source',
        sourcePath,
        '--out',
        outputDir,
        '--assets-dir',
        assetsDirName,
      ],
      {
        env: {
          ...process.env,
          PYTHONPATH: pythonPath,
        },
        maxBuffer: 1024 * 1024 * 16,
      },
    );
  } catch (error) {
    throw new Error(formatPythonBackendError(error));
  }

  const manifestPath = path.join(outputDir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  return {
    manifest,
    manifestPath,
    assetsDir: path.join(outputDir, assetsDirName),
  };
}

function resolvePythonPath() {
  const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const localPythonPackages = path.join(toolRoot, '.python');
  const existingPath = process.env.PYTHONPATH;

  return existingPath ? `${localPythonPackages}${path.delimiter}${existingPath}` : localPythonPackages;
}

function formatPythonBackendError(error) {
  const stderr = error?.stderr?.trim();
  const stdout = error?.stdout?.trim();
  const detail = stderr || stdout || error?.message || String(error);

  if (/ModuleNotFoundError: No module named 'psd_tools'/.test(detail)) {
    return [
      'The JS parser could not read this PSD/PSB, and Python fallback is not installed.',
      'Run this once from Tools/PsdPreprocessor:',
      '  npm run setup:python',
    ].join('\n');
  }

  return detail;
}
