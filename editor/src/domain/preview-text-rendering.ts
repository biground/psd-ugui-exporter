import type { SourceText } from '../schemas/source';

export type PreviewTextAlign = 'left' | 'right' | 'center' | 'justify';
export type PreviewTextVerticalJustify = 'flex-start' | 'center' | 'flex-end';

export interface PreviewTextStrokeStyle {
  WebkitTextStroke?: string;
  paintOrder?: 'stroke fill';
}

export function resolvePreviewTextAlign(text: SourceText | null): PreviewTextAlign {
  const name = text?.paragraph?.horizontalAlign?.name ?? text?.alignment?.name ?? null;

  if (name === 'right' || name === 'center' || name === 'justify') {
    return name;
  }

  return 'left';
}

export function resolvePreviewTextVerticalJustify(
  text: SourceText | null
): PreviewTextVerticalJustify {
  const name = text?.paragraph?.verticalAlign?.name ?? null;

  if (name === 'middle') {
    return 'center';
  }

  if (name === 'bottom') {
    return 'flex-end';
  }

  return 'flex-start';
}

export function resolvePreviewTextStroke(
  text: SourceText | null,
  zoom: number
): PreviewTextStrokeStyle {
  const stroke = text?.stroke;

  if (stroke === null || stroke === undefined || stroke.enabled === false) {
    return {};
  }

  const color = readHexColor(stroke.color);
  if (color === null) {
    return {};
  }

  const rawSize = typeof stroke.size === 'number' && stroke.size > 0 ? stroke.size : 1;
  const size = Math.max(1, Math.round(rawSize * zoom * 100) / 100);

  return {
    WebkitTextStroke: `${size}px ${color}`,
    paintOrder: 'stroke fill'
  };
}

function readHexColor(color: unknown): string | null {
  if (
    typeof color === 'object'
    && color !== null
    && 'hex' in color
    && typeof color.hex === 'string'
    && /^#[0-9a-f]{6}$/i.test(color.hex)
  ) {
    return color.hex;
  }

  return null;
}
