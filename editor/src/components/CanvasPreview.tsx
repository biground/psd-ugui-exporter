import { flattenExportNodes } from '../app/state';
import type { PSDUIProject } from '../schemas/psdui';

interface CanvasPreviewProps {
  project: PSDUIProject | null;
  selectedExportNodeId: string | null;
}

export function CanvasPreview({ project, selectedExportNodeId }: CanvasPreviewProps) {
  if (project === null) {
    return (
      <section className="canvas-placeholder">
        <h2>Canvas Preview</h2>
        <p>Open a PSD/PSB to inspect export bounds.</p>
      </section>
    );
  }

  const documentWidth = Math.max(1, project.document.width);
  const documentHeight = Math.max(1, project.document.height);
  const nodes = flattenExportNodes(project.exportTree);

  return (
    <section className="canvas-stage" aria-label="Canvas preview">
      <div className="canvas-info">
        <strong>{project.source.fileName}</strong>
        <span>
          {project.document.width} x {project.document.height}
        </span>
      </div>
      <div className="canvas-shell">
        <div
          className="canvas-board"
          style={{ aspectRatio: `${documentWidth} / ${documentHeight}` }}
        >
          {nodes.map((node) => {
            const isSelected = selectedExportNodeId === node.id;

            return (
              <button
                key={node.id}
                type="button"
                className={`canvas-node ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${(node.rect.x / documentWidth) * 100}%`,
                  top: `${(node.rect.y / documentHeight) * 100}%`,
                  width: `${(node.rect.width / documentWidth) * 100}%`,
                  height: `${(node.rect.height / documentHeight) * 100}%`
                }}
                title={`${node.name} (${node.exportKind})`}
                aria-label={`${node.name} ${node.exportKind}`}
              >
                <span>{node.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
