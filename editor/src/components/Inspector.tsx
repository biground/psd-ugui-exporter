import { convertFileSrc } from '@tauri-apps/api/core';

import {
  exportKinds,
  type ExportKind,
  type ExportNode,
  type ListSettings,
  type Scale9Settings
} from '../schemas/psdui';
import { createAutoScale9Settings, createDefaultScale9Settings } from '../domain/scale9';

interface InspectorProps {
  node: ExportNode | null;
  selectedExportNodeCount: number;
  scale9PreviewAsset: Scale9PreviewAsset | null;
  onUpdateNode: (patch: Partial<ExportNode> | ((node: ExportNode) => ExportNode)) => void;
  onMergeSelectedExports: () => void;
  onUnmergeNode: (nodeId: string) => void;
}

interface Scale9PreviewAsset {
  path: string;
  width: number;
  height: number;
}

type InputChangeEvent = { target: HTMLInputElement };
type SelectChangeEvent = { target: HTMLSelectElement };

export function Inspector({
  node,
  selectedExportNodeCount,
  scale9PreviewAsset,
  onUpdateNode,
  onMergeSelectedExports,
  onUnmergeNode
}: InspectorProps) {
  if (node === null) {
    return (
      <section className="inspector-empty">
        <h2>Inspector</h2>
        <ExportSelectionActions
          selectedExportNodeCount={selectedExportNodeCount}
          onMergeSelectedExports={onMergeSelectedExports}
        />
        <p>Select an export node to edit its export semantics.</p>
      </section>
    );
  }

  return (
    <section className="inspector">
      <h2>Inspector</h2>
      <ExportSelectionActions
        selectedExportNodeCount={selectedExportNodeCount}
        onMergeSelectedExports={onMergeSelectedExports}
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
      {node.mergedFrom !== undefined && node.mergedFrom.length > 0 ? (
        <button type="button" className="danger-button" onClick={() => onUnmergeNode(node.id)}>
          Unmerge Node
        </button>
      ) : null}
      {node.exportKind === 'list' && node.list !== null ? (
        <ListSettingsEditor list={node.list} onUpdateNode={onUpdateNode} />
      ) : null}
      {node.exportKind === 'image' ? (
        <Scale9SettingsEditor
          node={node}
          previewAsset={scale9PreviewAsset}
          onUpdateNode={onUpdateNode}
        />
      ) : null}
    </section>
  );
}

interface ExportSelectionActionsProps {
  selectedExportNodeCount: number;
  onMergeSelectedExports: () => void;
}

function ExportSelectionActions({
  selectedExportNodeCount,
  onMergeSelectedExports
}: ExportSelectionActionsProps) {
  if (selectedExportNodeCount === 0) {
    return null;
  }

  return (
    <section className="selection-actions" aria-label="Export selection actions">
      <div>
        <strong>Export selection</strong>
        <span>{selectedExportNodeCount} node{selectedExportNodeCount === 1 ? '' : 's'}</span>
      </div>
      <button
        type="button"
        onClick={onMergeSelectedExports}
        disabled={selectedExportNodeCount < 2}
      >
        Merge Selected Nodes
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

interface Scale9SettingsEditorProps {
  node: ExportNode;
  previewAsset: Scale9PreviewAsset | null;
  onUpdateNode: InspectorProps['onUpdateNode'];
}

function Scale9SettingsEditor({ node, previewAsset, onUpdateNode }: Scale9SettingsEditorProps) {
  const scale9 = node.scale9 ?? null;
  const assetSize = resolveScale9AssetSize(node, previewAsset);

  function updateScale9(scale9Settings: Scale9Settings | null) {
    onUpdateNode({ scale9: scale9Settings });
  }

  function updateBorder(side: keyof Scale9Settings['border'], value: number) {
    if (scale9 === null) {
      return;
    }

    updateScale9({
      ...scale9,
      border: {
        ...scale9.border,
        [side]: normalizeScale9BorderInput(value)
      }
    });
  }

  return (
    <fieldset className="scale9-settings">
      <legend>Scale9</legend>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={scale9?.enabled === true}
          onChange={(event: InputChangeEvent) =>
            updateScale9(event.target.checked ? createDefaultScale9Settings() : null)
          }
        />
        <span>九宫格图片</span>
      </label>
      {scale9 !== null && scale9.enabled ? (
        <>
          <div className="scale9-toolbar">
            <button type="button" onClick={() => updateScale9(createAutoScale9Settings(assetSize))}>
              Auto
            </button>
            <button type="button" onClick={() => updateScale9(createDefaultScale9Settings())}>
              Reset
            </button>
          </div>
          <Scale9Preview scale9={scale9} previewAsset={previewAsset} assetSize={assetSize} />
          <div className="padding-grid" aria-label="Scale9 border">
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <label key={side} className="field">
                <span>{side}</span>
                <input
                  type="number"
                  min="0"
                  value={scale9.border[side]}
                  onChange={(event: InputChangeEvent) => updateBorder(side, event.target.valueAsNumber || 0)}
                />
              </label>
            ))}
          </div>
        </>
      ) : null}
    </fieldset>
  );
}

interface Scale9PreviewProps {
  scale9: Scale9Settings;
  previewAsset: Scale9PreviewAsset | null;
  assetSize: Scale9PreviewAsset;
}

function Scale9Preview({ scale9, previewAsset, assetSize }: Scale9PreviewProps) {
  const left = toPercent(scale9.border.left, assetSize.width);
  const right = 100 - toPercent(scale9.border.right, assetSize.width);
  const top = toPercent(scale9.border.top, assetSize.height);
  const bottom = 100 - toPercent(scale9.border.bottom, assetSize.height);

  return (
    <div
      className="scale9-preview"
      aria-label="Scale9 preview"
      style={{ aspectRatio: `${assetSize.width} / ${assetSize.height}` }}
    >
      {previewAsset === null ? (
        <span className="scale9-preview-placeholder">No image preview</span>
      ) : (
        <img src={convertFileSrc(previewAsset.path)} alt="" draggable={false} />
      )}
      <span className="scale9-guide vertical" style={{ left: `${left}%` }} aria-hidden="true" />
      <span className="scale9-guide vertical" style={{ left: `${right}%` }} aria-hidden="true" />
      <span className="scale9-guide horizontal" style={{ top: `${top}%` }} aria-hidden="true" />
      <span className="scale9-guide horizontal" style={{ top: `${bottom}%` }} aria-hidden="true" />
    </div>
  );
}

function resolveScale9AssetSize(node: ExportNode, previewAsset: Scale9PreviewAsset | null): Scale9PreviewAsset {
  if (previewAsset !== null) {
    return {
      ...previewAsset,
      width: Math.max(1, previewAsset.width),
      height: Math.max(1, previewAsset.height)
    };
  }

  const rect = node.rasterBounds ?? node.rect;
  return {
    path: '',
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height)
  };
}

function normalizeScale9BorderInput(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function toPercent(value: number, total: number): number {
  return Math.max(0, Math.min(100, (value / Math.max(1, total)) * 100));
}
