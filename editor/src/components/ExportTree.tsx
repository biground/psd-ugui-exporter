import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, X } from 'lucide-react';

import { isTreeNodeCollapsed, toggleCollapsedNodeId } from '../domain/tree-collapse';
import type { ExportNode } from '../schemas/psdui';

interface ExportTreeProps {
  nodes: ExportNode[];
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  onDeleteNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, direction: 'up' | 'down') => void;
  onSelectNode: (nodeId: string) => void;
  onToggleNodeSelection: (nodeId: string) => void;
}

export function ExportTree({
  nodes,
  selectedNodeId,
  selectedNodeIds,
  onDeleteNode,
  onMoveNode,
  onSelectNode,
  onToggleNodeSelection
}: ExportTreeProps) {
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<string[]>([]);

  if (nodes.length === 0) {
    return <p className="empty-state">No export nodes yet.</p>;
  }

  return (
    <div className="tree" role="tree" aria-label="Export nodes">
      {nodes.map((node, index) => (
        <ExportNodeRow
          key={node.id}
          node={node}
          depth={0}
          siblingIndex={index}
          siblingCount={nodes.length}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          onDeleteNode={onDeleteNode}
          onMoveNode={onMoveNode}
          onSelectNode={onSelectNode}
          onToggleNodeSelection={onToggleNodeSelection}
          collapsedNodeIds={collapsedNodeIds}
          onToggleNodeCollapse={(nodeId) =>
            setCollapsedNodeIds((current) => toggleCollapsedNodeId(current, nodeId))
          }
        />
      ))}
    </div>
  );
}

interface ExportNodeRowProps extends Omit<ExportTreeProps, 'nodes'> {
  node: ExportNode;
  depth: number;
  siblingIndex: number;
  siblingCount: number;
  collapsedNodeIds: string[];
  onToggleNodeCollapse: (nodeId: string) => void;
}

function ExportNodeRow({
  node,
  depth,
  siblingIndex,
  siblingCount,
  selectedNodeId,
  selectedNodeIds,
  onDeleteNode,
  onMoveNode,
  onSelectNode,
  onToggleNodeSelection,
  collapsedNodeIds,
  onToggleNodeCollapse
}: ExportNodeRowProps) {
  const isSelected = selectedNodeId === node.id;
  const isChecked = selectedNodeIds.includes(node.id);
  const hasChildren = node.children.length > 0;
  const isCollapsed = isTreeNodeCollapsed(collapsedNodeIds, node.id);

  return (
    <div role="treeitem" aria-selected={isSelected} aria-expanded={hasChildren ? !isCollapsed : undefined}>
      <div
        className={`tree-row export-tree-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="icon-button tree-collapse-toggle"
            aria-label={`Toggle ${node.name}`}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            onClick={() => onToggleNodeCollapse(node.id)}
          >
            {isCollapsed ? (
              <ChevronRight aria-hidden="true" className="button-icon" size={15} />
            ) : (
              <ChevronDown aria-hidden="true" className="button-icon" size={15} />
            )}
          </button>
        ) : (
          <span className="tree-collapse-spacer" aria-hidden="true" />
        )}
        <input
          type="checkbox"
          className="node-selection-checkbox"
          checked={isChecked}
          aria-label={`Select ${node.name} for merging`}
          onChange={() => onToggleNodeSelection(node.id)}
        />
        <span className={`status-dot ${node.enabled ? 'enabled' : 'disabled'}`} aria-hidden="true" />
        <button type="button" className="tree-row-main" onClick={() => onSelectNode(node.id)}>
          <span className="tree-name">{node.name}</span>
          <span className="tree-meta">{node.exportKind}</span>
        </button>
        <div className="tree-row-actions" aria-label={`${node.name} export node actions`}>
          <button
            type="button"
            className="icon-button"
            aria-label={`Move ${node.name} up`}
            title="Move up"
            disabled={siblingIndex === 0}
            onClick={() => onMoveNode(node.id, 'up')}
          >
            <ArrowUp aria-hidden="true" className="button-icon" size={14} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Move ${node.name} down`}
            title="Move down"
            disabled={siblingIndex === siblingCount - 1}
            onClick={() => onMoveNode(node.id, 'down')}
          >
            <ArrowDown aria-hidden="true" className="button-icon" size={14} />
          </button>
          <button
            type="button"
            className="icon-button danger-icon-button"
            aria-label={`Delete ${node.name}`}
            title="Delete"
            onClick={() => onDeleteNode(node.id)}
          >
            <X aria-hidden="true" className="button-icon" size={14} />
          </button>
        </div>
      </div>
      {isCollapsed ? null : node.children.map((child, index) => (
        <ExportNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          siblingIndex={index}
          siblingCount={node.children.length}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          onDeleteNode={onDeleteNode}
          onMoveNode={onMoveNode}
          onSelectNode={onSelectNode}
          onToggleNodeSelection={onToggleNodeSelection}
          collapsedNodeIds={collapsedNodeIds}
          onToggleNodeCollapse={onToggleNodeCollapse}
        />
      ))}
    </div>
  );
}
