import type { SourceText } from '../schemas/source';

export type PreviewTextAlign = 'left' | 'right' | 'center' | 'justify';
export type PreviewTextVerticalJustify = 'flex-start' | 'center' | 'flex-end';
export type PreviewTextLineHeight = number | string;

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

  if (isPointLikeText(text)) {
    return 'center';
  }

  return 'flex-start';
}

export function resolvePreviewTextLineHeight(
  text: SourceText | null,
  zoom: number
): PreviewTextLineHeight {
  if (isPointLikeText(text)) {
    return 1;
  }

  if (typeof text?.lineHeight === 'number' && text.lineHeight > 0) {
    return `${Math.round(text.lineHeight * zoom * 100) / 100}px`;
  }

  return 1.1;
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

function isPointLikeText(text: SourceText | null): boolean {
  if (text === null) {
    return false;
  }

  return text.box?.kind !== 'paragraph' && text.box?.wrap !== true;
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
