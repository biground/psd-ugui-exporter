import { describe, expect, test } from 'vitest';

import {
  resolvePreviewTextAlign,
  resolvePreviewTextLineHeight,
  resolvePreviewTextStroke,
  resolvePreviewTextVerticalJustify
} from '../src/domain/preview-text-rendering';
import canvasPreview from '../src/components/CanvasPreview.tsx?raw';
import type { SourceText } from '../src/schemas/source';

describe('preview text rendering', () => {
  test('uses PSD paragraph alignment metadata for horizontal and vertical placement', () => {
    const text: SourceText = {
      value: '999',
      alignment: { value: 0, name: 'left' },
      paragraph: {
        horizontalAlign: { value: 2, name: 'center' },
        verticalAlign: { value: 1, name: 'middle' }
      }
    };

    expect(resolvePreviewTextAlign(text)).toBe('center');
    expect(resolvePreviewTextVerticalJustify(text)).toBe('center');
  });

  test('centers point text vertically when PSD has no paragraph vertical alignment', () => {
    const text: SourceText = {
      value: '999',
      fontSize: 40,
      box: {
        kind: 'point',
        bounds: { x: 280, y: 86, width: 80, height: 42 },
        width: 80,
        height: 42,
        wrap: false
      },
      paragraph: {
        horizontalAlign: { value: 2, name: 'center' },
        verticalAlign: { value: null, name: 'unknown' }
      }
    };

    expect(resolvePreviewTextVerticalJustify(text)).toBe('center');
    expect(resolvePreviewTextLineHeight(text, 1)).toBe(1);
  });

  test('creates CSS text stroke from PSD stroke metadata', () => {
    const text: SourceText = {
      value: '60',
      stroke: {
        source: 'textStyle',
        enabled: true,
        size: 2,
        color: { hex: '#ffffff' }
      }
    };

    expect(resolvePreviewTextStroke(text, 0.5)).toEqual({
      WebkitTextStroke: '1px #ffffff',
      paintOrder: 'stroke fill'
    });
  });

  test('falls back to a visible stroke width when PSD provides stroke color without size', () => {
    const text: SourceText = {
      value: '60',
      stroke: {
        source: 'textStyle',
        enabled: true,
        size: null,
        color: { hex: '#ffffff' }
      }
    };

    expect(resolvePreviewTextStroke(text, 1)).toEqual({
      WebkitTextStroke: '1px #ffffff',
      paintOrder: 'stroke fill'
    });
  });

  test('wraps preview text in a full-width content element so text-align affects the PSD text box', () => {
    expect(canvasPreview).toContain('className="canvas-text-content"');
  });
});
