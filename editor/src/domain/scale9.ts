import type { Scale9Settings } from '../schemas/psdui';

interface Scale9AssetSize {
  width: number;
  height: number;
}

export function createDefaultScale9Settings(): Scale9Settings {
  return {
    enabled: true,
    mode: 'sliced',
    unit: 'pixel',
    relativeTo: 'asset',
    border: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  };
}

export function createAutoScale9Settings(size: Scale9AssetSize): Scale9Settings {
  const border = Math.max(0, Math.floor(Math.min(size.width, size.height) * 0.25));

  return {
    ...createDefaultScale9Settings(),
    border: {
      top: border,
      right: border,
      bottom: border,
      left: border
    }
  };
}
