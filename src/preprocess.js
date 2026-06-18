import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Psd from '@webtoon/psd';
import { runPythonBackend as runPythonBackendDefault } from './python-backend.js';
import { extractPsdDocument } from './psd-adapter.js';
import { writePng } from './png-writer.js';

export async function preprocessPsd({
  sourcePath,
  outputDir,
  assetsDirName,
  readFile: readFileImpl = readFile,
  parsePsd = parsePsdBuffer,
  extractDocument = extractPsdDocument,
  writeManifest = writeManifestFile,
  runPythonBackend = runPythonBackendDefault,
}) {
  const fileBuffer = await readFileImpl(sourcePath);
  let psd;

  try {
    psd = parsePsd(bufferToArrayBuffer(fileBuffer));
  } catch (error) {
    if (shouldFallbackToPython(error)) {
      return runPythonBackend({ sourcePath, outputDir, assetsDirName });
    }

    throw error;
  }

  const { manifest, assetsDir } = await extractDocument({
    psd,
    sourcePath,
    outputDir,
    assetsDirName,
    writePng,
  });

  const manifestPath = path.join(outputDir, 'manifest.json');
  await writeManifest(manifestPath, manifest);

  return {
    manifest,
    manifestPath,
    assetsDir,
  };
}

function parsePsdBuffer(arrayBuffer) {
  return Psd.parse(arrayBuffer);
}

function bufferToArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function writeManifestFile(filePath, manifest) {
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function shouldFallbackToPython(error) {
  return error instanceof Error && /Invalid signature/.test(error.message);
}
