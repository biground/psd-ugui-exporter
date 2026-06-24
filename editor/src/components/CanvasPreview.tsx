import { convertFileSrc } from '@tauri-apps/api/core';
import { useLayoutEffect, useRef, useState } from 'react';

import { flattenExportNodes } from '../app/state';
import {
  beginMiddleMousePan,
  calculateWheelZoom,
  moveCanvasPan,
  type CanvasPan,
  type CanvasPanDrag
} from '../domain/canvas-pan';
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
  const [pan, setPan] = useState<CanvasPan>({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState<CanvasPanDrag | null>(null);

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

  useLayoutEffect(() => {
    setPan({ x: 0, y: 0 });
    setPanDrag(null);
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
