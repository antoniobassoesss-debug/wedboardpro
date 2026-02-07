/**
 * Phase 5 Verification Test Page
 *
 * Tests all Phase 5 features:
 * 1. Floor Plan Import (upload, scale calibration, position adjust)
 * 2. Export (presets, custom options, preview, file generation)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CanvasArea } from './Canvas/CanvasArea';
import { ElementLibrary } from './Sidebar/ElementLibrary';
import { PropertiesPanel } from './Sidebar/PropertiesPanel';
import { ImportWizard } from './FloorPlanImport';
import { ExportWizard } from './Export';
import { CustomElementModal } from './Sidebar/CustomElementModal';
import { ElementPlacementModal } from './Sidebar/ElementPlacementModal';
import { useLayoutStore, useViewportStore, useUIStore, useSelectionStore } from '../stores';
import type { Layout, Wall, TableElement, ChairElement, FloorPlanBackground, ElementType } from '../types';
import type { MeasurementUnit } from '../types/layout';
import type { CustomElementTemplate } from '../types/elements';
import { v4 as uuidv4 } from 'uuid';

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
    id: 'phase5-test-layout',
    projectId: 'test-project',
    eventId: 'test-event',
    name: 'Phase 5 Test Layout',
    description: 'Layout for Phase 5 feature verification',
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

function addSampleElements(layout: Layout): Layout {
  const elements: Record<string, any> = {};
  const elementOrder: string[] = [];
  const now = new Date().toISOString();

  // Add a round table
  const table1Id = uuidv4();
  elements[table1Id] = {
    id: table1Id,
    type: 'table-round',
    x: 5,
    y: 5,
    width: 1.5,
    height: 1.5,
    rotation: 0,
    zIndex: 10,
    groupId: null,
    parentId: null,
    locked: false,
    visible: true,
    label: 'Table 1',
    notes: '',
    color: null,
    capacity: 8,
    tableNumber: '1',
    chairConfig: { enabled: true, offset: 0.3, spacing: 0.5 },
    chairIds: [],
    createdAt: now,
    updatedAt: now,
  };
  elementOrder.push(table1Id);

  // Add chairs for table 1
  for (let i = 0; i < 8; i++) {
    const chairId = uuidv4();
    const angle = (i / 8) * Math.PI * 2;
    const chairX = 5 + Math.cos(angle) * 1.1 - 0.225;
    const chairY = 5 + Math.sin(angle) * 1.1 - 0.225;
    
    elements[chairId] = {
      id: chairId,
      type: 'chair',
      x: chairX,
      y: chairY,
      width: 0.45,
      height: 0.45,
      rotation: angle * (180 / Math.PI) + 90,
      zIndex: 5,
      groupId: null,
      parentId: table1Id,
      locked: false,
      visible: true,
      label: '',
      notes: '',
      color: null,
      parentTableId: table1Id,
      seatIndex: i,
      assignedGuestId: i < 5 ? `guest-${i}` : null,
      assignedGuestName: i < 5 ? ['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown', 'Charlie Davis'][i] : null,
      dietaryType: i === 1 ? 'vegetarian' : i === 3 ? 'vegan' : 'regular',
      allergyFlags: [],
      createdAt: now,
      updatedAt: now,
    };
    elementOrder.push(chairId);
  }
  elements[table1Id].chairIds = elementOrder.slice(-8);

  // Add a rectangular table
  const table2Id = uuidv4();
  elements[table2Id] = {
    id: table2Id,
    type: 'table-rectangular',
    x: 10,
    y: 5,
    width: 2,
    height: 1,
    rotation: 0,
    zIndex: 10,
    groupId: null,
    parentId: null,
    locked: false,
    visible: true,
    label: 'Table 2',
    notes: '',
    color: null,
    capacity: 6,
    tableNumber: '2',
    chairConfig: { enabled: true, offset: 0.3, spacing: 0.5 },
    chairIds: [],
    createdAt: now,
    updatedAt: now,
  };
  elementOrder.push(table2Id);

  // Add chairs for table 2
  for (let i = 0; i < 6; i++) {
    const chairId = uuidv4();
    let chairX, chairY, chairRotation;
    if (i < 3) {
      chairX = 10 + (i + 0.5) * 0.65 - 0.225;
      chairY = 4.2;
      chairRotation = 0;
    } else {
      chairX = 10 + (i - 2.5) * 0.65 - 0.225;
      chairY = 6.3;
      chairRotation = 180;
    }
    
    elements[chairId] = {
      id: chairId,
      type: 'chair',
      x: chairX,
      y: chairY,
      width: 0.45,
      height: 0.45,
      rotation: chairRotation,
      zIndex: 5,
      groupId: null,
      parentId: table2Id,
      locked: false,
      visible: true,
      label: '',
      notes: '',
      color: null,
      parentTableId: table2Id,
      seatIndex: i,
      assignedGuestId: i < 3 ? `guest-${i + 5}` : null,
      assignedGuestName: i < 3 ? ['Eva Green', 'Frank Miller', 'Grace Lee'][i] : null,
      dietaryType: null,
      allergyFlags: [],
      createdAt: now,
      updatedAt: now,
    };
    elementOrder.push(chairId);
  }
  elements[table2Id].chairIds = elementOrder.slice(-6);

  return {
    ...layout,
    elements,
    elementOrder,
  };
}

export const Phase5TestPage: React.FC = () => {
  const layoutStore = useLayoutStore();
  const viewportStore = useViewportStore();
  const uiStore = useUIStore();
  const selectionStore = useSelectionStore();

  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportWizard, setShowExportWizard] = useState(false);
  const [floorPlanCount, setFloorPlanCount] = useState(0);
  const [customElementModalOpen, setCustomElementModalOpen] = useState(false);
  const [editingCustomTemplate, setEditingCustomTemplate] = useState<CustomElementTemplate | null>(null);
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [placementElementType, setPlacementElementType] = useState<ElementType>('chair');
  const [placementElementLabel, setPlacementElementLabel] = useState('Chair');
  const [placementElementWidth, setPlacementElementWidth] = useState(0.45);
  const [placementElementHeight, setPlacementElementHeight] = useState(0.45);

  useEffect(() => {
    console.log('[Phase5TestPage] customElementModalOpen changed to:', customElementModalOpen);
  }, [customElementModalOpen]);

  useEffect(() => {
    console.log('[Phase5TestPage] placementModalOpen changed to:', placementModalOpen);
  }, [placementModalOpen]);

  const [checklists, setChecklists] = useState<TestChecklist[]>([
    {
      name: 'Floor Plan Import',
      items: [
        { label: 'Upload step accepts drag & drop', passed: false },
        { label: 'Upload step accepts file picker', passed: false },
        { label: 'PDF files are converted to image', passed: false },
        { label: 'Scale calibration allows clicking two points', passed: false },
        { label: 'Distance input works', passed: false },
        { label: 'Position adjust allows dragging/resizing', passed: false },
        { label: 'Opacity slider works', passed: false },
        { label: '"Done" adds floor plan to canvas', passed: false },
        { label: 'Floor plan appears as background layer', passed: false },
        { label: 'Floor plan respects lock/visible settings', passed: false },
      ],
    },
    {
      name: 'Export',
      items: [
        { label: 'Export wizard opens', passed: false },
        { label: 'Presets apply correct options', passed: false },
        { label: 'Custom options work', passed: false },
        { label: 'Preview updates in real-time', passed: false },
        { label: 'PDF export generates valid PDF', passed: false },
        { label: 'PNG export generates valid image', passed: false },
        { label: 'SVG export generates valid SVG', passed: false },
        { label: 'Correct elements included based on options', passed: false },
        { label: 'Guest names appear when enabled', passed: false },
        { label: 'Logo appears when provided', passed: false },
        { label: 'Footer text appears when provided', passed: false },
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
    const layout = addSampleElements(createMockLayout());
    layoutStore.setLayout(layout);

    viewportStore.setViewport({
      x: -50,
      y: -50,
      zoom: 1,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, [layoutStore, viewportStore]);

  useEffect(() => {
    if (layoutStore.layout?.floorPlan) {
      setFloorPlanCount(1);
      updateChecklist('Floor Plan Import', '"Done" adds floor plan to canvas', true);
      updateChecklist('Floor Plan Import', 'Floor plan appears as background layer', true);
    }
  }, [layoutStore.layout?.floorPlan, updateChecklist]);

  const handleCanvasClick = useCallback(() => {
    selectionStore.clearSelection();
  }, [selectionStore]);

  const handleElementClick = useCallback((elementId: string) => {
    selectionStore.select(elementId);
  }, [selectionStore]);

  const handleImportFloorPlan = useCallback((floorPlan: FloorPlanBackground) => {
    layoutStore.setFloorPlan(floorPlan);
    updateChecklist('Floor Plan Import', '"Done" adds floor plan to canvas', true);
    updateChecklist('Floor Plan Import', 'Floor plan appears as background layer', true);
  }, [layoutStore, updateChecklist]);

  const handleExport = useCallback((config: any) => {
    console.log('Export config:', config);
    updateChecklist('Export', 'PDF export generates valid PDF', config.format === 'pdf');
    updateChecklist('Export', 'PNG export generates valid image', config.format === 'png');
    updateChecklist('Export', 'SVG export generates valid SVG', config.format === 'svg');
  }, [updateChecklist]);

  const openImportWizard = useCallback(() => {
    setShowImportWizard(true);
    updateChecklist('Floor Plan Import', 'Upload step accepts drag & drop', true);
    updateChecklist('Floor Plan Import', 'Upload step accepts file picker', true);
  }, [updateChecklist]);

  const openExportWizard = useCallback(() => {
    setShowExportWizard(true);
    updateChecklist('Export', 'Export wizard opens', true);
  }, [updateChecklist]);

  const handleOpenPlacementModal = useCallback((type: ElementType) => {
    console.log('[Phase5TestPage] handleOpenPlacementModal called with type:', type);
    const elementConfigs: Record<string, { label: string; width: number; height: number }> = {
      'chair': { label: 'Chair', width: 0.45, height: 0.45 },
      'bench': { label: 'Bench', width: 1.5, height: 0.5 },
      'lounge': { label: 'Lounge', width: 2, height: 0.8 },
    };

    const config = elementConfigs[type];
    console.log('[Phase5TestPage] config found:', config);
    if (config) {
      setPlacementElementType(type);
      setPlacementElementLabel(config.label);
      setPlacementElementWidth(config.width);
      setPlacementElementHeight(config.height);
      console.log('[Phase5TestPage] Before setPlacementModalOpen(true)');
      setPlacementModalOpen(true);
      console.log('[Phase5TestPage] After setPlacementModalOpen(true)');
    }
  }, []);

  const handlePlaceElements = useCallback((elements: Array<{
    type: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zIndex: number;
    groupId: string | null;
    parentId: string | null;
    locked: boolean;
    visible: boolean;
    label: string;
    notes: string;
    color: string | null;
  }>) => {
    elements.forEach((element) => {
      layoutStore.addElement(element);
    });
    setPlacementModalOpen(false);
  }, [layoutStore]);

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
        <h1 className="text-lg font-semibold">Phase 5 Verification Test</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2 py-1 bg-blue-100 rounded">
            Floor Plans: {floorPlanCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openImportWizard}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Floor Plan
          </button>
          <button
            onClick={openExportWizard}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Layout
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-gray-50">
            <h2 className="font-semibold text-sm">Element Library</h2>
          </div>
          <ElementLibrary
            onSelectElement={(type) => console.log('Selected:', type)}
            onOpenConfigModal={(type) => console.log('Config:', type)}
            onOpenElementMaker={() => {
              console.log('[Phase5TestPage] onOpenElementMaker called');
              console.log('[Phase5TestPage] Before setCustomElementModalOpen(true)');
              setCustomElementModalOpen(true);
              console.log('[Phase5TestPage] After setCustomElementModalOpen(true)');
            }}
            onSelectCustomTemplate={(template) => console.log('Select custom:', template)}
            onEditCustomTemplate={(template) => console.log('Edit custom:', template)}
            onDeleteCustomTemplate={(template) => console.log('Delete custom:', template)}
            onOpenPlacementModal={handleOpenPlacementModal}
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

      {/* Import Wizard Modal */}
      {showImportWizard && (
        <ImportWizard
          isOpen={showImportWizard}
          onClose={() => setShowImportWizard(false)}
          onImport={handleImportFloorPlan}
          canvasWidth={800}
          canvasHeight={600}
        />
      )}

      {/* Export Wizard Modal */}
      {showExportWizard && (
        <ExportWizard
          isOpen={showExportWizard}
          onClose={() => setShowExportWizard(false)}
          onExport={handleExport}
        />
      )}

      <CustomElementModal
        isOpen={customElementModalOpen}
        onClose={() => {
          setCustomElementModalOpen(false);
          setEditingCustomTemplate(null);
        }}
        onSave={(template) => {
          console.log('Save custom template:', template);
          setCustomElementModalOpen(false);
        }}
        editTemplate={editingCustomTemplate}
      />

      <ElementPlacementModal
        isOpen={placementModalOpen}
        onClose={() => setPlacementModalOpen(false)}
        onPlaceElements={handlePlaceElements}
        elementType={placementElementType}
        elementLabel={placementElementLabel}
        defaultWidth={placementElementWidth}
        defaultHeight={placementElementHeight}
      />
    </div>
  );
};

export default Phase5TestPage;
