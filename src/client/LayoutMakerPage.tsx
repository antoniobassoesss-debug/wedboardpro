import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import GridCanvas from './GridCanvas';
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
import ZoomControls from './components/ZoomControls';
import {
  saveLayout,
  saveMultipleLayouts,
  getOrCreateLayoutForEvent,
  isLayoutFileData,
  type SaveLayoutInput,
  type LayoutRecord,
  type LayoutFileData,
  type LayoutTab,
} from './api/layoutsApi';
import { getEvent, type Event } from './api/eventsPipelineApi';
import type { Wall, Door } from './types/wall.js';
import type { PowerPoint } from './types/powerPoint';

export interface Project {
  id: string;
  name: string;
  canvasData: {
    drawings: any[];
    shapes: any[];
    textElements: any[];
    walls?: Wall[];
    doors?: Door[];
    powerPoints?: PowerPoint[];
    viewBox: { x: number; y: number; width: number; height: number };
  };
  a4Dimensions?: A4Dimensions;
  supabaseLayoutId?: string;
  eventId?: string;
  category?: string;
  tags?: string[];
  description?: string;
}

const STORAGE_KEY = 'layout-maker-projects';
const STORAGE_ACTIVE_PROJECT_KEY = 'layout-maker-active-project-id';

const saveProjectsToStorage = (projects: Project[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Error saving projects to localStorage:', error);
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

  const defaultA4 = getInitialA4Dimensions();
  return [{
    id: '1',
    name: 'Project 1',
    canvasData: {
      drawings: [],
      shapes: [],
      textElements: [],
      walls: [],
      doors: [],
      powerPoints: [],
      viewBox: { x: 0, y: 0, width: 0, height: 0 },
    },
    a4Dimensions: defaultA4,
  }];
};

const LayoutMakerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get('eventId');

  const [activeTool, setActiveTool] = useState<string>('hand');
  const [brushSize, setBrushSize] = useState<number>(2);
  const [brushColor, setBrushColor] = useState<string>('#000000');

  // Event info state (when opened for a specific event)
  const [eventInfo, setEventInfo] = useState<{ title: string; weddingDate?: string } | null>(null);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<Project[]>(() => loadProjectsFromStorage());
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACTIVE_PROJECT_KEY);
      if (stored) {
        const loadedProjects = loadProjectsFromStorage();
        if (loadedProjects.find(p => p.id === stored)) {
          return stored;
        }
      }
    } catch (error) {
      console.error('Error loading active project ID:', error);
    }
    return '1';
  });
  const [newlyCreatedProjectId, setNewlyCreatedProjectId] = useState<string | null>(null);
  
  const currentCanvasDataRef = useRef<Project['canvasData'] | null>(null);
  const refProjectIdRef = useRef<string>('1');
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

  const [showElectricalDashboard, setShowElectricalDashboard] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAssociateModal, setShowAssociateModal] = useState<boolean>(false);
  const [recentlySavedLayoutIds, setRecentlySavedLayoutIds] = useState<string[]>([]);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState<boolean>(false);
  const [workflowPositions, setWorkflowPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const stored = localStorage.getItem('workflow-positions');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      console.error('Error loading workflow positions');
    }
    return {};
  });

  const handleWorkflowPositionsChange = useCallback((positions: Record<string, { x: number; y: number }>) => {
    setWorkflowPositions(positions);
    localStorage.setItem('workflow-positions', JSON.stringify(positions));
  }, []);

  const handleReorderProjects = useCallback((fromIndex: number, toIndex: number) => {
    setProjects(prevProjects => {
      const updated = [...prevProjects];
      const [removed] = updated.splice(fromIndex, 1);
      if (removed) {
        updated.splice(toIndex, 0, removed);
      }
      saveProjectsToStorage(updated);
      return updated;
    });
  }, []);

  const handleOpenWorkflow = useCallback(() => {
    setIsWorkflowOpen(true);
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || {
    id: '1',
    name: 'Project 1',
    canvasData: {
      drawings: [],
      shapes: [],
      textElements: [],
      walls: [],
      doors: [],
      powerPoints: [],
      viewBox: { x: 0, y: 0, width: 1000, height: 1000 }
    }
  };
  
  const electricalProjectId = activeProject?.supabaseLayoutId || 'demo-electrical-project';
  
  const deepCopyCanvasData = useCallback((data: Project['canvasData']): Project['canvasData'] => {
    return {
      drawings: JSON.parse(JSON.stringify(data.drawings || [])),
      shapes: JSON.parse(JSON.stringify(data.shapes || [])),
      textElements: JSON.parse(JSON.stringify(data.textElements || [])),
      walls: JSON.parse(JSON.stringify(data.walls || [])),
      doors: JSON.parse(JSON.stringify(data.doors || [])),
      powerPoints: JSON.parse(JSON.stringify(data.powerPoints || [])),
      viewBox: { ...data.viewBox },
    };
  }, []);

  const handleSaveCurrentLayout = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const currentData = currentCanvasDataRef.current;
      const layoutToSave = currentData || activeProject.canvasData;
      const saveInput: SaveLayoutInput = {
        name: activeProject.name,
        tags: activeProject.tags || [],
        canvasData: layoutToSave,
      };
      if (activeProject.description) saveInput.description = activeProject.description;
      if (activeProject.category) saveInput.category = activeProject.category;
      if (activeProject.eventId) saveInput.eventId = activeProject.eventId;

      const result = await saveLayout(saveInput);
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to save layout');
      }
      const savedData = result.data;
      setProjects(prev => prev.map(p =>
        p.id === activeProjectId
          ? { ...p, supabaseLayoutId: savedData.id }
          : p
      ));
      setSaveStatus('saved');
      console.log('[LayoutMakerPage] Layout saved to Supabase:', savedData.id);
      if (!activeProject.eventId && savedData.id) {
        setRecentlySavedLayoutIds([savedData.id]);
      }
    } catch (error) {
      console.error('[LayoutMakerPage] Error saving layout:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to save layout');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, activeProject, activeProjectId]);

  const handleSaveAllLayouts = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const layoutsToSave: SaveLayoutInput[] = projects.map(p => {
        const input: SaveLayoutInput = {
          name: p.name,
          tags: p.tags || [],
          canvasData: deepCopyCanvasData(p.canvasData),
        };
        if (p.description) input.description = p.description;
        if (p.category) input.category = p.category;
        if (p.eventId) input.eventId = p.eventId;
        return input;
      });
      const result = await saveMultipleLayouts(layoutsToSave);
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to save layouts');
      }
      const savedIds = result.data.map((saved: LayoutRecord) => saved.id);
      setSaveStatus('saved');
      console.log('[LayoutMakerPage] All layouts saved to Supabase:', result.data.length);
      const anyWithoutEvent = projects.some(p => !p.eventId);
      if (anyWithoutEvent && savedIds.length > 0) {
        setRecentlySavedLayoutIds(savedIds);
        setShowAssociateModal(true);
      }
    } catch (error) {
      console.error('[LayoutMakerPage] Error saving all layouts:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to save layouts');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, projects, deepCopyCanvasData]);

  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => {
        setSaveStatus('idle');
        setRecentlySavedLayoutIds([]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus, recentlySavedLayoutIds]);

  const handleCanvasDataChange = useCallback((newData: Project['canvasData'], projectId: string) => {
    currentCanvasDataRef.current = newData;
    refProjectIdRef.current = projectId;
  }, []);

  const handleProjectSelect = useCallback((projectId: string) => {
    if (isWorkflowOpen) {
      setIsWorkflowOpen(false);
    }
    if (currentCanvasDataRef.current && 
        refProjectIdRef.current === activeProjectId && 
        activeProjectId !== projectId) {
      const canvasDataToSave = deepCopyCanvasData(currentCanvasDataRef.current);
      setProjects(prevProjects => {
        const updated = prevProjects.map(project =>
          project.id === activeProjectId
            ? { ...project, canvasData: canvasDataToSave }
            : project
        );
        saveProjectsToStorage(updated);
        return updated;
      });
    }
    setActiveProjectId(projectId);
    localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, projectId);
  }, [activeProjectId, deepCopyCanvasData, isWorkflowOpen]);

  const handleProjectHighlight = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, projectId);
  }, []);

  const handleNewProject = useCallback(() => {
    const nextProjectNumber = projects.length + 1;
    const defaultA4 = getInitialA4Dimensions();
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Project ${nextProjectNumber}`,
      canvasData: {
        drawings: [],
        shapes: [],
        textElements: [],
        walls: [],
        doors: [],
        powerPoints: [],
        viewBox: { x: 0, y: 0, width: 0, height: 0 },
      },
      a4Dimensions: defaultA4,
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    setActiveProjectId(newProject.id);
    localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, newProject.id);
    setNewlyCreatedProjectId(newProject.id);
  }, [projects]);

  const handleDeleteProject = useCallback((projectId: string) => {
    if (projects.length <= 1) return;
    const updated = projects.filter(p => p.id !== projectId);
    setProjects(updated);
    saveProjectsToStorage(updated);
    if (activeProjectId === projectId && updated[0]) {
      setActiveProjectId(updated[0].id);
      localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, updated[0].id);
    }
  }, [projects, activeProjectId]);

  const handleRenameProject = useCallback((projectId: string, newName: string) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, name: newName } : p
    ));
    saveProjectsToStorage;
  }, []);

  const handleCloseAssociateModal = useCallback(() => {
    setShowAssociateModal(false);
    setRecentlySavedLayoutIds([]);
  }, []);

  const handleLayoutsAssociated = useCallback(() => {
    setShowAssociateModal(false);
    setRecentlySavedLayoutIds([]);
  }, []);

  const spaceOptions = useMemo(() => {
    const shapes = activeProject?.canvasData?.shapes || [];
    return shapes
      .filter((s: any) => s.type === 'rectangle' && s.spaceMetersWidth)
      .map((s: any) => ({
        id: s.id,
        name: s.name || `${s.spaceMetersWidth}m × ${s.spaceMetersHeight}m`,
        width: s.spaceMetersWidth,
        height: s.spaceMetersHeight,
      }));
  }, [activeProject]);

  const currentPowerPoints = useMemo(() => {
    if (refProjectIdRef.current === activeProjectId) {
      return currentCanvasDataRef.current?.powerPoints || [];
    }
    return activeProject?.canvasData?.powerPoints || [];
  }, [activeProject, activeProjectId]);

  const handleZoomToPoints = useCallback((points: { x: number; y: number }[]) => {
    gridCanvasRef.current?.zoomToPoints(points);
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

  useEffect(() => {
    saveProjectsToStorage(projects);
  }, [projects]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Load event info and layout when eventId is in URL
  useEffect(() => {
    if (!eventIdFromUrl) {
      setEventInfo(null);
      setCurrentLayoutId(null);
      return;
    }

    const loadEventData = async () => {
      try {
        // Load event info
        const eventResult = await getEvent(eventIdFromUrl);
        if (eventResult.data) {
          setEventInfo({
            title: eventResult.data.title,
            weddingDate: eventResult.data.wedding_date,
          });
        }

        // Load or create layout for this event
        const layoutResult = await getOrCreateLayoutForEvent(
          eventIdFromUrl,
          eventResult.data?.title || 'Event Layout'
        );

        if (layoutResult.data) {
          setCurrentLayoutId(layoutResult.data.id);

          // Convert layout data to projects format
          const canvasData = layoutResult.data.canvas_data;
          if (isLayoutFileData(canvasData)) {
            // New format with tabs
            const fileData = canvasData as LayoutFileData;
            const loadedProjects: Project[] = fileData.tabs.map((tab: LayoutTab) => {
              const project: Project = {
                id: tab.id,
                name: tab.name,
                canvasData: {
                  drawings: tab.canvas.drawings || [],
                  shapes: tab.canvas.shapes || [],
                  textElements: tab.canvas.textElements || [],
                  walls: tab.canvas.walls || [],
                  doors: tab.canvas.doors || [],
                  powerPoints: tab.canvas.powerPoints || [],
                  viewBox: tab.canvas.viewBox || { x: 0, y: 0, width: 0, height: 0 },
                },
                a4Dimensions: tab.a4Dimensions || getInitialA4Dimensions(),
                supabaseLayoutId: layoutResult.data!.id,
                eventId: eventIdFromUrl,
              };
              if (tab.category) {
                project.category = tab.category;
              }
              return project;
            });

            if (loadedProjects.length > 0) {
              setProjects(loadedProjects);
              const firstProject = loadedProjects[0];
              if (firstProject) {
                setActiveProjectId(fileData.activeTabId || firstProject.id);
              }
              if (fileData.workflowPositions) {
                setWorkflowPositions(fileData.workflowPositions);
              }
            }
          } else {
            // Legacy single canvas format - convert to tab
            const legacyData = canvasData;
            const projectId = `tab-${Date.now()}`;
            const project: Project = {
              id: projectId,
              name: 'Main Layout',
              canvasData: {
                drawings: legacyData.drawings || [],
                shapes: legacyData.shapes || [],
                textElements: legacyData.textElements || [],
                walls: legacyData.walls || [],
                doors: legacyData.doors || [],
                powerPoints: [],
                viewBox: legacyData.viewBox || { x: 0, y: 0, width: 0, height: 0 },
              },
              a4Dimensions: getInitialA4Dimensions(),
              supabaseLayoutId: layoutResult.data!.id,
              eventId: eventIdFromUrl,
            };
            setProjects([project]);
            setActiveProjectId(projectId);
          }
        }
      } catch (err) {
        console.error('[LayoutMakerPage] Error loading event data:', err);
      }
    };

    loadEventData();
  }, [eventIdFromUrl]);

  if (isInitialLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
      }}>
        <img src="/loadinglogo.png" alt="Loading" style={{ width: '160px', height: 'auto' }} />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem'
      }}>
        <h2>Error: No projects available</h2>
        <button 
          onClick={() => {
            const defaultProject: Project = {
              id: '1',
              name: 'Project 1',
              canvasData: {
                drawings: [],
                shapes: [],
                textElements: [],
                walls: [],
                doors: [],
                powerPoints: [],
                viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
              },
            };
            setProjects([defaultProject]);
            setActiveProjectId('1');
          }}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#0f172a',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Create Default Project
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
      
      <InfiniteGridBackground />

      {!isWorkflowOpen && (
        <ErrorBoundary>
          <GridCanvas 
            ref={gridCanvasRef}
            activeTool={activeTool} 
            onToolChange={setActiveTool}
            projectId={activeProjectId}
            projectData={{
              drawings: activeProject.canvasData.drawings || [],
              shapes: activeProject.canvasData.shapes || [],
              textElements: activeProject.canvasData.textElements || [],
              walls: activeProject.canvasData.walls || [],
              doors: activeProject.canvasData.doors || [],
              powerPoints: activeProject.canvasData.powerPoints || [],
              viewBox: activeProject.canvasData.viewBox || { x: 0, y: 0, width: 1000, height: 1000 },
            }}
            a4Dimensions={activeProject.a4Dimensions || getInitialA4Dimensions()}
            onDataChange={handleCanvasDataChange}
            brushSize={brushSize}
            brushColor={brushColor}
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
          onSaveCurrentLayout={handleSaveCurrentLayout}
          onSaveAllLayouts={handleSaveAllLayouts}
          isSaving={isSaving}
          projectCount={projects.length}
          {...(eventInfo ? { eventInfo } : {})}
        />
        
        {!isWorkflowOpen && (
          <Toolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onAddSpace={() => gridCanvasRef.current?.addSpace(12, 8)}
            onAddTable={(type, size, seats, imageUrl) => gridCanvasRef.current?.addTable(type, size, seats, imageUrl)}
            onAddWalls={(walls, doors) => gridCanvasRef.current?.addWalls(walls, doors)}
            brushSize={brushSize}
            brushColor={brushColor}
            onBrushSizeChange={setBrushSize}
            onBrushColorChange={setBrushColor}
            availableSpaces={spaceOptions}
          />
        )}
        <ProjectTabs
          projects={projects}
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
        onClose={handleCloseAssociateModal}
        layoutIds={recentlySavedLayoutIds}
        onAssociated={handleLayoutsAssociated}
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
          projects={projects}
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

export default LayoutMakerPage;
