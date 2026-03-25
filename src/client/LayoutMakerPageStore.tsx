/**
 * LayoutMakerPage - Store-based Version
 *
 * ARCHITECTURE:
 * - Each project's canvas data is stored in localStorage (key: layout-maker-canvas-{projectId})
 * - Switching projects is SYNCHRONOUS - save current, load new from localStorage
 * - Supabase sync happens in background (doesn't affect project switching)
 * - This ensures each project tab always shows its own canvas data
 */
console.log('[DEBUG] LayoutMakerPageStore module loaded');

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
import ExportButton from './components/ExportButton';
import { BuildGuideButton } from '../layout-maker/components/BuildGuideModal/BuildGuideButton';
import A4Canvas, { type A4Dimensions, getInitialA4Dimensions } from './components/A4Canvas';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import ZoomControls from './components/ZoomControls';
import { useCanvasStore } from '../layout-maker/store/canvasStore';
import { CustomUploadModal } from './components/CustomUploadModal';
import { CustomBackgroundInfoChip } from './components/CustomBackgroundInfoChip';
import { SeatingConfigModal } from './components/SeatingConfigModal';
import { CeremonySeatingModal } from './components/CeremonySeatingModal';
import { DanceFloorConfigModal } from './components/DanceFloorConfigModal';
import type { DanceFloorData } from './components/DanceFloorConfigModal';
import { StageConfigModal } from './components/StageConfigModal';
import type { StageData } from './components/StageConfigModal';
import { AltarConfigModal } from './components/AltarConfigModal';
import type { AltarData } from './components/AltarConfigModal';
import { PathwayConfigModal } from './components/PathwayConfigModal';
import type { PathwayData } from './components/PathwayConfigModal';
import { AVElementModal } from './components/AVElementModal';
import type { AVData } from './components/AVElementModal';
import { BarConfigModal } from './components/BarConfigModal';
import type { BarData } from './components/BarConfigModal';
import { CocktailConfigModal } from './components/CocktailConfigModal';
import type { CocktailData } from './components/CocktailConfigModal';
import { useAutoSync } from '../layout-maker/hooks/useAutoSync';
import { ElementLibrary } from '../layout-maker/components/Sidebar/ElementLibrary';
import { ElementPlacementModal } from '../layout-maker/components/Sidebar/ElementPlacementModal';
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
import type { Connection, WorkflowNote } from './components/WorkflowCanvas';
import type { WorkflowTask } from './components/TaskCard';
import {
  loadWorkflowData,
  saveWorkflowData,
  upsertWorkflowNote,
  updateWorkflowNoteFields,
  insertWorkflowConnection,
  deleteWorkflowConnectionPair,
  deleteWorkflowNote,
} from './api/workflowApi';
import { browserSupabaseClient } from './browserSupabaseClient';
import { listLayoutsForProject, isLayoutFileData } from './api/layoutsApi';
import { ELEMENT_DEFAULTS, getElementDefault } from '../layout-maker/constants';
import { generateChairPositions } from '../layout-maker/utils/chairGeneration';
import { v4 as uuidv4 } from 'uuid';
import { NewLayoutModal } from './components/layout/NewLayoutModal';
import type { LayoutFlow } from './components/layout/NewLayoutModal';

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

const STORAGE_KEY_BASE = 'layout-maker-projects-v2';
const STORAGE_ACTIVE_PROJECT_KEY_BASE = 'layout-maker-active-project-id';
const CANVAS_STORAGE_PREFIX = 'layout-maker-canvas-';

// When the URL has an eventId, scope storage to that event so each event
// has its own independent set of projects and active-project selection.
const getEventIdFromUrl = (): string | null =>
  new URLSearchParams(window.location.search).get('eventId');

const getStorageKey = (eventId?: string | null) =>
  eventId ? `${STORAGE_KEY_BASE}-${eventId}` : STORAGE_KEY_BASE;

const getActiveProjectStorageKey = (eventId?: string | null) =>
  eventId ? `${STORAGE_ACTIVE_PROJECT_KEY_BASE}-${eventId}` : STORAGE_ACTIVE_PROJECT_KEY_BASE;

// ============ LOCAL STORAGE HELPERS ============

const getCanvasStorageKey = (projectId: string) => `${CANVAS_STORAGE_PREFIX}${projectId}`;
// Separate key for large background images so they don't blow up the main canvas JSON
const getBgImageStorageKey = (projectId: string) => `${CANVAS_STORAGE_PREFIX}${projectId}__bgimage`;

const saveCanvasToLocalStorage = (projectId: string, canvasData: any) => {
  try {
    // Strip imageBase64 from satellite/custom background before saving the main JSON —
    // a single AI-enhanced satellite image can be 1-2 MB as base64, which quickly
    // exhausts the 5 MB localStorage quota and causes silent save failures.
    const satellite = canvasData.satelliteBackground;
    const custom = canvasData.customBackground;

    // Detect destructive saves: saving WITHOUT background to a key that HAS one
    if (!satellite && !custom) {
      const existingRaw = localStorage.getItem(getCanvasStorageKey(projectId));
      if (existingRaw) {
        try {
          const existing = JSON.parse(existingRaw);
          if (existing.satelliteBackground || existing.customBackground) {
            console.error('[Storage:SAVE DESTRUCTIVE] Writing null background over existing background! Stack:');
            console.trace();
          }
        } catch {}
      }
    }
    console.log('[Storage:SAVE] projectId:', projectId, 'hasSatellite:', !!satellite, 'imageBase64Len:', satellite?.imageBase64?.length ?? 0, 'hasCustom:', !!custom);

    const strippedData = {
      ...canvasData,
      satelliteBackground: satellite
        ? { ...satellite, imageBase64: '__bg__' }
        : null,
      customBackground: custom
        ? { ...custom, imageBase64: '__bg__' }
        : null,
    };

    // Store the actual image(s) in a dedicated key (raw base64, no JSON overhead)
    const bgPayload: { satellite?: string; custom?: string } = {};
    if (satellite?.imageBase64) bgPayload.satellite = satellite.imageBase64;
    if (custom?.imageBase64) bgPayload.custom = custom.imageBase64;
    const bgKey = getBgImageStorageKey(projectId);
    if (bgPayload.satellite || bgPayload.custom) {
      try {
        localStorage.setItem(bgKey, JSON.stringify(bgPayload));
        console.log('[Storage:SAVE] bg image key saved, satelliteLen:', bgPayload.satellite?.length ?? 0);
      } catch (e) {
        // Image too large even on its own — skip image persistence, keep metadata
        console.error('[Storage:SAVE] bg image key FAILED (quota?):', e);
        localStorage.removeItem(bgKey);
      }
    } else {
      localStorage.removeItem(bgKey);
      console.log('[Storage:SAVE] no image to save — bg key cleared');
    }

    localStorage.setItem(getCanvasStorageKey(projectId), JSON.stringify(strippedData));
    console.log('[Storage:SAVE] main canvas key saved, satelliteBackground in stripped:', !!strippedData.satelliteBackground);
  } catch (error) {
    console.error('[Storage] Failed to save canvas data:', error);
  }
};

const loadCanvasFromLocalStorage = (projectId: string): any | null => {
  try {
    const stored = localStorage.getItem(getCanvasStorageKey(projectId));
    console.log('[Storage:LOAD] projectId:', projectId, 'found main key:', !!stored);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    console.log('[Storage:LOAD] parsed satelliteBackground:', !!parsed.satelliteBackground, 'imageBase64:', parsed.satelliteBackground?.imageBase64?.slice(0, 20));

    // Restore imageBase64 from the dedicated image key
    try {
      const bgRaw = localStorage.getItem(getBgImageStorageKey(projectId));
      console.log('[Storage:LOAD] bg image key found:', !!bgRaw, 'len:', bgRaw?.length ?? 0);
      if (bgRaw) {
        const bgPayload = JSON.parse(bgRaw);
        if (parsed.satelliteBackground && bgPayload.satellite) {
          parsed.satelliteBackground = { ...parsed.satelliteBackground, imageBase64: bgPayload.satellite };
          console.log('[Storage:LOAD] satellite image restored, len:', bgPayload.satellite?.length ?? 0);
        }
        if (parsed.customBackground && bgPayload.custom) {
          parsed.customBackground = { ...parsed.customBackground, imageBase64: bgPayload.custom };
          console.log('[Storage:LOAD] custom image restored, len:', bgPayload.custom?.length ?? 0);
        }
      }
    } catch (e) {
      console.error('[Storage:LOAD] failed to restore bg image:', e);
    }

    // Final fallback: check the dedicated bg key (written directly by the store action,
    // immune to any canvas-save overwrite). This rescues backgrounds that were lost
    // when initializeProject / handleProjectSelect saved the canvas without bg data.
    if (!parsed.satelliteBackground && !parsed.customBackground) {
      try {
        const dedicatedRaw = localStorage.getItem(`layout-maker-bg-${projectId}`);
        if (dedicatedRaw) {
          const dedicated = JSON.parse(dedicatedRaw) as { type: 'satellite' | 'custom'; data: any };
          if (dedicated.type === 'satellite' && dedicated.data) {
            parsed.satelliteBackground = dedicated.data;
            console.log('[Storage:LOAD] satellite restored from dedicated bg key');
          } else if (dedicated.type === 'custom' && dedicated.data) {
            parsed.customBackground = dedicated.data;
            console.log('[Storage:LOAD] custom bg restored from dedicated bg key');
          }
        }
      } catch (e) {
        console.warn('[Storage:LOAD] could not read dedicated bg key:', e);
      }
    }

    return parsed;
  } catch (error) {
    console.error('[Storage] Failed to load canvas data:', error);
  }
  return null;
};

const deleteCanvasFromLocalStorage = (projectId: string) => {
  try {
    localStorage.removeItem(getCanvasStorageKey(projectId));
    localStorage.removeItem(getBgImageStorageKey(projectId));
    localStorage.removeItem(`layout-maker-bg-${projectId}`);
  } catch (error) {
    console.error('[Storage] Failed to delete canvas data:', error);
  }
};

const loadProjectsFromStorage = (eventId?: string | null): Project[] => {
  try {
    const stored = localStorage.getItem(getStorageKey(eventId));
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
      id: eventId ? `${eventId}-1` : '1',
      name: 'Project 1',
      a4Dimensions: defaultA4Dimensions,
    },
  ];
};

const saveProjectsToStorage = (projects: Project[], eventId?: string | null) => {
  try {
    localStorage.setItem(getStorageKey(eventId), JSON.stringify(projects));
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

  if (canvasData.wallScale) {
    storeData.wallScale = canvasData.wallScale;
  }

  if (canvasData.satelliteBackground) {
    storeData.satelliteBackground = canvasData.satelliteBackground;
  }

  if (canvasData.customBackground) {
    storeData.customBackground = canvasData.customBackground;
  }

  if (canvasData.notes && Array.isArray(canvasData.notes)) {
    storeData.notes = canvasData.notes;
  }

  return storeData;
};

// ============ MAIN COMPONENT ============

const LayoutMakerPageStore: React.FC = () => {
  console.log('[DEBUG] LayoutMakerPageStore render/init');
  const [searchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get('eventId');

  const [activeTool, setActiveTool] = useState<string>('select');
  const [brushSize, setBrushSize] = useState<number>(2);
  const [brushColor, setBrushColor] = useState<string>('#000000');
  const [eventInfo, setEventInfo] = useState<{ title: string; weddingDate?: string } | null>(null);

  const [projects, setProjects] = useState<Project[]>(() => {
    const eventId = getEventIdFromUrl();
    try {
      return loadProjectsFromStorage(eventId);
    } catch {
      const defaultA4 = getInitialA4Dimensions();
      return [{
        id: eventId ? `${eventId}-1` : '1',
        name: 'Project 1',
        a4Dimensions: defaultA4,
      }];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const eventId = getEventIdFromUrl();
    try {
      const stored = localStorage.getItem(getActiveProjectStorageKey(eventId));
      if (stored) {
        const loadedProjects = loadProjectsFromStorage(eventId);
        if (loadedProjects.find(p => p.id === stored)) {
          return stored;
        }
      }
    } catch {}
    return eventId ? `${eventId}-1` : '1';
  });

  const [newlyCreatedProjectId, setNewlyCreatedProjectId] = useState<string | null>(null);
  const [showElectricalDashboard, setShowElectricalDashboard] = useState(false);
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [recentlySavedLayoutIds, setRecentlySavedLayoutIds] = useState<string[]>([]);
  // Single Supabase row ID for the entire event's layout file (all tabs in one row)
  const [eventLayoutId, setEventLayoutId] = useState<string | undefined>(undefined);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [showElementLibrary, setShowElementLibrary] = useState(false);
  const [roundTableModalOpen, setRoundTableModalOpen] = useState(false);
  const [rectangularTableModalOpen, setRectangularTableModalOpen] = useState(false);
  const [squareTableModalOpen, setSquareTableModalOpen] = useState(false);
  const [ovalTableModalOpen, setOvalTableModalOpen] = useState(false);
  const [customElementModalOpen, setCustomElementModalOpen] = useState(false);
  const [customUploadOpen, setCustomUploadOpen] = useState(false);
  const [newLayoutModalOpen, setNewLayoutModalOpen] = useState(false);
  const [wallMakerTrigger, setWallMakerTrigger] = useState(0);
  const [editingCustomTemplate, setEditingCustomTemplate] = useState<CustomElementTemplate | null>(null);
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [placementElementType, setPlacementElementType] = useState<ElementType>('chair');
  const [seatingModalOpen, setSeatingModalOpen] = useState(false);
  const [seatingModalType, setSeatingModalType] = useState<ElementType>('seat-standard');
  const [seatingEditingShapeId, setSeatingEditingShapeId] = useState<string | null>(null);
  const [ceremonyModalOpen, setCeremonyModalOpen] = useState(false);
  const [danceFloorModalOpen, setDanceFloorModalOpen] = useState(false);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageEditShapeId, setStageEditShapeId] = useState<string | null>(null);
  const [altarModalOpen, setAltarModalOpen] = useState(false);
  const [altarEditShapeId, setAltarEditShapeId] = useState<string | null>(null);
  const [pathwayModalOpen, setPathwayModalOpen] = useState(false);
  const [pathwayEditShapeId, setPathwayEditShapeId] = useState<string | null>(null);
  const [avModalOpen, setAvModalOpen] = useState(false);
  const [avModalType, setAvModalType] = useState<string>('av-mixing-desk');
  const [avEditShapeId, setAvEditShapeId] = useState<string | null>(null);
  const [barModalOpen, setBarModalOpen] = useState(false);
  const [barEditShapeId, setBarEditShapeId] = useState<string | null>(null);
  const [cocktailModalOpen, setCocktailModalOpen] = useState(false);
  const [cocktailEditShapeId, setCocktailEditShapeId] = useState<string | null>(null);

  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('layout-maker-hidden-categories') || '[]') as string[];
    } catch { return []; }
  });

  const handleToggleCategoryVisibility = useCallback((category: string) => {
    setHiddenCategories((prev) => {
      const next = prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category];
      localStorage.setItem('layout-maker-hidden-categories', JSON.stringify(next));
      return next;
    });
  }, []);
  const [placementElementLabel, setPlacementElementLabel] = useState('Chair');
  const [placementElementWidth, setPlacementElementWidth] = useState(0.45);
  const [placementElementHeight, setPlacementElementHeight] = useState(0.45);

  const [viewMode, setViewMode] = useState<boolean>(() => {
    const param = searchParams.get('viewMode');
    return param === 'true';
  });

  const { templates: customTemplates, fetchTemplates, saveTemplate, updateTemplate, deleteTemplate } = useCustomElements();
  const plannerId = 'current-user';

  useEffect(() => {
    fetchTemplates(plannerId);
  }, [fetchTemplates, plannerId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setViewMode(prev => !prev);
        }
      }
      if (e.key === 'Escape' && viewMode) {
        setViewMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

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

  // Store access
  const initializeProject = useCanvasStore((s) => s.initializeProject);
  const storeSupabaseLayoutId = useCanvasStore((s) => s.supabaseLayoutId);
  const getCanvasData = useCanvasStore((s) => s.getCanvasData);
  const syncStatus = useCanvasStore((s) => s.syncStatus);
  const canvasAddWall = useCanvasStore((s) => s.addWall);
  const addElement = useCanvasStore((s) => s.addElement);
  const a4Bounds = useCanvasStore((s) => s.a4Bounds);
  const wallScale = useCanvasStore((s) => s.wallScale);
  const customBackground = useCanvasStore((s) => s.customBackground);
  const clearCustomBackground = useCanvasStore((s) => s.clearCustomBackground);

  // Get the effective pixels-per-meter from the current space, falling back to
  // satellite/custom background calibrated scale, then wallScale, then 100.
  const getEffectivePPM = useCallback((): number => {
    const state = useCanvasStore.getState();
    const allElements = state.elementOrder
      .map((id) => state.elements[id])
      .filter(Boolean);
    for (let i = allElements.length - 1; i >= 0; i--) {
      const el = allElements[i];
      if (
        el &&
        el.type === 'rectangle' &&
        typeof el.spaceMetersWidth === 'number' && el.spaceMetersWidth > 0 &&
        typeof el.pixelsPerMeter === 'number' && el.pixelsPerMeter > 0
      ) {
        return el.pixelsPerMeter;
      }
    }
    // Calibrated backgrounds take precedence over wall scale
    if (state.satelliteBackground?.pixelsPerMeter) return state.satelliteBackground.pixelsPerMeter;
    if (state.customBackground?.pixelsPerMeter) return state.customBackground.pixelsPerMeter;
    return state.wallScale?.pxPerMeter || 100;
  }, []);

  // Add custom shape directly to canvas without saving to library
  const handleAddCustomToCanvas = useCallback((templateData: Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt' | 'updatedAt'>) => {
    const PIXELS_PER_METER = getEffectivePPM();

    // Generate a unique ID for this unsaved custom shape
    const tempTemplateId = uuidv4();
    const elementId = uuidv4();

    // Convert dimensions from meters to pixels
    const widthPx = templateData.width * PIXELS_PER_METER;
    const heightPx = templateData.height * PIXELS_PER_METER;

    // Calculate center position of the canvas
    const centerX = a4Bounds
      ? a4Bounds.x + (a4Bounds.width / 2) - (widthPx / 2)
      : 200;
    const centerY = a4Bounds
      ? a4Bounds.y + (a4Bounds.height / 2) - (heightPx / 2)
      : 200;

    // Store original path in meters + scale factor for proper rendering
    addElement({
      id: elementId,
      type: `custom-${tempTemplateId}` as "rectangle",
      x: centerX,
      y: centerY,
      width: widthPx,
      height: heightPx,
      rotation: 0,
      customShape: templateData.svgPath,
      customShapeScale: PIXELS_PER_METER,
      label: templateData.name,
      fill: '#ffffff',
      stroke: '#374151',
      strokeWidth: 1.5,
    } as any);

    setCustomElementModalOpen(false);
    setEditingCustomTemplate(null);
  }, [addElement, a4Bounds]);

  const handleOpenPlacementModal = useCallback((type: ElementType) => {
    // Route ceremony-block to CeremonySeatingModal
    if (type === 'ceremony-block') {
      setCeremonyModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    // Route individual seat types to SeatingConfigModal
    const seatTypes: ElementType[] = [
      'seat-standard', 'seat-armchair', 'seat-chaise',
      'seat-sofa', 'seat-sofa-2', 'seat-sofa-3',
      'seat-bench', 'seat-barstool', 'seat-throne',
    ];
    if (seatTypes.includes(type)) {
      setSeatingModalType(type);
      setSeatingModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    // Route AV types to AVElementModal
    const avTypes = [
      'av-mixing-desk', 'av-speaker', 'av-subwoofer', 'av-truss', 'av-moving-head',
      'av-led-wall', 'av-screen', 'av-projector', 'av-light-console', 'av-preset-full-stage',
    ];
    if (avTypes.includes(type as string)) {
      if (type === 'av-preset-full-stage') {
        handleAddElementFromLibrary(type);
        return;
      }
      setAvModalType(type as string);
      setAvEditShapeId(null);
      setAvModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    // Bar and cocktail
    if (type === 'bar') {
      setBarEditShapeId(null);
      setBarModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    if (type === 'cocktail') {
      setCocktailEditShapeId(null);
      setCocktailModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    // Legacy path for 'chair'
    console.log('[LayoutMakerPageStore] handleOpenPlacementModal called with type:', type);
    const elementConfigs: Record<string, { label: string; width: number; height: number }> = {
      'chair': { label: 'Chair', width: 0.45, height: 0.45 },
    };

    const config = elementConfigs[type];
    console.log('[LayoutMakerPageStore] Config found:', config);
    if (config) {
      console.log('[LayoutMakerPageStore] Setting state and opening modal...');
      setPlacementElementType(type);
      setPlacementElementLabel(config.label);
      setPlacementElementWidth(config.width);
      setPlacementElementHeight(config.height);
      setPlacementModalOpen(true);
      setShowElementLibrary(false);
      console.log('[LayoutMakerPageStore] placementModalOpen should be:', true);
    }
  }, []);

  useEffect(() => {
    console.log('[LayoutMakerPageStore] placementModalOpen changed to:', placementModalOpen);
  }, [placementModalOpen]);

  useEffect(() => {
    console.log('[LayoutMakerPageStore] placementElementType changed to:', placementElementType);
  }, [placementElementType]);

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
      const id = uuidv4();
      addElement({
        id,
        type: element.type as any,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        label: element.label,
        color: element.color,
      } as any);
    });
    setPlacementModalOpen(false);
  }, [addElement]);

  // Place individual seat elements from SeatingConfigModal
  const handlePlaceSeats = useCallback((items: Array<{
    elementType: ElementType;
    widthM: number;
    heightM: number;
    label: string;
    fill?: string;
    count: number;
  }>) => {
    const ppm = getEffectivePPM();
    const COLS = 5;
    const GAP = 10; // px between elements
    const startX = a4Bounds.x + 40;
    const startY = a4Bounds.y + 40;
    let placed = 0;
    items.forEach(({ elementType, widthM, heightM, label, fill, count }) => {
      const widthPx = widthM * ppm;
      const heightPx = heightM * ppm;
      for (let i = 0; i < count; i++) {
        const col = placed % COLS;
        const row = Math.floor(placed / COLS);
        addElement({
          type: 'rectangle',
          x: startX + col * (widthPx + GAP),
          y: startY + row * (heightPx + GAP),
          width: widthPx,
          height: heightPx,
          fill: fill || '#f5f0eb',
          stroke: '#a08060',
          strokeWidth: 1.5,
          elementType,
          label,
          rotation: 0,
          color: null,
        } as any);
        placed++;
      }
    });
  }, [addElement, a4Bounds]);

  // Place ceremony seating block from CeremonySeatingModal
  const handlePlaceCeremony = useCallback((data: {
    totalWidthM: number;
    totalHeightM: number;
    ceremonyData: {
      mode: 'full-block' | 'row-by-row';
      seatsPerRow: number;
      rowCount: number;
      seatWidthPx: number;
      seatHeightPx: number;
      rowGapPx: number;
      seatGapPx: number;
      aisleWidthPx: number;
      showLabels: boolean;
      removedSeats?: string[];
      curvature?: number;
      chairStyle?: 'chiavari' | 'ghost' | 'folding' | 'banquet';
      aisleType?: 'none' | 'center' | 'sides' | 'double';
      sectionLabels?: { enabled: boolean; left: string; right: string };
      reservedRows?: number[];
      perRowOverrides?: Record<number, number>;
    };
  }) => {
    const ppm = getEffectivePPM();
    const widthPx = data.totalWidthM * ppm;
    const heightPx = data.totalHeightM * ppm;
    const x = a4Bounds.x + (a4Bounds.width - widthPx) / 2;
    const y = a4Bounds.y + (a4Bounds.height - heightPx) / 2;
    addElement({
      type: 'rectangle',
      x,
      y,
      width: widthPx,
      height: heightPx,
      fill: 'transparent',
      stroke: 'transparent',
      strokeWidth: 0,
      elementType: 'ceremony-block',
      ceremonyData: data.ceremonyData,
      label: 'Ceremony Seating',
      rotation: 0,
      color: null,
    } as any);
  }, [addElement, a4Bounds]);

  // Place dance floor element from DanceFloorConfigModal
  const handlePlaceDanceFloor = useCallback((data: DanceFloorData) => {
    const ppm = getEffectivePPM();
    const effectiveW = data.shape === 'circle' ? data.widthM : data.widthM;
    const effectiveH = data.shape === 'circle' ? data.widthM : data.heightM;
    const widthPx = effectiveW * ppm;
    const heightPx = effectiveH * ppm;
    const x = a4Bounds.x + (a4Bounds.width - widthPx) / 2;
    const y = a4Bounds.y + (a4Bounds.height - heightPx) / 2;
    addElement({
      type: 'rectangle',
      x,
      y,
      width: widthPx,
      height: heightPx,
      fill: 'rgba(255,228,181,0.5)',
      stroke: '#DEB887',
      strokeWidth: 2,
      rotation: 0,
      elementType: 'dance-floor',
      label: data.labelVisible ? data.label : '',
      danceFloorData: data,
      color: null,
    } as any);
  }, [addElement, a4Bounds]);

  // Place / update stage element from StageConfigModal
  const handlePlaceStage = useCallback((data: StageData) => {
    const ppm = getEffectivePPM();
    const widthPx = data.widthM * ppm;
    const heightPx = data.depthM * ppm;

    if (stageEditShapeId) {
      // Update existing stage in place
      useCanvasStore.getState().updateElement(stageEditShapeId, {
        width: widthPx,
        height: heightPx,
        fill: data.fillColor,
        label: data.labelVisible ? data.label : '',
        stageData: data,
      } as any);
      setStageEditShapeId(null);
      return;
    }

    const x = a4Bounds.x + (a4Bounds.width - widthPx) / 2;
    const y = a4Bounds.y + (a4Bounds.height - heightPx) / 2;
    addElement({
      type: 'rectangle',
      x, y,
      width: widthPx,
      height: heightPx,
      fill: data.fillColor,
      stroke: data.borderEnabled ? data.borderColor : 'transparent',
      strokeWidth: 2,
      rotation: 0,
      elementType: 'stage',
      label: data.labelVisible ? data.label : '',
      stageData: data,
      color: null,
    } as any);
  }, [addElement, a4Bounds, stageEditShapeId]);

  // Place / update altar element
  const handlePlaceAltar = useCallback((data: AltarData) => {
    const ppm = getEffectivePPM();
    const widthPx = data.widthM * ppm;
    const heightPx = data.depthM * ppm;
    if (altarEditShapeId) {
      useCanvasStore.getState().updateElement(altarEditShapeId, {
        width: widthPx, height: heightPx,
        fill: data.fillColor,
        label: data.labelVisible ? data.label : '',
        altarData: data,
      } as any);
      setAltarEditShapeId(null);
      return;
    }
    const x = a4Bounds.x + (a4Bounds.width - widthPx) / 2;
    const y = a4Bounds.y + (a4Bounds.height - heightPx) / 2;
    addElement({
      type: 'rectangle', x, y, width: widthPx, height: heightPx,
      fill: data.fillColor,
      stroke: data.borderEnabled ? data.borderColor : 'transparent',
      strokeWidth: 2, rotation: 0,
      elementType: 'altar',
      label: data.labelVisible ? data.label : '',
      altarData: data, color: null,
    } as any);
  }, [addElement, a4Bounds, altarEditShapeId]);

  // Place / update bar element
  const handlePlaceBar = useCallback((data: BarData) => {
    const ppm = getEffectivePPM();
    const widthPx = data.widthM * ppm;
    const heightPx = data.depthM * ppm;
    if (barEditShapeId) {
      useCanvasStore.getState().updateElement(barEditShapeId, {
        width: widthPx, height: heightPx,
        fill: data.fillColor,
        label: data.labelVisible ? data.label : '',
        barData: data,
      } as any);
      setBarEditShapeId(null);
      return;
    }
    const qty = data.quantity ?? 1;
    const gap = ppm * 0.3;
    const totalW = widthPx * qty + gap * (qty - 1);
    const startX = a4Bounds.x + (a4Bounds.width - totalW) / 2;
    const y = a4Bounds.y + (a4Bounds.height - heightPx) / 2;
    for (let i = 0; i < qty; i++) {
      addElement({
        type: 'rectangle', x: startX + i * (widthPx + gap), y, width: widthPx, height: heightPx,
        fill: data.fillColor,
        stroke: data.borderEnabled ? data.borderColor : 'transparent',
        strokeWidth: 2, rotation: 0,
        elementType: 'bar',
        label: data.labelVisible ? data.label : '',
        barData: data, color: null,
      } as any);
    }
  }, [addElement, a4Bounds, barEditShapeId]);

  // Place / update cocktail table element
  const handlePlaceCocktail = useCallback((data: CocktailData) => {
    const ppm = getEffectivePPM();
    const widthPx = data.widthM * ppm;
    const heightPx = data.depthM * ppm;
    if (cocktailEditShapeId) {
      useCanvasStore.getState().updateElement(cocktailEditShapeId, {
        width: widthPx, height: heightPx,
        fill: data.fillColor,
        label: data.labelVisible ? data.label : '',
        cocktailData: data,
      } as any);
      setCocktailEditShapeId(null);
      return;
    }
    const qty = data.quantity ?? 1;
    const gap = ppm * 0.3;
    const totalW = widthPx * qty + gap * (qty - 1);
    const startX = a4Bounds.x + (a4Bounds.width - totalW) / 2;
    const y = a4Bounds.y + (a4Bounds.height - heightPx) / 2;
    for (let i = 0; i < qty; i++) {
      addElement({
        type: 'rectangle', x: startX + i * (widthPx + gap), y, width: widthPx, height: heightPx,
        fill: data.fillColor,
        stroke: data.borderEnabled ? data.borderColor : 'transparent',
        strokeWidth: 2, rotation: 0,
        elementType: 'cocktail',
        label: data.labelVisible ? data.label : '',
        cocktailData: data, color: null,
      } as any);
    }
  }, [addElement, a4Bounds, cocktailEditShapeId]);

  // Place / update pathway element
  const handlePlacePathway = useCallback((data: PathwayData) => {
    const ppm = getEffectivePPM();
    // Pathway stored as width × length (portrait orientation by default)
    const widthPx = data.widthM * ppm;
    const heightPx = data.lengthM * ppm;
    if (pathwayEditShapeId) {
      useCanvasStore.getState().updateElement(pathwayEditShapeId, {
        width: widthPx, height: heightPx,
        fill: data.fillColor,
        label: data.labelVisible ? data.label : '',
        pathwayData: data,
      } as any);
      setPathwayEditShapeId(null);
      return;
    }
    const x = a4Bounds.x + (a4Bounds.width - widthPx) / 2;
    const y = a4Bounds.y + (a4Bounds.height - heightPx) / 2;
    addElement({
      type: 'rectangle', x, y, width: widthPx, height: heightPx,
      fill: data.fillColor,
      stroke: 'transparent', strokeWidth: 0, rotation: 0,
      elementType: 'pathway',
      label: data.labelVisible ? data.label : '',
      pathwayData: data, color: null,
    } as any);
  }, [addElement, a4Bounds, pathwayEditShapeId]);

  // Place an AV element from AVElementModal
  const handlePlaceAV = useCallback((data: AVData) => {
    const ppm = getEffectivePPM();
    const widthPx = data.widthM * ppm;
    const heightPx = data.heightM * ppm;
    const qty = data.quantity ?? 1;
    const gap = ppm * 0.3;
    const totalW = widthPx * qty + gap * (qty - 1);
    const startX = a4Bounds.x + (a4Bounds.width - totalW) / 2;
    const y = a4Bounds.y + (a4Bounds.height - heightPx) / 2;
    for (let i = 0; i < qty; i++) {
      addElement({
        type: 'rectangle',
        x: startX + i * (widthPx + gap), y,
        width: widthPx,
        height: heightPx,
        fill: '#1a1a2e',
        stroke: '#3b82f6',
        strokeWidth: 1.5,
        rotation: 0,
        elementType: data.type,
        label: data.labelVisible ? data.label : '',
        avData: data,
        color: null,
      } as any);
    }
    setAvEditShapeId(null);
  }, [addElement, a4Bounds]);

  // Update existing AV element from AVElementModal (double-click edit)
  const handleUpdateAV = useCallback((data: AVData) => {
    if (!avEditShapeId) return;
    const ppm = getEffectivePPM();
    useCanvasStore.getState().updateElement(avEditShapeId, {
      width: data.widthM * ppm,
      height: data.heightM * ppm,
      label: data.labelVisible ? data.label : '',
      avData: data,
    } as any);
    setAvEditShapeId(null);
  }, [avEditShapeId]);

  // Update an existing seat element's dimensions, fill, label, and type
  const handleUpdateSeat = useCallback((
    shapeId: string,
    widthM: number,
    heightM: number,
    fill: string,
    label: string,
    newElementType: ElementType,
  ) => {
    const ppm = getEffectivePPM();
    useCanvasStore.getState().updateElement(shapeId, {
      width: widthM * ppm,
      height: heightM * ppm,
      fill,
      label,
      elementType: newElementType,
    } as any);
    setSeatingEditingShapeId(null);
  }, []);

  // Double-click on a canvas shape — re-open edit modal if applicable
  const handleShapeDoubleClick = useCallback((shapeId: string) => {
    const shape = useCanvasStore.getState().elements[shapeId];
    if (!shape) return;

    const et = (shape as any).elementType as string | undefined;
    const seatTypes = ['seat-standard', 'seat-armchair', 'seat-chaise', 'seat-sofa-2', 'seat-sofa-3', 'seat-bench'];
    if (et && seatTypes.includes(et)) {
      // Map sofa variants to the unified 'seat-sofa' modal type
      const modalType: ElementType = (et === 'seat-sofa-2' || et === 'seat-sofa-3') ? 'seat-sofa' : et as ElementType;
      setSeatingModalType(modalType);
      setSeatingEditingShapeId(shapeId);
      setSeatingModalOpen(true);
      return;
    }
    const avEditTypes = [
      'av-mixing-desk', 'av-speaker', 'av-subwoofer', 'av-truss', 'av-moving-head',
      'av-led-wall', 'av-screen', 'av-projector', 'av-light-console',
    ];
    if (et && avEditTypes.includes(et) && (shape as any).avData) {
      setAvModalType(et);
      setAvEditShapeId(shapeId);
      setAvModalOpen(true);
      return;
    }
    if (et === 'stage' && (shape as any).stageData) {
      setStageEditShapeId(shapeId);
      setStageModalOpen(true);
    } else if (et === 'altar' && (shape as any).altarData) {
      setAltarEditShapeId(shapeId);
      setAltarModalOpen(true);
    } else if (et === 'pathway' && (shape as any).pathwayData) {
      setPathwayEditShapeId(shapeId);
      setPathwayModalOpen(true);
    } else if (et === 'bar' && (shape as any).barData) {
      setBarEditShapeId(shapeId);
      setBarModalOpen(true);
    } else if (et === 'cocktail' && (shape as any).cocktailData) {
      setCocktailEditShapeId(shapeId);
      setCocktailModalOpen(true);
    }
  }, []);

  const [workflowPositions, setWorkflowPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const eid = getEventIdFromUrl();
    try {
      const stored = localStorage.getItem(eid ? `workflow-positions-${eid}` : 'workflow-positions');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  const [workflowConnections, setWorkflowConnections] = useState<Connection[]>(() => {
    const eid = getEventIdFromUrl();
    try {
      const stored = localStorage.getItem(eid ? `workflow-connections-${eid}` : 'workflow-connections');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [workflowNotes, setWorkflowNotes] = useState<WorkflowNote[]>(() => {
    const eid = getEventIdFromUrl();
    try {
      const stored = localStorage.getItem(eid ? `workflow-notes-cards-${eid}` : 'workflow-notes-cards');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Load workflow data from Supabase when eventId is available
  const [isWorkflowLoaded, setIsWorkflowLoaded] = useState(false);

  useEffect(() => {
    const eventId = eventIdFromUrl;

    // No eventId means no workflow to load — unblock initialization immediately
    if (!eventId) {
      setIsWorkflowLoaded(true);
      return;
    }

    if (isWorkflowLoaded) return;

    const loadWorkflowFromSupabase = async () => {
      console.log('[Workflow] Loading from Supabase for event:', eventId);
      const result = await loadWorkflowData(eventId);

      console.log('[DEBUG] Supabase raw result:', JSON.stringify(result));
      if (result.error) {
        console.error('[Workflow] Error loading from Supabase:', result.error);
      } else if (result.notes.length > 0 || result.connections.length > 0) {
        console.log('[Workflow] Loaded from Supabase:', {
          notes: result.notes.length,
          connections: result.connections.length
        });
        setWorkflowNotes(result.notes as WorkflowNote[]);
        setWorkflowConnections(result.connections);
        console.log('[DEBUG] workflowConnections loaded:', result.connections.length);
        console.log('[DEBUG] workflowNotes loaded:', result.notes.length);
        // Also save to localStorage as backup
        localStorage.setItem(eventId ? `workflow-notes-cards-${eventId}` : 'workflow-notes-cards', JSON.stringify(result.notes));
        localStorage.setItem(eventId ? `workflow-connections-${eventId}` : 'workflow-connections', JSON.stringify(result.connections));
      }
      setIsWorkflowLoaded(true);
    };

    loadWorkflowFromSupabase();
  }, [eventIdFromUrl]);

  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTask[]>(() => {
    const eid = getEventIdFromUrl();
    try {
      const stored = localStorage.getItem(eid ? `workflow-task-cards-${eid}` : 'workflow-task-cards');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Tracks the ms timestamp of our last write to workflow tables.
  // The Realtime callback skips refetch if we caused the change within 5 s.
  const lastWorkflowSaveRef = useRef<number>(0);
  // Debounces the forceSave triggered by layout-card position moves.
  const layoutCardSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounces the per-note position update during drag.
  const notePositionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectCustomTemplate = useCallback((template: CustomElementTemplate) => {
    const PIXELS_PER_METER = getEffectivePPM();
    const id = uuidv4();

    // Convert dimensions from meters to pixels
    const widthPx = template.width * PIXELS_PER_METER;
    const heightPx = template.height * PIXELS_PER_METER;

    // Calculate center position of the canvas
    const centerX = a4Bounds
      ? a4Bounds.x + (a4Bounds.width / 2) - (widthPx / 2)
      : 200;
    const centerY = a4Bounds
      ? a4Bounds.y + (a4Bounds.height / 2) - (heightPx / 2)
      : 200;

    // Store original path in meters + scale factor for proper rendering
    addElement({
      id,
      type: `custom-${template.id}` as "rectangle",
      x: centerX,
      y: centerY,
      width: widthPx,
      height: heightPx,
      rotation: 0,
      customShape: template.svgPath,
      customShapeScale: PIXELS_PER_METER,
      label: template.name,
      fill: '#ffffff',
      stroke: '#374151',
      strokeWidth: 1.5,
    } as any);
  }, [addElement, a4Bounds]);

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
    getSvgElement: () => SVGSVGElement | null;
    openSatelliteModal: () => void;
  } | null>(null);

  const exportSvgRef = useRef<SVGSVGElement | null>(null);

  // Keep SVG ref in sync for export
  useEffect(() => {
    const updateSvgRef = () => {
      exportSvgRef.current = gridCanvasRef.current?.getSvgElement() ?? null;
    };
    updateSvgRef();
    const id = setInterval(updateSvgRef, 500);
    return () => clearInterval(id);
  }, [activeProjectId]);

  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Track if initial load is done
  const isInitializedRef = useRef(false);
  const currentProjectIdRef = useRef<string>(activeProjectId);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || {
    id: '1',
    name: 'Project 1',
    a4Dimensions: getInitialA4Dimensions(),
  };

  // Build a snapshot of ALL tabs' canvas data for the multi-tab save.
  // The active tab is read from the store (most current); all others from localStorage.
  const getCanvasSnapshot = useCallback(() => {
    // Flush active canvas to localStorage first so it's consistent with the others.
    const activeCanvas = getCanvasData();
    saveCanvasToLocalStorage(activeProjectId, {
      ...activeCanvas,
      supabaseLayoutId: storeSupabaseLayoutId,
    });
    return projects.map((p) => ({
      projectId: p.id,
      canvas: loadCanvasFromLocalStorage(p.id) || {
        drawings: [], shapes: [], textElements: [], walls: [], doors: [],
        powerPoints: [], viewBox: { x: 0, y: 0, width: 0, height: 0 },
      },
    }));
  }, [projects, activeProjectId, getCanvasData, storeSupabaseLayoutId]);

  const autoSyncOptions: Parameters<typeof useAutoSync>[0] = {
    enabled: true,
    projects,
    getCanvasSnapshot,
    onLayoutIdReceived: setEventLayoutId,
    workflowPositions,
    ...(eventIdFromUrl ? { eventId: eventIdFromUrl } : {}),
    ...(eventInfo?.title ? { eventName: eventInfo.title } : { eventName: 'Layout' }),
    ...(eventLayoutId ? { eventLayoutId } : {}),
  };
  const { forceSave } = useAutoSync(autoSyncOptions);

  // Keep refs for save interval to avoid recreating it
  const getCanvasDataRef = useRef(getCanvasData);
  const storeSupabaseLayoutIdRef = useRef(storeSupabaseLayoutId);
  const forceSaveRef = useRef(forceSave);

  useEffect(() => {
    getCanvasDataRef.current = getCanvasData;
  }, [getCanvasData]);

  useEffect(() => {
    storeSupabaseLayoutIdRef.current = storeSupabaseLayoutId;
  }, [storeSupabaseLayoutId]);

  useEffect(() => {
    forceSaveRef.current = forceSave;
  }, [forceSave]);

  // When the project list structure changes (tab added, deleted, or renamed),
  // force-save immediately so Supabase reflects the change even if the user
  // hasn't drawn anything yet (blank tabs never set pendingChanges).
  // This runs post-render so getCanvasSnapshot's closure already has the updated
  // projects list — calling forceSave synchronously inside a setProjects callback
  // would snapshot the stale list before React re-renders.
  const projectStructureRef = useRef('');
  useEffect(() => {
    const structure = JSON.stringify(projects.map(p => ({ id: p.id, name: p.name })));
    if (projectStructureRef.current === '') {
      // First render — record baseline, do not save
      projectStructureRef.current = structure;
      return;
    }
    if (structure !== projectStructureRef.current) {
      projectStructureRef.current = structure;
      forceSaveRef.current?.();
    }
  }, [projects]);

  // On every page load when an eventId is present, force-save to Supabase after
  // initialization completes. This migrates layouts that were previously saved
  // without an event_id so they become queryable by event on any device.
  useEffect(() => {
    if (!eventIdFromUrl) return;
    const timer = setTimeout(() => {
      console.log('[Migrate] Force-saving layout to attach event_id:', eventIdFromUrl);
      forceSaveRef.current?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for force sync events (e.g., from satellite picker)
  useEffect(() => {
    const handleForceSync = () => {
      console.log('[LayoutMakerPageStore] Force sync triggered');
      forceSaveRef.current?.();
    };
    window.addEventListener('forceLayoutSync', handleForceSync);
    return () => window.removeEventListener('forceLayoutSync', handleForceSync);
  }, []);

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

          // Projects are already scoped to this event via event-scoped storage keys;
          // no need to tag individual projects with eventId.
        }
      } catch (err) {
        console.error('Failed to load event data:', err);
      }
    };

    loadEventData();
  }, [eventIdFromUrl]);

  // Save current canvas to localStorage periodically
  // IMPORTANT: check isInitializedRef INSIDE the callback, not before creating the interval.
  // With empty deps the effect runs once before initialization, so the old guard caused the
  // interval to never be created at all — meaning saves only happened on unmount.
  useEffect(() => {
    console.log('[Storage] Save interval created on mount');
    const saveInterval = setInterval(() => {
      if (!isInitializedRef.current) {
        console.log('[Storage] interval tick — NOT initialized yet, skipping');
        return;
      }
      const state = useCanvasStore.getState();
      const projectId = currentProjectIdRef.current;

      // Safety: if the store's activeProjectId doesn't match our ref, the store is mid-switch.
      // Skip this tick to avoid saving the wrong project's (possibly empty) data.
      if (state.activeProjectId && state.activeProjectId !== projectId) {
        console.warn('[Storage] interval: store projectId', state.activeProjectId, '≠ ref', projectId, '— skipping');
        return;
      }

      const canvasData = getCanvasDataRef.current();
      // Read supabaseLayoutId directly from store (not via ref which can lag a render behind)
      saveCanvasToLocalStorage(projectId, {
        ...canvasData,
        supabaseLayoutId: state.supabaseLayoutId,
      });
    }, 1000); // Save every second

    return () => clearInterval(saveInterval);
  }, []); // Empty deps - only run once, use refs for current values

  // Initialize on mount IMMEDIATELY from localStorage — do NOT wait for workflow.
  //
  // WHY: When eventId is in the URL, isWorkflowLoaded stays false for 1-5 seconds while
  // Supabase loads workflow data. During that delay the canvas is rendered (empty store).
  // If the user adds elements before the workflow loads, those elements are in the store
  // but isInitializedRef is false so the 1-second interval skips saving them. When the
  // workflow finally loads and triggers the old init, initializeProject is called with the
  // old localStorage data — CLEARING the new elements. The interval then saves the now-empty
  // store, permanently losing the elements. Fix: init immediately, handle notes separately.
  useEffect(() => {
    if (isInitializedRef.current) return;

    const a4 = activeProject.a4Dimensions || getInitialA4Dimensions();
    const bounds = {
      x: a4.a4X,
      y: a4.a4Y,
      width: a4.a4WidthPx,
      height: a4.a4HeightPx,
    };

    const savedCanvas = loadCanvasFromLocalStorage(activeProjectId);

    if (savedCanvas) {
      console.log('[Init] Loading canvas from localStorage for project:', activeProjectId);
      const storeData = canvasDataToStoreFormat(savedCanvas);
      console.log('[Init] storeData — satelliteBackground:', !!storeData.satelliteBackground, 'customBackground:', !!storeData.customBackground, 'shapes:', storeData.elementOrder?.length ?? 0);
      initializeProject(activeProjectId, bounds, storeData);
      console.log('[Init] initializeProject called, store satelliteBackground after:', !!useCanvasStore.getState().satelliteBackground);
    } else {
      console.log('[Init] No saved canvas, initializing empty project:', activeProjectId);
      initializeProject(activeProjectId, bounds);
    }

    // Post-init safety net: if initializeProject ran without a background, check the
    // dedicated bg key (written by the store action, immune to canvas-save overwrites).
    const storeAfterInit = useCanvasStore.getState();
    if (!storeAfterInit.satelliteBackground && !storeAfterInit.customBackground) {
      try {
        const dedicatedRaw = localStorage.getItem(`layout-maker-bg-${activeProjectId}`);
        if (dedicatedRaw) {
          const dedicated = JSON.parse(dedicatedRaw) as { type: 'satellite' | 'custom'; data: any };
          if (dedicated.type === 'satellite' && dedicated.data) {
            storeAfterInit.setSatelliteBackground(dedicated.data);
            console.log('[Init] satellite restored from dedicated bg key after init');
          } else if (dedicated.type === 'custom' && dedicated.data) {
            storeAfterInit.setCustomBackground(dedicated.data);
            console.log('[Init] custom bg restored from dedicated bg key after init');
          }
        }
      } catch (e) {
        console.warn('[Init] could not read dedicated bg key:', e);
      }
    }

    isInitializedRef.current = true;
    currentProjectIdRef.current = activeProjectId;
    console.log('[Init] DONE — isInitializedRef=true, projectId:', activeProjectId, 'shapes in store:', useCanvasStore.getState().elementOrder.length);
  }, []); // Empty deps — runs once immediately on mount, never re-initializes

  // Separate effect: update workflow notes in the store when they load from Supabase.
  // This does NOT reinitialize the project — just merges notes into existing canvas state.
  useEffect(() => {
    if (!isWorkflowLoaded) return;
    if (!isInitializedRef.current) return;

    const connectedNoteIds = workflowConnections
      .filter(c => c.toCardId === activeProjectId && c.fromCardId.startsWith('note-'))
      .map(c => c.fromCardId.replace('note-', ''));

    const connectedNotes = workflowNotes
      .filter(n => connectedNoteIds.includes(n.id))
      .map(n => ({
        id: n.id,
        content: n.content,
        color: n.color,
        width: n.width,
        height: n.height,
      }));

    if (connectedNotes.length > 0) {
      console.log('[Init] Updating workflow notes in store:', connectedNotes.length);
      useCanvasStore.getState().setNotes(connectedNotes);
    }
  }, [isWorkflowLoaded, workflowNotes, workflowConnections, activeProjectId]);

  // Sync Supabase layout ID back to local project when it's assigned
  useEffect(() => {
    if (storeSupabaseLayoutId && storeSupabaseLayoutId !== activeProject.supabaseLayoutId) {
      setProjects(prev => {
        const updated = prev.map(p =>
          p.id === activeProjectId
            ? { ...p, supabaseLayoutId: storeSupabaseLayoutId }
            : p
        );
        saveProjectsToStorage(updated, eventIdFromUrl);
        return updated;
      });
    }
  }, [storeSupabaseLayoutId, activeProjectId, activeProject.supabaseLayoutId, eventIdFromUrl]);

  // On every mount with an eventId: load the single layout file from Supabase.
  // Deserializes all tabs from LayoutFileData and restores them into local state.
  // Also sets up a Supabase Realtime subscription so changes from other clients
  // are reflected without a full page reload.
  useEffect(() => {
    if (!eventIdFromUrl) return;

    const loadFromSupabase = async () => {
      const result = await listLayoutsForProject(eventIdFromUrl);
      if (result.error || !result.data || result.data.length === 0) {
        console.log('[Sync] No layout in Supabase for event:', result.error || 'empty');
        return;
      }

      const layoutRecord = result.data[0];
      if (!layoutRecord) return;
      const layoutData = layoutRecord.canvas_data;

      // Store the event layout row ID so future saves can upsert by ID
      setEventLayoutId(layoutRecord.id);

      if (!isLayoutFileData(layoutData)) {
        // Legacy single-canvas format — treat it as a single tab
        console.log('[Sync] Legacy canvas_data format, loading as single tab');
        const projectId = layoutRecord.id;
        saveCanvasToLocalStorage(projectId, { ...layoutData, supabaseLayoutId: layoutRecord.id });
        const defaultA4 = getInitialA4Dimensions();
        const legacyProject = [{
          id: projectId,
          name: layoutRecord.name,
          supabaseLayoutId: layoutRecord.id,
          eventId: eventIdFromUrl,
          a4Dimensions: defaultA4,
        }];
        saveProjectsToStorage(legacyProject, eventIdFromUrl);
        setProjects(legacyProject);
        if (!isInitializedRef.current) {
          const bounds = { x: defaultA4.a4X, y: defaultA4.a4Y, width: defaultA4.a4WidthPx, height: defaultA4.a4HeightPx };
          initializeProject(projectId, bounds, canvasDataToStoreFormat({ ...layoutData, supabaseLayoutId: layoutRecord.id }));
          isInitializedRef.current = true;
        }
        return;
      }

      console.log('[Sync] Restoring', layoutData.tabs.length, 'tab(s) from LayoutFileData');

      const defaultA4 = getInitialA4Dimensions();

      // Write every tab's canvas to localStorage (keyed by tab ID)
      for (const tab of layoutData.tabs) {
        saveCanvasToLocalStorage(tab.id, {
          ...tab.canvas,
          supabaseLayoutId: layoutRecord.id,
        });
      }

      // Map tabs to Project objects — all share the same Supabase row ID
      const supabaseProjects: Project[] = layoutData.tabs.map((tab) => {
        const proj: Project = {
          id: tab.id,
          name: tab.name,
          supabaseLayoutId: layoutRecord.id,
          eventId: eventIdFromUrl,
          a4Dimensions: tab.a4Dimensions || defaultA4,
        };
        if (tab.category) proj.category = tab.category;
        return proj;
      });

      saveProjectsToStorage(supabaseProjects, eventIdFromUrl);
      setProjects(supabaseProjects);

      // Restore the previously active tab, or fall back to the first
      const targetTabId = layoutData.activeTabId || supabaseProjects[0]?.id;
      const targetTab = layoutData.tabs.find((t) => t.id === targetTabId) || layoutData.tabs[0];

      if (targetTab && !isInitializedRef.current) {
        const a4 = targetTab.a4Dimensions || defaultA4;
        const bounds = { x: a4.a4X, y: a4.a4Y, width: a4.a4WidthPx, height: a4.a4HeightPx };
        const storeData = canvasDataToStoreFormat({ ...targetTab.canvas, supabaseLayoutId: layoutRecord.id });
        initializeProject(targetTab.id, bounds, storeData);
        setActiveProjectId(targetTab.id);
        currentProjectIdRef.current = targetTab.id;
        isInitializedRef.current = true;
        console.log('[Sync] Canvas initialized from tab:', targetTab.id);
      }

      // Restore workflow card positions if stored in this layout row
      if (layoutData.workflowPositions && Object.keys(layoutData.workflowPositions).length > 0) {
        setWorkflowPositions(layoutData.workflowPositions);
        localStorage.setItem(`workflow-positions-${eventIdFromUrl}`, JSON.stringify(layoutData.workflowPositions));
      }
    };

    loadFromSupabase();

    // Realtime: when another client saves, re-fetch from Supabase and update state.
    // We do NOT read canvas_data from payload.new because Supabase truncates large
    // JSONB payloads (>8KB), so payload.new.canvas_data is often missing entirely.
    if (!browserSupabaseClient) return;
    console.log('[Realtime] Subscribing to layout changes for event:', eventIdFromUrl);
    console.log('[Realtime] Filter:', `event_id=eq.${eventIdFromUrl}`);
    // Diagnostic: confirm the Realtime client is authenticated
    browserSupabaseClient.auth.getSession().then(({ data }) => {
      console.log('[Realtime] Auth session user:', data.session?.user?.id ?? 'NOT AUTHENTICATED — RLS will block subscription');
    });
    const channel = browserSupabaseClient
      .channel(`layout-event-${eventIdFromUrl}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'layouts',
          filter: `event_id=eq.${eventIdFromUrl}`,
        },
        async (payload: any) => {
          console.log('[Realtime] Layout changed — re-fetching from Supabase', payload);
          // Re-fetch the full row because payload.new may be truncated for large canvas_data
          const result = await listLayoutsForProject(eventIdFromUrl);
          if (result.error || !result.data?.length) {
            console.warn('[Realtime] Re-fetch failed:', result.error);
            return;
          }
          const layoutRecord = result.data[0];
          const incoming = layoutRecord.canvas_data;
          if (!isLayoutFileData(incoming)) return;

          const currentActive = currentProjectIdRef.current;
          const defaultA4 = getInitialA4Dimensions();

          // Detect whether WE caused this update: if our last save timestamp is within
          // 5 seconds of the row's updated_at, skip canvas reinit to avoid resetting
          // the canvas while the user is editing.
          const rowUpdatedAt = layoutRecord.updated_at
            ? new Date(layoutRecord.updated_at).getTime()
            : 0;
          const ourLastSave = useCanvasStore.getState().lastSyncedAt ?? 0;
          const weCausedThis = Math.abs(rowUpdatedAt - ourLastSave) < 5000;
          console.log('[Realtime] weCausedThis:', weCausedThis, '| rowUpdatedAt:', rowUpdatedAt, '| ourLastSave:', ourLastSave);

          // Update every tab in localStorage
          for (const tab of incoming.tabs) {
            saveCanvasToLocalStorage(tab.id, {
              ...tab.canvas,
              supabaseLayoutId: layoutRecord.id,
            });
          }

          // Sync the project list (handles tabs added/removed by the other client)
          const updatedProjects = incoming.tabs.map((tab: any) => ({
            id: tab.id,
            name: tab.name,
            supabaseLayoutId: layoutRecord.id,
            eventId: eventIdFromUrl,
            a4Dimensions: tab.a4Dimensions || defaultA4,
            category: tab.category,
          }));
          saveProjectsToStorage(updatedProjects, eventIdFromUrl);
          setProjects(updatedProjects);

          // Reinitialize the active canvas only when the change came from another client
          if (!weCausedThis) {
            const activeTab = incoming.tabs.find((t: any) => t.id === currentActive);
            if (activeTab) {
              const a4 = activeTab.a4Dimensions || defaultA4;
              const bounds = {
                x: a4.a4X, y: a4.a4Y,
                width: a4.a4WidthPx, height: a4.a4HeightPx,
              };
              const storeData = canvasDataToStoreFormat({
                ...activeTab.canvas,
                supabaseLayoutId: layoutRecord.id,
              });
              initializeProject(currentActive, bounds, storeData);
              console.log('[Realtime] Active canvas reinitialized with remote data');
            }
          }

          // Sync workflow card positions from remote
          if (incoming.workflowPositions && Object.keys(incoming.workflowPositions).length > 0) {
            setWorkflowPositions(incoming.workflowPositions);
            localStorage.setItem(`workflow-positions-${eventIdFromUrl}`, JSON.stringify(incoming.workflowPositions));
          }

          console.log('[Realtime] State updated —', updatedProjects.length, 'tab(s)');
        }
      )
      .subscribe((status: string) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [eventIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: sync workflow notes and connections across browsers
  useEffect(() => {
    if (!eventIdFromUrl || !browserSupabaseClient) return;

    let refetchInProgress = false;
    const refetchWorkflow = async () => {
      // Skip if WE caused this change within the last 5 seconds (self-save guard)
      if (Date.now() - lastWorkflowSaveRef.current < 5000) {
        console.log('[Realtime] Workflow: skipping self-echo');
        return;
      }
      if (refetchInProgress) return;
      refetchInProgress = true;
      try {
        const result = await loadWorkflowData(eventIdFromUrl);
        if (!result.error) {
          setWorkflowNotes(result.notes as WorkflowNote[]);
          setWorkflowConnections(result.connections);
          localStorage.setItem(`workflow-notes-cards-${eventIdFromUrl}`, JSON.stringify(result.notes));
          localStorage.setItem(`workflow-connections-${eventIdFromUrl}`, JSON.stringify(result.connections));
        }
      } finally {
        refetchInProgress = false;
      }
    };

    const workflowChannel = browserSupabaseClient
      .channel(`workflow-event-${eventIdFromUrl}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'workflow_notes', filter: `event_id=eq.${eventIdFromUrl}` },
        () => { refetchWorkflow(); }
      )
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'workflow_connections', filter: `event_id=eq.${eventIdFromUrl}` },
        () => { refetchWorkflow(); }
      )
      .subscribe();

    return () => {
      workflowChannel.unsubscribe();
    };
  }, [eventIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWorkflowPositionsChange = useCallback((positions: Record<string, { x: number; y: number }>) => {
    setWorkflowPositions(positions);
    localStorage.setItem(eventIdFromUrl ? `workflow-positions-${eventIdFromUrl}` : 'workflow-positions', JSON.stringify(positions));

    if (!eventIdFromUrl) return;

    // Debounce note-position writes to avoid flooding Supabase on every drag frame
    if (notePositionDebounceRef.current) clearTimeout(notePositionDebounceRef.current);
    notePositionDebounceRef.current = setTimeout(() => {
      workflowNotes.forEach(note => {
        const pos = positions[note.id];
        if (pos) {
          lastWorkflowSaveRef.current = Date.now();
          updateWorkflowNoteFields(note.id, { position_x: pos.x, position_y: pos.y }).catch(err => {
            console.error('[Workflow] Error updating note position:', err);
          });
        }
      });
    }, 300);

    // Debounce the layouts-row save for layout-card positions.
    // setTimeout(0) lets React re-render first so forceSaveRef has the updated closure.
    if (layoutCardSaveDebounceRef.current) clearTimeout(layoutCardSaveDebounceRef.current);
    layoutCardSaveDebounceRef.current = setTimeout(() => {
      forceSaveRef.current?.();
    }, 500);
  }, [eventIdFromUrl, workflowNotes]);

  const handleWorkflowConnectionsChange = useCallback((connections: Connection[]) => {
    const prev = workflowConnections;
    setWorkflowConnections(connections);
    localStorage.setItem(eventIdFromUrl ? `workflow-connections-${eventIdFromUrl}` : 'workflow-connections', JSON.stringify(connections));

    if (!eventIdFromUrl) return;

    lastWorkflowSaveRef.current = Date.now();

    // Atomic diff: insert added connections, delete removed ones
    const added = connections.filter(
      c => !prev.some(p => p.fromCardId === c.fromCardId && p.toCardId === c.toCardId),
    );
    const removed = prev.filter(
      p => !connections.some(c => c.fromCardId === p.fromCardId && c.toCardId === p.toCardId),
    );

    added.forEach(c => {
      insertWorkflowConnection(eventIdFromUrl, c).catch(err => {
        console.error('[Workflow] Error inserting connection:', err);
      });
    });
    removed.forEach(c => {
      deleteWorkflowConnectionPair(eventIdFromUrl, c.fromCardId, c.toCardId).catch(err => {
        console.error('[Workflow] Error deleting connection:', err);
      });
    });
  }, [eventIdFromUrl, workflowConnections]);

  const handleWorkflowNotesChange = useCallback((notes: WorkflowNote[]) => {
    const prev = workflowNotes;
    setWorkflowNotes(notes);
    localStorage.setItem(eventIdFromUrl ? `workflow-notes-cards-${eventIdFromUrl}` : 'workflow-notes-cards', JSON.stringify(notes));

    if (!eventIdFromUrl) return;

    lastWorkflowSaveRef.current = Date.now();

    const prevIds = new Set(prev.map(n => n.id));
    const newIds = new Set(notes.map(n => n.id));

    // Created notes — upsert so position is included when available
    notes.filter(n => !prevIds.has(n.id)).forEach(note => {
      const pos = workflowPositions[note.id];
      upsertWorkflowNote(eventIdFromUrl, pos ? { ...note, positionX: pos.x, positionY: pos.y } : note)
        .catch(err => console.error('[Workflow] Error creating note:', err));
    });

    // Deleted notes
    prev.filter(n => !newIds.has(n.id)).forEach(note => {
      deleteWorkflowNote(note.id)
        .catch(err => console.error('[Workflow] Error deleting note:', err));
    });

    // Updated notes — only push the fields that actually changed
    notes.filter(n => prevIds.has(n.id)).forEach(note => {
      const prevNote = prev.find(p => p.id === note.id);
      if (!prevNote) return;
      const fields: Partial<{ content: string; color: string; width: number; height: number }> = {};
      if (prevNote.content !== note.content) fields.content = note.content;
      if (prevNote.color !== note.color) fields.color = note.color;
      if (prevNote.width !== note.width) fields.width = note.width;
      if (prevNote.height !== note.height) fields.height = note.height;
      if (Object.keys(fields).length > 0) {
        updateWorkflowNoteFields(note.id, fields)
          .catch(err => console.error('[Workflow] Error updating note:', err));
      }
    });
  }, [eventIdFromUrl, workflowNotes, workflowPositions]);

  const handleWorkflowTasksChange = useCallback((tasks: WorkflowTask[]) => {
    setWorkflowTasks(tasks);
    localStorage.setItem(eventIdFromUrl ? `workflow-task-cards-${eventIdFromUrl}` : 'workflow-task-cards', JSON.stringify(tasks));
  }, [eventIdFromUrl]);


  const handleReorderProjects = useCallback((fromIndex: number, toIndex: number) => {
    setProjects(prev => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      if (removed) {
        updated.splice(toIndex, 0, removed);
      }
      saveProjectsToStorage(updated, eventIdFromUrl);
      return updated;
    });
  }, [eventIdFromUrl]);

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

    // Get connected notes from workflow
    const connectedNoteIds = workflowConnections
      .filter(c => c.toCardId === projectId && c.fromCardId.startsWith('note-'))
      .map(c => c.fromCardId.replace('note-', ''));
    
    const connectedNotes = workflowNotes
      .filter(n => connectedNoteIds.includes(n.id))
      .map(n => ({
        id: n.id,
        content: n.content,
        color: n.color,
        width: n.width,
        height: n.height,
      }));

    // 2b. Trigger Supabase sync for the OLD project NOW, before clearing the store.
    // forceSave() calls syncToSupabase() which reads getCanvasData() synchronously
    // at its very start (before the first await). If called after initializeProject the
    // store already holds the NEW project's data (often empty), creating a corrupt row.
    forceSave();

    if (savedCanvas) {
      console.log('[ProjectSwitch] Loading canvas from localStorage:', {
        drawings: savedCanvas.drawings?.length || 0,
        shapes: savedCanvas.shapes?.length || 0,
      });
      const storeData = canvasDataToStoreFormat(savedCanvas);
      if (connectedNotes.length > 0 && (!storeData.notes || storeData.notes.length === 0)) {
        storeData.notes = connectedNotes;
      }
      initializeProject(projectId, bounds, storeData);
    } else {
      console.log('[ProjectSwitch] No saved canvas, initializing empty');
      if (connectedNotes.length > 0) {
        initializeProject(projectId, bounds, { notes: connectedNotes } as any);
      } else {
        initializeProject(projectId, bounds);
      }
    }

    // 3. Update active project
    currentProjectIdRef.current = projectId;
    setActiveProjectId(projectId);
    localStorage.setItem(getActiveProjectStorageKey(eventIdFromUrl), projectId);
  }, [activeProjectId, isWorkflowOpen, projects, getCanvasData, storeSupabaseLayoutId, initializeProject, forceSave, workflowNotes, workflowConnections, eventIdFromUrl]);

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
    saveProjectsToStorage(updatedProjects, eventIdFromUrl);

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
    localStorage.setItem(getActiveProjectStorageKey(eventIdFromUrl), newProject.id);
    setNewlyCreatedProjectId(newProject.id);
  }, [projects, activeProjectId, getCanvasData, storeSupabaseLayoutId, initializeProject, eventIdFromUrl]);

  const handleNewLayoutConfirm = useCallback((flow: LayoutFlow) => {
    setNewLayoutModalOpen(false);
    if (flow === 'scratch') {
      // Open the Wall Maker on the current canvas — no new project needed
      setWallMakerTrigger(t => t + 1);
    } else if (flow === 'import') {
      setTimeout(() => setCustomUploadOpen(true), 80);
    } else if (flow === 'location') {
      setTimeout(() => gridCanvasRef.current?.openSatelliteModal(), 80);
    }
  }, []);

  const handleRenameProject = useCallback((projectId: string, newName: string) => {
    setProjects(prev => {
      const updated = prev.map(p =>
        p.id === projectId ? { ...p, name: newName } : p
      );
      saveProjectsToStorage(updated, eventIdFromUrl);
      return updated;
    });
    setNewlyCreatedProjectId(null);
  }, [eventIdFromUrl]);

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
    saveProjectsToStorage(updatedProjects, eventIdFromUrl);

    // Remove any workflow connections that reference this project
    const updatedConnections = workflowConnections.filter(
      c => c.fromCardId !== projectId && c.toCardId !== projectId
    );
    if (updatedConnections.length !== workflowConnections.length) {
      setWorkflowConnections(updatedConnections);
      localStorage.setItem(
        eventIdFromUrl ? `workflow-connections-${eventIdFromUrl}` : 'workflow-connections',
        JSON.stringify(updatedConnections)
      );
      if (eventIdFromUrl) {
        saveWorkflowData(eventIdFromUrl, workflowNotes, updatedConnections).catch(() => {});
      }
    }
  }, [projects, activeProjectId, handleProjectSelect, eventIdFromUrl, workflowConnections, workflowNotes]);

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

    // Anchor-based lighting tools: activate placement mode (two-click placement on canvas)
    if (elementType === 'string-lights' || elementType === 'bunting') {
      setActiveTool(elementType);
      setShowElementLibrary(false);
      return;
    }

    // New individual seat types → SeatingConfigModal
    const seatTypes: ElementType[] = [
      'seat-standard', 'seat-armchair', 'seat-chaise', 'seat-sofa-2',
      'seat-sofa-3', 'seat-bench', 'seat-barstool', 'seat-throne',
    ];
    if (seatTypes.includes(elementType)) {
      setSeatingModalType(elementType);
      setSeatingModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    if (elementType === 'ceremony-block') {
      setCeremonyModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    if (elementType === 'dance-floor') {
      setDanceFloorModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    if (elementType === 'stage') {
      setStageEditShapeId(null);
      setStageModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    if (elementType === 'altar') {
      setAltarEditShapeId(null);
      setAltarModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    if (elementType === 'pathway') {
      setPathwayEditShapeId(null);
      setPathwayModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    if (elementType === 'bar') {
      setBarEditShapeId(null);
      setBarModalOpen(true);
      setShowElementLibrary(false);
      return;
    }
    if (elementType === 'cocktail') {
      setCocktailEditShapeId(null);
      setCocktailModalOpen(true);
      setShowElementLibrary(false);
      return;
    }

    // AV equipment types → AVElementModal
    const avTypes = [
      'av-mixing-desk', 'av-speaker', 'av-subwoofer', 'av-truss', 'av-moving-head',
      'av-led-wall', 'av-screen', 'av-projector', 'av-light-console',
    ];
    if (avTypes.includes(elementType as string)) {
      setAvModalType(elementType as string);
      setAvEditShapeId(null);
      setAvModalOpen(true);
      setShowElementLibrary(false);
      return;
    }

    // Full Stage AV preset — place a collection of AV elements
    if (elementType === 'av-preset-full-stage') {
      const ppm = getEffectivePPM();
      const stageW = 6 * ppm, stageH = 1 * ppm;
      const cx = a4Bounds.x + a4Bounds.width / 2;
      const stageCy = a4Bounds.y + a4Bounds.height * 0.55;
      // Stage backdrop LED wall — 0.25m depth (top-down: thin strip)
      addElement({ type: 'rectangle', x: cx - stageW / 2, y: stageCy - 2 * ppm, width: stageW, height: 0.25 * ppm,
        fill: '#0a0a0a', stroke: '#3b82f6', strokeWidth: 1.5, rotation: 0,
        elementType: 'av-led-wall', label: 'LED Wall',
        avData: { type: 'av-led-wall', widthM: 6, heightM: 0.25, label: 'LED Wall', labelVisible: false, screenAspect: '16:9' } as any, color: null } as any);
      // Truss
      addElement({ type: 'rectangle', x: cx - stageW / 2, y: stageCy - 3.5 * ppm, width: stageW, height: 0.3 * ppm,
        fill: '#aaa', stroke: '#888', strokeWidth: 1.5, rotation: 0,
        elementType: 'av-truss', label: 'Front Truss',
        avData: { type: 'av-truss', widthM: 6, heightM: 0.3, label: 'Front Truss', labelVisible: false } as any, color: null } as any);
      // Stage platform
      addElement({ type: 'rectangle', x: cx - stageW / 2, y: stageCy, width: stageW, height: stageH,
        fill: '#1a1a1a', stroke: '#555', strokeWidth: 1.5, rotation: 0,
        elementType: 'av-screen', label: 'Stage',
        avData: { type: 'av-screen', widthM: 6, heightM: 1, label: 'Stage', labelVisible: false } as any, color: null } as any);
      // Mixing desk (FOH)
      addElement({ type: 'rectangle', x: cx - 0.6 * ppm, y: stageCy + 3 * ppm, width: 1.2 * ppm, height: 0.8 * ppm,
        fill: '#2a2a2a', stroke: '#3b82f6', strokeWidth: 1.5, rotation: 0,
        elementType: 'av-mixing-desk', label: 'FOH Desk',
        avData: { type: 'av-mixing-desk', widthM: 1.2, heightM: 0.8, label: 'FOH Desk', labelVisible: false, channels: 24 } as any, color: null } as any);
      // Left speaker
      addElement({ type: 'rectangle', x: cx - stageW / 2 - 0.4 * ppm, y: stageCy - 0.2 * ppm, width: 0.4 * ppm, height: 0.6 * ppm,
        fill: '#1a1a1a', stroke: '#555', strokeWidth: 1.5, rotation: 0,
        elementType: 'av-speaker', label: 'PA L',
        avData: { type: 'av-speaker', widthM: 0.4, heightM: 0.6, label: 'PA L', labelVisible: false } as any, color: null } as any);
      // Right speaker
      addElement({ type: 'rectangle', x: cx + stageW / 2, y: stageCy - 0.2 * ppm, width: 0.4 * ppm, height: 0.6 * ppm,
        fill: '#1a1a1a', stroke: '#555', strokeWidth: 1.5, rotation: 0,
        elementType: 'av-speaker', label: 'PA R',
        avData: { type: 'av-speaker', widthM: 0.4, heightM: 0.6, label: 'PA R', labelVisible: false } as any, color: null } as any);
      setShowElementLibrary(false);
      return;
    }

    // Legacy chair: open placement modal
    if (elementType === 'chair') {
      setPlacementElementType(elementType);
      setPlacementElementLabel('Chair');
      setPlacementElementWidth(0.45);
      setPlacementElementHeight(0.45);
      setPlacementModalOpen(true);
      setShowElementLibrary(false);
      return;
    }

    // Zone, service, and decoration elements: add directly to canvas at A4 center
    const defaults = getElementDefault(elementType);
    const ppm = getEffectivePPM();
    const widthPx = defaults.width * ppm;
    const heightPx = defaults.height * ppm;
    const currentA4 = useCanvasStore.getState().a4Bounds;
    const centerX = currentA4 ? currentA4.x + (currentA4.width / 2) - (widthPx / 2) : 200;
    const centerY = currentA4 ? currentA4.y + (currentA4.height / 2) - (heightPx / 2) : 200;

    const zoneColors: Record<string, { fill: string; stroke: string }> = {
      'dance-floor': { fill: 'rgba(255,228,181,0.5)', stroke: '#DEB887' },
      'stage': { fill: 'rgba(221,160,221,0.5)', stroke: '#BA55D3' },
      'cocktail-area': { fill: 'rgba(152,251,152,0.5)', stroke: '#32CD32' },
      'ceremony-area': { fill: 'rgba(230,230,250,0.5)', stroke: '#9370DB' },
    };
    const serviceColors: Record<string, { fill: string; stroke: string }> = {
      'bar': { fill: '#8B4513', stroke: '#654321' },
      'buffet': { fill: '#F5DEB3', stroke: '#D2B48C' },
      'cake-table': { fill: '#FFB6C1', stroke: '#FF69B4' },
      'gift-table': { fill: '#87CEEB', stroke: '#4682B4' },
      'dj-booth': { fill: '#2F2F2F', stroke: '#1A1A1A' },
    };
    const decorationColors: Record<string, { fill: string; stroke: string }> = {
      'flower-arrangement': { fill: '#FFB7C5', stroke: '#FF69B4' },
      'photo-booth': { fill: '#F0E68C', stroke: '#DAA520' },
      'arch': { fill: '#D4AF37', stroke: '#B8860B' },
    };
    const colors = zoneColors[elementType] || serviceColors[elementType] || decorationColors[elementType] || { fill: '#CCCCCC', stroke: '#999999' };

    addElement({
      type: 'rectangle' as const,
      x: centerX,
      y: centerY,
      width: widthPx,
      height: heightPx,
      rotation: 0,
      fill: colors.fill,
      stroke: colors.stroke,
      strokeWidth: 2,
      elementType,
      label: defaults.label || elementType,
    } as any);
    setShowElementLibrary(false);
  }, [addElement]);

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
    const ppmValue = getEffectivePPM();
    const tableSizePx = diameterInMeters * ppmValue;
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
      const chairSizePx = 0.45 * ppmValue;
      const chairRadius = (tableSizePx / 2) + (0.1 * ppmValue);

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
    const ppmValue = getEffectivePPM();
    const tableWidthPx = widthInMeters * ppmValue;
    const tableHeightPx = heightInMeters * ppmValue;
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
      const chairSizePx = 0.45 * ppmValue;
      const chairOffset = 0.12 * ppmValue;

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
    const ppmValue = getEffectivePPM();
    const tableSizePx = sizeInMeters * ppmValue;
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
      const chairSizePx = 0.45 * ppmValue;
      const chairOffset = 0.12 * ppmValue;

      // Distribute seats across 4 sides (top, bottom, right, left)
      const baseSeatsPerSide = Math.floor(seats / 4);
      const extraSeats = seats % 4;
      // Distribute extra seats: top gets first extra, bottom gets second, right gets third, left gets fourth
      const seatsOnSide = [
        baseSeatsPerSide + (extraSeats > 0 ? 1 : 0), // top
        baseSeatsPerSide + (extraSeats > 1 ? 1 : 0), // bottom
        baseSeatsPerSide + (extraSeats > 2 ? 1 : 0), // right
        baseSeatsPerSide + (extraSeats > 3 ? 1 : 0), // left
      ];

      let seatIndex = 0;
      for (let side = 0; side < 4; side++) {
        const seatsThisSide = seatsOnSide[side] ?? 0;
        for (let k = 0; k < seatsThisSide; k++) {
          let chairX = 0;
          let chairY = 0;

          // Calculate position along the side (0 to 1)
          const positionAlongSide = seatsThisSide > 1
            ? k / (seatsThisSide - 1)
            : 0.5;

          if (side === 0) {
            // Top side - chairs above the table, distributed horizontally
            chairX = tableX + positionAlongSide * (tableSizePx - chairSizePx);
            chairY = tableY - chairOffset - chairSizePx / 2;
          } else if (side === 1) {
            // Bottom side - chairs below the table, distributed horizontally
            chairX = tableX + positionAlongSide * (tableSizePx - chairSizePx);
            chairY = tableY + tableSizePx + chairOffset - chairSizePx / 2;
          } else if (side === 2) {
            // Right side - chairs to the right of table, distributed vertically
            chairX = tableX + tableSizePx + chairOffset - chairSizePx / 2;
            chairY = tableY + positionAlongSide * (tableSizePx - chairSizePx);
          } else if (side === 3) {
            // Left side - chairs to the left of table, distributed vertically
            chairX = tableX - chairOffset - chairSizePx / 2;
            chairY = tableY + positionAlongSide * (tableSizePx - chairSizePx);
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
              seatIndex: seatIndex,
              assignedGuestId: null,
              assignedGuestName: null,
              dietaryType: null,
            },
          });
          chairIds.push(chairId);
          seatIndex++;
        }
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
    const ppmValue = getEffectivePPM();
    const tableWidthPx = widthInMeters * ppmValue;
    const tableHeightPx = heightInMeters * ppmValue;
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
      const chairSizePx = 0.45 * ppmValue;
      const chairOffset = 0.12 * ppmValue;

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

  // Build projects with canvas data for workflow preview and load connected notes
  const projectsWithCanvasData = useMemo(() => {
    console.log('[DEBUG] memo running — workflowConnections:', workflowConnections.length, 'workflowNotes:', workflowNotes.length);
    const emptyCanvasData = {
      drawings: [],
      shapes: [],
      textElements: [],
      walls: [],
      doors: [],
      powerPoints: [],
      viewBox: { x: 0, y: 0, width: 800, height: 1132 },
      notes: [],
    };

    return projects.map(p => {
      // Find notes connected to this project from workflow
      console.log('[DEBUG] checking project', p.id, 'type:', typeof p.id);
      console.log('[DEBUG] workflowConnections at memo time:', workflowConnections.length, workflowConnections.map(c => ({ from: c.fromCardId, to: c.toCardId })));
      console.log('[DEBUG] p.id:', p.id, typeof p.id, '| sample toCardId:', workflowConnections[0]?.toCardId, typeof workflowConnections[0]?.toCardId);
      const connectedNoteIds = workflowConnections
        .filter(c => c.toCardId === p.id && c.fromCardId.startsWith('note-'))
        .map(c => c.fromCardId.replace('note-', ''));
      console.log('[DEBUG] connectedNoteIds:', connectedNoteIds);
      console.log('[DEBUG] project', p.id, 'connectedNoteIds:', connectedNoteIds);

      const connectedNotes = workflowNotes
        .filter(n => connectedNoteIds.includes(n.id))
        .map(n => ({
          id: n.id,
          content: n.content,
          color: n.color,
          width: n.width,
          height: n.height,
        }));

      // For the active project, get current store data
      if (p.id === activeProjectId) {
        // Save current data to localStorage first so we have the latest
        const currentData = getCanvasData();
        const data = currentData || emptyCanvasData;
        return {
          ...p,
          canvasData: {
            ...data,
            notes: connectedNotes.length > 0 ? connectedNotes : (data.notes || []),
          },
        };
      }

      // For other projects, load from localStorage
      const savedCanvas = loadCanvasFromLocalStorage(p.id);
      console.log('[BG-DEBUG]', p.name, 'id:', p.id,
        '| bgimage key len:', localStorage.getItem(`layout-maker-canvas-${p.id}__bgimage`)?.length ?? 0,
        '| dedicated bg key len:', localStorage.getItem(`layout-maker-bg-${p.id}`)?.length ?? 0,
        '| satellite in loaded data:', !!savedCanvas?.satelliteBackground?.imageBase64,
        '| shapes count:', savedCanvas?.shapes?.length ?? 0);
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
            satelliteBackground: savedCanvas.satelliteBackground || null,
            notes: connectedNotes.length > 0 ? connectedNotes : (savedCanvas.notes || []),
          },
        };
      }

      return { 
        ...p, 
        canvasData: {
          ...emptyCanvasData,
          notes: connectedNotes,
        } 
      };
    });
  }, [projects, activeProjectId, getCanvasData, workflowConnections, workflowNotes]);

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

  const handleLayoutsAssociated = useCallback((assocEventId: string) => {
    setProjects(prev => {
      const updated = prev.map(p =>
        recentlySavedLayoutIds.includes(p.supabaseLayoutId || '')
          ? { ...p, eventId: assocEventId }
          : p
      );
      saveProjectsToStorage(updated, eventIdFromUrl);
      return updated;
    });
    setShowAssociateModal(false);
    setRecentlySavedLayoutIds([]);
  }, [recentlySavedLayoutIds, eventIdFromUrl]);

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
    saveProjectsToStorage(projects, eventIdFromUrl);
  }, [projects, eventIdFromUrl]);

  // Save canvas on unmount - use refs to get current values
  useEffect(() => {
    return () => {
      const canvasData = getCanvasDataRef.current();
      saveCanvasToLocalStorage(currentProjectIdRef.current, {
        ...canvasData,
        supabaseLayoutId: useCanvasStore.getState().supabaseLayoutId,
      });
    };
  }, []); // Empty deps - cleanup only runs on unmount

  // Save canvas when the page is refreshed or closed (beforeunload fires before React unmount)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isInitializedRef.current) return;
      const canvasData = getCanvasDataRef.current();
      // Read supabaseLayoutId directly from store — the ref may lag by one render
      saveCanvasToLocalStorage(currentProjectIdRef.current, {
        ...canvasData,
        supabaseLayoutId: useCanvasStore.getState().supabaseLayoutId,
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
            activeTool={viewMode ? 'hand' : activeTool}
            onToolChange={setActiveTool}
            projectId={activeProjectId}
            a4Dimensions={activeProject.a4Dimensions || getInitialA4Dimensions()}
            brushSize={brushSize}
            brushColor={brushColor}
            isViewMode={viewMode}
            hiddenCategories={hiddenCategories}
            onShapeDoubleClick={handleShapeDoubleClick}
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
        {!viewMode && (
          <HeaderBar
            onSaveCurrentLayout={forceSave}
            onSaveAllLayouts={forceSave}
            isSaving={syncStatus === 'syncing'}
            projectCount={projects.length}
            {...(eventInfo !== null ? { eventInfo } : {})}
          />
        )}

        {!viewMode && !isWorkflowOpen && (
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
              onOpenSatelliteModal={() => gridCanvasRef.current?.openSatelliteModal()}
              onOpenCustomUploadModal={() => setCustomUploadOpen(true)}
              onNewLayout={() => setNewLayoutModalOpen(true)}
              openWallMakerTrigger={wallMakerTrigger}
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
                border: showElementLibrary ? '2px solid #0f172a' : '1px solid #e0e0e0',
                background: showElementLibrary ? '#0f172a' : 'white',
                color: showElementLibrary ? 'white' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: showElementLibrary
                  ? '0 4px 12px rgba(15, 23, 42, 0.4)'
                  : '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10001,
                transition: 'all 0.2s ease',
                pointerEvents: 'auto',
              }}
              title={showElementLibrary ? 'Hide Elements' : 'Show Elements'}
              onMouseEnter={(e) => {
                if (!showElementLibrary) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#0f172a';
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
                        background: '#0f172a',
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
                      onOpenPlacementModal={handleOpenPlacementModal}
                      customTemplates={customTemplates}
                      hiddenCategories={hiddenCategories}
                      onToggleCategoryVisibility={handleToggleCategoryVisibility}
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

      {/* Export Button */}
      {!viewMode && !isWorkflowOpen && (
        <div style={{ position: 'fixed', top: 20, right: 178, zIndex: 20051 }}>
          <ExportButton
            svgRef={exportSvgRef}
            a4Bounds={a4Bounds ? { x: a4Bounds.x, y: a4Bounds.y, width: a4Bounds.width, height: a4Bounds.height } : null}
            layoutName={activeProject.name}
          />
        </div>
      )}

      {/* Build Guide Button */}
      {!viewMode && !isWorkflowOpen && (
        <div style={{ position: 'fixed', top: 20, right: 290, zIndex: 20051 }}>
          <BuildGuideButton
            eventId={activeProject.eventId || eventIdFromUrl || ''}
            eventName={activeProject.name}
            layouts={projectsWithCanvasData.map(p => ({
              layoutId: p.id,
              layoutName: p.name,
              spaceName: p.category || 'Layout',
              included: true,
              pageSize: 'half',
              shapes: p.canvasData?.shapes || [],
              walls: p.canvasData?.walls || [],
              viewBox: p.canvasData?.viewBox || { x: 0, y: 0, width: 800, height: 600 },
              satelliteBackground: (p.canvasData as any)?.satelliteBackground ?? undefined,
              elementVisibility: [
                { category: 'tables', visible: true },
                { category: 'seating', visible: true },
                { category: 'ceremony', visible: true },
                { category: 'entertainment', visible: true },
                { category: 'service', visible: true },
                { category: 'decor', visible: true },
                { category: 'lighting', visible: true },
                { category: 'custom', visible: true },
              ],
              includeLegend: true,
              includeDimensions: true,
              includeNotes: (p.canvasData?.notes?.length ?? 0) > 0,
              includeTasks: true,
              notes: (() => {
                const n = (p.canvasData?.notes || []).map(note => ({
                  id: note.id,
                  content: note.content,
                  color: note.color,
                  included: true,
                }));
                console.log('[DEBUG] layout notes for', p.id, p.name, n);
                return n;
              })(),
              tasks: [],
            }))}
            spaceNames={spaceOptions.map(s => s.label)}
          />
        </div>
      )}

      {/* View Mode Toggle Button - Outside the pointerEvents:none container */}
      {!viewMode && (
        <button
          type="button"
          onClick={() => setViewMode(true)}
          style={{
            position: 'fixed',
            top: 20,
            right: 128,
            zIndex: 20051,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '1px solid #e0e0e0',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          title="View Mode (Press V)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}

      {viewMode && (
        <button
          type="button"
          onClick={() => setViewMode(false)}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 20051,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e0e0e0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Exit View Mode (Press Esc)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      <AssistantChat eventContext={eventInfo ? { eventName: eventInfo.title, eventDate: eventInfo.weddingDate } : undefined} />

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

      <CustomElementModal
        isOpen={customElementModalOpen}
        onClose={() => {
          setCustomElementModalOpen(false);
          setEditingCustomTemplate(null);
        }}
        onSave={handleSaveCustomTemplate}
        onAddToCanvas={handleAddCustomToCanvas}
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

      <SeatingConfigModal
        isOpen={seatingModalOpen}
        onClose={() => { setSeatingModalOpen(false); setSeatingEditingShapeId(null); }}
        elementType={seatingModalType}
        onPlaceSeats={handlePlaceSeats}
        pixelsPerMeter={getEffectivePPM()}
        editingShape={seatingEditingShapeId ? (() => {
          const s = useCanvasStore.getState().elements[seatingEditingShapeId];
          if (!s) return null;
          return {
            id: seatingEditingShapeId,
            elementType: (s as any).elementType ?? seatingModalType,
            widthPx: s.width,
            heightPx: s.height,
            fill: s.fill || '#D4C5B0',
            label: (s as any).label,
          };
        })() : null}
        onUpdateSeat={handleUpdateSeat}
      />

      <CeremonySeatingModal
        isOpen={ceremonyModalOpen}
        onClose={() => setCeremonyModalOpen(false)}
        onPlaceCeremony={handlePlaceCeremony}
      />

      <DanceFloorConfigModal
        isOpen={danceFloorModalOpen}
        onClose={() => setDanceFloorModalOpen(false)}
        onPlace={handlePlaceDanceFloor}
      />

      <StageConfigModal
        key={stageEditShapeId ?? 'new-stage'}
        isOpen={stageModalOpen}
        onClose={() => { setStageModalOpen(false); setStageEditShapeId(null); }}
        onPlace={handlePlaceStage}
        initialData={
          stageEditShapeId
            ? (useCanvasStore.getState().elements[stageEditShapeId] as any)?.stageData
            : undefined
        }
      />

      <AltarConfigModal
        key={altarEditShapeId ?? 'new-altar'}
        isOpen={altarModalOpen}
        onClose={() => { setAltarModalOpen(false); setAltarEditShapeId(null); }}
        onPlace={handlePlaceAltar}
        initialData={
          altarEditShapeId
            ? (useCanvasStore.getState().elements[altarEditShapeId] as any)?.altarData
            : undefined
        }
      />

      <BarConfigModal
        key={barEditShapeId ?? 'new-bar'}
        isOpen={barModalOpen}
        onClose={() => { setBarModalOpen(false); setBarEditShapeId(null); }}
        onPlace={handlePlaceBar}
        initialData={
          barEditShapeId
            ? (useCanvasStore.getState().elements[barEditShapeId] as any)?.barData
            : undefined
        }
      />

      <CocktailConfigModal
        key={cocktailEditShapeId ?? 'new-cocktail'}
        isOpen={cocktailModalOpen}
        onClose={() => { setCocktailModalOpen(false); setCocktailEditShapeId(null); }}
        onPlace={handlePlaceCocktail}
        initialData={
          cocktailEditShapeId
            ? (useCanvasStore.getState().elements[cocktailEditShapeId] as any)?.cocktailData
            : undefined
        }
      />

      <PathwayConfigModal
        key={pathwayEditShapeId ?? 'new-pathway'}
        isOpen={pathwayModalOpen}
        onClose={() => { setPathwayModalOpen(false); setPathwayEditShapeId(null); }}
        onPlace={handlePlacePathway}
        initialData={
          pathwayEditShapeId
            ? (useCanvasStore.getState().elements[pathwayEditShapeId] as any)?.pathwayData
            : undefined
        }
      />

      <AVElementModal
        key={avEditShapeId ?? `new-av-${avModalType}`}
        isOpen={avModalOpen}
        avType={avModalType}
        onClose={() => { setAvModalOpen(false); setAvEditShapeId(null); }}
        onPlace={handlePlaceAV}
        onUpdate={handleUpdateAV}
        editingData={
          avEditShapeId
            ? (useCanvasStore.getState().elements[avEditShapeId] as any)?.avData ?? null
            : null
        }
      />

      {showElectricalDashboard && (
        <ElectricalDashboard
          electricalProjectId={electricalProjectId}
          powerPoints={currentPowerPoints}
          onZoomToPoints={handleZoomToPoints}
          onClose={() => setShowElectricalDashboard(false)}
        />
      )}

      {/* New Layout Modal — pick how to start: scratch / import / location */}
      <NewLayoutModal
        isOpen={newLayoutModalOpen}
        onClose={() => setNewLayoutModalOpen(false)}
        onConfirm={handleNewLayoutConfirm}
      />

      {/* Custom Upload Modal - managed here to avoid ref chain issues */}
      <CustomUploadModal
        isOpen={customUploadOpen}
        onClose={() => setCustomUploadOpen(false)}
        a4WidthPx={activeProject.a4Dimensions?.a4WidthPx ?? 794}
        {...(customBackground ? { initialData: customBackground } : {})}
      />

      {/* Custom Background Info Chip - shown when a custom background is active */}
      {customBackground && !customUploadOpen && (
        <CustomBackgroundInfoChip
          background={customBackground}
          onEdit={() => setCustomUploadOpen(true)}
          onClear={clearCustomBackground}
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
          connections={workflowConnections}
          onConnectionsChange={handleWorkflowConnectionsChange}
          notes={workflowNotes}
          onNotesChange={handleWorkflowNotesChange}
          tasks={workflowTasks}
          onTasksChange={handleWorkflowTasksChange}
          eventId={eventIdFromUrl || ''}
        />
      )}
    </div>
  );
};

export default LayoutMakerPageStore;
