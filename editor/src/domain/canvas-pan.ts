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
