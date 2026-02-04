/**
 * Position & Adjust Step Component
 *
 * Step 3 of the floor plan import wizard:
 * - Position floor plan on canvas
 * - Resize using corner handles
 * - Rotate
 * - Adjust opacity
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface PositionData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

interface PositionAdjustProps {
  imageUrl: string;
  pixelsPerMeter: number;
  onComplete: (data: PositionData) => void;
  onBack: () => void;
}

const MIN_SIZE = 100;

export const PositionAdjust: React.FC<PositionAdjustProps> = ({
  imageUrl,
  pixelsPerMeter,
  onComplete,
  onBack,
}) => {
  const [position, setPosition] = useState<PositionData>({
    x: 100,
    y: 100,
    width: 400,
    height: 300,
    rotation: 0,
    opacity: 80,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [resizing, setResizing] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || e.target instanceof HTMLImageElement) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        startX: position.x,
        startY: position.y,
      });
    }
  }, [position.x, position.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragStart) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPosition(prev => ({
        ...prev,
        x: dragStart.startX + deltaX,
        y: dragStart.startY + deltaY,
      }));
    }

    if (resizing) {
      const deltaX = e.clientX - (dragStart?.x || 0);
      const deltaY = e.clientY - (dragStart?.y || 0);

      let newX = position.x;
      let newY = position.y;
      let newWidth = position.width;
      let newHeight = position.height;

      if (resizing === 'se') {
        newWidth = Math.max(MIN_SIZE, position.width + deltaX);
        newHeight = Math.max(MIN_SIZE, position.height + deltaY);
      } else if (resizing === 'sw') {
        const newW = Math.max(MIN_SIZE, position.width - deltaX);
        newX = position.x + position.width - newW;
        newWidth = newW;
        newHeight = Math.max(MIN_SIZE, position.height + deltaY);
      } else if (resizing === 'ne') {
        const newH = Math.max(MIN_SIZE, position.height - deltaY);
        newY = position.y + position.height - newH;
        newWidth = Math.max(MIN_SIZE, position.width + deltaX);
        newHeight = newH;
      } else if (resizing === 'nw') {
        const newW = Math.max(MIN_SIZE, position.width - deltaX);
        const newH = Math.max(MIN_SIZE, position.height - deltaY);
        newX = position.x + position.width - newW;
        newY = position.y + position.height - newH;
        newWidth = newW;
        newHeight = newH;
      }

      setPosition(prev => ({
        ...prev,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      }));
    }
  }, [isDragging, resizing, dragStart, position]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
    setResizing(null);
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    setResizing(corner);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y,
    });
  }, [position.x, position.y]);

  const handleRotateStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
  }, []);

  const handleRotateMove = useCallback((e: React.MouseEvent) => {
    if (!isRotating || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    let degrees = angle * (180 / Math.PI) + 90;

    setPosition(prev => ({
      ...prev,
      rotation: degrees,
    }));
  }, [isRotating]);

  const handleRotateEnd = useCallback(() => {
    setIsRotating(false);
  }, []);

  useEffect(() => {
    if (isDragging || resizing || isRotating) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      if (isRotating) {
        document.addEventListener('mousemove', handleRotateMove as any);
        document.addEventListener('mouseup', handleRotateEnd);
      }
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleRotateMove as any);
      document.removeEventListener('mouseup', handleRotateEnd);
    };
  }, [isDragging, resizing, isRotating, handleMouseMove, handleMouseUp, handleRotateMove, handleRotateEnd]);

  const handleComplete = useCallback(() => {
    const widthMeters = position.width / pixelsPerMeter;
    const heightMeters = position.height / pixelsPerMeter;

    onComplete({
      ...position,
      width: widthMeters,
      height: heightMeters,
    });
  }, [position, pixelsPerMeter, onComplete]);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Position & Adjust</h3>
        <p className="text-sm text-gray-500">
          Drag to position, use corner handles to resize, rotate handle to rotate
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative border rounded overflow-hidden bg-gray-100"
        style={{ height: '400px' }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #ccc 1px, transparent 1px),
              linear-gradient(to bottom, #ccc 1px, transparent 1px)
            `,
            backgroundSize: `${100 / pixelsPerMeter}px ${100 / pixelsPerMeter}px`,
          }}
        />

        {/* Floor plan container */}
        <div
          className="absolute cursor-move"
          style={{
            left: position.x,
            top: position.y,
            width: position.width,
            height: position.height,
            transform: `rotate(${position.rotation}deg)`,
            transformOrigin: 'center center',
          }}
          onMouseDown={handleMouseDown}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Floor plan"
            className="w-full h-full object-contain pointer-events-none"
            style={{ opacity: position.opacity / 100 }}
          />

          {/* Selection border */}
          <div
            className="absolute inset-0 border-2 border-blue-500 border-dashed pointer-events-none"
            style={{ borderColor: 'rgba(59, 130, 246, 0.5)' }}
          />

          {/* Corner resize handles */}
          <div
            className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded cursor-nw-resize"
            style={{ left: -8, top: -8, cursor: 'nw-resize' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
          />
          <div
            className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded cursor-ne-resize"
            style={{ right: -8, top: -8, cursor: 'ne-resize' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
          />
          <div
            className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded cursor-sw-resize"
            style={{ left: -8, bottom: -8, cursor: 'sw-resize' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
          />
          <div
            className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded cursor-se-resize"
            style={{ right: -8, bottom: -8, cursor: 'se-resize' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />

          {/* Rotate handle */}
          <div
            className="absolute cursor-grab active:cursor-grabbing"
            style={{
              left: '50%',
              top: -30,
              transform: 'translateX(-50%)',
            }}
            onMouseDown={handleRotateStart}
          >
            <div className="w-0.5 h-6 bg-blue-500" />
            <div className="w-4 h-4 bg-blue-500 rounded-full -mt-1 mx-auto" />
          </div>
        </div>

        {/* Rotation indicator */}
        <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded text-xs shadow">
          {Math.round(position.rotation)}° rotation
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Opacity:</label>
            <input
              type="range"
              min="10"
              max="100"
              value={position.opacity}
              onChange={(e) => setPosition(prev => ({ ...prev, opacity: parseInt(e.target.value) }))}
              className="w-32"
            />
            <span className="text-sm text-gray-600 w-12">{position.opacity}%</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Size: {Math.round(position.width / pixelsPerMeter * 10) / 10}m × {Math.round(position.height / pixelsPerMeter * 10) / 10}m</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
        >
          Back
        </button>

        <button
          onClick={handleComplete}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
        >
          Done ✓
        </button>
      </div>
    </div>
  );
};

export default PositionAdjust;
