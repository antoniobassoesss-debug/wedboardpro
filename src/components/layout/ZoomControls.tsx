/**
 * Zoom Controls Component
 *
 * Displays zoom level and provides zoom control buttons.
 */

import { useLayoutScale } from '../../contexts/LayoutScaleContext';
import { SCALE_CONSTANTS } from '../../lib/layout/scale-utils';

/**
 * Props for ZoomControls
 */
export interface ZoomControlsProps {
  className?: string;
  showScale?: boolean;
}

/**
 * Minus icon component
 */
function MinusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 12H4"
      />
    </svg>
  );
}

/**
 * Plus icon component
 */
function PlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

/**
 * Maximize icon component
 */
function MaximizeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
      />
    </svg>
  );
}

/**
 * Zoom Controls Component
 *
 * Provides buttons for zooming in/out and fitting to canvas.
 */
export function ZoomControls({
  className = '',
  showScale = true,
}: ZoomControlsProps): JSX.Element {
  const { zoom, setZoom, zoomIn, zoomOut, fitToCanvas, scale } =
    useLayoutScale();

  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div
      className={`absolute bottom-4 right-4 flex items-center gap-2 bg-white rounded-lg shadow-lg p-2 ${className}`}
    >
      <button
        onClick={zoomOut}
        disabled={zoom <= SCALE_CONSTANTS.MIN_ZOOM}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Zoom Out (Ctrl+-)"
      >
        <MinusIcon className="w-4 h-4" />
      </button>

      <div className="w-16 text-center text-sm font-medium select-none">
        {zoomPercentage}%
      </div>

      <button
        onClick={zoomIn}
        disabled={zoom >= SCALE_CONSTANTS.MAX_ZOOM}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Zoom In (Ctrl++)"
      >
        <PlusIcon className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <button
        onClick={fitToCanvas}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
        title="Fit to Canvas (Ctrl+0)"
      >
        <MaximizeIcon className="w-4 h-4" />
      </button>

      {showScale && scale && (
        <div className="text-xs text-gray-500 ml-2 select-none">
          {scale.pixelsPerMeter.toFixed(0)} px/m
        </div>
      )}
    </div>
  );
}

export default ZoomControls;
