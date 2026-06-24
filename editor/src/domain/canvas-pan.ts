export interface CanvasPan {
  x: number;
  y: number;
}

export interface CanvasPanDrag {
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
}

export function beginMiddleMousePan(
  button: number,
  clientX: number,
  clientY: number,
  currentPan: CanvasPan
): CanvasPanDrag | null {
  if (button !== 1) {
    return null;
  }

  return {
    startClientX: clientX,
    startClientY: clientY,
    startPanX: currentPan.x,
    startPanY: currentPan.y
  };
}

export function moveCanvasPan(drag: CanvasPanDrag, clientX: number, clientY: number): CanvasPan {
  return {
    x: drag.startPanX + clientX - drag.startClientX,
    y: drag.startPanY + clientY - drag.startClientY
  };
}

export function calculateWheelZoom(currentZoom: number, deltaY: number): number {
  if (deltaY === 0) {
    return clampZoom(currentZoom);
  }

  const step = deltaY < 0 ? 0.1 : -0.1;
  return clampZoom(currentZoom + step);
}

function clampZoom(value: number): number {
  return Math.min(4, Math.max(0.1, Math.round(value * 100) / 100));
}
