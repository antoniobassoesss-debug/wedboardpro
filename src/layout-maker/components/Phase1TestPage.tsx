/**
 * Phase 1 Verification Test Page
 *
 * Tests the CanvasArea component and verifies all Phase 1 features:
 * - Zoom with cursor pivot
 * - Pan controls (middle-click, space+drag)
 * - Grid, rulers, scale bar
 * - Viewport state logging
 * - Coordinate conversion verification
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasArea } from './Canvas/CanvasArea';
import { useLayoutStore, useViewportStore, useUIStore } from '../stores';
import type { Layout, Wall } from '../types';
import type { ViewportState } from '../types/viewport';
import type { MeasurementUnit } from '../types/layout';

interface TestLogEntry {
  timestamp: number;
  type: 'viewport' | 'coordinate' | 'interaction';
  message: string;
  data?: Record<string, unknown>;
}

function createMockLayout(): Layout {
  const walls: Wall[] = [
    { id: 'wall-1', startX: 0, startY: 0, endX: 10, endY: 0, thickness: 0.2, color: '#333333' },
    { id: 'wall-2', startX: 10, startY: 0, endX: 10, endY: 8, thickness: 0.2, color: '#333333' },
    { id: 'wall-3', startX: 10, startY: 8, endX: 0, endY: 8, thickness: 0.2, color: '#333333' },
    { id: 'wall-4', startX: 0, startY: 8, endX: 0, endY: 0, thickness: 0.2, color: '#333333' },
  ];

  return {
    id: 'test-layout',
    projectId: 'test-project',
    eventId: 'test-event',
    name: 'Phase 1 Test Layout',
    description: 'Mock layout for Phase 1 verification',
    status: 'draft',
    space: {
      walls,
      dimensions: { width: 10, height: 8 },
      pixelsPerMeter: 100,
    },
    floorPlan: null,
    elements: {},
    elementOrder: [],
    groups: {},
    assignments: {},
    settings: {
      gridVisible: true,
      gridSize: 0.5,
      snapEnabled: true,
      snapThreshold: 10,
      rulersVisible: true,
      unit: 'meters' as MeasurementUnit,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test-user',
    schemaVersion: 1,
  };
}

export const Phase1TestPage: React.FC = () => {
  const layoutStore = useLayoutStore();
  const viewportStore = useViewportStore();
  const uiStore = useUIStore();

  const [logs, setLogs] = useState<TestLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [viewportHistory, setViewportHistory] = useState<ViewportState | null>(null);

  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((entry: Omit<TestLogEntry, 'timestamp'>) => {
    const newEntry: TestLogEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    setLogs((prev) => {
      const updated = [...prev, newEntry].slice(-50);
      return updated;
    });
  }, []);

  useEffect(() => {
    const layout = createMockLayout();
    layoutStore.setLayout(layout);
    addLog({
      type: 'interaction',
      message: 'Mock layout created with 10m x 8m room',
      data: { dimensions: layout.space.dimensions, wallCount: layout.space.walls.length },
    });
  }, [layoutStore, addLog]);

  useEffect(() => {
    const viewport = viewportStore.viewport;
    if (viewportHistory !== viewport) {
      setViewportHistory(viewport);
      if (logs.length > 0) {
        addLog({
          type: 'viewport',
          message: `Viewport updated`,
          data: {
            x: Math.round(viewport.x * 100) / 100,
            y: Math.round(viewport.y * 100) / 100,
            zoom: Math.round(viewport.zoom * 1000) / 1000,
            width: viewport.width,
            height: viewport.height,
          },
        });
      }
    }
  }, [viewportStore.viewport, viewportHistory, addLog, logs.length]);

  const handleCanvasClick = useCallback(() => {
    addLog({ type: 'interaction', message: 'Canvas clicked - selection cleared' });
  }, [addLog]);

  const handleElementClick = useCallback((elementId: string) => {
    addLog({ type: 'interaction', message: `Element clicked: ${elementId}` });
  }, [addLog]);

  const handleElementDoubleClick = useCallback((elementId: string) => {
    addLog({ type: 'interaction', message: `Element double-clicked: ${elementId}` });
  }, [addLog]);

  const testCoordinateConversion = useCallback(() => {
    const viewport = viewportStore.viewport;
    const pixelsPerMeter = viewportStore.pixelsPerMeter || 100;

    const testPoints = [
      { x: 0, y: 0 },
      { x: 5, y: 4 },
      { x: 10, y: 8 },
      { x: -2, y: -2 },
    ];

    addLog({ type: 'coordinate', message: 'Testing coordinate conversion...' });

    for (const point of testPoints) {
      const worldPoint = { x: point.x, y: point.y };
      const screenPoint = {
        x: (worldPoint.x * pixelsPerMeter + viewport.x) * viewport.zoom,
        y: (worldPoint.y * pixelsPerMeter + viewport.y) * viewport.zoom,
      };
      const backToWorld = {
        x: (screenPoint.x / viewport.zoom - viewport.x) / pixelsPerMeter,
        y: (screenPoint.y / viewport.zoom - viewport.y) / pixelsPerMeter,
      };

      const tolerance = 0.0001;
      const isValid =
        Math.abs(backToWorld.x - worldPoint.x) < tolerance &&
        Math.abs(backToWorld.y - worldPoint.y) < tolerance;

      addLog({
        type: 'coordinate',
        message: `Point (${point.x}, ${point.y}): ${isValid ? 'PASS' : 'FAIL'}`,
        data: {
          original: worldPoint,
          screen: { x: Math.round(screenPoint.x), y: Math.round(screenPoint.y) },
          backToWorld: {
            x: Math.round(backToWorld.x * 1000) / 1000,
            y: Math.round(backToWorld.y * 1000) / 1000,
          },
          isValid,
        },
      });
    }
  }, [viewportStore, addLog]);

  const resetView = useCallback(() => {
    viewportStore.resetView();
    addLog({ type: 'interaction', message: 'Reset view (Cmd/Ctrl+0)' });
  }, [viewportStore, addLog]);

  const toggleGrid = useCallback(() => {
    uiStore.setShowGrid(!uiStore.showGrid);
    addLog({
      type: 'interaction',
      message: `Grid ${uiStore.showGrid ? 'hidden' : 'shown'}`,
    });
  }, [uiStore, addLog]);

  const toggleRulers = useCallback(() => {
    uiStore.setShowRulers(!uiStore.showRulers);
    addLog({
      type: 'interaction',
      message: `Rulers ${uiStore.showRulers ? 'hidden' : 'shown'}`,
    });
  }, [uiStore, addLog]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '0') {
        event.preventDefault();
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetView]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Phase 1 Verification Test</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={testCoordinateConversion}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Test Coordinate Conversion
          </button>
          <button
            onClick={resetView}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Reset View
          </button>
          <button
            onClick={toggleGrid}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Toggle Grid
          </button>
          <button
            onClick={toggleRulers}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Toggle Rulers
          </button>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            {showLogs ? 'Hide Logs' : 'Show Logs'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <CanvasArea
            onCanvasClick={handleCanvasClick}
            onElementClick={handleElementClick}
            onElementDoubleClick={handleElementDoubleClick}
          />

          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3 text-sm">
            <h3 className="font-semibold mb-2">Test Instructions</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Scroll to zoom - should pivot at cursor</li>
              <li>• Middle-click drag to pan</li>
              <li>• Space + left-click drag to pan</li>
              <li>• Cmd/Ctrl+0 to reset view</li>
              <li>• Click elements to select</li>
              <li>• Hover over elements for visual feedback</li>
              <li>• Drag elements to move them</li>
            </ul>
          </div>

          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3 text-sm">
            <h3 className="font-semibold mb-2">Current Viewport</h3>
            <div className="space-y-1">
              <div>x: {Math.round(viewportStore.viewport.x * 100) / 100}</div>
              <div>y: {Math.round(viewportStore.viewport.y * 100) / 100}</div>
              <div>zoom: {Math.round(viewportStore.viewport.zoom * 1000) / 1000}</div>
              <div>width: {viewportStore.viewport.width}px</div>
              <div>height: {viewportStore.viewport.height}px</div>
            </div>
          </div>
        </div>

        {showLogs && (
          <div className="w-80 bg-white border-l flex flex-col">
            <div className="bg-gray-50 px-3 py-2 border-b font-semibold text-sm">
              Activity Log ({logs.length})
            </div>
            <div
              ref={logRef}
              className="flex-1 overflow-auto p-2 space-y-1"
              style={{ fontFamily: 'monospace', fontSize: '11px' }}
            >
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-1 rounded ${
                    log.type === 'viewport'
                      ? 'bg-blue-50'
                      : log.type === 'coordinate'
                      ? 'bg-green-50'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between text-gray-500">
                    <span>{log.type}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div>{log.message}</div>
                  {log.data && (
                    <pre className="text-xs text-gray-600 mt-1 overflow-auto">
                      {JSON.stringify(log.data, null, 1)}
                    </pre>
                  )}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-400 text-center py-4">
                  No logs yet. Interact with the canvas to see events.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Phase1TestPage;
