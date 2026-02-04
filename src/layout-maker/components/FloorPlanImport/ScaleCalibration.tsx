/**
 * Scale Calibration Step Component
 *
 * Step 2 of the floor plan import wizard:
 * - Click two points on the floor plan
 * - Enter the real-world distance between them
 * - Calculate pixels-per-meter ratio
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
}

interface ScaleCalibrationProps {
  imageUrl: string;
  onCalibrate: (pixelsPerMeter: number, point1: Point, point2: Point, distance: number) => void;
  onBack: () => void;
}

export const ScaleCalibration: React.FC<ScaleCalibrationProps> = ({
  imageUrl,
  onCalibrate,
  onBack,
}) => {
  const [point1, setPoint1] = useState<Point | null>(null);
  const [point2, setPoint2] = useState<Point | null>(null);
  const [distance, setDistance] = useState<number>(5);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = imageRef.current;
    if (img) {
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
    }
  }, [imageUrl]);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!point1) {
      setPoint1({ x, y });
    } else if (!point2) {
      setPoint2({ x, y });
    } else {
      setPoint1({ x, y });
      setPoint2(null);
    }
  }, [point1, point2]);

  const handleReset = useCallback(() => {
    setPoint1(null);
    setPoint2(null);
  }, []);

  const handleCalibrate = useCallback(() => {
    if (!point1 || !point2 || distance <= 0) return;

    const pixelDistance = Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    );
    const ppm = pixelDistance / distance;

    if (ppm > 0 && isFinite(ppm)) {
      onCalibrate(ppm, point1, point2, distance);
    }
  }, [point1, point2, distance, onCalibrate]);

  const canCalibrate = point1 && point2 && distance > 0;

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Calibrate Scale</h3>
        <p className="text-sm text-gray-500">
          Click two points on the floor plan and enter the real distance between them
        </p>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600">
            {point1 ? 'Point 1 set' : 'Click first point'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600">
            {point2 ? 'Point 2 set' : point1 ? 'Click second point' : ''}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative border rounded overflow-hidden cursor-crosshair"
        style={{ maxHeight: '400px', backgroundColor: '#F3F4F6' }}
        onClick={handleImageClick}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Floor plan for calibration"
          className="w-full h-full object-contain"
          style={{ maxHeight: '400px' }}
        />

        {point1 && (
          <div
            className="absolute w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: point1.x, top: point1.y }}
          />
        )}

        {point2 && (
          <div
            className="absolute w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: point2.x, top: point2.y }}
          />
        )}

        {point1 && point2 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ overflow: 'visible' }}
          >
            <line
              x1={point1.x}
              y1={point1.y}
              x2={point2.x}
              y2={point2.y}
              stroke="#3B82F6"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>
        )}
      </div>

      {point1 && point2 && (
        <div className="mt-4 flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Distance between points:
            </label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
              min="0.1"
              step="0.1"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">meters</span>
          </div>

          {canCalibrate && (() => {
            const pixelDistance = Math.sqrt(
              Math.pow(point2!.x - point1!.x, 2) + Math.pow(point2!.y - point1!.y, 2)
            );
            const ppm = pixelDistance / distance;
            return (
              <div className="text-sm text-gray-500">
                ({Math.round(pixelDistance)} px → {ppm.toFixed(1)} px/m)
              </div>
            );
          })()}
        </div>
      )}

      <div className="mt-4 flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
        >
          Back
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            disabled={!point1 && !point2}
          >
            Reset Points
          </button>

          <button
            onClick={handleCalibrate}
            disabled={!canCalibrate}
            className={`px-6 py-2 rounded-lg font-medium ${
              canCalibrate
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Calibrate
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> Use a known measurement like the width of a standard door (~0.9m)
          or a table diameter (~1.5m for round tables).
        </p>
      </div>
    </div>
  );
};

export default ScaleCalibration;
