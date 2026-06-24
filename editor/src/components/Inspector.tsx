import type { ExportKind, ExportNode, ListSettings } from '../schemas/psdui';

interface InspectorProps {
  node: ExportNode | null;
  selectedSourceLayerCount: number;
  onUpdateNode: (patch: Partial<ExportNode> | ((node: ExportNode) => ExportNode)) => void;
  onMergeSelectedSources: () => void;
  onUnmergeNode: (nodeId: string) => void;
}

const exportKinds: ExportKind[] = ['group', 'image', 'text', 'button', 'list'];

type InputChangeEvent = { target: HTMLInputElement };
type SelectChangeEvent = { target: HTMLSelectElement };

export function Inspector({
  node,
  selectedSourceLayerCount,
  onUpdateNode,
  onMergeSelectedSources,
  onUnmergeNode
}: InspectorProps) {
  if (node === null) {
    return (
      <section className="inspector-empty">
        <h2>Inspector</h2>
        <SourceSelectionActions
          selectedSourceLayerCount={selectedSourceLayerCount}
          onMergeSelectedSources={onMergeSelectedSources}
        />
        <p>Select an export node to edit its export semantics.</p>
      </section>
    );
  }

  return (
    <section className="inspector">
      <h2>Inspector</h2>
      <SourceSelectionActions
        selectedSourceLayerCount={selectedSourceLayerCount}
        onMergeSelectedSources={onMergeSelectedSources}
      />
      <label className="field">
        <span>Name</span>
        <input
          value={node.name}
          onChange={(event: InputChangeEvent) => onUpdateNode({ name: event.target.value })}
        />
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={node.enabled}
          onChange={(event: InputChangeEvent) => onUpdateNode({ enabled: event.target.checked })}
        />
        <span>Enabled</span>
      </label>
      <label className="field">
        <span>Export kind</span>
        <select
          value={node.exportKind}
          onChange={(event: SelectChangeEvent) => onUpdateNode({ exportKind: event.target.value as ExportKind })}
        >
          {exportKinds.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span>Source layer ids</span>
        <output>{node.sourceLayerIds.join(', ') || 'None'}</output>
      </div>
      {node.sourceLayerIds.length > 1 ? (
        <button type="button" className="danger-button" onClick={() => onUnmergeNode(node.id)}>
          Unmerge Node
        </button>
      ) : null}
      {node.exportKind === 'list' && node.list !== null ? (
        <ListSettingsEditor list={node.list} onUpdateNode={onUpdateNode} />
      ) : null}
    </section>
  );
}

interface SourceSelectionActionsProps {
  selectedSourceLayerCount: number;
  onMergeSelectedSources: () => void;
}

function SourceSelectionActions({
  selectedSourceLayerCount,
  onMergeSelectedSources
}: SourceSelectionActionsProps) {
  if (selectedSourceLayerCount === 0) {
    return null;
  }

  return (
    <section className="source-selection-actions" aria-label="Source selection actions">
      <div>
        <strong>Source selection</strong>
        <span>{selectedSourceLayerCount} layer{selectedSourceLayerCount === 1 ? '' : 's'}</span>
      </div>
      <button
        type="button"
        onClick={onMergeSelectedSources}
        disabled={selectedSourceLayerCount < 2}
      >
        Merge Selected Layers
      </button>
    </section>
  );
}

interface ListSettingsEditorProps {
  list: ListSettings;
  onUpdateNode: InspectorProps['onUpdateNode'];
}

function ListSettingsEditor({ list, onUpdateNode }: ListSettingsEditorProps) {
  function updateList(patch: Partial<ListSettings>) {
    onUpdateNode((node) => ({
      ...node,
      list: {
        ...list,
        ...patch,
        padding: patch.padding ?? list.padding
      }
    }));
  }

  function updatePadding(side: keyof ListSettings['padding'], value: number) {
    updateList({
      padding: {
        ...list.padding,
        [side]: value
      }
    });
  }

  return (
    <fieldset className="list-settings">
      <legend>List</legend>
      <label className="field">
        <span>Direction</span>
        <select
          value={list.direction}
          onChange={(event: SelectChangeEvent) =>
            updateList({ direction: event.target.value as ListSettings['direction'] })
          }
        >
          <option value="vertical">vertical</option>
          <option value="horizontal">horizontal</option>
        </select>
      </label>
      <label className="field">
        <span>Spacing</span>
        <input
          type="number"
          value={list.spacing}
          onChange={(event: InputChangeEvent) => updateList({ spacing: event.target.valueAsNumber || 0 })}
        />
      </label>
      <label className="field">
        <span>Cell template node id</span>
        <input
          value={list.cellTemplateNodeId ?? ''}
          onChange={(event: InputChangeEvent) => updateList({ cellTemplateNodeId: event.target.value || null })}
        />
      </label>
      <div className="padding-grid" aria-label="List padding">
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <label key={side} className="field">
            <span>{side}</span>
            <input
              type="number"
              value={list.padding[side]}
              onChange={(event: InputChangeEvent) => updatePadding(side, event.target.valueAsNumber || 0)}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
