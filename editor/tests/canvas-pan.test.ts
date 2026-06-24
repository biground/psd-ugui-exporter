import { describe, expect, test } from 'vitest';

import { beginMiddleMousePan, moveCanvasPan } from '../src/domain/canvas-pan';

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
});
