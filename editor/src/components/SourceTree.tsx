import type { SourceLayer } from '../schemas/source';

type MouseClickEvent = {
  metaKey: boolean;
  ctrlKey: boolean;
};

interface SourceTreeProps {
  layers: SourceLayer[];
  selectedLayerIds: number[];
  hiddenLayerIds: number[];
  onSelectLayer: (layerId: number) => void;
  onToggleLayerSelection: (layerId: number) => void;
  onToggleLayerVisibility: (layerId: number) => void;
}

export function SourceTree({
  layers,
  selectedLayerIds,
  hiddenLayerIds,
  onSelectLayer,
  onToggleLayerSelection,
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
          onSelectLayer={onSelectLayer}
          onToggleLayerSelection={onToggleLayerSelection}
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
  onSelectLayer,
  onToggleLayerSelection,
  onToggleLayerVisibility
}: SourceLayerRowProps) {
  const isSelected = selectedLayerIds.includes(layer.id);
  const isPreviewVisible = layer.visible && !hiddenLayerIds.includes(layer.id);

  function selectLayer(event: MouseClickEvent) {
    if (event.metaKey || event.ctrlKey) {
      onToggleLayerSelection(layer.id);
      return;
    }

    onSelectLayer(layer.id);
  }

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
        <input
          type="checkbox"
          className="layer-selection-checkbox"
          checked={isSelected}
          aria-label={`Select ${layer.name}`}
          onChange={() => onToggleLayerSelection(layer.id)}
        />
        <button type="button" className="tree-row-main" onClick={selectLayer}>
          <span className="tree-name">{layer.name}</span>
          <span className="tree-meta">{layer.kind}</span>
        </button>
      </div>
      {layer.children.map((child) => (
        <SourceLayerRow
          key={child.id}
          layer={child}
          depth={depth + 1}
          selectedLayerIds={selectedLayerIds}
          hiddenLayerIds={hiddenLayerIds}
          onSelectLayer={onSelectLayer}
          onToggleLayerSelection={onToggleLayerSelection}
          onToggleLayerVisibility={onToggleLayerVisibility}
        />
      ))}
    </div>
  );
}
