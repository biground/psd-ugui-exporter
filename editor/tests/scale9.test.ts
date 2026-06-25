import { describe, expect, test } from 'vitest';

import {
  createAutoScale9Settings,
  createDefaultScale9Settings
} from '../src/domain/scale9';

describe('scale9 settings', () => {
  test('creates engine-neutral default scale9 metadata', () => {
    expect(createDefaultScale9Settings()).toEqual({
      enabled: true,
      mode: 'sliced',
      unit: 'pixel',
      relativeTo: 'asset',
      border: { top: 0, right: 0, bottom: 0, left: 0 }
    });
  });

  test('creates conservative auto borders from asset dimensions', () => {
    expect(createAutoScale9Settings({ width: 100, height: 40 })).toEqual({
      enabled: true,
      mode: 'sliced',
      unit: 'pixel',
      relativeTo: 'asset',
      border: { top: 10, right: 10, bottom: 10, left: 10 }
    });
  });
});
