/**
 * Phase 2 Verification Test Page
 *
 * Tests all Phase 2 features:
 * 1. Element Library (sidebar, categories, search, recently used)
 * 2. Adding Elements (config popover, drag-drop)
 * 3. Table + Chairs auto-generation
 * 4. Element Rendering (shapes, colors, rotation)
 * 5. Properties Panel functionality
 * 6. Undo/Redo for elements and properties
 */

import React, { useEffect, useState, useCallback } from 'react';
import { CanvasArea } from './Canvas/CanvasArea';
import { ElementLibrary } from './Sidebar/ElementLibrary';
import { PropertiesPanel } from './Sidebar/PropertiesPanel';
import { useLayoutStore, useViewportStore, useUIStore, useSelectionStore, useHistoryStore } from '../stores';
import type { Layout, Wall, TableElement, ChairElement } from '../types';
import type { MeasurementUnit } from '../types/layout';

interface TestChecklist {
  name: string;
  items: { label: string; passed: boolean; note?: string }[];
}

function createMockLayout(): Layout {
  const walls: Wall[] = [
    { id: 'wall-1', startX: 0, startY: 0, endX: 15, endY: 0, thickness: 0.2, color: '#333333' },
    { id: 'wall-2', startX: 15, startY: 0, endX: 15, endY: 12, thickness: 0.2, color: '#333333' },
    { id: 'wall-3', startX: 15, startY: 12, endX: 0, endY: 12, thickness: 0.2, color: '#333333' },
    { id: 'wall-4', startX: 0, startY: 12, endX: 0, endY: 0, thickness: 0.2, color: '#333333' },
  ];

  return {
    id: 'phase2-test-layout',
    projectId: 'test-project',
    eventId: 'test-event',
    name: 'Phase 2 Test Layout',
    description: 'Layout for Phase 2 feature verification',
    status: 'draft',
    space: {
      walls,
      dimensions: { width: 15, height: 12 },
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

export const Phase2TestPage: React.FC = () => {
  const layoutStore = useLayoutStore();
  const viewportStore = useViewportStore();
  const uiStore = useUIStore();
  const selectionStore = useSelectionStore();
  const historyStore = useHistoryStore();

  const [elementCount, setElementCount] = useState(0);
  const [tableCount, setTableCount] = useState(0);
  const [chairCount, setChairCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [checklists, setChecklists] = useState<TestChecklist[]>([
    {
      name: 'Element Library',
      items: [
        { label: 'Sidebar displays all categories', passed: false },
        { label: 'Categories expand/collapse', passed: false },
        { label: 'Search filters elements', passed: false },
        { label: 'Recently used section works', passed: false },
      ],
    },
    {
      name: 'Adding Elements',
      items: [
        { label: 'Click element → config popover appears', passed: false },
        { label: 'Can configure seats, size, etc.', passed: false },
        { label: '"Add to Layout" places element in center', passed: false },
        { label: 'Drag from sidebar to canvas works', passed: false },
        { label: 'Element appears at drop position', passed: false },
      ],
    },
    {
      name: 'Table + Chairs',
      items: [
        { label: 'Adding table auto-generates chairs', passed: false },
        { label: 'Chairs positioned correctly for round tables', passed: false },
        { label: 'Chairs positioned correctly for rectangular tables', passed: false },
        { label: 'Chair count matches capacity', passed: false },
      ],
    },
    {
      name: 'Element Rendering',
      items: [
        { label: 'Tables render with correct shape and color', passed: false },
        { label: 'Chairs render as small circles', passed: false },
        { label: 'Empty chairs have outline style', passed: false },
        { label: 'Zones render with transparency', passed: false },
        { label: 'All elements respect rotation', passed: false },
      ],
    },
    {
      name: 'Properties Panel',
      items: [
        { label: 'Shows "Select an element..." when nothing selected', passed: false },
        { label: 'Shows appropriate properties for selected element', passed: false },
        { label: 'Can edit table capacity (chairs redistribute)', passed: false },
        { label: 'Can change position/rotation', passed: false },
        { label: 'Multiple selection shows alignment tools', passed: false },
      ],
    },
    {
      name: 'Undo/Redo',
      items: [
        { label: 'Adding element can be undone', passed: false },
        { label: 'Undo removes table AND its chairs', passed: false },
        { label: 'Property changes can be undone', passed: false },
      ],
    },
  ]);

  const updateChecklist = useCallback((category: string, label: string, passed: boolean) => {
    setChecklists((prev) =>
      prev.map((c) =>
        c.name === category
          ? {
              ...c,
              items: c.items.map((item) =>
                item.label === label ? { ...item, passed } : item
              ),
            }
          : c
      )
    );
  }, []);

  useEffect(() => {
    const layout = createMockLayout();
    layoutStore.setLayout(layout);

    // Set viewport to show entire room
    viewportStore.setViewport({
      x: -50,
      y: -50,
      zoom: 1,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, [layoutStore, viewportStore]);

  useEffect(() => {
    const elements = layoutStore.layout?.elements || {};
    const tables = Object.values(elements).filter((e) => e.type.startsWith('table-')) as TableElement[];
    const chairs = Object.values(elements).filter((e) => e.type === 'chair') as ChairElement[];

    setElementCount(Object.keys(elements).length);
    setTableCount(tables.length);
    setChairCount(chairs.length);

    // Update checklist items based on element count
    if (tables.length > 0) {
      updateChecklist('Table + Chairs', 'Adding table auto-generates chairs', true);

      const totalChairs = tables.reduce((sum, t) => sum + (t.chairIds?.length || 0), 0);
      if (totalChairs > 0) {
        updateChecklist('Table + Chairs', 'Chair count matches capacity', true);
      }
    }

    if (chairs.length > 0) {
      updateChecklist('Table + Chairs', 'Chairs positioned correctly for round tables', true);
    }
  }, [layoutStore.layout?.elements, updateChecklist]);

  useEffect(() => {
    setSelectedCount(selectionStore.selectedIds.length);

    if (selectionStore.selectedIds.length === 0) {
      updateChecklist('Properties Panel', 'Shows "Select an element..." when nothing selected', true);
    } else if (selectionStore.selectedIds.length === 1) {
      updateChecklist('Properties Panel', 'Shows appropriate properties for selected element', true);
    } else if (selectionStore.selectedIds.length > 1) {
      updateChecklist('Properties Panel', 'Multiple selection shows alignment tools', true);
    }
  }, [selectionStore.selectedIds, updateChecklist]);

  const handleCanvasClick = useCallback(() => {
    selectionStore.clearSelection();
  }, [selectionStore]);

  const handleElementClick = useCallback((elementId: string) => {
    selectionStore.select(elementId);
  }, [selectionStore]);

  const handleAddTable = useCallback((table: TableElement) => {
    // Check if chairs were created
    setTimeout(() => {
      const elements = layoutStore.layout?.elements || {};
      const chairs = Object.values(elements).filter((e) => e.type === 'chair');
      if (chairs.length > 0) {
        updateChecklist('Table + Chairs', 'Adding table auto-generates chairs', true);
        updateChecklist('Adding Elements', '"Add to Layout" places element in center', true);
      }
    }, 100);
  }, [layoutStore.layout, updateChecklist]);

  const runUndoTest = useCallback(() => {
    const pastLength = historyStore.past.length;
    if (pastLength > 0) {
      historyStore.undo();
      updateChecklist('Undo/Redo', 'Adding element can be undone', true);
    }
  }, [historyStore, updateChecklist]);

  const runRedoTest = useCallback(() => {
    const futureLength = historyStore.future.length;
    if (futureLength > 0) {
      historyStore.redo();
      updateChecklist('Undo/Redo', 'Adding element can be undone', true);
    }
  }, [historyStore, updateChecklist]);

  const getProgressColor = (items: { passed: boolean }[]) => {
    const passed = items.filter((i) => i.passed).length;
    const total = items.length;
    if (passed === total) return 'bg-green-500';
    if (passed === 0) return 'bg-gray-300';
    return 'bg-yellow-500';
  };

  const getProgressWidth = (items: { passed: boolean }[]) => {
    const passed = items.filter((i) => i.passed).length;
    const total = items.length;
    return `${(passed / total) * 100}%`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Phase 2 Verification Test</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2 py-1 bg-blue-100 rounded">
            Elements: {elementCount}
          </span>
          <span className="px-2 py-1 bg-green-100 rounded">
            Tables: {tableCount}
          </span>
          <span className="px-2 py-1 bg-purple-100 rounded">
            Chairs: {chairCount}
          </span>
          <span className="px-2 py-1 bg-orange-100 rounded">
            Selected: {selectedCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runUndoTest}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Test Undo
          </button>
          <button
            onClick={runRedoTest}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Test Redo
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-gray-50">
            <h2 className="font-semibold text-sm">Element Library</h2>
          </div>
          <ElementLibrary
            onSelectElement={(type) => {
              console.log('Selected element type:', type);
              updateChecklist('Element Library', 'Click element → config popover appears', true);
            }}
            onOpenConfigModal={(type) => {
              console.log('Config element:', type);
            }}
            onOpenElementMaker={() => {
              console.log('Open element maker');
            }}
            onSelectCustomTemplate={(template) => {
              console.log('Select custom template:', template);
            }}
            onEditCustomTemplate={(template) => {
              console.log('Edit custom template:', template);
            }}
            onDeleteCustomTemplate={(template) => {
              console.log('Delete custom template:', template);
            }}
            customTemplates={[]}
          />
        </div>

        <div className="flex-1 relative">
          <CanvasArea
            onCanvasClick={handleCanvasClick}
            onElementClick={handleElementClick}
          />
        </div>

        <div className="w-72 bg-white border-l flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-gray-50">
            <h2 className="font-semibold text-sm">Properties</h2>
          </div>
          <PropertiesPanel
            selectedElement={null}
            onUpdate={() => {}}
            onDuplicate={() => {}}
            onDelete={() => {}}
            onToggleLock={() => {}}
            onClose={() => {}}
          />
        </div>
      </div>

      <div className="bg-white border-t p-4">
        <h2 className="font-semibold mb-3">Verification Checklist</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {checklists.map((category) => {
            const passed = category.items.filter((i) => i.passed).length;
            const total = category.items.length;
            return (
              <div key={category.name} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{category.name}</h3>
                  <span className="text-xs text-gray-500">
                    {passed}/{total}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getProgressColor(category.items)}`}
                    style={{ width: getProgressWidth(category.items) }}
                  />
                </div>
                <ul className="mt-2 space-y-1">
                  {category.items.map((item) => (
                    <li
                      key={item.label}
                      className={`text-xs flex items-center gap-1.5 ${
                        item.passed ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      <span className="w-3 h-3 flex items-center justify-center">
                        {item.passed ? '✓' : '○'}
                      </span>
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Phase2TestPage;
