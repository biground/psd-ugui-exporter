import { describe, expect, test } from 'vitest';

import {
  createPreviewFontFamily,
  projectPreviewFontFamily
} from '../src/domain/preview-text-style';

describe('preview text style', () => {
  test('keeps the raw PSD font name and adds normalized CSS family candidates', () => {
    expect(createPreviewFontFamily('ArialMT')).toBe(
      `"ArialMT", "Arial", "${projectPreviewFontFamily}", Inter, ui-sans-serif, system-ui, sans-serif`
    );
    expect(createPreviewFontFamily('PingFangSC-Regular')).toBe(
      `"PingFangSC-Regular", "PingFang SC", "${projectPreviewFontFamily}", Inter, ui-sans-serif, system-ui, sans-serif`
    );
    expect(createPreviewFontFamily('MicrosoftYaHei')).toBe(
      `"MicrosoftYaHei", "Microsoft YaHei", "${projectPreviewFontFamily}", Inter, ui-sans-serif, system-ui, sans-serif`
    );
    expect(createPreviewFontFamily('SourceHanSansCN-Heavy')).toBe(
      `"SourceHanSansCN-Heavy", "Source Han Sans CN Heavy", "${projectPreviewFontFamily}", Inter, ui-sans-serif, system-ui, sans-serif`
    );
  });

  test('falls back to the editor font stack when PSD font name is missing', () => {
    expect(createPreviewFontFamily(null)).toBe(
      `"${projectPreviewFontFamily}", Inter, ui-sans-serif, system-ui, sans-serif`
    );
    expect(createPreviewFontFamily('   ')).toBe(
      `"${projectPreviewFontFamily}", Inter, ui-sans-serif, system-ui, sans-serif`
    );
  });
});
