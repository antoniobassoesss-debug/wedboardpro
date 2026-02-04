/**
 * Grid Settings Panel Component
 *
 * Controls for grid visibility, snap, and size.
 */

import { useLayoutScale } from '../../contexts/LayoutScaleContext';

/**
 * Grid size option definition
 */
interface GridSizeOption {
  value: number;
  label: string;
}

/**
 * Available grid size options
 */
const GRID_SIZE_OPTIONS: GridSizeOption[] = [
  { value: 0.05, label: '5cm' },
  { value: 0.1, label: '10cm' },
  { value: 0.25, label: '25cm' },
  { value: 0.5, label: '50cm' },
  { value: 1, label: '1m' },
];

/**
 * Props for GridSettingsPanel
 */
export interface GridSettingsPanelProps {
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Grid Settings Panel Component
 *
 * Provides controls for grid visibility, snap to grid,
 * and grid size settings.
 */
export function GridSettingsPanel({
  className = '',
  collapsed = false,
}: GridSettingsPanelProps): JSX.Element {
  const { gridConfig, setGridSize, toggleSnapEnabled, toggleGridVisible } =
    useLayoutScale();

  if (collapsed) {
    return (
      <div
        className={`absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 ${className}`}
      >
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={toggleGridVisible}
            className={`px-2 py-1 rounded ${
              gridConfig.visible
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
            title="Toggle Grid (G)"
          >
            Grid
          </button>
          <button
            onClick={toggleSnapEnabled}
            className={`px-2 py-1 rounded ${
              gridConfig.enabled
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
            title="Toggle Snap (S)"
          >
            Snap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 space-y-3 ${className}`}
    >
      <div className="text-sm font-medium text-gray-700">Grid Settings</div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={gridConfig.visible}
          onChange={toggleGridVisible}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm">
          Show Grid <span className="text-gray-400">(G)</span>
        </span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={gridConfig.enabled}
          onChange={toggleSnapEnabled}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm">
          Snap to Grid <span className="text-gray-400">(S)</span>
        </span>
      </label>

      <div className="space-y-1">
        <label className="text-sm text-gray-600">Grid Size</label>
        <select
          value={gridConfig.size}
          onChange={(e) => setGridSize(parseFloat(e.target.value))}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {GRID_SIZE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="text-xs text-gray-400 pt-1 border-t border-gray-100">
        Current: {(gridConfig.size * 100).toFixed(0)}cm grid
      </div>
    </div>
  );
}

export default GridSettingsPanel;
