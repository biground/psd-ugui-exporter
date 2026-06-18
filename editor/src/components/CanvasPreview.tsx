import { convertFileSrc } from '@tauri-apps/api/core';
import { useLayoutEffect, useRef, useState } from 'react';

import { flattenExportNodes } from '../app/state';
import { collectVisiblePreviewImageLayers, resolveLayerImagePath } from '../domain/preview-assets';
import type { PSDUIProject } from '../schemas/psdui';

interface CanvasPreviewProps {
  project: PSDUIProject | null;
  selectedExportNodeId: string | null;
}

export function CanvasPreview({ project, selectedExportNodeId }: CanvasPreviewProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [fitZoom, setFitZoom] = useState(1);
  const [manualZoom, setManualZoom] = useState(1);
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');

  const effectiveZoom = zoomMode === 'fit' ? fitZoom : manualZoom;

  useLayoutEffect(() => {
    if (project === null || shellRef.current === null) {
      return;
    }

    const element = shellRef.current;
    const document = project.document;

    function updateFitZoom() {
      const documentWidth = Math.max(1, document.width);
      const documentHeight = Math.max(1, document.height);
      const padding = 32;
      const nextFitZoom = Math.min(
        1,
        Math.max(0.05, (element.clientWidth - padding) / documentWidth),
        Math.max(0.05, (element.clientHeight - padding) / documentHeight)
      );

      setFitZoom(Number.isFinite(nextFitZoom) ? nextFitZoom : 1);
    }

    updateFitZoom();

    const resizeObserver = new ResizeObserver(updateFitZoom);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [project]);

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
  const imageLayers = collectVisiblePreviewImageLayers(project.sourceTree);
  const zoomLabel = `${Math.round(effectiveZoom * 100)}%`;

  return (
    <section className="canvas-stage" aria-label="Canvas preview">
      <div className="canvas-info">
        <div className="canvas-document-meta">
          <strong>{project.source.fileName}</strong>
          <span>
            {project.document.width} x {project.document.height}
          </span>
        </div>
        <div className="canvas-controls" aria-label="Canvas zoom controls">
          <button type="button" onClick={() => setZoomMode('fit')} aria-pressed={zoomMode === 'fit'}>
            Fit
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomMode('manual');
              setManualZoom((current) => clampZoom(current - 0.25));
            }}
            aria-label="Zoom out"
          >
            -
          </button>
          <output>{zoomLabel}</output>
          <button
            type="button"
            onClick={() => {
              setZoomMode('manual');
              setManualZoom((current) => clampZoom(current + 0.25));
            }}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomMode('manual');
              setManualZoom(1);
            }}
            aria-pressed={zoomMode === 'manual' && manualZoom === 1}
          >
            100%
          </button>
        </div>
      </div>
      <div className="canvas-shell" ref={shellRef}>
        <div
          className="canvas-board"
          style={{
            width: `${documentWidth * effectiveZoom}px`,
            height: `${documentHeight * effectiveZoom}px`
          }}
        >
          {imageLayers.map(({ layer }) => {
            const imagePath = resolveLayerImagePath(layer, project.cache.assetsDir);

            if (imagePath === null) {
              return null;
            }

            return (
              <img
                key={layer.id}
                className="canvas-layer-image"
                src={convertFileSrc(imagePath)}
                alt=""
                draggable={false}
                style={{
                  left: `${(layer.rasterBounds.x / documentWidth) * 100}%`,
                  top: `${(layer.rasterBounds.y / documentHeight) * 100}%`,
                  width: `${(layer.rasterBounds.width / documentWidth) * 100}%`,
                  height: `${(layer.rasterBounds.height / documentHeight) * 100}%`
                }}
              />
            );
          })}
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

function clampZoom(value: number): number {
  return Math.min(4, Math.max(0.1, Math.round(value * 100) / 100));
}
