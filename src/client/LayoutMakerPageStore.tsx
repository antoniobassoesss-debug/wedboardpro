/**
 * LayoutMakerPage - Store-based Version
 *
 * ARCHITECTURE:
 * - Each project's canvas data is stored in localStorage (key: layout-maker-canvas-{projectId})
 * - Switching projects is SYNCHRONOUS - save current, load new from localStorage
 * - Supabase sync happens in background (doesn't affect project switching)
 * - This ensures each project tab always shows its own canvas data
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import GridCanvasStore from './GridCanvasStore';
import { getEvent } from './api/eventsPipelineApi';
import HeaderBar from './HeaderBar';
import Toolbar from './Toolbar';
import ProjectTabs from './ProjectTabs';
import InfiniteGridBackground from './InfiniteGridBackground';
import WorkflowCanvas from './components/WorkflowCanvas';
import AssistantChat from './AssistantChat';
import AssociateProjectModal from './AssociateProjectModal';
import ElectricalDashboard from './components/ElectricalDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import A4Canvas, { type A4Dimensions, getInitialA4Dimensions } from './components/A4Canvas';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import ZoomControls from './components/ZoomControls';
import { useCanvasStore } from '../layout-maker/store/canvasStore';
import { useAutoSync } from '../layout-maker/hooks/useAutoSync';
import { ElementLibrary } from '../layout-maker/components/Sidebar/ElementLibrary';
import { RoundTableModal } from '../layout-maker/components/Sidebar/RoundTableModal';
import { RectangularTableModal } from '../layout-maker/components/Sidebar/RectangularTableModal';
import { SquareTableModal } from '../layout-maker/components/Sidebar/SquareTableModal';
import { OvalTableModal } from '../layout-maker/components/Sidebar/OvalTableModal';
import { CustomElementModal } from '../layout-maker/components/Sidebar/CustomElementModal';
import { useCustomElements } from '../layout-maker/hooks/useCustomElements';
import type { CustomElementTemplate } from '../layout-maker/types/elements';
import type { Wall, Door } from './types/wall';
import type { PowerPoint } from './types/powerPoint';
import type { ElementType } from '../layout-maker/types/elements';
import { ELEMENT_DEFAULTS, getElementDefault } from '../layout-maker/constants';
import { generateChairPositions } from '../layout-maker/utils/chairGeneration';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
  id: string;
  name: string;
  a4Dimensions?: A4Dimensions;
  supabaseLayoutId?: string;
  eventId?: string;
  category?: string;
  tags?: string[];
  description?: string;
}

const STORAGE_KEY = 'layout-maker-projects-v2';
const STORAGE_ACTIVE_PROJECT_KEY = 'layout-maker-active-project-id';
const CANVAS_STORAGE_PREFIX = 'layout-maker-canvas-';

// ============ LOCAL STORAGE HELPERS ============

const getCanvasStorageKey = (projectId: string) => `${CANVAS_STORAGE_PREFIX}${projectId}`;

const saveCanvasToLocalStorage = (projectId: string, canvasData: any) => {
  try {
    localStorage.setItem(getCanvasStorageKey(projectId), JSON.stringify(canvasData));
  } catch (error) {
    console.error('[Storage] Failed to save canvas data:', error);
  }
};

const loadCanvasFromLocalStorage = (projectId: string): any | null => {
  try {
    const stored = localStorage.getItem(getCanvasStorageKey(projectId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[Storage] Failed to load canvas data:', error);
  }
  return null;
};

const deleteCanvasFromLocalStorage = (projectId: string) => {
  try {
    localStorage.removeItem(getCanvasStorageKey(projectId));
  } catch (error) {
    console.error('[Storage] Failed to delete canvas data:', error);
  }
};

const loadProjectsFromStorage = (): Project[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading projects from localStorage:', error);
  }
  const defaultA4Dimensions = getInitialA4Dimensions();
  return [
    {
      id: '1',
      name: 'Project 1',
      a4Dimensions: defaultA4Dimensions,
    },
  ];
};

const saveProjectsToStorage = (projects: Project[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Error saving projects to localStorage:', error);
  }
};

// Convert canvas data arrays to store format (normalized)
const canvasDataToStoreFormat = (canvasData: any) => {
  const storeData: any = {};

  if (canvasData.shapes && Array.isArray(canvasData.shapes)) {
    storeData.elements = {};
    storeData.elementOrder = [];
    canvasData.shapes.forEach((shape: any) => {
      storeData.elements[shape.id] = shape;
      storeData.elementOrder.push(shape.id);
    });
  }

  if (canvasData.drawings && Array.isArray(canvasData.drawings)) {
    storeData.drawings = {};
    storeData.drawingOrder = [];
    canvasData.drawings.forEach((drawing: any) => {
      storeData.drawings[drawing.id] = drawing;
      storeData.drawingOrder.push(drawing.id);
    });
  }

  if (canvasData.walls && Array.isArray(canvasData.walls)) {
    storeData.walls = {};
    storeData.wallOrder = [];
    canvasData.walls.forEach((wall: any) => {
      storeData.walls[wall.id] = wall;
      storeData.wallOrder.push(wall.id);
    });
  }

  if (canvasData.doors && Array.isArray(canvasData.doors)) {
    storeData.doors = {};
    canvasData.doors.forEach((door: any) => {
      storeData.doors[door.id] = door;
    });
  }

  if (canvasData.textElements && Array.isArray(canvasData.textElements)) {
    storeData.textElements = {};
    storeData.textOrder = [];
    canvasData.textElements.forEach((text: any) => {
      storeData.textElements[text.id] = text;
      storeData.textOrder.push(text.id);
    });
  }

  if (canvasData.powerPoints && Array.isArray(canvasData.powerPoints)) {
    storeData.powerPoints = {};
    storeData.powerPointOrder = [];
    canvasData.powerPoints.forEach((pp: any) => {
      storeData.powerPoints[pp.id] = pp;
      storeData.powerPointOrder.push(pp.id);
    });
  }

  if (canvasData.viewBox) {
    storeData.viewBox = canvasData.viewBox;
  }

  if (canvasData.supabaseLayoutId) {
    storeData.supabaseLayoutId = canvasData.supabaseLayoutId;
  }

  return storeData;
};

// ============ MAIN COMPONENT ============

const LayoutMakerPageStore: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get('eventId');

  const [activeTool, setActiveTool] = useState<string>('select');
  const [brushSize, setBrushSize] = useState<number>(2);
  const [brushColor, setBrushColor] = useState<string>('#000000');
  const [eventInfo, setEventInfo] = useState<{ title: string; weddingDate?: string } | null>(null);

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      return loadProjectsFromStorage();
    } catch {
      const defaultA4 = getInitialA4Dimensions();
      return [{
        id: '1',
        name: 'Project 1',
        a4Dimensions: defaultA4,
      }];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACTIVE_PROJECT_KEY);
      if (stored) {
        const loadedProjects = loadProjectsFromStorage();
        if (loadedProjects.find(p => p.id === stored)) {
          return stored;
        }
      }
    } catch {}
    return '1';
  });

  const [newlyCreatedProjectId, setNewlyCreatedProjectId] = useState<string | null>(null);
  const [showElectricalDashboard, setShowElectricalDashboard] = useState(false);
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [recentlySavedLayoutIds, setRecentlySavedLayoutIds] = useState<string[]>([]);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [showElementLibrary, setShowElementLibrary] = useState(true);
  const [roundTableModalOpen, setRoundTableModalOpen] = useState(false);
  const [rectangularTableModalOpen, setRectangularTableModalOpen] = useState(false);
  const [squareTableModalOpen, setSquareTableModalOpen] = useState(false);
  const [ovalTableModalOpen, setOvalTableModalOpen] = useState(false);
  const [customElementModalOpen, setCustomElementModalOpen] = useState(false);
  const [editingCustomTemplate, setEditingCustomTemplate] = useState<CustomElementTemplate | null>(null);

  const { templates: customTemplates, fetchTemplates, saveTemplate, updateTemplate, deleteTemplate } = useCustomElements();
  const plannerId = 'current-user';

  useEffect(() => {
    fetchTemplates(plannerId);
  }, [fetchTemplates, plannerId]);

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
      alert(`Cannot delete "${template.name}" because it is used in ${result.usageCount} layout(s).`);
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

  const [workflowPositions, setWorkflowPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const stored = localStorage.getItem('workflow-positions');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  // Store access
  const initializeProject = useCanvasStore((s) => s.initializeProject);
  const storeSupabaseLayoutId = useCanvasStore((s) => s.supabaseLayoutId);
  const getCanvasData = useCanvasStore((s) => s.getCanvasData);
  const syncStatus = useCanvasStore((s) => s.syncStatus);
  const canvasAddWall = useCanvasStore((s) => s.addWall);
  const addElement = useCanvasStore((s) => s.addElement);
  const a4Bounds = useCanvasStore((s) => s.a4Bounds);
  const wallScale = useCanvasStore((s) => s.wallScale);

  const handleSelectCustomTemplate = useCallback((template: CustomElementTemplate) => {
    const id = uuidv4();
    addElement({
      id,
      type: `custom-${template.id}` as "rectangle",
      x: 5,
      y: 5,
      width: template.width,
      height: template.height,
      rotation: 0,
      customShape: template.svgPath,
      label: template.name,
    } as any);
  }, [addElement]);

  const gridCanvasRef = useRef<{
    addSpace: (width: number, height: number) => void;
    addTable: (type: string, size: string, seats: number, imageUrl: string, targetSpaceId?: string) => void;
    addWalls: (walls: Wall[], doors?: Door[]) => void;
    zoomToPoints: (points: { x: number; y: number }[]) => void;
    getPowerPoints: () => PowerPoint[];
    getZoomLevel: () => number;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    fitToCanvas: () => void;
  } | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Track if initial load is done
  const isInitializedRef = useRef(false);
  const currentProjectIdRef = useRef<string>(activeProjectId);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || {
    id: '1',
    name: 'Project 1',
    a4Dimensions: getInitialA4Dimensions(),
  };

  // Enable auto-sync to Supabase (background sync, doesn't affect switching)
  const autoSyncOptions = {
    enabled: true,
    projectName: activeProject.name,
    ...(activeProject.eventId ? { eventId: activeProject.eventId } : {}),
  };
  const { forceSave } = useAutoSync(autoSyncOptions);

  // Keep refs for save interval to avoid recreating it
  const getCanvasDataRef = useRef(getCanvasData);
  const storeSupabaseLayoutIdRef = useRef(storeSupabaseLayoutId);

  useEffect(() => {
    getCanvasDataRef.current = getCanvasData;
  }, [getCanvasData]);

  useEffect(() => {
    storeSupabaseLayoutIdRef.current = storeSupabaseLayoutId;
  }, [storeSupabaseLayoutId]);

  // Load event info and set eventId on projects when URL has eventId
  useEffect(() => {
    if (!eventIdFromUrl) {
      setEventInfo(null);
      return;
    }

    const loadEventData = async () => {
      try {
        const eventResult = await getEvent(eventIdFromUrl);
        if (eventResult.data) {
          setEventInfo({
            title: eventResult.data.title,
            weddingDate: eventResult.data.wedding_date,
          });

          // Update all projects to have this eventId
          setProjects(prev => prev.map(p => ({
            ...p,
            eventId: eventIdFromUrl,
          })));
        }
      } catch (err) {
        console.error('Failed to load event data:', err);
      }
    };

    loadEventData();
  }, [eventIdFromUrl]);

  // Save current canvas to localStorage periodically
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const saveInterval = setInterval(() => {
      const canvasData = getCanvasDataRef.current();
      // Add supabaseLayoutId to saved data
      const dataToSave = {
        ...canvasData,
        supabaseLayoutId: storeSupabaseLayoutIdRef.current,
      };
      saveCanvasToLocalStorage(currentProjectIdRef.current, dataToSave);
    }, 1000); // Save every second

    return () => clearInterval(saveInterval);
  }, []); // Empty deps - only run once, use refs for current values

  // Initialize on mount - load the active project's canvas data
  useEffect(() => {
    if (isInitializedRef.current) return;

    const a4 = activeProject.a4Dimensions || getInitialA4Dimensions();
    const bounds = {
      x: a4.a4X,
      y: a4.a4Y,
      width: a4.a4WidthPx,
      height: a4.a4HeightPx,
    };

    // Load canvas data from localStorage
    const savedCanvas = loadCanvasFromLocalStorage(activeProjectId);

    if (savedCanvas) {
      console.log('[Init] Loading canvas from localStorage for project:', activeProjectId);
      const storeData = canvasDataToStoreFormat(savedCanvas);
      initializeProject(activeProjectId, bounds, storeData);
    } else {
      console.log('[Init] No saved canvas, initializing empty project:', activeProjectId);
      initializeProject(activeProjectId, bounds);
    }

    isInitializedRef.current = true;
    currentProjectIdRef.current = activeProjectId;
  }, []); // Only run once on mount

  // Sync Supabase layout ID back to local project when it's assigned
  useEffect(() => {
    if (storeSupabaseLayoutId && storeSupabaseLayoutId !== activeProject.supabaseLayoutId) {
      setProjects(prev => {
        const updated = prev.map(p =>
          p.id === activeProjectId
            ? { ...p, supabaseLayoutId: storeSupabaseLayoutId }
            : p
        );
        saveProjectsToStorage(updated);
        return updated;
      });
    }
  }, [storeSupabaseLayoutId, activeProjectId, activeProject.supabaseLayoutId]);

  const handleWorkflowPositionsChange = useCallback((positions: Record<string, { x: number; y: number }>) => {
    setWorkflowPositions(positions);
    localStorage.setItem('workflow-positions', JSON.stringify(positions));
  }, []);

  const handleReorderProjects = useCallback((fromIndex: number, toIndex: number) => {
    setProjects(prev => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      if (removed) {
        updated.splice(toIndex, 0, removed);
      }
      saveProjectsToStorage(updated);
      return updated;
    });
  }, []);

  const handleOpenWorkflow = useCallback(() => setIsWorkflowOpen(true), []);
  const handleCloseWorkflow = useCallback(() => setIsWorkflowOpen(false), []);

  // PROJECT SWITCHING - The key function for project isolation
  const handleProjectSelect = useCallback((projectId: string) => {
    if (isWorkflowOpen) setIsWorkflowOpen(false);
    if (projectId === activeProjectId) return;

    console.log('[ProjectSwitch] Switching from', activeProjectId, 'to', projectId);

    // 1. SAVE current project's canvas to localStorage
    const currentCanvasData = getCanvasData();
    const dataToSave = {
      ...currentCanvasData,
      supabaseLayoutId: storeSupabaseLayoutId,
    };
    saveCanvasToLocalStorage(activeProjectId, dataToSave);
    console.log('[ProjectSwitch] Saved current project canvas');

    // 2. LOAD new project's canvas from localStorage
    const newProject = projects.find(p => p.id === projectId);
    if (!newProject) return;

    const a4 = newProject.a4Dimensions || getInitialA4Dimensions();
    const bounds = {
      x: a4.a4X,
      y: a4.a4Y,
      width: a4.a4WidthPx,
      height: a4.a4HeightPx,
    };

    const savedCanvas = loadCanvasFromLocalStorage(projectId);

    if (savedCanvas) {
      console.log('[ProjectSwitch] Loading canvas from localStorage:', {
        drawings: savedCanvas.drawings?.length || 0,
        shapes: savedCanvas.shapes?.length || 0,
      });
      const storeData = canvasDataToStoreFormat(savedCanvas);
      initializeProject(projectId, bounds, storeData);
    } else {
      console.log('[ProjectSwitch] No saved canvas, initializing empty');
      initializeProject(projectId, bounds);
    }

    // 3. Update active project
    currentProjectIdRef.current = projectId;
    setActiveProjectId(projectId);
    localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, projectId);

    // 4. Trigger background Supabase sync for the old project
    forceSave();
  }, [activeProjectId, isWorkflowOpen, projects, getCanvasData, storeSupabaseLayoutId, initializeProject, forceSave]);

  const handleProjectHighlight = useCallback((projectId: string) => {
    // This is used by workflow canvas - treat same as select
    handleProjectSelect(projectId);
  }, [handleProjectSelect]);

  const handleNewProject = useCallback(() => {
    // Save current project first
    const currentCanvasData = getCanvasData();
    const dataToSave = {
      ...currentCanvasData,
      supabaseLayoutId: storeSupabaseLayoutId,
    };
    saveCanvasToLocalStorage(activeProjectId, dataToSave);

    const nextProjectNumber = projects.length + 1;
    const defaultA4 = getInitialA4Dimensions();
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Project ${nextProjectNumber}`,
      a4Dimensions: defaultA4,
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);

    // Initialize empty canvas for new project
    const bounds = {
      x: defaultA4.a4X,
      y: defaultA4.a4Y,
      width: defaultA4.a4WidthPx,
      height: defaultA4.a4HeightPx,
    };
    initializeProject(newProject.id, bounds);

    currentProjectIdRef.current = newProject.id;
    setActiveProjectId(newProject.id);
    localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, newProject.id);
    setNewlyCreatedProjectId(newProject.id);
  }, [projects, activeProjectId, getCanvasData, storeSupabaseLayoutId, initializeProject]);

  const handleRenameProject = useCallback((projectId: string, newName: string) => {
    setProjects(prev => {
      const updated = prev.map(p =>
        p.id === projectId ? { ...p, name: newName } : p
      );
      saveProjectsToStorage(updated);
      return updated;
    });
    setNewlyCreatedProjectId(null);
  }, []);

  const handleDeleteProject = useCallback((projectId: string) => {
    if (projects.length <= 1) {
      alert('Cannot delete the last project.');
      return;
    }

    // Delete canvas data from localStorage
    deleteCanvasFromLocalStorage(projectId);

    if (projectId === activeProjectId) {
      const otherProject = projects.find(p => p.id !== projectId);
      if (otherProject) {
        handleProjectSelect(otherProject.id);
      }
    }

    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
  }, [projects, activeProjectId, handleProjectSelect]);

  const handleAddSpace = useCallback((widthMeters: number, heightMeters: number) => {
    gridCanvasRef.current?.addSpace(widthMeters, heightMeters);
  }, []);

  const handleAddTable = useCallback((type: string, size: string, seats: number, imageUrl: string, spaceId?: string) => {
    gridCanvasRef.current?.addTable(type, size, seats, imageUrl, spaceId);
  }, []);

  const handleAddWalls = useCallback((walls: Wall[], doors?: Door[]) => {
    gridCanvasRef.current?.addWalls(walls, doors);
  }, []);

  // Handler for opening config modal for elements
  const handleOpenElementModal = useCallback((elementType: ElementType) => {
    if (elementType === 'table-round') {
      setRoundTableModalOpen(true);
      setShowElementLibrary(false);
    } else if (elementType === 'table-rectangular') {
      setRectangularTableModalOpen(true);
      setShowElementLibrary(false);
    } else if (elementType === 'table-square') {
      setSquareTableModalOpen(true);
      setShowElementLibrary(false);
    } else if (elementType === 'table-oval') {
      setOvalTableModalOpen(true);
      setShowElementLibrary(false);
    }
  }, []);

  // Handler for adding elements from the Element Library
  const handleAddElementFromLibrary = useCallback((elementType: ElementType) => {
    console.log('[ElementLibrary] Adding element:', elementType);

    // For round tables, open the modal instead
    if (elementType === 'table-round') {
      setRoundTableModalOpen(true);
      setShowElementLibrary(false);
      return;
    }

    // For rectangular tables, open the modal instead
    if (elementType === 'table-rectangular') {
      setRectangularTableModalOpen(true);
      setShowElementLibrary(false);
      return;
    }

    // For square tables, open the modal instead
    if (elementType === 'table-square') {
      setSquareTableModalOpen(true);
      setShowElementLibrary(false);
      return;
    }

    // For oval tables, open the modal instead
    if (elementType === 'table-oval') {
      setOvalTableModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
  }, []);

  // Handler for opening config modal for rectangular tables
  const handleOpenRectangularTableModal = useCallback((elementType: ElementType) => {
    if (elementType === 'table-rectangular') {
      setRectangularTableModalOpen(true);
      setShowElementLibrary(false);
    }
  }, []);

  // Handler for opening config modal for square tables
  const handleOpenSquareTableModal = useCallback((elementType: ElementType) => {
    if (elementType === 'table-square') {
      setSquareTableModalOpen(true);
      setShowElementLibrary(false);
    }
  }, []);

  // Handler for round table modal submit
  const handleRoundTableSubmit = useCallback((data: { diameter: number; unit: 'cm' | 'm'; seats: number; quantity: number }) => {
    const { diameter, unit, seats, quantity } = data;

    const diameterInMeters = unit === 'cm' ? diameter / 100 : diameter;
    const PIXELS_PER_METER = 100;
    const tableSizePx = diameterInMeters * PIXELS_PER_METER;
    const spacingPx = 60;

    const itemsPerRow = Math.min(quantity, 4);
    const totalRows = Math.ceil(quantity / itemsPerRow);
    const totalWidth = (itemsPerRow * tableSizePx) + ((itemsPerRow - 1) * spacingPx);
    const totalHeight = (totalRows * tableSizePx) + ((totalRows - 1) * spacingPx);

    const centerX = a4Bounds.x + a4Bounds.width / 2;
    const centerY = a4Bounds.y + a4Bounds.height / 2;
    const startX = centerX - totalWidth / 2;
    const startY = centerY - totalHeight / 2;

    for (let i = 0; i < quantity; i++) {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const tableX = startX + col * (tableSizePx + spacingPx);
      const tableY = startY + row * (tableSizePx + spacingPx);

      const tableId = addElement({
        type: 'circle' as const,
        x: tableX,
        y: tableY,
        width: tableSizePx,
        height: tableSizePx,
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeWidth: 2,
        tableData: {
          type: 'table-round',
          size: `${diameterInMeters.toFixed(2)}m`,
          seats: seats,
          actualSizeMeters: diameterInMeters,
          chairIds: [],
        },
      });

      const chairIds: string[] = [];
      const chairSizePx = 0.45 * PIXELS_PER_METER;
      const chairRadius = (tableSizePx / 2) + 10;

      for (let j = 0; j < seats; j++) {
        const angle = (j / seats) * Math.PI * 2 - Math.PI / 2;
        const chairX = tableX + (tableSizePx / 2) + Math.cos(angle) * chairRadius - chairSizePx / 2;
        const chairY = tableY + (tableSizePx / 2) + Math.sin(angle) * chairRadius - chairSizePx / 2;

        const chairId = addElement({
          type: 'circle' as const,
          x: chairX,
          y: chairY,
          width: chairSizePx,
          height: chairSizePx,
          fill: '#FFFFFF',
          stroke: '#999999',
          strokeWidth: 1,
          chairData: {
            parentTableId: tableId,
            seatIndex: j,
            assignedGuestId: null,
            assignedGuestName: null,
            dietaryType: null,
          },
        });
        chairIds.push(chairId);
      }

      const updateElement = useCanvasStore.getState().updateElement;
      updateElement(tableId, {
        tableData: {
          type: 'table-round',
          size: `${diameterInMeters.toFixed(2)}m`,
          seats: seats,
          actualSizeMeters: diameterInMeters,
          chairIds: chairIds,
        },
      });
    }

    setRoundTableModalOpen(false);
    setActiveTool('select');
  }, [a4Bounds, addElement, setActiveTool]);

  // Handler for rectangular table modal submit
  const handleRectangularTableSubmit = useCallback((data: { width: number; height: number; unit: 'cm' | 'm'; seats: number; quantity: number }) => {
    const { width, height, unit, seats, quantity } = data;

    const widthInMeters = unit === 'cm' ? width / 100 : width;
    const heightInMeters = unit === 'cm' ? height / 100 : height;
    const PIXELS_PER_METER = 100;
    const tableWidthPx = widthInMeters * PIXELS_PER_METER;
    const tableHeightPx = heightInMeters * PIXELS_PER_METER;
    const spacingPx = 60;

    const itemsPerRow = Math.min(quantity, 4);
    const totalRows = Math.ceil(quantity / itemsPerRow);
    const totalContentWidth = (itemsPerRow * tableWidthPx) + ((itemsPerRow - 1) * spacingPx);
    const totalContentHeight = (totalRows * Math.max(tableWidthPx, tableHeightPx)) + ((totalRows - 1) * spacingPx);

    const centerX = a4Bounds.x + a4Bounds.width / 2;
    const centerY = a4Bounds.y + a4Bounds.height / 2;
    const startX = centerX - totalContentWidth / 2;
    const startY = centerY - totalContentHeight / 2;
    const maxItemSize = Math.max(tableWidthPx, tableHeightPx);

    for (let i = 0; i < quantity; i++) {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const tableX = startX + col * (tableWidthPx + spacingPx);
      const tableY = startY + row * (maxItemSize + spacingPx) + (maxItemSize - tableHeightPx) / 2;

      const tableId = addElement({
        type: 'rectangle' as const,
        x: tableX,
        y: tableY,
        width: tableWidthPx,
        height: tableHeightPx,
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeWidth: 2,
        tableData: {
          type: 'table-rectangular',
          size: `${widthInMeters.toFixed(2)}m × ${heightInMeters.toFixed(2)}m`,
          seats: seats,
          actualSizeMeters: widthInMeters,
          chairIds: [],
        },
      });

      const chairIds: string[] = [];
      const chairSizePx = 0.45 * PIXELS_PER_METER;
      const chairOffset = 12;

      const seatsPerSide = Math.floor(seats / 2);
      const extraOnTop = seats % 2;
      const topSeatsCount = seatsPerSide + extraOnTop;
      const bottomSeatsCount = seatsPerSide;

      for (let j = 0; j < seats; j++) {
        const isTop = j < topSeatsCount;
        const sideIndex = isTop ? j : j - topSeatsCount;
        const sidePos = seatsPerSide > 1 ? sideIndex / (seatsPerSide - 1) : 0.5;
        const tableHalfWidth = tableWidthPx / 2;
        const tableHalfHeight = tableHeightPx / 2;

        const chairX = seatsPerSide > 1
          ? tableX + sideIndex * (tableWidthPx - chairSizePx) / (seatsPerSide - 1)
          : tableX + tableHalfWidth - chairSizePx / 2;
        const chairY = isTop
          ? tableY - chairOffset - chairSizePx / 2
          : tableY + tableHeightPx + chairOffset - chairSizePx / 2;
        const rotation = isTop ? 0 : 180;

        const chairId = addElement({
          type: 'circle' as const,
          x: chairX,
          y: chairY,
          width: chairSizePx,
          height: chairSizePx,
          fill: '#FFFFFF',
          stroke: '#999999',
          strokeWidth: 1,
          chairData: {
            parentTableId: tableId,
            seatIndex: j,
            assignedGuestId: null,
            assignedGuestName: null,
            dietaryType: null,
          },
        });
        chairIds.push(chairId);
      }

      const updateElement = useCanvasStore.getState().updateElement;
      updateElement(tableId, {
        tableData: {
          type: 'table-rectangular',
          size: `${widthInMeters.toFixed(2)}m × ${heightInMeters.toFixed(2)}m`,
          seats: seats,
          actualSizeMeters: widthInMeters,
          chairIds: chairIds,
        },
      });
    }

    setRectangularTableModalOpen(false);
    setActiveTool('select');
  }, [a4Bounds, addElement, setActiveTool]);

  // Handler for square table modal submit
  const handleSquareTableSubmit = useCallback((data: { size: number; unit: 'cm' | 'm'; seats: number; quantity: number }) => {
    const { size, unit, seats, quantity } = data;

    const sizeInMeters = unit === 'cm' ? size / 100 : size;
    const PIXELS_PER_METER = 100;
    const tableSizePx = sizeInMeters * PIXELS_PER_METER;
    const spacingPx = 60;

    const itemsPerRow = Math.min(quantity, 4);
    const totalRows = Math.ceil(quantity / itemsPerRow);
    const totalContentWidth = (itemsPerRow * tableSizePx) + ((itemsPerRow - 1) * spacingPx);
    const totalContentHeight = (totalRows * tableSizePx) + ((totalRows - 1) * spacingPx);

    const centerX = a4Bounds.x + a4Bounds.width / 2;
    const centerY = a4Bounds.y + a4Bounds.height / 2;
    const startX = centerX - totalContentWidth / 2;
    const startY = centerY - totalContentHeight / 2;

    for (let i = 0; i < quantity; i++) {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const tableX = startX + col * (tableSizePx + spacingPx);
      const tableY = startY + row * (tableSizePx + spacingPx);

      const tableId = addElement({
        type: 'rectangle' as const,
        x: tableX,
        y: tableY,
        width: tableSizePx,
        height: tableSizePx,
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeWidth: 2,
        tableData: {
          type: 'table-square',
          size: `${sizeInMeters.toFixed(2)}m × ${sizeInMeters.toFixed(2)}m`,
          seats: seats,
          actualSizeMeters: sizeInMeters,
          chairIds: [],
        },
      });

      const chairIds: string[] = [];
      const chairSizePx = 0.45 * PIXELS_PER_METER;
      const chairOffset = 12;
      const tableHalfSize = tableSizePx / 2;
      const seatsPerSide = Math.floor(seats / 4);

      for (let j = 0; j < seats; j++) {
        const side = Math.floor(j / seatsPerSide);

        let chairX = 0;
        let chairY = 0;

        if (side === 0) {
          chairX = tableX + tableHalfSize - chairSizePx / 2;
          chairY = tableY - chairOffset - chairSizePx / 2;
        } else if (side === 1) {
          chairX = tableX + tableHalfSize - chairSizePx / 2;
          chairY = tableY + tableSizePx + chairOffset + chairSizePx / 2;
        } else if (side === 2) {
          chairX = tableX + tableSizePx + chairOffset + chairSizePx / 2;
          chairY = tableY + tableHalfSize - chairSizePx / 2;
        } else if (side === 3) {
          chairX = tableX - chairOffset - chairSizePx / 2;
          chairY = tableY + tableHalfSize - chairSizePx / 2;
        }

        const chairId = addElement({
          type: 'circle' as const,
          x: chairX,
          y: chairY,
          width: chairSizePx,
          height: chairSizePx,
          fill: '#FFFFFF',
          stroke: '#999999',
          strokeWidth: 1,
          chairData: {
            parentTableId: tableId,
            seatIndex: j,
            assignedGuestId: null,
            assignedGuestName: null,
            dietaryType: null,
          },
        });
        chairIds.push(chairId);
      }

      const updateElement = useCanvasStore.getState().updateElement;
      updateElement(tableId, {
        tableData: {
          type: 'table-square',
          size: `${sizeInMeters.toFixed(2)}m × ${sizeInMeters.toFixed(2)}m`,
          seats: seats,
          actualSizeMeters: sizeInMeters,
          chairIds: chairIds,
        },
      });
    }

    setSquareTableModalOpen(false);
    setActiveTool('select');
  }, [a4Bounds, addElement, setActiveTool]);

  const handleOvalTableSubmit = useCallback((data: { width: number; height: number; unit: 'cm' | 'm'; seats: number; quantity: number }) => {
    const { width, height, unit, seats, quantity } = data;

    const widthInMeters = unit === 'cm' ? width / 100 : width;
    const heightInMeters = unit === 'cm' ? height / 100 : height;
    const PIXELS_PER_METER = 100;
    const tableWidthPx = widthInMeters * PIXELS_PER_METER;
    const tableHeightPx = heightInMeters * PIXELS_PER_METER;
    const spacingPx = 60;

    const itemsPerRow = Math.min(quantity, 4);
    const totalRows = Math.ceil(quantity / itemsPerRow);
    const totalContentWidth = (itemsPerRow * tableWidthPx) + ((itemsPerRow - 1) * spacingPx);
    const totalContentHeight = (totalRows * Math.max(tableWidthPx, tableHeightPx)) + ((totalRows - 1) * spacingPx);

    const centerX = a4Bounds.x + a4Bounds.width / 2;
    const centerY = a4Bounds.y + a4Bounds.height / 2;
    const startX = centerX - totalContentWidth / 2;
    const startY = centerY - totalContentHeight / 2;

    for (let i = 0; i < quantity; i++) {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const tableX = startX + col * (tableWidthPx + spacingPx);
      const tableY = startY + row * (Math.max(tableWidthPx, tableHeightPx) + spacingPx);

      const tableId = addElement({
        type: 'rectangle' as const,
        x: tableX,
        y: tableY,
        width: tableWidthPx,
        height: tableHeightPx,
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeWidth: 2,
        tableData: {
          type: 'table-oval',
          size: `${widthInMeters.toFixed(2)}m × ${heightInMeters.toFixed(2)}m`,
          seats: seats,
          actualSizeMeters: widthInMeters,
          chairIds: [],
        },
      });

      const chairIds: string[] = [];
      const chairSizePx = 0.45 * PIXELS_PER_METER;
      const chairOffset = 12;

      for (let j = 0; j < seats; j++) {
        const angle = (j / seats) * Math.PI * 2 - Math.PI / 2;
        const tableRx = tableWidthPx / 2;
        const tableRy = tableHeightPx / 2;
        const ellipseRadius = Math.sqrt(
          Math.pow(tableRx * Math.cos(angle), 2) + Math.pow(tableRy * Math.sin(angle), 2)
        );
        const normalizedX = (tableRx * Math.cos(angle)) / ellipseRadius;
        const normalizedY = (tableRy * Math.sin(angle)) / ellipseRadius;
        const chairX = tableX + tableWidthPx / 2 + normalizedX * (ellipseRadius + chairOffset) - chairSizePx / 2;
        const chairY = tableY + tableHeightPx / 2 + normalizedY * (ellipseRadius + chairOffset) - chairSizePx / 2;

        const chairId = addElement({
          type: 'circle' as const,
          x: chairX,
          y: chairY,
          width: chairSizePx,
          height: chairSizePx,
          fill: '#FFFFFF',
          stroke: '#999999',
          strokeWidth: 1,
          chairData: {
            parentTableId: tableId,
            seatIndex: j,
            assignedGuestId: null,
            assignedGuestName: null,
            dietaryType: null,
          },
        });
        chairIds.push(chairId);
      }

      const updateElement = useCanvasStore.getState().updateElement;
      updateElement(tableId, {
        tableData: {
          type: 'table-oval',
          size: `${widthInMeters.toFixed(2)}m × ${heightInMeters.toFixed(2)}m`,
          seats: seats,
          actualSizeMeters: widthInMeters,
          chairIds: chairIds,
        },
      });
    }

    setOvalTableModalOpen(false);
    setActiveTool('select');
  }, [a4Bounds, addElement, setActiveTool]);

  // Get space options from store
  const spaceOptions = useMemo(() => {
    const canvasData = getCanvasData();
    const shapes = canvasData.shapes || [];
    return shapes
      .filter((shape: any) =>
        shape?.type === 'rectangle' &&
        typeof shape.spaceMetersWidth === 'number' &&
        shape.spaceMetersWidth > 0 &&
        typeof shape.spaceMetersHeight === 'number' &&
        shape.spaceMetersHeight > 0
      )
      .map((shape: any, index: number) => ({
        id: shape.id,
        label: `Space ${index + 1}`,
        widthMeters: shape.spaceMetersWidth,
        heightMeters: shape.spaceMetersHeight,
        pixelsPerMeter: shape.pixelsPerMeter,
      }));
  }, [getCanvasData]);

  // Build projects with canvas data for workflow preview
  // Only recalculate when workflow is open to avoid performance issues during canvas editing
  const projectsWithCanvasData = useMemo(() => {
    const emptyCanvasData = {
      drawings: [],
      shapes: [],
      textElements: [],
      walls: [],
      doors: [],
      powerPoints: [],
      viewBox: { x: 0, y: 0, width: 800, height: 1132 },
    };

    // Only load canvas data when workflow is open (for performance)
    if (!isWorkflowOpen) {
      return projects.map(p => ({ ...p, canvasData: emptyCanvasData }));
    }

    return projects.map(p => {
      // For the active project, get current store data
      if (p.id === activeProjectId) {
        // Save current data to localStorage first so we have the latest
        const currentData = getCanvasData();
        return {
          ...p,
          canvasData: currentData || emptyCanvasData,
        };
      }

      // For other projects, load from localStorage
      const savedCanvas = loadCanvasFromLocalStorage(p.id);
      if (savedCanvas) {
        return {
          ...p,
          canvasData: {
            drawings: savedCanvas.drawings || [],
            shapes: savedCanvas.shapes || [],
            textElements: savedCanvas.textElements || [],
            walls: savedCanvas.walls || [],
            doors: savedCanvas.doors || [],
            powerPoints: savedCanvas.powerPoints || [],
            viewBox: savedCanvas.viewBox || { x: 0, y: 0, width: 800, height: 1132 },
          },
        };
      }

      return { ...p, canvasData: emptyCanvasData };
    });
  }, [projects, activeProjectId, isWorkflowOpen, getCanvasData]);

  const handleZoomToPoints = useCallback((points: { x: number; y: number }[]) => {
    gridCanvasRef.current?.zoomToPoints(points);
    setShowElectricalDashboard(false);
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    gridCanvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    gridCanvasRef.current?.zoomOut();
  }, []);

  const handleResetZoom = useCallback(() => {
    gridCanvasRef.current?.resetZoom();
  }, []);

  const handleFitToCanvas = useCallback(() => {
    gridCanvasRef.current?.fitToCanvas();
  }, []);

  // Update zoom level from canvas
  useEffect(() => {
    const updateZoomLevel = () => {
      if (gridCanvasRef.current?.getZoomLevel) {
        const level = gridCanvasRef.current.getZoomLevel();
        setZoomLevel(level);
      }
    };

    // Update on initial render
    updateZoomLevel();

    // Update on wheel events (zoom changes)
    const handleWheel = () => {
      requestAnimationFrame(updateZoomLevel);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeProjectId]);

  const currentPowerPoints = useMemo(() => {
    return gridCanvasRef.current?.getPowerPoints() || [];
  }, [activeProjectId]);

  const handleLayoutsAssociated = useCallback((eventId: string) => {
    setProjects(prev => {
      const updated = prev.map(p =>
        recentlySavedLayoutIds.includes(p.supabaseLayoutId || '')
          ? { ...p, eventId }
          : p
      );
      saveProjectsToStorage(updated);
      return updated;
    });
    setShowAssociateModal(false);
    setRecentlySavedLayoutIds([]);
  }, [recentlySavedLayoutIds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const currentIndex = projects.findIndex(p => p.id === activeProjectId);

        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          const prevProject = projects[currentIndex - 1];
          if (prevProject) handleProjectSelect(prevProject.id);
        } else if (e.key === 'ArrowRight' && currentIndex < projects.length - 1) {
          e.preventDefault();
          const nextProject = projects[currentIndex + 1];
          if (nextProject) handleProjectSelect(nextProject.id);
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleNewProject();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projects, activeProjectId, handleProjectSelect, handleNewProject]);

  useEffect(() => {
    saveProjectsToStorage(projects);
  }, [projects]);

  // Save canvas on unmount - use refs to get current values
  useEffect(() => {
    return () => {
      const canvasData = getCanvasDataRef.current();
      const dataToSave = {
        ...canvasData,
        supabaseLayoutId: storeSupabaseLayoutIdRef.current,
      };
      saveCanvasToLocalStorage(currentProjectIdRef.current, dataToSave);
    };
  }, []); // Empty deps - cleanup only runs on unmount

  if (!projects || projects.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
        <h2>Error: No projects available</h2>
        <button
          onClick={() => {
            const defaultProject: Project = { id: '1', name: 'Project 1', a4Dimensions: getInitialA4Dimensions() };
            setProjects([defaultProject]);
            setActiveProjectId('1');
          }}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0f172a', color: 'white', cursor: 'pointer' }}
        >
          Create Default Project
        </button>
      </div>
    );
  }

  const electricalProjectId = activeProject?.supabaseLayoutId || 'demo-electrical-project';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
      <InfiniteGridBackground />

      {!isWorkflowOpen && (
        <ErrorBoundary>
          <GridCanvasStore
            ref={gridCanvasRef}
            activeTool={activeTool}
            onToolChange={setActiveTool}
            projectId={activeProjectId}
            a4Dimensions={activeProject.a4Dimensions || getInitialA4Dimensions()}
            brushSize={brushSize}
            brushColor={brushColor}
            {...(activeProject.eventId ? { eventId: activeProject.eventId } : eventIdFromUrl ? { eventId: eventIdFromUrl } : {})}
          />
        </ErrorBoundary>
      )}

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 10000,
        isolation: 'isolate',
      }}>
        <HeaderBar
          onSaveCurrentLayout={forceSave}
          onSaveAllLayouts={forceSave}
          isSaving={syncStatus === 'syncing'}
          projectCount={projects.length}
          {...(eventInfo !== null ? { eventInfo } : {})}
        />

        {/* Sync Status Indicator */}
        <div style={{ position: 'fixed', top: '12px', right: '200px', pointerEvents: 'auto', zIndex: 10001 }}>
          <SyncStatusIndicator />
        </div>

        {!isWorkflowOpen && (
          <>
            <Toolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              onAddSpace={handleAddSpace}
              onAddTable={handleAddTable}
              onAddWalls={handleAddWalls}
              brushSize={brushSize}
              brushColor={brushColor}
              onBrushSizeChange={setBrushSize}
              onBrushColorChange={setBrushColor}
              availableSpaces={spaceOptions}
            />

            {/* Element Library Toggle Button - Positioned above toolbar */}
            <button
              onClick={() => setShowElementLibrary(!showElementLibrary)}
              style={{
                position: 'fixed',
                left: '20px',
                top: 'calc(50% - 215px)',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: showElementLibrary ? '2px solid #3b82f6' : '1px solid #e0e0e0',
                background: showElementLibrary ? '#3b82f6' : 'white',
                color: showElementLibrary ? 'white' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: showElementLibrary
                  ? '0 4px 12px rgba(59, 130, 246, 0.4)'
                  : '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10001,
                transition: 'all 0.2s ease',
                pointerEvents: 'auto',
              }}
              title={showElementLibrary ? 'Hide Elements' : 'Show Elements'}
              onMouseEnter={(e) => {
                if (!showElementLibrary) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }
              }}
              onMouseLeave={(e) => {
                if (!showElementLibrary) {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </button>

            {/* Element Library Sidebar */}
            {showElementLibrary && (
              <>
                {/* Backdrop */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowElementLibrary(false);
                  }}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.02)',
                    zIndex: 10000,
                    pointerEvents: 'auto',
                  }}
                />

                {/* Sidebar Panel */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'fixed',
                    left: '92px',
                    top: 'calc(50% - 215px)',
                    width: '300px',
                    maxHeight: '520px',
                    background: '#ffffff',
                    borderRadius: '24px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                    zIndex: 10002,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    pointerEvents: 'auto',
                    border: '1px solid rgba(224,224,224,0.85)',
                  }}>
                  {/* Header */}
                  <div style={{
                    padding: '18px 20px 14px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#fafafa',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                          <rect x="3" y="3" width="7" height="7" rx="1.5" />
                          <rect x="14" y="3" width="7" height="7" rx="1.5" />
                          <rect x="3" y="14" width="7" height="7" rx="1.5" />
                          <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        </svg>
                      </div>
                      <div>
                        <h3 style={{
                          margin: 0,
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#0f172a',
                          letterSpacing: '-0.01em',
                        }}>Elements</h3>
                        <p style={{
                          margin: '1px 0 0',
                          fontSize: '12px',
                          color: '#64748b',
                        }}>Drag or click to add</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowElementLibrary(false)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.color = '#64748b';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#94a3b8';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Element Library */}
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <ElementLibrary
                      onSelectElement={handleAddElementFromLibrary}
                      onOpenConfigModal={handleOpenElementModal}
                      onOpenElementMaker={handleOpenElementMaker}
                      onSelectCustomTemplate={handleSelectCustomTemplate}
                      onEditCustomTemplate={handleEditCustomTemplate}
                      onDeleteCustomTemplate={handleDeleteCustomTemplate}
                      customTemplates={customTemplates}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <ProjectTabs
          projects={projectsWithCanvasData}
          activeProjectId={activeProjectId}
          onProjectSelect={handleProjectSelect}
          onNewProject={handleNewProject}
          onDeleteProject={handleDeleteProject}
          onRenameProject={handleRenameProject}
          newlyCreatedProjectId={newlyCreatedProjectId}
          onOpenWorkflow={handleOpenWorkflow}
          isWorkflowOpen={isWorkflowOpen}
        />
      </div>

      <AssistantChat />

      {/* Zoom Controls - only show when not in workflow mode */}
      {!isWorkflowOpen && (
        <ZoomControls
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleResetZoom}
          onFitToCanvas={handleFitToCanvas}
        />
      )}

      <AssociateProjectModal
        isOpen={showAssociateModal}
        onClose={() => { setShowAssociateModal(false); setRecentlySavedLayoutIds([]); }}
        layoutIds={recentlySavedLayoutIds}
        onAssociated={handleLayoutsAssociated}
      />

      <RoundTableModal
        isOpen={roundTableModalOpen}
        onClose={() => setRoundTableModalOpen(false)}
        onSubmit={handleRoundTableSubmit}
      />

      <RectangularTableModal
        isOpen={rectangularTableModalOpen}
        onClose={() => setRectangularTableModalOpen(false)}
        onSubmit={handleRectangularTableSubmit}
      />

      <SquareTableModal
        isOpen={squareTableModalOpen}
        onClose={() => setSquareTableModalOpen(false)}
        onSubmit={handleSquareTableSubmit}
      />

      <OvalTableModal
        isOpen={ovalTableModalOpen}
        onClose={() => setOvalTableModalOpen(false)}
        onSubmit={handleOvalTableSubmit}
      />

      {showElectricalDashboard && (
        <ElectricalDashboard
          electricalProjectId={electricalProjectId}
          powerPoints={currentPowerPoints}
          onZoomToPoints={handleZoomToPoints}
          onClose={() => setShowElectricalDashboard(false)}
        />
      )}

      {!showElectricalDashboard && !isWorkflowOpen && currentPowerPoints.length > 0 && (
        <button
          onClick={() => setShowElectricalDashboard(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 15000,
          }}
        >
          <span style={{ fontSize: '16px' }}>⚡</span>
          Electrical Panel
        </button>
      )}

      {isWorkflowOpen && (
        <WorkflowCanvas
          projects={projectsWithCanvasData}
          onProjectSelect={handleProjectSelect}
          onHighlight={handleProjectHighlight}
          onReorder={handleReorderProjects}
          activeProjectId={activeProjectId}
          positions={workflowPositions}
          onPositionsChange={handleWorkflowPositionsChange}
        />
      )}
    </div>
  );
};

export default LayoutMakerPageStore;
