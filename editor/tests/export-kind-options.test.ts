import { describe, expect, test } from 'vitest';

import app from '../src/app/App.tsx?raw';
import inspector from '../src/components/Inspector.tsx?raw';
import { exportKinds } from '../src/schemas/psdui';

describe('export kind options', () => {
  test('removes group and exposes node/layout/item export semantics', () => {
    expect(exportKinds).toEqual([
      'Node',
      'image',
      'text',
      'button',
      'list',
      'VGLayout',
      'HGLayout',
      'Item'
    ]);
    expect(exportKinds).not.toContain('group');
  });

  test('toolbar and inspector render export kinds from the shared option list', () => {
    expect(app).toContain('exportKinds.map');
    expect(inspector).toContain('exportKinds.map');
    expect(app).not.toContain('value="group"');
    expect(inspector).not.toContain("'group'");
  });
});
