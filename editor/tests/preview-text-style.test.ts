import { describe, expect, test } from 'vitest';

import { createPreviewFontFamily } from '../src/domain/preview-text-style';

describe('preview text style', () => {
  test('keeps the raw PSD font name and adds normalized CSS family candidates', () => {
    expect(createPreviewFontFamily('ArialMT')).toBe(
      '"ArialMT", "Arial", Inter, ui-sans-serif, system-ui, sans-serif'
    );
    expect(createPreviewFontFamily('PingFangSC-Regular')).toBe(
      '"PingFangSC-Regular", "PingFang SC", Inter, ui-sans-serif, system-ui, sans-serif'
    );
    expect(createPreviewFontFamily('MicrosoftYaHei')).toBe(
      '"MicrosoftYaHei", "Microsoft YaHei", Inter, ui-sans-serif, system-ui, sans-serif'
    );
  });

  test('falls back to the editor font stack when PSD font name is missing', () => {
    expect(createPreviewFontFamily(null)).toBe('Inter, ui-sans-serif, system-ui, sans-serif');
    expect(createPreviewFontFamily('   ')).toBe('Inter, ui-sans-serif, system-ui, sans-serif');
  });
});
