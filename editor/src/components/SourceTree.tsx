import type { SourceLayer } from '../schemas/source';

type MouseClickEvent = {
  metaKey: boolean;
  ctrlKey: boolean;
};

interface SourceTreeProps {
  layers: SourceLayer[];
  selectedLayerIds: number[];
  onSelectLayer: (layerId: number) => void;
  onToggleLayerSelection: (layerId: number) => void;
}

export function SourceTree({
  layers,
  selectedLayerIds,
  onSelectLayer,
  onToggleLayerSelection
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
          onSelectLayer={onSelectLayer}
          onToggleLayerSelection={onToggleLayerSelection}
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
  onSelectLayer,
  onToggleLayerSelection
}: SourceLayerRowProps) {
  const isSelected = selectedLayerIds.includes(layer.id);

  function selectLayer(event: MouseClickEvent) {
    if (event.metaKey || event.ctrlKey) {
      onToggleLayerSelection(layer.id);
      return;
    }

    onSelectLayer(layer.id);
  }

  return (
    <div role="treeitem" aria-selected={isSelected}>
      <button
        type="button"
        className={`tree-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onClick={selectLayer}
      >
        <span className={`visibility-dot ${layer.visible ? 'visible' : 'hidden'}`} aria-hidden="true" />
        <span className="tree-name">{layer.name}</span>
        <span className="tree-meta">{layer.kind}</span>
      </button>
      {layer.children.map((child) => (
        <SourceLayerRow
          key={child.id}
          layer={child}
          depth={depth + 1}
          selectedLayerIds={selectedLayerIds}
          onSelectLayer={onSelectLayer}
          onToggleLayerSelection={onToggleLayerSelection}
        />
      ))}
    </div>
  );
}
