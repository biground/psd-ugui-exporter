import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';

import { isTreeNodeCollapsed, toggleCollapsedNodeId } from '../domain/tree-collapse';
import type { SourceLayer } from '../schemas/source';

interface SourceTreeProps {
  layers: SourceLayer[];
  selectedLayerIds: number[];
  hiddenLayerIds: number[];
  exportedSourceLayerIds: number[];
  onSelectLayer: (layerId: number) => void;
  onAddLayerToExportTree: (layerId: number) => void;
  onToggleLayerVisibility: (layerId: number) => void;
}

export function SourceTree({
  layers,
  selectedLayerIds,
  hiddenLayerIds,
  exportedSourceLayerIds,
  onSelectLayer,
  onAddLayerToExportTree,
  onToggleLayerVisibility
}: SourceTreeProps) {
  const [collapsedLayerIds, setCollapsedLayerIds] = useState<string[]>([]);

  if (layers.length === 0) {
    return <p className="empty-state">No source layers loaded.</p>;
  }

  return (
    <div className="tree" role="tree" aria-label="Source layers">
      {layers.map((layer) => (
        <SourceLayerRow
          key={layer.id}
          layer={layer}
          depth={0}
          selectedLayerIds={selectedLayerIds}
          hiddenLayerIds={hiddenLayerIds}
          exportedSourceLayerIds={exportedSourceLayerIds}
          onSelectLayer={onSelectLayer}
          onAddLayerToExportTree={onAddLayerToExportTree}
          onToggleLayerVisibility={onToggleLayerVisibility}
          collapsedLayerIds={collapsedLayerIds}
          onToggleLayerCollapse={(layerId) =>
            setCollapsedLayerIds((current) => toggleCollapsedNodeId(current, String(layerId)))
          }
        />
      ))}
    </div>
  );
}

interface SourceLayerRowProps extends Omit<SourceTreeProps, 'layers'> {
  layer: SourceLayer;
  depth: number;
  collapsedLayerIds: string[];
  onToggleLayerCollapse: (layerId: number) => void;
}

function SourceLayerRow({
  layer,
  depth,
  selectedLayerIds,
  hiddenLayerIds,
  exportedSourceLayerIds,
  onSelectLayer,
  onAddLayerToExportTree,
  onToggleLayerVisibility,
  collapsedLayerIds,
  onToggleLayerCollapse
}: SourceLayerRowProps) {
  const isSelected = selectedLayerIds.includes(layer.id);
  const isPreviewVisible = layer.visible && !hiddenLayerIds.includes(layer.id);
  const hasExportedSourceInSubtree = containsExportedSourceLayer(layer, exportedSourceLayerIds);
  const hasChildren = layer.children.length > 0;
  const isCollapsed = isTreeNodeCollapsed(collapsedLayerIds, String(layer.id));

  return (
    <div role="treeitem" aria-selected={isSelected} aria-expanded={hasChildren ? !isCollapsed : undefined}>
      <div
        className={`tree-row source-tree-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="icon-button tree-collapse-toggle"
            aria-label={`Toggle ${layer.name}`}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            onClick={() => onToggleLayerCollapse(layer.id)}
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
          className={`icon-button layer-visibility-toggle ${isPreviewVisible ? 'is-visible' : 'is-hidden'}`}
          aria-label={`${isPreviewVisible ? 'Hide' : 'Show'} ${layer.name} in preview`}
          title={`${isPreviewVisible ? 'Hide' : 'Show'} in preview`}
          onClick={() => onToggleLayerVisibility(layer.id)}
        >
          {isPreviewVisible ? (
            <Eye aria-hidden="true" className="button-icon" size={15} />
          ) : (
            <EyeOff aria-hidden="true" className="button-icon" size={15} />
          )}
        </button>
        <button type="button" className="tree-row-main" onClick={() => onSelectLayer(layer.id)}>
          <span className="tree-name">{layer.name}</span>
          <span className="tree-meta">{layer.kind}</span>
        </button>
        <button
          type="button"
          className="icon-button add-export-button"
          aria-label={`Add ${layer.name} to export tree`}
          title={hasExportedSourceInSubtree ? 'Already in Export Tree' : 'Add to Export Tree'}
          disabled={hasExportedSourceInSubtree}
          onClick={() => onAddLayerToExportTree(layer.id)}
        >
          <ArrowRight aria-hidden="true" className="button-icon" size={15} />
        </button>
      </div>
      {isCollapsed ? null : layer.children.map((child) => (
        <SourceLayerRow
          key={child.id}
          layer={child}
          depth={depth + 1}
          selectedLayerIds={selectedLayerIds}
          hiddenLayerIds={hiddenLayerIds}
          exportedSourceLayerIds={exportedSourceLayerIds}
          onSelectLayer={onSelectLayer}
          onAddLayerToExportTree={onAddLayerToExportTree}
          onToggleLayerVisibility={onToggleLayerVisibility}
          collapsedLayerIds={collapsedLayerIds}
          onToggleLayerCollapse={onToggleLayerCollapse}
        />
      ))}
    </div>
  );
}

function containsExportedSourceLayer(layer: SourceLayer, exportedSourceLayerIds: number[]): boolean {
  return exportedSourceLayerIds.includes(layer.id)
    || layer.children.some((child) => containsExportedSourceLayer(child, exportedSourceLayerIds));
}
