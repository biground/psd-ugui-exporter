import type { ExportNode } from '../schemas/psdui';

interface ExportTreeProps {
  nodes: ExportNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export function ExportTree({ nodes, selectedNodeId, onSelectNode }: ExportTreeProps) {
  if (nodes.length === 0) {
    return <p className="empty-state">No export nodes yet.</p>;
  }

  return (
    <div className="tree" role="tree" aria-label="Export nodes">
      {nodes.map((node) => (
        <ExportNodeRow
          key={node.id}
          node={node}
          depth={0}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      ))}
    </div>
  );
}

interface ExportNodeRowProps extends Omit<ExportTreeProps, 'nodes'> {
  node: ExportNode;
  depth: number;
}

function ExportNodeRow({ node, depth, selectedNodeId, onSelectNode }: ExportNodeRowProps) {
  const isSelected = selectedNodeId === node.id;

  return (
    <div role="treeitem" aria-selected={isSelected}>
      <button
        type="button"
        className={`tree-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onClick={() => onSelectNode(node.id)}
      >
        <span className={`status-dot ${node.enabled ? 'enabled' : 'disabled'}`} aria-hidden="true" />
        <span className="tree-name">{node.name}</span>
        <span className="tree-meta">{node.exportKind}</span>
      </button>
      {node.children.map((child) => (
        <ExportNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      ))}
    </div>
  );
}
