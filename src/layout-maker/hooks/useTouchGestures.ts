/**
 * useTouchGestures Hook
 *
 * Comprehensive touch gesture handling for mobile/tablet:
 * - Pinch-to-zoom (distance between 2 fingers)
 * - Two-finger pan
 * - Single tap = click
 * - Long press (500ms) = context menu
 * - Double tap = zoom in
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface TouchGestureCallbacks {
  onTap?: (x: number, y: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onPinch?: (scale: number, centerX: number, centerY: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onPanStart?: (x: number, y: number) => void;
  onPanEnd?: () => void;
}

interface TouchGestureOptions {
  longPressDelay?: number;
  doubleTapDelay?: number;
  minPinchDistance?: number;
  minPanDistance?: number;
}

interface TouchGestureState {
  isActive: boolean;
  isPinching: boolean;
  isPanning: boolean;
  lastTapTime: number;
  lastTapPosition: { x: number; y: number } | null;
}

export function useTouchGestures(
  callbacks: TouchGestureCallbacks,
  options: TouchGestureOptions = {}
) {
  const {
    longPressDelay = 500,
    doubleTapDelay = 300,
    minPinchDistance = 20,
    minPanDistance = 10,
  } = options;

  const [state, setState] = useState<TouchGestureState>({
    isActive: false,
    isPinching: false,
    isPanning: false,
    lastTapTime: 0,
    lastTapPosition: null,
  });

  const touchRefs = useRef<{
    initialDistance: number;
    initialScale: number;
    initialPan: { x: number; y: number } | null;
    longPressTimer: NodeJS.Timeout | null;
    startX: number;
    startY: number;
    startTime: number;
    isLongPress: boolean;
    lastTapTime: number;
  }>({
    initialDistance: 0,
    initialScale: 1,
    initialPan: null,
    longPressTimer: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    isLongPress: false,
    lastTapTime: 0,
  });

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      const touches = event.touches;

      if (touches.length === 1) {
        const touch = touches[0]!;
        const x = touch.clientX;
        const y = touch.clientY;

        touchRefs.current.startX = x;
        touchRefs.current.startY = y;
        touchRefs.current.startTime = Date.now();
        touchRefs.current.isLongPress = false;

        touchRefs.current.longPressTimer = setTimeout(() => {
          touchRefs.current.isLongPress = true;
          setState((s) => ({ ...s, isActive: true }));
          callbacks.onLongPress?.(x, y);
        }, longPressDelay);
      } else if (touches.length === 2) {
        if (touchRefs.current.longPressTimer) {
          clearTimeout(touchRefs.current.longPressTimer);
          touchRefs.current.longPressTimer = null;
        }

        const touch0 = touches[0]!;
        const touch1 = touches[1]!;
        const dx = touch0.clientX - touch1.clientX;
        const dy = touch0.clientY - touch1.clientY;
        touchRefs.current.initialDistance = Math.sqrt(dx * dx + dy * dy);

        setState((s) => ({ ...s, isPinching: true }));
      }
    },
    [longPressDelay, callbacks]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      const touches = event.touches;

      if (touches.length === 1) {
        const touch = touches[0]!;
        const dx = touch.clientX - touchRefs.current.startX;
        const dy = touch.clientY - touchRefs.current.startY;

        if (Math.abs(dx) > minPanDistance || Math.abs(dy) > minPanDistance) {
          if (touchRefs.current.longPressTimer) {
            clearTimeout(touchRefs.current.longPressTimer);
            touchRefs.current.longPressTimer = null;
          }
        }

        if (!touchRefs.current.isLongPress && touchRefs.current.initialPan === null) {
          if (Math.abs(dx) > minPanDistance || Math.abs(dy) > minPanDistance) {
            touchRefs.current.initialPan = { x: touch.clientX, y: touch.clientY };
            setState((s) => ({ ...s, isPanning: true }));
            callbacks.onPanStart?.(touch.clientX, touch.clientY);
          }
        }

        if (touchRefs.current.initialPan) {
          callbacks.onPan?.(dx, dy);
        }
      } else if (touches.length === 2) {
        event.preventDefault();

        const touch0 = touches[0]!;
        const touch1 = touches[1]!;
        const dx = touch0.clientX - touch1.clientX;
        const dy = touch0.clientY - touch1.clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);

        if (touchRefs.current.initialDistance > minPinchDistance) {
          const scale = currentDistance / touchRefs.current.initialDistance;
          const centerX = (touch0.clientX + touch1.clientX) / 2;
          const centerY = (touch0.clientY + touch1.clientY) / 2;
          callbacks.onPinch?.(scale, centerX, centerY);
        }
      }
    },
    [minPinchDistance, minPanDistance, callbacks]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const touch = event.changedTouches[0]!;
      const duration = Date.now() - touchRefs.current.startTime;
      const dx = touch.clientX - touchRefs.current.startX;
      const dy = touch.clientY - touchRefs.current.startY;

      if (touchRefs.current.longPressTimer) {
        clearTimeout(touchRefs.current.longPressTimer);
        touchRefs.current.longPressTimer = null;
      }

      setState((s) => ({ ...s, isActive: false, isPinching: false, isPanning: false }));

      if (state.isPinching) {
        setState((s) => ({ ...s, isPinching: false }));
        return;
      }

      if (state.isPanning && touchRefs.current.initialPan) {
        callbacks.onPanEnd?.();
        touchRefs.current.initialPan = null;
        return;
      }

      if (!touchRefs.current.isLongPress && duration < 500) {
        const now = Date.now();
        const isDoubleTap =
          state.lastTapPosition !== null &&
          now - state.lastTapTime < doubleTapDelay &&
          Math.abs(touch.clientX - state.lastTapPosition.x) < 30 &&
          Math.abs(touch.clientY - state.lastTapPosition.y) < 30;

        setState((s) => ({
          ...s,
          lastTapTime: isDoubleTap ? 0 : now,
          lastTapPosition: isDoubleTap
            ? null
            : { x: touch.clientX, y: touch.clientY },
        }));

        if (isDoubleTap) {
          callbacks.onDoubleTap?.(touch.clientX, touch.clientY);
        } else {
          callbacks.onTap?.(touch.clientX, touch.clientY);
        }
      }

      touchRefs.current.isLongPress = false;
    },
    [state.lastTapPosition, state.lastTapTime, state.isPinching, state.isPanning, doubleTapDelay, callbacks]
  );

  useEffect(() => {
    return () => {
      if (touchRefs.current.longPressTimer) {
        clearTimeout(touchRefs.current.longPressTimer);
      }
    };
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isActive: state.isActive,
    isPinching: state.isPinching,
    isPanning: state.isPanning,
  };
}

export default useTouchGestures;
