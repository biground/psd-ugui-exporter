import { invoke } from '@tauri-apps/api/core';
import { documentDir } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect, useMemo, useState } from 'react';

import { CanvasPreview } from '../components/CanvasPreview';
import { ExportTree } from '../components/ExportTree';
import { Inspector } from '../components/Inspector';
import { SourceTree } from '../components/SourceTree';
import { createLayoutDocument } from '../domain/layout-export';
import {
  defaultTreePanelWidths,
  resizeTreePanelsFromPointer,
  treePanelMinWidth,
  type TreePanelWidths
} from '../domain/tree-panel-resize';
import { exportKinds, type ExportKind, type ExportNode, type PSDUIProject } from '../schemas/psdui';
import { createOpenProjectDialogOptions, createOpenPsdDialogOptions } from './open-dialog';
import { deriveDefaultProjectSettings, type ProjectSettings } from './project-settings';
import {
  createRecentFilesStore,
  forgetRecentProject,
  getRecentOpenCandidates,
  recordRecentProject,
  recordRecentSource
} from './recent-files';
import {
  addSourceLayerToExportTree,
  collectExportedSourceLayerIds,
  createEmptyState,
  createProjectFromSourceDocument,
  findExportNodeById,
  mergeSelectedExportNodes,
  moveExportNode,
  removeExportNode,
  selectSourceLayer,
  toggleExportNodeSelection,
  toggleSourceLayerPreviewVisibility,
  unmergeExportNode,
  type SourceDocumentInput,
  updateExportNode
} from './state';

type InputChangeEvent = { target: HTMLInputElement };
type SelectChangeEvent = { target: HTMLSelectElement };
type DetailsToggleEvent = { target: HTMLDetailsElement };
type TreePanelResizePointerEvent = {
  clientX: number;
  pointerId: number;
  preventDefault: () => void;
  currentTarget: {
    parentElement: { getBoundingClientRect: () => { left: number } } | null;
    setPointerCapture: (pointerId: number) => void;
    releasePointerCapture: (pointerId: number) => void;
  };
};

export function App() {
  const recentFilesStore = useMemo(() => createRecentFilesStore(window.localStorage), []);
  const [state, setState] = useState(createEmptyState);
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    projectPath: '',
    layoutPath: ''
  });
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [newExportKind, setNewExportKind] = useState<ExportKind>('image');
  const [treePanelWidths, setTreePanelWidths] = useState<TreePanelWidths>(defaultTreePanelWidths);
  const [isTreePanelResizing, setTreePanelResizing] = useState(false);

  const selectedExportNode = useMemo(() => {
    if (state.project === null) {
      return null;
    }

    return findExportNodeById(state.project.exportTree, state.selectedExportNodeId);
  }, [state.project, state.selectedExportNodeId]);

  const exportedSourceLayerIds = useMemo(() => {
    if (state.project === null) {
      return [];
    }

    return collectExportedSourceLayerIds(state.project.exportTree);
  }, [state.project]);

  useEffect(() => {
    void restoreRecentFile();
  }, []);

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

  async function restoreRecentFile() {
    const candidates = getRecentOpenCandidates(recentFilesStore.load());

    if (candidates.length === 0) {
      return;
    }

    setState((current) => ({
      ...current,
      message: 'Restoring last opened file...'
    }));

    let lastError: unknown = null;
    let projectRestoreFailed = false;

    for (const candidate of candidates) {
      try {
        if (candidate.kind === 'project') {
          const project = await invoke<PSDUIProject>('read_project', {
            projectPath: candidate.path
          });

          recordRecentProject(recentFilesStore, candidate.path, project.source.path);
          openProjectInEditor(project, `Restored ${candidate.path}.`, candidate.path);
          return;
        }

        const sourceDocument = await invoke<SourceDocumentInput>('open_psd', {
          sourcePath: candidate.path,
          cacheDir: null
        });
        const project = createProjectFromSourceDocument(sourceDocument);

        if (projectRestoreFailed) {
          forgetRecentProject(recentFilesStore);
        }
        recordRecentSource(recentFilesStore, candidate.path);
        openProjectInEditor(project, `Restored ${project.source.fileName}.`);
        return;
      } catch (error) {
        if (candidate.kind === 'project') {
          projectRestoreFailed = true;
        }
        lastError = error;
      }
    }

    setState((current) => ({
      ...current,
      message: `Could not restore recent file: ${formatError(lastError)}`
    }));
  }

  async function openPsd() {
    await runCommand(async () => {
      const selectedPath = await open(createOpenPsdDialogOptions(await documentDir()));

      if (selectedPath === null) {
        setState((current) => ({
          ...current,
          message: 'Open cancelled.'
        }));
        return;
      }

      const sourcePath = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
      if (sourcePath === undefined) {
        throw new Error('No PSD/PSB file was selected.');
      }

      const sourceDocument = await invoke<SourceDocumentInput>('open_psd', {
        sourcePath,
        cacheDir: null
      });
      const project = createProjectFromSourceDocument(sourceDocument);
      recordRecentSource(recentFilesStore, sourcePath);

      openProjectInEditor(project, `Opened ${project.source.fileName}.`);
    });
  }

  async function openProject() {
    await runCommand(async () => {
      const selectedPath = await open(createOpenProjectDialogOptions(await documentDir()));

      if (selectedPath === null) {
        setState((current) => ({
          ...current,
          message: 'Open cancelled.'
        }));
        return;
      }

      const projectPath = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
      if (projectPath === undefined) {
        throw new Error('No PSDUI project file was selected.');
      }

      const project = await invoke<PSDUIProject>('read_project', { projectPath });
      recordRecentProject(recentFilesStore, projectPath, project.source.path);
      openProjectInEditor(project, `Opened ${projectPath}.`, projectPath);
    });
  }

  function openProjectInEditor(project: PSDUIProject, message: string, projectPath?: string) {
    setProjectSettings({
      ...deriveDefaultProjectSettings(project.source.path),
      ...(projectPath === undefined ? {} : { projectPath })
    });
    setProjectSettingsOpen(false);

    setState({
      project,
      selectedSourceLayerIds: [],
      hiddenSourceLayerIds: [],
      selectedExportNodeId: project.exportTree[0]?.id ?? null,
      selectedExportNodeIds: [],
      message
    });
  }

  function mergeSelectedExportNodesFromTree() {
    setState((current) => {
      return mergeSelectedExportNodes(
        current,
        `export_${Date.now().toString(36)}`,
        newExportKind
      );
    });
  }

  async function saveProject() {
    await runCommand(async () => {
      if (state.project === null) {
        throw new Error('Open a PSD/PSB before saving.');
      }
      if (projectSettings.projectPath.trim().length === 0) {
        throw new Error('Set a .psdui project path before saving.');
      }

      const projectPath = projectSettings.projectPath.trim();
      await invoke('save_project', { projectPath, project: state.project });
      recordRecentProject(recentFilesStore, projectPath, state.project.source.path);
      setState((current) => ({ ...current, message: `Saved ${projectPath}.` }));
    });
  }

  async function exportLayout() {
    await runCommand(async () => {
      if (state.project === null) {
        throw new Error('Open a PSD/PSB before exporting layout.');
      }
      if (projectSettings.layoutPath.trim().length === 0) {
        throw new Error('Set a ui.layout.json path before exporting.');
      }

      const layout = createLayoutDocument(state.project);
      await invoke('export_layout', { layoutPath: projectSettings.layoutPath, layout });
      setState((current) => ({ ...current, message: `Exported ${projectSettings.layoutPath}.` }));
    });
  }

  function updateSelectedExportNode(patch: Partial<ExportNode> | ((node: ExportNode) => ExportNode)) {
    const nodeId = state.selectedExportNodeId;

    if (nodeId === null) {
      return;
    }

    setState((current) => updateExportNode(current, nodeId, patch));
  }

  function unmergeSelectedExportNode(nodeId: string) {
    setState((current) => unmergeExportNode(current, nodeId));
  }

  function addSourceLayerExportNode(layerId: number) {
    setState((current) => addSourceLayerToExportTree(current, layerId));
  }

  function deleteExportNode(nodeId: string) {
    setState((current) => removeExportNode(current, nodeId));
  }

  function moveSelectedExportNode(nodeId: string, direction: 'up' | 'down') {
    setState((current) => moveExportNode(current, nodeId, direction));
  }

  const canMergeNodes = state.project !== null && state.selectedExportNodeIds.length > 1;
  const project = state.project;
  const hasProject = project !== null;

  return (
    <>
      <style>{appCss}</style>
      <main className={`app-shell ${hasProject ? 'has-project' : 'is-empty'}`}>
        {project === null ? (
          <section className="empty-workspace">
            <button type="button" className="open-file-hero" onClick={openPsd}>
              Open PSD/PSB
            </button>
            <button type="button" onClick={openProject}>
              Open .psdui
            </button>
            <p className="message" role="status">
              {state.message ?? 'Choose a Photoshop document to begin.'}
            </p>
          </section>
        ) : (
          <>
            <header className="toolbar">
              <div className="source-summary">
                <span>PSD/PSB source</span>
                <strong>{project.source.fileName}</strong>
                <small>{project.source.path}</small>
              </div>
              <div className="actions">
                <button type="button" onClick={openPsd}>
                  Open Another
                </button>
                <button type="button" onClick={openProject}>
                  Open .psdui
                </button>
                <label className="compact-select">
                  <span>Merge as</span>
                  <select value={newExportKind} onChange={(event: SelectChangeEvent) => setNewExportKind(event.target.value as ExportKind)}>
                    {exportKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={mergeSelectedExportNodesFromTree} disabled={!canMergeNodes}>
                  Merge Export Nodes
                </button>
                <button type="button" onClick={saveProject}>
                  Save .psdui
                </button>
                <button type="button" onClick={exportLayout}>
                  Export Layout
                </button>
              </div>
              <details
                className="project-settings"
                open={projectSettingsOpen}
                onToggle={(event: DetailsToggleEvent) => setProjectSettingsOpen(event.target.open)}
              >
                <summary>Project Settings</summary>
                <div className="project-settings-grid">
                  <PathInput
                    label="Project path"
                    value={projectSettings.projectPath}
                    onChange={(projectPath) => setProjectSettings((current) => ({ ...current, projectPath }))}
                  />
                  <PathInput
                    label="Layout path"
                    value={projectSettings.layoutPath}
                    onChange={(layoutPath) => setProjectSettings((current) => ({ ...current, layoutPath }))}
                  />
                </div>
              </details>
              <p className="message" role="status">
                {state.message ?? 'Ready.'}
              </p>
            </header>
            <section
              className="workspace"
              style={{
                '--source-tree-panel-width': `${treePanelWidths.sourceWidth}px`,
                '--export-tree-panel-width': `${treePanelWidths.exportWidth}px`
              }}
            >
              <aside className="tree-panel source-panel">
                <section className="panel-section">
                  <h2>Source Tree</h2>
                  <SourceTree
                    layers={project.sourceTree}
                    selectedLayerIds={state.selectedSourceLayerIds}
                    hiddenLayerIds={state.hiddenSourceLayerIds}
                    exportedSourceLayerIds={exportedSourceLayerIds}
                    onSelectLayer={(layerId) =>
                      setState((current) => selectSourceLayer(current, layerId))
                    }
                    onAddLayerToExportTree={addSourceLayerExportNode}
                    onToggleLayerVisibility={(layerId) =>
                      setState((current) => toggleSourceLayerPreviewVisibility(current, layerId))
                    }
                  />
                </section>
              </aside>
              <div
                className={`tree-panel-resizer ${isTreePanelResizing ? 'resizing' : ''}`}
                role="separator"
                aria-label="Resize Source Tree and Export Tree panels"
                aria-orientation="vertical"
                aria-valuemin={treePanelMinWidth}
                aria-valuemax={
                  treePanelWidths.sourceWidth + treePanelWidths.exportWidth - treePanelMinWidth
                }
                aria-valuenow={treePanelWidths.sourceWidth}
                title="Resize Source Tree and Export Tree panels"
                onPointerDown={(event: TreePanelResizePointerEvent) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setTreePanelResizing(true);
                }}
                onPointerMove={(event: TreePanelResizePointerEvent) => {
                  if (!isTreePanelResizing || event.currentTarget.parentElement === null) {
                    return;
                  }

                  event.preventDefault();
                  const bounds = event.currentTarget.parentElement.getBoundingClientRect();
                  setTreePanelWidths((current) =>
                    resizeTreePanelsFromPointer({
                      containerLeft: bounds.left,
                      pointerX: event.clientX,
                      totalWidth: current.sourceWidth + current.exportWidth
                    })
                  );
                }}
                onPointerUp={(event: TreePanelResizePointerEvent) => {
                  if (!isTreePanelResizing) {
                    return;
                  }

                  event.preventDefault();
                  event.currentTarget.releasePointerCapture(event.pointerId);
                  setTreePanelResizing(false);
                }}
                onPointerCancel={() => setTreePanelResizing(false)}
              />
              <aside className="tree-panel export-panel">
                <section className="panel-section">
                  <h2>Export Tree</h2>
                  <ExportTree
                    nodes={project.exportTree}
                    selectedNodeId={state.selectedExportNodeId}
                    selectedNodeIds={state.selectedExportNodeIds}
                    onDeleteNode={deleteExportNode}
                    onMoveNode={moveSelectedExportNode}
                    onSelectNode={(nodeId) =>
                      setState((current) => ({ ...current, selectedExportNodeId: nodeId }))
                    }
                    onToggleNodeSelection={(nodeId) =>
                      setState((current) => toggleExportNodeSelection(current, nodeId))
                    }
                  />
                </section>
              </aside>
              <CanvasPreview
                project={project}
                selectedSourceLayerIds={state.selectedSourceLayerIds}
                selectedExportNodeId={state.selectedExportNodeId}
                hiddenSourceLayerIds={state.hiddenSourceLayerIds}
              />
              <aside className="right-panel">
                <Inspector
                  node={selectedExportNode}
                  selectedExportNodeCount={state.selectedExportNodeIds.length}
                  onUpdateNode={updateSelectedExportNode}
                  onMergeSelectedExports={mergeSelectedExportNodesFromTree}
                  onUnmergeNode={unmergeSelectedExportNode}
                />
              </aside>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

html,
body,
#root {
  width: 100%;
  height: 100%;
  overflow: hidden;
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
  height: 100vh;
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
}

.app-shell.is-empty {
  grid-template-rows: 1fr;
}

.empty-workspace {
  min-height: 100vh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 16px;
  padding: 32px;
}

.open-file-hero {
  min-width: min(360px, calc(100vw - 48px));
  min-height: 88px;
  border-color: #7aa8e8;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 36px rgba(37, 99, 235, 0.14);
  color: #1d4ed8;
  font-size: 22px;
  font-weight: 750;
}

.toolbar {
  padding: 12px 14px;
  background: #ffffff;
  border-bottom: 1px solid #d8dee8;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  gap: 10px 16px;
  align-items: center;
}

.source-summary,
.path-input,
.field {
  display: grid;
  gap: 5px;
  color: #526173;
  font-size: 12px;
  font-weight: 650;
}

.source-summary {
  min-width: 0;
}

.source-summary strong,
.source-summary small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-summary strong {
  min-height: 18px;
  color: #17202c;
  font-size: 13px;
}

.source-summary small {
  color: #718096;
  font-size: 12px;
  font-weight: 500;
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
  align-items: center;
  justify-content: flex-end;
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

.project-settings {
  grid-column: 1 / -1;
  border-top: 1px solid #eef2f7;
  padding-top: 8px;
}

.project-settings summary {
  width: max-content;
  color: #526173;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.project-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.toolbar > .message {
  grid-column: 1 / -1;
}

.workspace {
  display: grid;
  grid-template-columns:
    var(--source-tree-panel-width, 280px)
    8px
    var(--export-tree-panel-width, 280px)
    minmax(360px, 1fr)
    minmax(260px, 320px);
  min-height: 0;
  overflow: hidden;
}

.tree-panel,
.right-panel {
  min-height: 0;
  overflow: hidden;
  background: #f8fafc;
}

.tree-panel {
  border-right: 1px solid #d8dee8;
}

.tree-panel-resizer {
  position: relative;
  z-index: 2;
  min-height: 0;
  border-right: 1px solid #d8dee8;
  border-left: 1px solid #eef2f7;
  background: #eef4fb;
  cursor: col-resize;
  touch-action: none;
}

.tree-panel-resizer::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 44px;
  border-radius: 999px;
  background: #9aa8ba;
  transform: translate(-50%, -50%);
}

.tree-panel-resizer:hover,
.tree-panel-resizer.resizing {
  background: #dcecff;
}

.right-panel {
  border-left: 1px solid #d8dee8;
}

.panel-section,
.inspector,
.inspector-empty {
  padding: 14px;
}

.panel-section {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
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
  align-content: start;
  gap: 3px;
  min-height: 0;
  overflow: auto;
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

.source-tree-row {
  grid-template-columns: 24px 26px minmax(0, 1fr) 26px;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
}

.export-tree-row {
  grid-template-columns: 24px 18px auto minmax(0, 1fr) auto;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
}

.source-tree-row .tree-row-main {
  min-width: 0;
}

.tree-row-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 0;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
}

.tree-row-main:hover {
  background: transparent;
}

.icon-button {
  display: inline-grid;
  place-items: center;
  width: 24px;
  min-width: 24px;
  min-height: 24px;
  height: 24px;
  border-color: transparent;
  background: transparent;
  padding: 0;
}

.icon-button:hover {
  border-color: #c4ccd8;
  background: #ffffff;
}

.tree-collapse-spacer {
  display: block;
  width: 24px;
  min-width: 24px;
  height: 24px;
}

.layer-visibility-toggle.is-hidden {
  color: #a8b0bd;
}

.button-icon {
  display: block;
  flex: 0 0 auto;
  stroke-width: 2;
}

.node-selection-checkbox {
  width: 16px;
  height: 16px;
  margin: 0;
}

.add-export-button {
  color: #1d4ed8;
  font-weight: 800;
}

.tree-row-actions {
  display: flex;
  gap: 2px;
  align-items: center;
}

.tree-row-actions .icon-button {
  width: 22px;
  min-width: 22px;
  height: 22px;
  min-height: 22px;
  color: #526173;
  font-size: 11px;
  font-weight: 800;
}

.tree-row-actions .icon-button:disabled {
  opacity: 0.28;
}

.danger-icon-button {
  color: #b42318;
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
  overflow: hidden;
}

.canvas-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  color: #526173;
  font-size: 13px;
}

.canvas-document-meta {
  min-width: 0;
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.canvas-info strong {
  color: #1f2a37;
}

.canvas-document-meta strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-controls {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
  align-items: center;
}

.canvas-preview-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid #cbd3df;
  border-radius: 7px;
  background: #ffffff;
}

.canvas-preview-toggle button {
  min-height: 28px;
  border-color: transparent;
  border-radius: 5px;
}

.canvas-controls button {
  min-width: 34px;
  padding: 0 8px;
}

.canvas-controls button[aria-pressed="true"] {
  border-color: #2563eb;
  background: #dcecff;
  color: #1d4ed8;
}

.canvas-controls output {
  min-width: 48px;
  color: #334155;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.canvas-shell {
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #d8dee8;
  background: #e5eaf1;
  cursor: grab;
  user-select: none;
}

.canvas-shell.panning {
  cursor: grabbing;
}

.canvas-board {
  position: relative;
  flex: 0 0 auto;
  border: 1px solid #aeb8c7;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  background:
    linear-gradient(45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(-45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f8fafc 75%),
    linear-gradient(-45deg, transparent 75%, #f8fafc 75%);
  background-color: #ffffff;
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
}

.canvas-layer-image {
  position: absolute;
  display: block;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
}

.canvas-text-layer {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow-wrap: anywhere;
  word-break: break-word;
  pointer-events: none;
  user-select: none;
}

.canvas-highlight {
  position: absolute;
  display: block;
  min-height: 0;
  border: 2px solid #dc2626;
  border-radius: 3px;
  background: transparent;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.canvas-highlight.source {
  border-color: #2563eb;
}

.inspector {
  display: grid;
  align-content: start;
  gap: 12px;
}

.inspector-empty {
  display: grid;
  align-content: start;
  gap: 12px;
}

.right-panel > .inspector,
.right-panel > .inspector-empty {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.selection-actions {
  display: grid;
  gap: 10px;
  padding: 10px;
  border: 1px solid #d8dee8;
  border-radius: 6px;
  background: #ffffff;
}

.selection-actions div {
  display: grid;
  gap: 2px;
}

.selection-actions strong {
  color: #253244;
  font-size: 13px;
}

.selection-actions span {
  color: #64748b;
  font-size: 12px;
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

.danger-button {
  border-color: #f3b2b2;
  background: #fff7f7;
  color: #b42318;
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
  .toolbar,
  .project-settings-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    justify-content: flex-start;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .tree-panel-resizer {
    display: none;
  }

  .tree-panel,
  .right-panel {
    border: 0;
    border-bottom: 1px solid #d8dee8;
  }
}
`;
