/**
 * Rulers Component
 *
 * X and Y axis rulers with zoom-adaptive tick marks and cursor highlighting.
 */

import React, { useMemo } from 'react';
import type { ViewportState } from '../../types/viewport';
import {
  RULER_SIZE,
  RULER_BACKGROUND,
  RULER_TEXT,
  RULER_TICK,
  RULER_CURSOR_HIGHLIGHT,
} from '../../constants';

interface RulerProps {
  viewport: ViewportState;
  pixelsPerMeter: number;
  orientation: 'horizontal' | 'vertical';
  cursorPosition?: number | null;
}

const Ruler: React.FC<RulerProps> = ({
  viewport,
  pixelsPerMeter,
  orientation,
  cursorPosition = null,
}) => {
  const { width, height, zoom, x, y } = viewport;

  if (!width || !height) return null;

  const scale = pixelsPerMeter * zoom;
  const isHorizontal = orientation === 'horizontal';

  const tickInterval = useMemo(() => {
    if (zoom >= 3) return 0.1;
    if (zoom >= 1.5) return 0.25;
    if (zoom >= 0.75) return 0.5;
    if (zoom >= 0.5) return 1;
    return 2;
  }, [zoom]);

  const tickSize = isHorizontal ? RULER_SIZE : RULER_SIZE;
  const majorInterval = 5 * tickInterval;

  const bounds = isHorizontal
    ? { start: x * scale, end: (x + width / zoom) * scale }
    : { start: y * scale, end: (y + height / zoom) * scale };

  const startTick = Math.floor(bounds.start / (tickInterval * scale)) * tickInterval;
  const endTick = Math.ceil(bounds.end / (tickInterval * scale)) * tickInterval;

  const ticks: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];

  let tickCount = 0;
  for (let pos = startTick; pos <= endTick; pos += tickInterval) {
    tickCount++;
    if (tickCount > 1000) break;

    const screenPos = isHorizontal
      ? (pos * scale - bounds.start)
      : (pos * scale - bounds.start);

    const isMajor = Math.abs(pos % majorInterval) < 0.0001;
    const tickLength = isMajor ? 10 : 6;
    const worldPos = pos;

    if (isHorizontal) {
      ticks.push(
        <line
          key={`tick-${pos}`}
          x1={screenPos}
          y1={RULER_SIZE - tickLength}
          x2={screenPos}
          y2={RULER_SIZE}
          stroke={RULER_TICK}
          strokeWidth={isMajor ? 1 : 0.5}
        />
      );

      if (isMajor) {
        labels.push(
          <text
            key={`label-${pos}`}
            x={screenPos}
            y={RULER_SIZE - tickLength - 4}
            fill={RULER_TEXT}
            fontSize={10}
            textAnchor="middle"
          >
            {worldPos.toFixed(1).replace('.0', '')}m
          </text>
        );
      }
    } else {
      ticks.push(
        <line
          key={`tick-${pos}`}
          x1={RULER_SIZE - tickLength}
          y1={screenPos}
          x2={RULER_SIZE}
          y2={screenPos}
          stroke={RULER_TICK}
          strokeWidth={isMajor ? 1 : 0.5}
        />
      );

      if (isMajor) {
        labels.push(
          <text
            key={`label-${pos}`}
            x={RULER_SIZE - tickLength - 4}
            y={screenPos}
            fill={RULER_TEXT}
            fontSize={10}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {worldPos.toFixed(1).replace('.0', '')}m
          </text>
        );
      }
    }
  }

  const cursorIndicator = cursorPosition !== null && (
    <line
      x1={isHorizontal ? cursorPosition : 0}
      y1={isHorizontal ? 0 : cursorPosition}
      x2={isHorizontal ? cursorPosition : RULER_SIZE}
      y2={isHorizontal ? RULER_SIZE : cursorPosition}
      stroke={RULER_CURSOR_HIGHLIGHT}
      strokeWidth={2}
    />
  );

  if (isHorizontal) {
    return (
      <div
        className="absolute top-0 left-0 right-0 flex pointer-events-none"
        style={{ height: RULER_SIZE, marginLeft: RULER_SIZE }}
      >
        <svg
          width="100%"
          height={RULER_SIZE}
          viewBox={`${bounds.start} 0 ${bounds.end - bounds.start} ${RULER_SIZE}`}
          preserveAspectRatio="none"
          style={{ backgroundColor: RULER_BACKGROUND }}
        >
          <line
            x1={bounds.start}
            y1={RULER_SIZE}
            x2={bounds.end}
            y2={RULER_SIZE}
            stroke={RULER_TICK}
            strokeWidth={1}
          />
          {ticks}
          {labels}
          {cursorIndicator}
        </svg>
      </div>
    );
  }

  return (
    <div
      className="absolute top-0 left-0 bottom-0 pointer-events-none"
      style={{ width: RULER_SIZE }}
    >
      <svg
        width={RULER_SIZE}
        height="100%"
        viewBox={`0 ${bounds.start} ${RULER_SIZE} ${bounds.end - bounds.start}`}
        preserveAspectRatio="none"
        style={{ backgroundColor: RULER_BACKGROUND }}
      >
        <line
          x1={RULER_SIZE}
          y1={bounds.start}
          x2={RULER_SIZE}
          y2={bounds.end}
          stroke={RULER_TICK}
          strokeWidth={1}
        />
        {ticks}
        {labels}
        {cursorIndicator}
      </svg>
    </div>
  );
};

interface RulerXProps {
  viewport: ViewportState;
  pixelsPerMeter: number;
  cursorX?: number | null;
}

export const RulerX: React.FC<RulerXProps> = ({
  viewport,
  pixelsPerMeter,
  cursorX = null,
}) => {
  return (
    <Ruler
      viewport={viewport}
      pixelsPerMeter={pixelsPerMeter}
      orientation="horizontal"
      cursorPosition={cursorX}
    />
  );
};

interface RulerYProps {
  viewport: ViewportState;
  pixelsPerMeter: number;
  cursorY?: number | null;
}

export const RulerY: React.FC<RulerYProps> = ({
  viewport,
  pixelsPerMeter,
  cursorY = null,
}) => {
  return (
    <Ruler
      viewport={viewport}
      pixelsPerMeter={pixelsPerMeter}
      orientation="vertical"
      cursorPosition={cursorY}
    />
  );
};

export default { RulerX, RulerY };
