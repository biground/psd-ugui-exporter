import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';

export async function writePng(filePath, width, height, rgba) {
  if (rgba.length !== width * height * 4) {
    throw new Error(`Invalid RGBA length for ${width}x${height}: ${rgba.length}`);
  }

  await mkdir(path.dirname(filePath), { recursive: true });

  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba);
  await writeFile(filePath, PNG.sync.write(png));
}
