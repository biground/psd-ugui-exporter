import type { ExportNode } from '../schemas/psdui';

interface ExportTreeProps {
  nodes: ExportNode[];
  selectedNodeId: string | null;
  onDeleteNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, direction: 'up' | 'down') => void;
  onSelectNode: (nodeId: string) => void;
}

export function ExportTree({
  nodes,
  selectedNodeId,
  onDeleteNode,
  onMoveNode,
  onSelectNode
}: ExportTreeProps) {
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
          onDeleteNode={onDeleteNode}
          onMoveNode={onMoveNode}
          onSelectNode={onSelectNode}
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
}

function ExportNodeRow({
  node,
  depth,
  siblingIndex,
  siblingCount,
  selectedNodeId,
  onDeleteNode,
  onMoveNode,
  onSelectNode
}: ExportNodeRowProps) {
  const isSelected = selectedNodeId === node.id;

  return (
    <div role="treeitem" aria-selected={isSelected}>
      <div
        className={`tree-row export-tree-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
      >
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
            ^
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Move ${node.name} down`}
            title="Move down"
            disabled={siblingIndex === siblingCount - 1}
            onClick={() => onMoveNode(node.id, 'down')}
          >
            v
          </button>
          <button
            type="button"
            className="icon-button danger-icon-button"
            aria-label={`Delete ${node.name}`}
            title="Delete"
            onClick={() => onDeleteNode(node.id)}
          >
            <span className="delete-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
      {node.children.map((child, index) => (
        <ExportNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          siblingIndex={index}
          siblingCount={node.children.length}
          selectedNodeId={selectedNodeId}
          onDeleteNode={onDeleteNode}
          onMoveNode={onMoveNode}
          onSelectNode={onSelectNode}
        />
      ))}
    </div>
  );
}
