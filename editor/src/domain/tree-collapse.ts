export function toggleCollapsedNodeId(collapsedIds: string[], nodeId: string): string[] {
  if (collapsedIds.includes(nodeId)) {
    return collapsedIds.filter((id) => id !== nodeId);
  }

  return [...collapsedIds, nodeId];
}

export function isTreeNodeCollapsed(collapsedIds: string[], nodeId: string): boolean {
  return collapsedIds.includes(nodeId);
}
