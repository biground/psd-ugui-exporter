import { describe, expect, test } from 'vitest';

import { createOpenPsdDialogOptions } from '../src/app/open-dialog';

describe('open PSD dialog options', () => {
  test('uses Documents as the default file picker path', () => {
    const options = createOpenPsdDialogOptions('/Users/biground/Documents');

    expect(options.defaultPath).toBe('/Users/biground/Documents');
  });

  test('opens a single PSD or PSB file', () => {
    const options = createOpenPsdDialogOptions('/Users/biground/Documents');

    expect(options.multiple).toBe(false);
    expect(options.filters).toEqual([
      {
        name: 'Photoshop documents',
        extensions: ['psd', 'psb']
      }
    ]);
  });
});
