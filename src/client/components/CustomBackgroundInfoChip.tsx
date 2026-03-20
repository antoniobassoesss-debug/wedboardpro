/**
 * CustomBackgroundInfoChip — floating overlay chip shown when a custom
 * uploaded background is active on the canvas.
 */

import React from 'react';
import { ImageIcon, Pencil, Trash2 } from 'lucide-react';
import type { CustomBackground } from '../../layout-maker/store/canvasStore';

interface CustomBackgroundInfoChipProps {
  background: CustomBackground;
  onEdit: () => void;
  onClear: () => void;
}

export const CustomBackgroundInfoChip: React.FC<CustomBackgroundInfoChipProps> = ({
  background,
  onEdit,
  onClear,
}) => {
  const handleClear = () => {
    if (window.confirm('Remove the custom background image from the canvas?')) {
      onClear();
    }
  };

  const cmPerMeter = 100;
  const pixelsPerCm = background.pixelsPerMeter / cmPerMeter;
  // 1cm on printed A4 = ? meters in real life
  const metersPerCm = pixelsPerCm > 0 ? 1 / pixelsPerCm : 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
    >
      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-md px-3 py-1.5 text-xs">
        <ImageIcon size={12} className="text-amber-500 flex-shrink-0" />

        {/* File name */}
        <span className="font-medium text-gray-700 max-w-[120px] truncate" title={background.fileName}>
          {background.fileName}
        </span>

        <span className="text-gray-300">·</span>

        {/* Scale */}
        <span className="text-gray-500">
          1cm = {metersPerCm.toFixed(1)}m
        </span>

        <span className="text-gray-300">·</span>

        {/* Dimensions */}
        <span className="text-gray-500">
          {background.realWorldWidth.toFixed(1)}m × {background.realWorldHeight.toFixed(1)}m
        </span>

        <span className="text-gray-300">·</span>

        {/* Calibration line count */}
        <span className="text-gray-400">
          {background.calibrationLines.length} ref line{background.calibrationLines.length !== 1 ? 's' : ''}
        </span>

        {/* Actions */}
        <button
          onClick={onEdit}
          className="ml-1 p-1 hover:bg-gray-100 rounded-full transition-colors"
          title="Re-calibrate"
        >
          <Pencil size={11} className="text-gray-500" />
        </button>
        <button
          onClick={handleClear}
          className="p-1 hover:bg-red-50 rounded-full transition-colors"
          title="Remove background"
        >
          <Trash2 size={11} className="text-red-400" />
        </button>
      </div>
    </div>
  );
};
