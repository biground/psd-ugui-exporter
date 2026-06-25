import { describe, expect, test } from 'vitest';

import sourceTree from '../src/components/SourceTree.tsx?raw';
import exportTree from '../src/components/ExportTree.tsx?raw';
import { isTreeNodeCollapsed, toggleCollapsedNodeId } from '../src/domain/tree-collapse';

describe('tree collapse state', () => {
  test('toggles collapsed node ids without mutating the previous list', () => {
    const collapsed = ['source:1'];

    const expanded = toggleCollapsedNodeId(collapsed, 'source:2');
    const reopened = toggleCollapsedNodeId(expanded, 'source:1');

    expect(expanded).toEqual(['source:1', 'source:2']);
    expect(reopened).toEqual(['source:2']);
    expect(collapsed).toEqual(['source:1']);
    expect(isTreeNodeCollapsed(reopened, 'source:1')).toBe(false);
    expect(isTreeNodeCollapsed(reopened, 'source:2')).toBe(true);
  });
});

describe('tree collapse controls', () => {
  test('source and export trees render icon collapse controls', () => {
    expect(sourceTree).toContain('ChevronRight');
    expect(sourceTree).toContain('ChevronDown');
    expect(sourceTree).toContain('Toggle');
    expect(sourceTree).toContain('isCollapsed ? null');

    expect(exportTree).toContain('ChevronRight');
    expect(exportTree).toContain('ChevronDown');
    expect(exportTree).toContain('Toggle');
    expect(exportTree).toContain('isCollapsed ? null');
  });
});
