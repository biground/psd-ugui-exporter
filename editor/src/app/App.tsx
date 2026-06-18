import { invoke } from '@tauri-apps/api/core';
import { useMemo, useState } from 'react';

import { CanvasPreview } from '../components/CanvasPreview';
import { ExportTree } from '../components/ExportTree';
import { Inspector } from '../components/Inspector';
import { SourceTree } from '../components/SourceTree';
import { createLayoutDocument } from '../domain/layout-export';
import type { ExportKind, ExportNode } from '../schemas/psdui';
import {
  appendExportNode,
  createEmptyState,
  createExportNodeForSources,
  createProjectFromSourceDocument,
  findExportNodeById,
  findSourceLayersByIds,
  selectSourceLayer,
  type SourceDocumentInput,
  updateExportNode
} from './state';

type InputChangeEvent = { target: HTMLInputElement };
type SelectChangeEvent = { target: HTMLSelectElement };

export function App() {
  const [state, setState] = useState(createEmptyState);
  const [sourcePath, setSourcePath] = useState('');
  const [cacheDir, setCacheDir] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [layoutPath, setLayoutPath] = useState('');
  const [newExportKind, setNewExportKind] = useState<ExportKind>('image');

  const selectedExportNode = useMemo(() => {
    if (state.project === null) {
      return null;
    }

    return findExportNodeById(state.project.exportTree, state.selectedExportNodeId);
  }, [state.project, state.selectedExportNodeId]);

  async function runCommand(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      setState((current) => ({
        ...current,
        message: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  async function openPsd() {
    await runCommand(async () => {
      const sourceDocument = await invoke<SourceDocumentInput>('open_psd', {
        sourcePath,
        cacheDir
      });
      const project = createProjectFromSourceDocument(sourceDocument);

      setState({
        project,
        selectedSourceLayerIds: [],
        selectedExportNodeId: project.exportTree[0]?.id ?? null,
        message: `Opened ${project.source.fileName}.`
      });
    });
  }

  function createExportNode() {
    setState((current) => {
      if (current.project === null) {
        return {
          ...current,
          message: 'Open a PSD/PSB before creating export nodes.'
        };
      }

      const sourceLayers = findSourceLayersByIds(
        current.project.sourceTree,
        current.selectedSourceLayerIds
      );

      if (sourceLayers.length === 0) {
        return {
          ...current,
          message: 'Select at least one source layer first.'
        };
      }

      const node = createExportNodeForSources(`export_${Date.now().toString(36)}`, sourceLayers, newExportKind);

      return appendExportNode(current, node);
    });
  }

  async function saveProject() {
    await runCommand(async () => {
      if (state.project === null) {
        throw new Error('Open a PSD/PSB before saving.');
      }

      await invoke('save_project', { projectPath, project: state.project });
      setState((current) => ({ ...current, message: `Saved ${projectPath}.` }));
    });
  }

  async function exportLayout() {
    await runCommand(async () => {
      if (state.project === null) {
        throw new Error('Open a PSD/PSB before exporting layout.');
      }

      const layout = createLayoutDocument(state.project);
      await invoke('export_layout', { layoutPath, layout });
      setState((current) => ({ ...current, message: `Exported ${layoutPath}.` }));
    });
  }

  function updateSelectedExportNode(patch: Partial<ExportNode> | ((node: ExportNode) => ExportNode)) {
    const nodeId = state.selectedExportNodeId;

    if (nodeId === null) {
      return;
    }

    setState((current) => updateExportNode(current, nodeId, patch));
  }

  const canCreateNode = state.project !== null && state.selectedSourceLayerIds.length > 0;

  return (
    <>
      <style>{appCss}</style>
      <main className="app-shell">
        <header className="toolbar">
          <div className="path-grid">
            <PathInput label="PSD/PSB path" value={sourcePath} onChange={setSourcePath} />
            <PathInput label="Cache dir" value={cacheDir} onChange={setCacheDir} />
            <PathInput label="Project path" value={projectPath} onChange={setProjectPath} />
            <PathInput label="Layout path" value={layoutPath} onChange={setLayoutPath} />
          </div>
          <div className="actions">
            <button type="button" onClick={openPsd}>
              Open PSD/PSB
            </button>
            <label className="compact-select">
              <span>New node</span>
              <select value={newExportKind} onChange={(event: SelectChangeEvent) => setNewExportKind(event.target.value as ExportKind)}>
                <option value="image">image</option>
                <option value="button">button</option>
                <option value="group">group</option>
                <option value="text">text</option>
                <option value="list">list</option>
              </select>
            </label>
            <button type="button" onClick={createExportNode} disabled={!canCreateNode}>
              Create Export Node
            </button>
            <button type="button" onClick={saveProject} disabled={state.project === null}>
              Save .psdui
            </button>
            <button type="button" onClick={exportLayout} disabled={state.project === null}>
              Export Layout
            </button>
          </div>
          <p className="message" role="status">
            {state.message ?? 'Ready.'}
          </p>
        </header>
        <section className="workspace">
          <aside className="left-panel">
            <section className="panel-section">
              <h2>Source Tree</h2>
              <SourceTree
                layers={state.project?.sourceTree ?? []}
                selectedLayerIds={state.selectedSourceLayerIds}
                onSelectLayer={(layerId) =>
                  setState((current) => selectSourceLayer(current, layerId))
                }
              />
            </section>
            <section className="panel-section">
              <h2>Export Tree</h2>
              <ExportTree
                nodes={state.project?.exportTree ?? []}
                selectedNodeId={state.selectedExportNodeId}
                onSelectNode={(nodeId) =>
                  setState((current) => ({ ...current, selectedExportNodeId: nodeId }))
                }
              />
            </section>
          </aside>
          <CanvasPreview
            project={state.project}
            selectedExportNodeId={state.selectedExportNodeId}
          />
          <aside className="right-panel">
            <Inspector node={selectedExportNode} onUpdateNode={updateSelectedExportNode} />
          </aside>
        </section>
      </main>
    </>
  );
}

interface PathInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function PathInput({ label, value, onChange }: PathInputProps) {
  return (
    <label className="path-input">
      <span>{label}</span>
      <input value={value} onChange={(event: InputChangeEvent) => onChange(event.target.value)} />
    </label>
  );
}

const appCss = `
:root {
  color: #18202b;
  background: #eef1f5;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input,
select {
  font: inherit;
}

button {
  border: 1px solid #c4ccd8;
  border-radius: 6px;
  background: #ffffff;
  color: #1f2a37;
  cursor: pointer;
  min-height: 34px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
}

.toolbar {
  padding: 12px 14px;
  background: #ffffff;
  border-bottom: 1px solid #d8dee8;
  display: grid;
  gap: 10px;
}

.path-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  gap: 10px;
}

.path-input,
.field {
  display: grid;
  gap: 5px;
  color: #526173;
  font-size: 12px;
  font-weight: 650;
}

.path-input input,
.field input,
.field select,
.field output {
  width: 100%;
  min-height: 32px;
  border: 1px solid #cbd3df;
  border-radius: 6px;
  padding: 5px 8px;
  background: #ffffff;
  color: #17202c;
  font-weight: 500;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: end;
}

.actions button {
  padding: 0 12px;
}

.compact-select {
  display: grid;
  grid-template-columns: auto minmax(96px, 130px);
  gap: 6px;
  align-items: center;
  min-height: 34px;
  color: #526173;
  font-size: 12px;
  font-weight: 650;
}

.compact-select select {
  min-height: 34px;
  border: 1px solid #cbd3df;
  border-radius: 6px;
  padding: 0 8px;
}

.message {
  margin: 0;
  min-height: 20px;
  color: #526173;
  font-size: 13px;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(270px, 320px) minmax(360px, 1fr) minmax(260px, 320px);
  min-height: 0;
}

.left-panel,
.right-panel {
  min-height: 0;
  overflow: auto;
  background: #f8fafc;
}

.left-panel {
  border-right: 1px solid #d8dee8;
}

.right-panel {
  border-left: 1px solid #d8dee8;
}

.panel-section,
.inspector,
.inspector-empty {
  padding: 14px;
}

.panel-section + .panel-section {
  border-top: 1px solid #d8dee8;
}

h2 {
  margin: 0 0 10px;
  font-size: 13px;
  color: #2e3a48;
  text-transform: uppercase;
  letter-spacing: 0;
}

.empty-state,
.inspector-empty p,
.canvas-placeholder p {
  margin: 0;
  color: #718096;
  font-size: 13px;
}

.tree {
  display: grid;
  gap: 3px;
}

.tree-row {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  text-align: left;
  border-color: transparent;
  background: transparent;
  padding-top: 6px;
  padding-right: 8px;
  padding-bottom: 6px;
}

.tree-row:hover {
  background: #eef4fb;
}

.tree-row.selected {
  background: #dcecff;
  border-color: #7aa8e8;
}

.tree-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-meta {
  color: #64748b;
  font-size: 11px;
}

.visibility-dot,
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.visibility-dot.visible,
.status-dot.enabled {
  background: #2f9e6d;
}

.visibility-dot.hidden,
.status-dot.disabled {
  background: #a8b0bd;
}

.canvas-placeholder,
.canvas-stage {
  min-width: 0;
  min-height: 0;
  padding: 18px;
}

.canvas-stage {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 12px;
}

.canvas-info {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #526173;
  font-size: 13px;
}

.canvas-info strong {
  color: #1f2a37;
}

.canvas-shell {
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: auto;
}

.canvas-board {
  position: relative;
  width: min(100%, 920px);
  max-height: 100%;
  border: 1px solid #aeb8c7;
  background:
    linear-gradient(45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(-45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f8fafc 75%),
    linear-gradient(-45deg, transparent 75%, #f8fafc 75%);
  background-color: #ffffff;
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
}

.canvas-node {
  position: absolute;
  display: block;
  overflow: hidden;
  min-height: 0;
  border: 1px solid #2563eb;
  border-radius: 3px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  padding: 2px;
  text-align: left;
}

.canvas-node.selected {
  border-color: #dc2626;
  background: rgba(220, 38, 38, 0.12);
  color: #991b1b;
}

.canvas-node span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  line-height: 1.2;
}

.inspector {
  display: grid;
  gap: 12px;
}

.checkbox-field {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #526173;
  font-size: 13px;
  font-weight: 650;
}

.checkbox-field input {
  width: 16px;
  height: 16px;
}

.list-settings {
  display: grid;
  gap: 12px;
  margin: 4px 0 0;
  padding: 12px;
  border: 1px solid #d8dee8;
  border-radius: 6px;
}

.list-settings legend {
  color: #526173;
  font-size: 12px;
  font-weight: 700;
}

.padding-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 980px) {
  .path-grid {
    grid-template-columns: repeat(2, minmax(170px, 1fr));
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .left-panel,
  .right-panel {
    border: 0;
    border-bottom: 1px solid #d8dee8;
  }
}
`;
