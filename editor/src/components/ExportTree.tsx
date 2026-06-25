import { useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical, X } from 'lucide-react';

import { isTreeNodeCollapsed, toggleCollapsedNodeId } from '../domain/tree-collapse';
import type { ExportNode } from '../schemas/psdui';

type ExportNodeDropPosition = 'before' | 'inside' | 'after';

interface ExportTreeProps {
  nodes: ExportNode[];
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  onDeleteNode: (nodeId: string) => void;
  onDropNode: (draggedNodeId: string, targetNodeId: string, position: ExportNodeDropPosition) => void;
  onSelectNode: (nodeId: string) => void;
  onToggleNodeSelection: (nodeId: string) => void;
}

export function ExportTree({
  nodes,
  selectedNodeId,
  selectedNodeIds,
  onDeleteNode,
  onDropNode,
  onSelectNode,
  onToggleNodeSelection
}: ExportTreeProps) {
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<string[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<ExportTreeDragTarget | null>(null);

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
          draggedNodeId={draggedNodeId}
          dragTarget={dragTarget}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          onDeleteNode={onDeleteNode}
          onDropNode={onDropNode}
          onDragNodeStart={setDraggedNodeId}
          onDragNodeEnd={() => {
            setDraggedNodeId(null);
            setDragTarget(null);
          }}
          onDragTargetChange={setDragTarget}
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

interface ExportTreeDragTarget {
  nodeId: string;
  position: ExportNodeDropPosition;
}

interface ExportNodeRowProps extends Omit<ExportTreeProps, 'nodes'> {
  node: ExportNode;
  depth: number;
  draggedNodeId: string | null;
  dragTarget: ExportTreeDragTarget | null;
  onDragNodeStart: (nodeId: string) => void;
  onDragNodeEnd: () => void;
  onDragTargetChange: (target: ExportTreeDragTarget | null) => void;
  collapsedNodeIds: string[];
  onToggleNodeCollapse: (nodeId: string) => void;
}

function ExportNodeRow({
  node,
  depth,
  draggedNodeId,
  dragTarget,
  selectedNodeId,
  selectedNodeIds,
  onDeleteNode,
  onDropNode,
  onDragNodeStart,
  onDragNodeEnd,
  onDragTargetChange,
  onSelectNode,
  onToggleNodeSelection,
  collapsedNodeIds,
  onToggleNodeCollapse
}: ExportNodeRowProps) {
  const isSelected = selectedNodeId === node.id;
  const isChecked = selectedNodeIds.includes(node.id);
  const hasChildren = node.children.length > 0;
  const isCollapsed = isTreeNodeCollapsed(collapsedNodeIds, node.id);
  const dropPosition = dragTarget?.nodeId === node.id ? dragTarget.position : null;

  return (
    <div role="treeitem" aria-selected={isSelected} aria-expanded={hasChildren ? !isCollapsed : undefined}>
      <div
        className={[
          'tree-row',
          'export-tree-row',
          isSelected ? 'selected' : '',
          draggedNodeId === node.id ? 'dragging' : '',
          dropPosition !== null ? `drop-${dropPosition}` : ''
        ].filter(Boolean).join(' ')}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onDragOver={(event: ExportTreeDragEvent) => {
          if (draggedNodeId === null || draggedNodeId === node.id) {
            return;
          }

          event.preventDefault();
          onDragTargetChange({
            nodeId: node.id,
            position: resolveDropPosition(event)
          });
        }}
        onDragLeave={() => {
          if (dragTarget?.nodeId === node.id) {
            onDragTargetChange(null);
          }
        }}
        onDrop={(event: ExportTreeDragEvent) => {
          if (draggedNodeId === null || draggedNodeId === node.id) {
            return;
          }

          event.preventDefault();
          const position = resolveDropPosition(event);
          onDropNode(draggedNodeId, node.id, position);
          onDragNodeEnd();
        }}
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
        <button
          type="button"
          className="icon-button export-node-drag-handle"
          draggable
          aria-label={`Drag ${node.name}`}
          title="Drag to reorder"
          onDragStart={(event: ExportTreeDragStartEvent) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', node.id);
            onDragNodeStart(node.id);
          }}
          onDragEnd={onDragNodeEnd}
        >
          <GripVertical aria-hidden="true" className="button-icon" size={14} />
        </button>
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
          draggedNodeId={draggedNodeId}
          dragTarget={dragTarget}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          onDeleteNode={onDeleteNode}
          onDropNode={onDropNode}
          onDragNodeStart={onDragNodeStart}
          onDragNodeEnd={onDragNodeEnd}
          onDragTargetChange={onDragTargetChange}
          onSelectNode={onSelectNode}
          onToggleNodeSelection={onToggleNodeSelection}
          collapsedNodeIds={collapsedNodeIds}
          onToggleNodeCollapse={onToggleNodeCollapse}
        />
      ))}
    </div>
  );
}

interface ExportTreeDragStartEvent {
  dataTransfer: {
    effectAllowed: string;
    setData: (format: string, data: string) => void;
  };
}

interface ExportTreeDragEvent {
  clientY: number;
  preventDefault: () => void;
  currentTarget: {
    getBoundingClientRect: () => { top: number; height: number };
  };
}

function resolveDropPosition(event: ExportTreeDragEvent): ExportNodeDropPosition {
  const bounds = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - bounds.top;

  if (y < bounds.height * 0.28) {
    return 'before';
  }

  if (y > bounds.height * 0.72) {
    return 'after';
  }

  return 'inside';
}
