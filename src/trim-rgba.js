export function trimTransparentRgba(rgba, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = rgba[(y * width + x) * 4 + 3];
      if (alpha === 0) {
        continue;
      }

      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;
  const trimmed = new Uint8ClampedArray(trimmedWidth * trimmedHeight * 4);

  for (let y = 0; y < trimmedHeight; y += 1) {
    for (let x = 0; x < trimmedWidth; x += 1) {
      const sourceIndex = ((minY + y) * width + minX + x) * 4;
      const targetIndex = (y * trimmedWidth + x) * 4;
      trimmed[targetIndex] = rgba[sourceIndex];
      trimmed[targetIndex + 1] = rgba[sourceIndex + 1];
      trimmed[targetIndex + 2] = rgba[sourceIndex + 2];
      trimmed[targetIndex + 3] = rgba[sourceIndex + 3];
    }
  }

  return {
    x: minX,
    y: minY,
    width: trimmedWidth,
    height: trimmedHeight,
    rgba: trimmed,
  };
}
