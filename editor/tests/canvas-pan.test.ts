import { describe, expect, test } from 'vitest';

import { beginMiddleMousePan, calculateWheelZoom, moveCanvasPan } from '../src/domain/canvas-pan';

describe('canvas pan', () => {
  test('starts panning only for the middle mouse button', () => {
    expect(beginMiddleMousePan(1, 10, 20, { x: 4, y: 8 })).toEqual({
      startClientX: 10,
      startClientY: 20,
      startPanX: 4,
      startPanY: 8
    });
    expect(beginMiddleMousePan(0, 10, 20, { x: 4, y: 8 })).toBeNull();
  });

  test('moves pan by pointer delta from the drag start', () => {
    const drag = beginMiddleMousePan(1, 10, 20, { x: 4, y: 8 });

    expect(moveCanvasPan(drag!, 16, 35)).toEqual({ x: 10, y: 23 });
  });

  test('changes zoom from wheel direction and clamps the result', () => {
    expect(calculateWheelZoom(1, -120)).toBe(1.1);
    expect(calculateWheelZoom(1, 120)).toBe(0.9);
    expect(calculateWheelZoom(3.95, -120)).toBe(4);
    expect(calculateWheelZoom(0.12, 120)).toBe(0.1);
    expect(calculateWheelZoom(1.234, 0)).toBe(1.23);
  });
});
