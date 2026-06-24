import { convertFileSrc } from '@tauri-apps/api/core';
import { useLayoutEffect, useRef, useState } from 'react';

import { collectExportedSourceLayerIds } from '../app/state';
import {
  beginMiddleMousePan,
  calculateWheelZoom,
  moveCanvasPan,
  type CanvasPan,
  type CanvasPanDrag
} from '../domain/canvas-pan';
import { collectCanvasHighlights, type PreviewMode } from '../domain/preview-highlights';
import { collectVisiblePreviewImageLayers, resolveLayerImagePath } from '../domain/preview-assets';
import type { PSDUIProject } from '../schemas/psdui';

interface CanvasPreviewProps {
  project: PSDUIProject | null;
  selectedSourceLayerIds: number[];
  selectedExportNodeId: string | null;
  hiddenSourceLayerIds: number[];
}

export function CanvasPreview({
  project,
  selectedSourceLayerIds,
  selectedExportNodeId,
  hiddenSourceLayerIds
}: CanvasPreviewProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [fitZoom, setFitZoom] = useState(1);
  const [manualZoom, setManualZoom] = useState(1);
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('source');
  const [pan, setPan] = useState<CanvasPan>({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState<CanvasPanDrag | null>(null);

  const effectiveZoom = zoomMode === 'fit' ? fitZoom : manualZoom;
  const selectedSourceLayerKey = selectedSourceLayerIds.join(',');

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

  useLayoutEffect(() => {
    setPan({ x: 0, y: 0 });
    setPanDrag(null);
  }, [project]);

  useLayoutEffect(() => {
    if (selectedSourceLayerIds.length > 0) {
      setPreviewMode('source');
    }
  }, [selectedSourceLayerIds.length, selectedSourceLayerKey]);

  useLayoutEffect(() => {
    if (selectedExportNodeId !== null) {
      setPreviewMode('export');
    }
  }, [selectedExportNodeId]);

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
  const exportedSourceLayerIds = collectExportedSourceLayerIds(project.exportTree);
  const imageLayers = collectVisiblePreviewImageLayers(
    project.sourceTree,
    hiddenSourceLayerIds,
    previewMode === 'source' ? null : exportedSourceLayerIds
  );
  const highlights = collectCanvasHighlights({
    mode: previewMode,
    sourceTree: project.sourceTree,
    exportTree: project.exportTree,
    selectedSourceLayerIds,
    selectedExportNodeId,
    hiddenSourceLayerIds
  });
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
          <div className="canvas-preview-toggle" aria-label="Canvas preview mode">
            <button
              type="button"
              onClick={() => setPreviewMode('source')}
              aria-pressed={previewMode === 'source'}
            >
              Source
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('export')}
              aria-pressed={previewMode === 'export'}
            >
              Export
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setZoomMode('fit');
              setPan({ x: 0, y: 0 });
            }}
            aria-pressed={zoomMode === 'fit'}
          >
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
              setPan({ x: 0, y: 0 });
            }}
            aria-pressed={zoomMode === 'manual' && manualZoom === 1}
          >
            100%
          </button>
        </div>
      </div>
      <div
        className={`canvas-shell ${panDrag !== null ? 'panning' : ''}`}
        ref={shellRef}
        onPointerDown={(event: CanvasPointerEvent) => {
          const nextDrag = beginMiddleMousePan(event.button, event.clientX, event.clientY, pan);
          if (nextDrag === null) {
            return;
          }

          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          setPanDrag(nextDrag);
        }}
        onPointerMove={(event: CanvasPointerEvent) => {
          if (panDrag === null) {
            return;
          }

          event.preventDefault();
          setPan(moveCanvasPan(panDrag, event.clientX, event.clientY));
        }}
        onPointerUp={(event: CanvasPointerEvent) => {
          if (panDrag === null) {
            return;
          }

          event.preventDefault();
          event.currentTarget.releasePointerCapture(event.pointerId);
          setPanDrag(null);
        }}
        onPointerCancel={() => setPanDrag(null)}
        onAuxClick={(event: CanvasPointerEvent) => {
          if (event.button === 1) {
            event.preventDefault();
          }
        }}
        onWheel={(event: CanvasWheelEvent) => {
          event.preventDefault();
          setZoomMode('manual');
          setManualZoom((current) =>
            calculateWheelZoom(zoomMode === 'fit' ? effectiveZoom : current, event.deltaY)
          );
        }}
      >
        <div
          className="canvas-board"
          style={{
            width: `${documentWidth * effectiveZoom}px`,
            height: `${documentHeight * effectiveZoom}px`,
            transform: `translate(${pan.x}px, ${pan.y}px)`
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
          {highlights.map((highlight) => {
            return (
              <div
                key={highlight.id}
                className={`canvas-highlight ${highlight.kind}`}
                style={{
                  left: `${(highlight.rect.x / documentWidth) * 100}%`,
                  top: `${(highlight.rect.y / documentHeight) * 100}%`,
                  width: `${(highlight.rect.width / documentWidth) * 100}%`,
                  height: `${(highlight.rect.height / documentHeight) * 100}%`
                }}
                title={highlight.name}
                aria-label={`${highlight.name} ${highlight.kind} preview highlight`}
              >
                <span>{highlight.name}</span>
              </div>
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

interface CanvasPointerEvent {
  button: number;
  clientX: number;
  clientY: number;
  pointerId: number;
  preventDefault: () => void;
  currentTarget: {
    setPointerCapture: (pointerId: number) => void;
    releasePointerCapture: (pointerId: number) => void;
  };
}

interface CanvasWheelEvent {
  deltaY: number;
  preventDefault: () => void;
}
