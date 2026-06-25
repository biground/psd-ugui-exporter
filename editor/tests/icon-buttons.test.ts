import { describe, expect, test } from 'vitest';

import canvasPreview from '../src/components/CanvasPreview.tsx?raw';
import exportTree from '../src/components/ExportTree.tsx?raw';
import sourceTree from '../src/components/SourceTree.tsx?raw';

describe('icon-only buttons', () => {
  test('uses icon components instead of text glyph placeholders', () => {
    expect(sourceTree).toContain("from 'lucide-react'");
    expect(sourceTree).not.toContain('&gt;');

    expect(exportTree).toContain("from 'lucide-react'");
    expect(exportTree).not.toContain('>^</button>');
    expect(exportTree).not.toContain('>v</button>');

    expect(canvasPreview).toContain("from 'lucide-react'");
    expect(canvasPreview).not.toContain('>-</button>');
    expect(canvasPreview).not.toContain('>+</button>');
  });
});
