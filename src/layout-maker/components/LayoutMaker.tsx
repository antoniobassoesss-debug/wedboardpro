/**
 * LayoutMaker Component
 *
 * Main responsive layout container for the Layout Maker.
 * Adapts to desktop, tablet, and mobile screen sizes.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { CanvasArea } from './Canvas/CanvasArea';
import { ElementLibrary } from './Sidebar/ElementLibrary';
import { PropertiesPanel } from './Sidebar/PropertiesPanel';
import { RoundTableModal } from './Sidebar/RoundTableModal';
import { OvalTableModal } from './Sidebar/OvalTableModal';
import { ElementConfigModal } from './Sidebar/ElementConfigModal';
import { CustomElementModal } from './Sidebar/CustomElementModal';
import { useLayoutStore, useViewportStore, useSelectionStore, useUIStore } from '../stores';
import { useResponsive } from '../hooks/useMediaQuery';
import { useCustomElements } from '../hooks/useCustomElements';
import { BottomSheet } from './common/BottomSheet';
import { FloatingActionButton } from './Toolbar/FloatingActionButton';
import { TabBar } from './Toolbar/TabBar';
import type { Layout, FloorPlanBackground, ElementType } from '../types';
import type { MeasurementUnit } from '../types/layout';
import type { TableType, ChairConfig, TableDimensions } from '../../types/layout-elements';
import type { CustomElementTemplate } from '../types/elements';
import { v4 as uuidv4 } from 'uuid';

interface ConfigModalData {
  type: TableType;
  dimensions: TableDimensions;
  capacity: number;
  chairConfig: ChairConfig;
  tableNumber: string;
  label?: string;
}

interface LayoutMakerProps {
  projectId?: string;
  eventId?: string;
  initialLayout?: Partial<Layout>;
}

export const LayoutMaker: React.FC<LayoutMakerProps> = ({
  projectId = 'default-project',
  eventId = 'default-event',
  initialLayout,
}) => {
  const layoutStore = useLayoutStore();
  const viewportStore = useViewportStore();
  const selectionStore = useSelectionStore();
  const uiStore = useUIStore();

  const { isDesktop, isTablet, isMobile } = useResponsive();

  const [elementsSheetOpen, setElementsSheetOpen] = useState(false);
  const [propertiesSheetOpen, setPropertiesSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Tables');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [roundTableModalOpen, setRoundTableModalOpen] = useState(false);
  const [ovalTableModalOpen, setOvalTableModalOpen] = useState(false);
  const [configElementType, setConfigElementType] = useState<TableType>('table-round');
  const [configInitialData, setConfigInitialData] = useState<Partial<ConfigModalData>>({});
  const [customElementModalOpen, setCustomElementModalOpen] = useState(false);
  const [editingCustomTemplate, setEditingCustomTemplate] = useState<CustomElementTemplate | null>(null);

  const { templates: customTemplates, fetchTemplates, saveTemplate, updateTemplate, deleteTemplate } = useCustomElements();

  const getPlannerId = useCallback(() => {
    try {
      const sessionStr = localStorage.getItem('wedboarpro_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        return session?.user?.id || 'anonymous';
      }
    } catch {
      // Ignore
    }
    return 'anonymous';
  }, []);

  const plannerId = getPlannerId();

  useEffect(() => {
    fetchTemplates(plannerId);
  }, [fetchTemplates, plannerId]);

  const handleCanvasClick = useCallback(() => {
    selectionStore.clearSelection();
  }, [selectionStore]);

  const handleElementClick = useCallback((elementId: string) => {
    selectionStore.select(elementId);
  }, [selectionStore]);

  const handleAddElement = useCallback((type: ElementType) => {
    const defaults: Record<string, { width: number; height: number; capacity: number }> = {
      'table-round': { width: 1.5, height: 1.5, capacity: 8 },
      'table-rectangular': { width: 2, height: 1, capacity: 8 },
      'table-oval': { width: 2, height: 1.2, capacity: 8 },
      'chair': { width: 0.45, height: 0.45, capacity: 1 },
    };

    const config = defaults[type] || { width: 1, height: 1, capacity: 1 };

    layoutStore.addTable({
      type: type.replace('table-', '') as any,
      x: 5,
      y: 5,
      width: config.width,
      height: config.height,
      capacity: config.capacity,
    });
  }, [layoutStore]);

  const handleAddElementFromSheet = useCallback((type: ElementType) => {
    handleAddElement(type);
    setElementsSheetOpen(false);
  }, [handleAddElement]);

  const selectedIdsArray = Array.from(selectionStore.selectedIds);
  const selectedElement = selectedIdsArray.length === 1
    ? (layoutStore.getElementById(selectedIdsArray[0]!) ?? null)
    : null;

  const tabletTabs = ['Tables', 'Zones', 'Service', 'Decoration'];

  const handleOpenConfigModal = useCallback((type: ElementType) => {
    const validTypes: TableType[] = ['table-round', 'table-rectangular', 'table-oval'];
    const normalizedType = validTypes.includes(type as TableType) ? type as TableType : 'table-round';
    setConfigElementType(normalizedType);
    setConfigInitialData({});
    setConfigModalOpen(true);
    setElementsSheetOpen(false);
  }, []);

  const handleOpenRoundTableModal = useCallback((type: ElementType) => {
    if (type === 'table-round') {
      setRoundTableModalOpen(true);
      setElementsSheetOpen(false);
    } else if (type === 'table-oval') {
      setOvalTableModalOpen(true);
      setElementsSheetOpen(false);
    }
  }, []);

  const handleRoundTableSubmit = useCallback((data: { diameter: number; unit: 'cm' | 'm'; seats: number; quantity: number }) => {
    const { diameter, unit, seats, quantity } = data;

    const diameterInMeters = unit === 'cm' ? diameter / 100 : diameter;
    const tableWidth = diameterInMeters;
    const tableHeight = diameterInMeters;

    const seatSpacing = 0.4;
    const seatOffset = 0.1;
    const chairSize = 0.45;

    for (let i = 0; i < quantity; i++) {
      const offsetX = i * (tableWidth + 0.5);
      const tableX = 5 + offsetX;
      const tableY = 5;

      const result = layoutStore.addTable({
        type: 'table-round',
        x: tableX,
        y: tableY,
        width: tableWidth,
        height: tableHeight,
        capacity: seats,
        label: `${i + 1}`,
      });
    }

    setRoundTableModalOpen(false);
  }, [layoutStore]);

  const handleOvalTableSubmit = useCallback((data: { width: number; height: number; unit: 'cm' | 'm'; seats: number; quantity: number }) => {
    const { width, height, unit, seats, quantity } = data;

    const widthInMeters = unit === 'cm' ? width / 100 : width;
    const heightInMeters = unit === 'cm' ? height / 100 : height;

    for (let i = 0; i < quantity; i++) {
      const offsetX = i * (widthInMeters + 0.5);
      const tableX = 5 + offsetX;
      const tableY = 5;

      layoutStore.addTable({
        type: 'table-oval',
        x: tableX,
        y: tableY,
        width: widthInMeters,
        height: heightInMeters,
        capacity: seats,
        label: `${i + 1}`,
      });
    }

    setOvalTableModalOpen(false);
  }, [layoutStore]);

  const handleConfigElementSubmit = useCallback((data: ConfigModalData) => {
    const { type, dimensions, capacity, tableNumber } = data;
    
    let width = dimensions.unit === 'cm' ? dimensions.width / 100 : dimensions.width;
    let height = dimensions.unit === 'cm' ? dimensions.height / 100 : dimensions.height;
    
    if (type === 'table-round' && dimensions.diameter) {
      width = dimensions.unit === 'cm' ? dimensions.diameter / 100 : dimensions.diameter;
      height = width;
    }

    const addTableParams: {
      type: TableType;
      x: number;
      y: number;
      width: number;
      height: number;
      capacity: number;
      tableNumber?: string;
      label?: string;
      rotation?: number;
      color?: string | null;
    } = {
      type,
      x: 5,
      y: 5,
      width,
      height,
      capacity,
    };

    if (tableNumber) {
      addTableParams.tableNumber = tableNumber;
      addTableParams.label = tableNumber;
    }

    layoutStore.addTable(addTableParams);
    
    setConfigModalOpen(false);
  }, [layoutStore]);

  const handleOpenElementMaker = useCallback(() => {
    setEditingCustomTemplate(null);
    setCustomElementModalOpen(true);
  }, []);

  const handleEditCustomTemplate = useCallback((template: CustomElementTemplate) => {
    setEditingCustomTemplate(template);
    setCustomElementModalOpen(true);
  }, []);

  const handleDeleteCustomTemplate = useCallback(async (template: CustomElementTemplate) => {
    const result = await deleteTemplate(template.id);
    if (!result.success && result.inUse) {
      alert(`Cannot delete "${template.name}" because it is used in ${result.usageCount} layout(s). Remove it from layouts first.`);
    }
  }, [deleteTemplate]);

  const handleSaveCustomTemplate = useCallback(async (templateData: Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt' | 'updatedAt'>) => {
    if (editingCustomTemplate) {
      await updateTemplate(editingCustomTemplate.id, templateData);
    } else {
      await saveTemplate(plannerId, templateData);
    }
    setCustomElementModalOpen(false);
    setEditingCustomTemplate(null);
  }, [editingCustomTemplate, saveTemplate, updateTemplate, plannerId]);

  const handleSelectCustomTemplate = useCallback((template: CustomElementTemplate) => {
    const elementId = layoutStore.addElement({
      type: `custom-${template.id}` as ElementType,
      x: 5,
      y: 5,
      width: template.width,
      height: template.height,
      rotation: 0,
      zIndex: layoutStore.maxZIndex + 1,
      groupId: null,
      parentId: null,
      locked: false,
      visible: true,
      label: template.name,
      notes: '',
      color: null,
    });

    if (elementId) {
      layoutStore.updateElement(elementId, { customShape: template.svgPath } as Record<string, unknown>);
    }
  }, [layoutStore]);

  const handleDuplicateElement = useCallback((id: string) => {
    const element = layoutStore.getElementById(id);
    if (element) {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...elementData } = element;
      layoutStore.addElement({
        ...elementData,
        x: element.x + 0.5,
        y: element.y + 0.5,
      });
    }
  }, [layoutStore]);

  const handleDeleteElement = useCallback((id: string) => {
    layoutStore.deleteElement(id);
  }, [layoutStore]);

  const handleUpdateElement = useCallback((id: string, updates: Record<string, unknown>) => {
    layoutStore.updateElement(id, updates);
  }, [layoutStore]);

  const handleToggleLockElement = useCallback((id: string) => {
    const element = layoutStore.getElementById(id);
    if (element) {
      layoutStore.updateElement(id, { locked: !element.locked });
    }
  }, [layoutStore]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      <header className="flex-shrink-0 bg-white border-b px-4 py-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Layout Maker</h1>
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
            {isDesktop ? 'Desktop' : isTablet ? 'Tablet' : 'Mobile'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setElementsSheetOpen(true)}
            className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add Element
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {isDesktop && (
          <aside className="w-64 bg-white border-r flex flex-col overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <h2 className="font-semibold text-sm">Elements</h2>
            </div>
            <ElementLibrary
              onSelectElement={handleAddElement}
              onOpenConfigModal={handleOpenRoundTableModal}
              onOpenElementMaker={handleOpenElementMaker}
              onSelectCustomTemplate={handleSelectCustomTemplate}
              onEditCustomTemplate={handleEditCustomTemplate}
              onDeleteCustomTemplate={handleDeleteCustomTemplate}
              customTemplates={customTemplates}
            />
          </aside>
        )}

        <main className="flex-1 relative overflow-hidden">
          <CanvasArea
            onCanvasClick={handleCanvasClick}
            onElementClick={handleElementClick}
          />

          {!isDesktop && (
            <FloatingActionButton
              onClick={() => setElementsSheetOpen(true)}
              onAddElement={handleAddElement}
            />
          )}
        </main>

        {isDesktop ? (
          <aside className="w-72 bg-white border-l flex flex-col overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <h2 className="font-semibold text-sm">Properties</h2>
            </div>
            <PropertiesPanel
              selectedElement={selectedElement}
              onUpdate={handleUpdateElement}
              onDuplicate={handleDuplicateElement}
              onDelete={handleDeleteElement}
              onToggleLock={handleToggleLockElement}
              onClose={() => selectionStore.clearSelection()}
            />
          </aside>
        ) : selectedElement && (
          <BottomSheet
            isOpen={propertiesSheetOpen}
            onClose={() => setPropertiesSheetOpen(false)}
            title="Properties"
            initialState="half"
          >
            <PropertiesPanel
              selectedElement={selectedElement}
              onUpdate={handleUpdateElement}
              onDuplicate={handleDuplicateElement}
              onDelete={handleDeleteElement}
              onToggleLock={handleToggleLockElement}
              onClose={() => setPropertiesSheetOpen(false)}
            />
          </BottomSheet>
        )}
      </div>

      {isTablet && (
        <TabBar
          tabs={tabletTabs}
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
      )}

      {isMobile && selectedElement && (
        <button
          onClick={() => setPropertiesSheetOpen(true)}
          className="fixed bottom-6 left-6 px-4 py-2 bg-white rounded-full shadow-lg text-sm font-medium text-gray-700 z-30"
          style={{ touchAction: 'manipulation' }}
        >
          Edit Selected
        </button>
      )}

      <BottomSheet
        isOpen={elementsSheetOpen}
        onClose={() => setElementsSheetOpen(false)}
        title="Add Element"
        initialState={isMobile ? 'full' : 'half'}
        snapPoints={isMobile ? [0.3, 0.6, 0.9] : [0.4, 0.7]}
      >
        <ElementLibrary
          onSelectElement={handleAddElementFromSheet}
          onOpenConfigModal={handleOpenRoundTableModal}
          onOpenElementMaker={handleOpenElementMaker}
          onSelectCustomTemplate={handleSelectCustomTemplate}
          onEditCustomTemplate={handleEditCustomTemplate}
          onDeleteCustomTemplate={handleDeleteCustomTemplate}
          customTemplates={customTemplates}
          compact={!isDesktop}
        />
      </BottomSheet>

      <RoundTableModal
        isOpen={roundTableModalOpen}
        onClose={() => setRoundTableModalOpen(false)}
        onSubmit={handleRoundTableSubmit}
      />

      <OvalTableModal
        isOpen={ovalTableModalOpen}
        onClose={() => setOvalTableModalOpen(false)}
        onSubmit={handleOvalTableSubmit}
      />

      <ElementConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onSubmit={handleConfigElementSubmit}
        elementType={configElementType}
        initialData={configInitialData}
      />

      <CustomElementModal
        isOpen={customElementModalOpen}
        onClose={() => {
          setCustomElementModalOpen(false);
          setEditingCustomTemplate(null);
        }}
        onSave={handleSaveCustomTemplate}
        editTemplate={editingCustomTemplate}
      />
    </div>
  );
};

export default LayoutMaker;
