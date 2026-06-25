import { describe, expect, test } from 'vitest';

import inspector from '../src/components/Inspector.tsx?raw';

describe('Inspector scale9 editor', () => {
  test('renders image-only scale9 controls and preview', () => {
    expect(inspector).toContain('Scale9');
    expect(inspector).toContain('createDefaultScale9Settings');
    expect(inspector).toContain('createAutoScale9Settings');
    expect(inspector).toContain('scale9-preview');
    expect(inspector).toContain('scale9-guide');
    expect(inspector).toContain('Auto');
    expect(inspector).toContain('Reset');
    expect(inspector).toContain("node.exportKind === 'image'");
    expect(inspector).toContain("(['top', 'right', 'bottom', 'left'] as const)");
  });
});
