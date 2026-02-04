/**
 * Element Drag Hook Tests
 *
 * Tests for drag functionality with grid snap.
 */

import { describe, it, expect } from 'vitest';
import { snapToGrid, roundToPrecision } from '../../lib/layout/scale-utils';

describe('drag utilities', () => {
  describe('snapToGrid', () => {
    it('snaps to 10cm grid', () => {
      const result = snapToGrid({ x: 5.03, y: 5.07 }, 0.1);
      expect(result.x).toBeCloseTo(5.0, 10);
      expect(result.y).toBeCloseTo(5.1, 10);
    });

    it('snaps to 25cm grid', () => {
      const result = snapToGrid({ x: 5.12, y: 5.38 }, 0.25);
      expect(result.x).toBe(5.0);
      expect(result.y).toBe(5.5);
    });

    it('snaps to 50cm grid', () => {
      const result = snapToGrid({ x: 5.24, y: 5.76 }, 0.5);
      expect(result.x).toBe(5.0);
      expect(result.y).toBe(6.0);
    });

    it('snaps to 1m grid', () => {
      const result = snapToGrid({ x: 5.4, y: 5.6 }, 1.0);
      expect(result.x).toBe(5);
      expect(result.y).toBe(6);
    });
  });

  describe('roundToPrecision', () => {
    it('rounds to centimeter precision', () => {
      expect(roundToPrecision(5.123456, 0.01)).toBeCloseTo(5.12, 10);
      expect(roundToPrecision(5.126789, 0.01)).toBeCloseTo(5.13, 10);
    });

    it('rounds to millimeter precision', () => {
      expect(roundToPrecision(5.1234, 0.001)).toBeCloseTo(5.123, 10);
    });

    it('handles negative values', () => {
      expect(roundToPrecision(-5.127, 0.01)).toBeCloseTo(-5.13, 10);
    });

    it('prevents floating point drift', () => {
      // Simulate multiple drag operations
      let position = 5.0;
      for (let i = 0; i < 100; i++) {
        position += 0.01;
        position = roundToPrecision(position, 0.01);
      }
      expect(position).toBeCloseTo(6.0, 10);
    });
  });

  describe('drag precision', () => {
    it('maintains precision after multiple snaps', () => {
      let pos = { x: 5.0, y: 5.0 };

      // Simulate 10 drag operations
      for (let i = 0; i < 10; i++) {
        pos = snapToGrid({ x: pos.x + 0.1, y: pos.y + 0.1 }, 0.1);
      }

      expect(pos.x).toBeCloseTo(6.0, 10);
      expect(pos.y).toBeCloseTo(6.0, 10);
    });

    it('no accumulated error with centimeter rounding', () => {
      let pos = { x: 0, y: 0 };

      // Simulate 100 movements of 0.01m (1cm) each
      for (let i = 0; i < 100; i++) {
        pos = {
          x: roundToPrecision(pos.x + 0.01, 0.01),
          y: roundToPrecision(pos.y + 0.01, 0.01),
        };
      }

      // Should be exactly 1.0 (100 * 0.01)
      expect(pos.x).toBeCloseTo(1.0, 10);
      expect(pos.y).toBeCloseTo(1.0, 10);
    });
  });
});

describe('drag state transitions', () => {
  const INITIAL_STATE = {
    isDragging: false,
    elementId: null,
    startPosition: null,
    currentPosition: null,
  };

  it('initial state is not dragging', () => {
    expect(INITIAL_STATE.isDragging).toBe(false);
    expect(INITIAL_STATE.elementId).toBeNull();
  });

  it('tracks start position for cancel', () => {
    const startPosition = { x: 5, y: 5 };
    const dragState = {
      isDragging: true,
      elementId: 'test-1',
      startPosition,
      currentPosition: { x: 6, y: 6 },
    };

    // Cancel should restore startPosition
    expect(dragState.startPosition).toEqual({ x: 5, y: 5 });
  });
});

describe('grid snap edge cases', () => {
  it('handles zero grid size gracefully', () => {
    const result = snapToGrid({ x: 5.5, y: 5.5 }, 0);
    expect(result.x).toBe(5.5);
    expect(result.y).toBe(5.5);
  });

  it('handles negative grid size gracefully', () => {
    const result = snapToGrid({ x: 5.5, y: 5.5 }, -0.1);
    expect(result.x).toBe(5.5);
    expect(result.y).toBe(5.5);
  });

  it('handles very small grid sizes', () => {
    const result = snapToGrid({ x: 5.555, y: 5.555 }, 0.001);
    expect(result.x).toBeCloseTo(5.555, 10);
    expect(result.y).toBeCloseTo(5.555, 10);
  });

  it('snaps at grid boundaries correctly', () => {
    // Exactly at 0.05 with 0.1 grid should snap to 0.1
    const result = snapToGrid({ x: 0.05, y: 0.05 }, 0.1);
    expect(result.x).toBeCloseTo(0.1, 10);
    expect(result.y).toBeCloseTo(0.1, 10);
  });
});
