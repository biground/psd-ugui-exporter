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
        />
      ))}
    </div>
  );
}

interface SourceLayerRowProps extends Omit<SourceTreeProps, 'layers'> {
  layer: SourceLayer;
  depth: number;
}

function SourceLayerRow({
  layer,
  depth,
  selectedLayerIds,
  hiddenLayerIds,
  exportedSourceLayerIds,
  onSelectLayer,
  onAddLayerToExportTree,
  onToggleLayerVisibility
}: SourceLayerRowProps) {
  const isSelected = selectedLayerIds.includes(layer.id);
  const isPreviewVisible = layer.visible && !hiddenLayerIds.includes(layer.id);
  const hasExportedSourceInSubtree = containsExportedSourceLayer(layer, exportedSourceLayerIds);

  return (
    <div role="treeitem" aria-selected={isSelected}>
      <div
        className={`tree-row source-tree-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
      >
        <button
          type="button"
          className={`icon-button layer-visibility-toggle ${isPreviewVisible ? 'is-visible' : 'is-hidden'}`}
          aria-label={`${isPreviewVisible ? 'Hide' : 'Show'} ${layer.name} in preview`}
          title={`${isPreviewVisible ? 'Hide' : 'Show'} in preview`}
          onClick={() => onToggleLayerVisibility(layer.id)}
        >
          <span className="eye-icon" aria-hidden="true" />
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
          &gt;
        </button>
      </div>
      {layer.children.map((child) => (
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
        />
      ))}
    </div>
  );
}

function containsExportedSourceLayer(layer: SourceLayer, exportedSourceLayerIds: number[]): boolean {
  return exportedSourceLayerIds.includes(layer.id)
    || layer.children.some((child) => containsExportedSourceLayer(child, exportedSourceLayerIds));
}
