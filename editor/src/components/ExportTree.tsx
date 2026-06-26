import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, GripVertical, X } from 'lucide-react';

import { isTreeNodeCollapsed, toggleCollapsedNodeId } from '../domain/tree-collapse';
import type { ExportNode } from '../schemas/psdui';

type ExportNodeDropPosition = 'before' | 'inside' | 'after';

interface ExportTreeProps {
  nodes: ExportNode[];
  renamingNodeId: string | null;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  onDeleteNode: (nodeId: string) => void;
  onDropNode: (draggedNodeId: string, targetNodeId: string, position: ExportNodeDropPosition) => void;
  onRenameNode: (nodeId: string, name: string) => void;
  onRenameNodeEnd: () => void;
  onRenameNodeStart: (nodeId: string) => void;
  onSelectNode: (nodeId: string, event: ExportTreeSelectEvent) => void;
  onToggleNodeEnabled: (nodeId: string) => void;
  onToggleNodeSelection: (nodeId: string) => void;
}

export interface ExportTreeSelectEvent {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  orderedNodeIds: string[];
}

export function ExportTree({
  nodes,
  renamingNodeId,
  selectedNodeId,
  selectedNodeIds,
  onDeleteNode,
  onDropNode,
  onRenameNode,
  onRenameNodeEnd,
  onRenameNodeStart,
  onSelectNode,
  onToggleNodeEnabled,
  onToggleNodeSelection
}: ExportTreeProps) {
  const treeRef = useRef<HTMLDivElement | null>(null);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<string[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<ExportTreeDragTarget | null>(null);
  const dragTargetRef = useRef<ExportTreeDragTarget | null>(null);
  const orderedNodeIds = collectVisibleExportNodeIds(nodes, collapsedNodeIds);

  useEffect(() => {
    if (draggedNodeId === null) {
      return;
    }

    const activeDraggedNodeId = draggedNodeId;
    const tree = treeRef.current;
    const ownerWindow = tree?.ownerDocument.defaultView ?? window;

    function finishDrag() {
      setDraggedNodeId(null);
      dragTargetRef.current = null;
      setDragTarget(null);
    }

    function handlePointerMove(event: PointerEvent) {
      if (treeRef.current === null) {
        return;
      }

      event.preventDefault();
      const nextDragTarget = findExportNodeDropTarget(treeRef.current, activeDraggedNodeId, event);
      dragTargetRef.current = nextDragTarget;
      setDragTarget(nextDragTarget);
    }

    function handlePointerUp(event: PointerEvent) {
      event.preventDefault();
      const currentDragTarget = dragTargetRef.current;

      if (currentDragTarget !== null) {
        onDropNode(activeDraggedNodeId, currentDragTarget.nodeId, currentDragTarget.position);
      }

      finishDrag();
    }

    ownerWindow.addEventListener('pointermove', handlePointerMove);
    ownerWindow.addEventListener('pointerup', handlePointerUp);
    ownerWindow.addEventListener('pointercancel', finishDrag);

    return () => {
      ownerWindow.removeEventListener('pointermove', handlePointerMove);
      ownerWindow.removeEventListener('pointerup', handlePointerUp);
      ownerWindow.removeEventListener('pointercancel', finishDrag);
    };
  }, [draggedNodeId, onDropNode]);

  if (nodes.length === 0) {
    return <p className="empty-state">No export nodes yet.</p>;
  }

  return (
    <div className="tree" role="tree" aria-label="Export nodes" ref={treeRef}>
      {nodes.map((node) => (
        <ExportNodeRow
          key={node.id}
          node={node}
          depth={0}
          draggedNodeId={draggedNodeId}
          dragTarget={dragTarget}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          onDeleteNode={onDeleteNode}
          onDragNodeStart={setDraggedNodeId}
          onRenameNode={onRenameNode}
          onRenameNodeStart={onRenameNodeStart}
          onSelectNode={onSelectNode}
          onToggleNodeEnabled={onToggleNodeEnabled}
          onToggleNodeSelection={onToggleNodeSelection}
          collapsedNodeIds={collapsedNodeIds}
          orderedNodeIds={orderedNodeIds}
          renamingNodeId={renamingNodeId}
          onRenameNodeEnd={onRenameNodeEnd}
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

interface ExportNodeRowProps extends Omit<ExportTreeProps, 'nodes' | 'onDropNode'> {
  node: ExportNode;
  depth: number;
  draggedNodeId: string | null;
  dragTarget: ExportTreeDragTarget | null;
  onDragNodeStart: (nodeId: string) => void;
  onRenameNodeStart: (nodeId: string) => void;
  collapsedNodeIds: string[];
  orderedNodeIds: string[];
  renamingNodeId: string | null;
  onRenameNodeEnd: () => void;
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
  onDragNodeStart,
  onRenameNode,
  onRenameNodeStart,
  onSelectNode,
  onToggleNodeEnabled,
  onToggleNodeSelection,
  collapsedNodeIds,
  orderedNodeIds,
  renamingNodeId,
  onRenameNodeEnd,
  onToggleNodeCollapse
}: ExportNodeRowProps) {
  const isChecked = selectedNodeIds.includes(node.id);
  const isSelected = selectedNodeId === node.id || isChecked;
  const hasChildren = node.children.length > 0;
  const isCollapsed = isTreeNodeCollapsed(collapsedNodeIds, node.id);
  const dropPosition = dragTarget?.nodeId === node.id ? dragTarget.position : null;
  const isRenaming = renamingNodeId === node.id;
  const [draftName, setDraftName] = useState(node.name);

  useEffect(() => {
    if (isRenaming) {
      setDraftName(node.name);
    }
  }, [isRenaming, node.name]);

  function commitRename() {
    const nextName = draftName.trim();
    if (nextName.length > 0 && nextName !== node.name) {
      onRenameNode(node.id, nextName);
    }
    onRenameNodeEnd();
  }

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
        data-export-node-id={node.id}
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
          className={`icon-button layer-visibility-toggle ${node.enabled ? 'is-visible' : 'is-hidden'}`}
          aria-label={`${node.enabled ? 'Disable' : 'Enable'} ${node.name} for export`}
          title={`${node.enabled ? 'Disable' : 'Enable'} export`}
          onClick={() => onToggleNodeEnabled(node.id)}
        >
          {node.enabled ? (
            <Eye aria-hidden="true" className="button-icon" size={15} />
          ) : (
            <EyeOff aria-hidden="true" className="button-icon" size={15} />
          )}
        </button>
        <button
          type="button"
          className="icon-button export-node-drag-handle"
          aria-label={`Drag ${node.name}`}
          title="Drag to reorder"
          onPointerDown={(event: ExportTreePointerDownEvent) => {
            if (event.button !== 0) {
              return;
            }

            event.preventDefault();
            onDragNodeStart(node.id);
          }}
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
        {isRenaming ? (
          <input
            className="tree-row-rename-input"
            value={draftName}
            autoFocus
            onChange={(event: InputChangeEvent) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event: ExportTreeKeyDownEvent) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitRename();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                onRenameNodeEnd();
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="tree-row-main"
            onClick={(event: ExportTreeMouseEvent) => {
              onSelectNode(node.id, {
                shiftKey: event.shiftKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                orderedNodeIds
              });
            }}
            onKeyDown={(event: ExportTreeKeyDownEvent) => {
              if (event.key !== 'Enter' || selectedNodeIds.length !== 1 || !isChecked) {
                return;
              }

              event.preventDefault();
              onRenameNodeStart(node.id);
            }}
          >
            <span className="tree-name">{node.name}</span>
            <span className="tree-meta">{node.exportKind}</span>
          </button>
        )}
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
      {isCollapsed ? null : node.children.map((child) => (
        <ExportNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          draggedNodeId={draggedNodeId}
          dragTarget={dragTarget}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          onDeleteNode={onDeleteNode}
          onDragNodeStart={onDragNodeStart}
          onRenameNode={onRenameNode}
          onRenameNodeStart={onRenameNodeStart}
          onSelectNode={onSelectNode}
          onToggleNodeEnabled={onToggleNodeEnabled}
          onToggleNodeSelection={onToggleNodeSelection}
          collapsedNodeIds={collapsedNodeIds}
          orderedNodeIds={orderedNodeIds}
          renamingNodeId={renamingNodeId}
          onRenameNodeEnd={onRenameNodeEnd}
          onToggleNodeCollapse={onToggleNodeCollapse}
        />
      ))}
    </div>
  );
}

interface ExportTreePointerPosition {
  clientX: number;
  clientY: number;
}

interface ExportTreePointerDownEvent {
  button: number;
  preventDefault: () => void;
}

type InputChangeEvent = { target: HTMLInputElement };
type ExportTreeMouseEvent = {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
};
type ExportTreeKeyDownEvent = {
  key: string;
  preventDefault: () => void;
};

function collectVisibleExportNodeIds(nodes: ExportNode[], collapsedNodeIds: string[]): string[] {
  return nodes.flatMap((node) => {
    if (isTreeNodeCollapsed(collapsedNodeIds, node.id)) {
      return [node.id];
    }

    return [node.id, ...collectVisibleExportNodeIds(node.children, collapsedNodeIds)];
  });
}

function resolveDropPosition(
  clientY: number,
  bounds: { top: number; height: number }
): ExportNodeDropPosition {
  const y = clientY - bounds.top;

  if (y < bounds.height * 0.28) {
    return 'before';
  }

  if (y > bounds.height * 0.72) {
    return 'after';
  }

  return 'inside';
}

function findExportNodeDropTarget(
  tree: HTMLElement,
  draggedNodeId: string,
  position: ExportTreePointerPosition
): ExportTreeDragTarget | null {
  const element = tree.ownerDocument.elementFromPoint(position.clientX, position.clientY);
  const row = element?.closest<HTMLElement>('[data-export-node-id]');

  if (row === undefined || row === null || !tree.contains(row)) {
    return null;
  }

  const targetNodeId = row.dataset.exportNodeId;

  if (targetNodeId === undefined || targetNodeId === draggedNodeId) {
    return null;
  }

  return {
    nodeId: targetNodeId,
    position: resolveDropPosition(position.clientY, row.getBoundingClientRect())
  };
}
