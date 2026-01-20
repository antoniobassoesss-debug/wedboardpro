import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import GridCanvas from './GridCanvas';
import HeaderBar from './HeaderBar';
import Toolbar from './Toolbar';
import ProjectTabs from './ProjectTabs';
import InfiniteGridBackground from './InfiniteGridBackground';
import AssistantChat from './AssistantChat';
import AssociateProjectModal from './AssociateProjectModal';
import ElectricalDashboard from './components/ElectricalDashboard';
import { saveLayout, saveMultipleLayouts, type SaveLayoutInput, type LayoutRecord } from './api/layoutsApi';
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
  // Supabase linkage
  supabaseLayoutId?: string;  // UUID from Supabase layouts table
  eventId?: string;           // Optional link to WedBoardPro event
  category?: string;
  tags?: string[];
  description?: string;
}

const STORAGE_KEY = 'layout-maker-projects';
const STORAGE_ACTIVE_PROJECT_KEY = 'layout-maker-active-project-id';

// Load projects from localStorage
const loadProjectsFromStorage = (): Project[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the structure
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading projects from localStorage:', error);
  }
  // Return default project if nothing stored
  return [
    {
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
    },
  ];
};

// Save projects to localStorage
const saveProjectsToStorage = (projects: Project[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Error saving projects to localStorage:', error);
  }
};

const LayoutMakerPage: React.FC = () => {
  const [activeTool, setActiveTool] = useState<string>('hand');
  const [brushSize, setBrushSize] = useState<number>(2);
  const [brushColor, setBrushColor] = useState<string>('#000000');
  
  // Load projects from localStorage on mount with error handling
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      return loadProjectsFromStorage();
    } catch (error) {
      console.error('Error loading projects from localStorage:', error);
      // Return default project if loading fails
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
      }];
    }
  });
  
  // Load active project ID from localStorage, or default to '1'
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACTIVE_PROJECT_KEY);
      if (stored) {
        // Verify the project exists
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

  // Track newly created project ID for edit mode
  const [newlyCreatedProjectId, setNewlyCreatedProjectId] = useState<string | null>(null);
  
  // Ref to store the latest canvas data for the current project
  const currentCanvasDataRef = useRef<Project['canvasData'] | null>(null);
  // Ref to track which project the ref data belongs to
  const refProjectIdRef = useRef<string>('1');
  // Ref to access GridCanvas methods
  const gridCanvasRef = useRef<{ 
    addSpace: (width: number, height: number) => void;
    addTable: (type: string, size: string, seats: number, imageUrl: string, targetSpaceId?: string) => void;
    addWalls: (walls: Wall[], doors?: Door[]) => void;
    zoomToPoints: (points: { x: number; y: number }[]) => void;
    getPowerPoints: () => PowerPoint[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Electrical Dashboard state
  const [showElectricalDashboard, setShowElectricalDashboard] = useState<boolean>(false);
  
  // Save to Supabase state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Associate with project modal state
  const [showAssociateModal, setShowAssociateModal] = useState<boolean>(false);
  const [recentlySavedLayoutIds, setRecentlySavedLayoutIds] = useState<string[]>([]);

  // Always show the loading logo briefly on initial mount (covers refresh navigation)
  useEffect(() => {
    console.log('[LayoutMakerPage] Component mounted');
    const minDisplayMs = 600;
    const t = setTimeout(() => {
      setIsLoading(false);
      console.log('[LayoutMakerPage] Loading complete');
    }, minDisplayMs);
    return () => clearTimeout(t);
  }, []);
  
  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[LayoutMakerPage] Global error caught:', event.error);
      // Force hide loading on error so user can see what's wrong
      setIsLoading(false);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  // Fallback: Force hide loading after max time (safety net)
  useEffect(() => {
    const maxLoadingTime = 3000; // 3 seconds max
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[LayoutMakerPage] Loading timeout - forcing display');
        setIsLoading(false);
      }
    }, maxLoadingTime);
    return () => clearTimeout(timeout);
  }, [isLoading]);
  
  // We'll render a non-blocking overlay in the main return so the Layout Maker mounts beneath it.

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
  
  // Placeholder for electrical project ID - in production, this would come from props or context
  const electricalProjectId = activeProject?.supabaseLayoutId || 'demo-electrical-project';
  
  // Helper function to create a deep copy of canvas data
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

  // Save current layout to Supabase
  const handleSaveCurrentLayout = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError(null);

    try {
      // Get the latest canvas data
      const latestData = currentCanvasDataRef.current || activeProject.canvasData;
      
      const input: SaveLayoutInput = {
        layoutId: activeProject.supabaseLayoutId,
        name: activeProject.name,
        description: activeProject.description,
        category: activeProject.category,
        tags: activeProject.tags,
        canvasData: deepCopyCanvasData(latestData),
        eventId: activeProject.eventId,
      };
      
      const result = await saveLayout(input);
      
      if (result.error) {
        console.error('[LayoutMakerPage] Save error:', result.error);
        setSaveStatus('error');
        setSaveError(result.error);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else if (result.data) {
        const savedId = result.data.id;
        
        // Update the project with the Supabase ID
        setProjects(prev => {
          const updated = prev.map(p =>
            p.id === activeProjectId
              ? { ...p, supabaseLayoutId: savedId }
              : p
          );
          saveProjectsToStorage(updated);
          return updated;
        });
        
        setSaveStatus('saved');
        console.log('[LayoutMakerPage] Layout saved to Supabase:', savedId);
        
        // Check if this layout already has an event linked
        const hasEventLinked = !!activeProject.eventId;
        
        if (!hasEventLinked) {
          // Trigger the associate project modal
          setRecentlySavedLayoutIds([savedId]);
          setShowAssociateModal(true);
        }
        
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err: any) {
      console.error('[LayoutMakerPage] Save exception:', err);
      setSaveStatus('error');
      setSaveError(err.message || 'Failed to save');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, activeProject, activeProjectId, deepCopyCanvasData]);
  
  // Save all layouts to Supabase
  const handleSaveAllLayouts = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError(null);

    try {
      // Prepare all projects for saving
      const inputs: SaveLayoutInput[] = projects.map(p => {
        // Use current canvas data for active project
        const canvasData = p.id === activeProjectId && currentCanvasDataRef.current
          ? currentCanvasDataRef.current
          : p.canvasData;
        
        return {
          layoutId: p.supabaseLayoutId,
          name: p.name,
          description: p.description,
          category: p.category,
          tags: p.tags,
          canvasData: deepCopyCanvasData(canvasData),
          eventId: p.eventId,
        };
      });
      
      const result = await saveMultipleLayouts(inputs);
      
      if (result.error && !result.data) {
        console.error('[LayoutMakerPage] Save all error:', result.error);
        setSaveStatus('error');
        setSaveError(result.error);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else if (result.data) {
        // Collect all saved layout IDs
        const savedIds = result.data.map((saved: LayoutRecord) => saved.id);
        
        // Update projects with Supabase IDs
        setProjects(prev => {
          const updated = prev.map((p, i) => {
            const supabaseId = result.data![i]?.id;
            return supabaseId ? { ...p, supabaseLayoutId: supabaseId } : p;
          });
          saveProjectsToStorage(updated);
          return updated;
        });
        
        setSaveStatus('saved');
        console.log('[LayoutMakerPage] All layouts saved to Supabase:', result.data.length);
        
        if (result.error) {
          // Partial success
          setSaveError(result.error);
        }
        
        // Check if any layout doesn't have an event linked
        const anyWithoutEvent = projects.some(p => !p.eventId);
        
        if (anyWithoutEvent && savedIds.length > 0) {
          // Trigger the associate project modal
          setRecentlySavedLayoutIds(savedIds);
          setShowAssociateModal(true);
        }
        
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err: any) {
      console.error('[LayoutMakerPage] Save all exception:', err);
      setSaveStatus('error');
      setSaveError(err.message || 'Failed to save');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, projects, activeProjectId, deepCopyCanvasData]);

  // Handle when layouts are associated with a project
  const handleLayoutsAssociated = useCallback((eventId: string) => {
    // Update local project state with the event ID
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
    console.log('[LayoutMakerPage] Layouts associated with event:', eventId);
  }, [recentlySavedLayoutIds]);
  
  const handleCloseAssociateModal = useCallback(() => {
    setShowAssociateModal(false);
    setRecentlySavedLayoutIds([]);
  }, []);

  const handleAIPlanner = () => {
    console.log('AI Planner clicked');
    // TODO: Implement AI Planner functionality
  };

  const handleProjectSelect = useCallback((projectId: string) => {
    // CRITICAL: Save current project's state BEFORE switching
    // Only save if we have data AND it belongs to the current project
    if (currentCanvasDataRef.current && 
        refProjectIdRef.current === activeProjectId && 
        activeProjectId !== projectId) {
      
      // Deep copy the canvas data to ensure complete isolation
      const canvasDataToSave = deepCopyCanvasData(currentCanvasDataRef.current);
      
      // Save to the correct project in the array
      setProjects(prevProjects => {
        const updated = prevProjects.map(project =>
          project.id === activeProjectId
            ? { ...project, canvasData: canvasDataToSave }
            : project
        );
        saveProjectsToStorage(updated); // Save to localStorage immediately
        return updated;
      });
    }
    // Now switch to the new project
    setActiveProjectId(projectId);
    localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, projectId);
  }, [activeProjectId, deepCopyCanvasData]);

  const handleNewProject = useCallback(() => {
    // Calculate the next project number based on existing projects
    const nextProjectNumber = projects.length + 1;
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
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects); // Save immediately
    setActiveProjectId(newProject.id);
    localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, newProject.id);
    // Set the newly created project ID to trigger edit mode
    setNewlyCreatedProjectId(newProject.id);
  }, [projects]);

  const handleRenameProject = (projectId: string, newName: string) => {
    setProjects(prevProjects => {
      const updated = prevProjects.map(project =>
        project.id === projectId
          ? { ...project, name: newName }
          : project
      );
      saveProjectsToStorage(updated);
      return updated;
    });
    // Clear the newly created flag after renaming
    setNewlyCreatedProjectId(null);
  };

  const handleDeleteProject = (projectId: string) => {
    // Don't allow deleting if it's the only project
    if (projects.length <= 1) {
      alert('Cannot delete the last project. Please create another project first.');
      return;
    }

    // If deleting the active project, switch to another project first
    if (projectId === activeProjectId) {
      // Find another project to switch to
      const otherProject = projects.find(p => p.id !== projectId);
      if (otherProject) {
        setActiveProjectId(otherProject.id);
        localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, otherProject.id);
      }
    }

    // Remove the project from the array
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects); // Save to localStorage
  };

  const handleAddSpace = useCallback((widthMeters: number, heightMeters: number) => {
    if (gridCanvasRef.current) {
      gridCanvasRef.current.addSpace(widthMeters, heightMeters);
    }
  }, []);

  const handleAddTable = useCallback((type: string, size: string, seats: number, imageUrl: string, spaceId?: string) => {
    if (gridCanvasRef.current) {
      gridCanvasRef.current.addTable(type, size, seats, imageUrl, spaceId);
    }
  }, []);

  const handleAddWalls = useCallback((walls: Wall[], doors?: Door[]) => {
    if (gridCanvasRef.current) {
      gridCanvasRef.current.addWalls(walls, doors);
    }
  }, []);

  const spaceOptions = useMemo(() => {
    const shapes = activeProject.canvasData?.shapes || [];
    if (!Array.isArray(shapes)) return [];
    return shapes
      .filter((shape: any) =>
        shape &&
        shape.type === 'rectangle' &&
        typeof shape.spaceMetersWidth === 'number' &&
        shape.spaceMetersWidth > 0 &&
        typeof shape.spaceMetersHeight === 'number' &&
        shape.spaceMetersHeight > 0 &&
        typeof shape.pixelsPerMeter === 'number' &&
        shape.pixelsPerMeter > 0
      )
      .map((shape: any, index: number) => ({
        id: shape.id || `space-${index}`,
        label: shape.name ? String(shape.name) : `Space ${index + 1}`,
        widthMeters: Number(shape.spaceMetersWidth),
        heightMeters: Number(shape.spaceMetersHeight),
        pixelsPerMeter: Number(shape.pixelsPerMeter),
      }));
  }, [activeProject.canvasData?.shapes]);

  const handleCanvasDataChange = useCallback((data: Project['canvasData'], projectIdForData: string) => {
    // CRITICAL: Use the projectId passed from GridCanvas, not the activeProjectId from closure
    // This ensures we save to the correct project even if the project switched during the save
    
    // Create a deep copy to ensure isolation
    const dataCopy = deepCopyCanvasData(data);
    
    // Always update the ref with the latest data (deep copied)
    currentCanvasDataRef.current = dataCopy;
    refProjectIdRef.current = projectIdForData; // Track which project this data belongs to
    
    // Also update the projects array with deep copy to ensure isolation
    // Use the projectId passed in, not activeProjectId from closure
    setProjects(prevProjects => {
      const updated = prevProjects.map(project =>
        project.id === projectIdForData
          ? { ...project, canvasData: deepCopyCanvasData(dataCopy) }
          : project
      );
      saveProjectsToStorage(updated); // Save to localStorage on every change
      return updated;
    });
  }, [deepCopyCanvasData]);

  // Sync the ref when switching projects - always use deep copy
  React.useEffect(() => {
    // When project changes, update the ref with the new project's data (deep copied)
    const projectDataCopy = deepCopyCanvasData(activeProject.canvasData);
    currentCanvasDataRef.current = projectDataCopy;
    refProjectIdRef.current = activeProjectId;
  }, [activeProjectId, activeProject.canvasData, deepCopyCanvasData]);

  // Force save current project data before page unload (refresh, close, navigate away)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save current project's canvas data immediately before unload
      if (currentCanvasDataRef.current && refProjectIdRef.current) {
        const dataCopy = deepCopyCanvasData(currentCanvasDataRef.current);
        const projectId = refProjectIdRef.current;
        
        // Get current projects from state
        const currentProjects = projects;
        const updated = currentProjects.map(project =>
          project.id === projectId
            ? { ...project, canvasData: dataCopy }
            : project
        );
        
        // Force synchronous save to localStorage
        saveProjectsToStorage(updated);
        console.log('Emergency save before unload completed for project:', projectId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [projects, deepCopyCanvasData]);

  // Keyboard shortcuts: Cmd/Ctrl + Left/Right to navigate between projects, Cmd/Ctrl + + to create new project
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      if (e.metaKey || e.ctrlKey) {
        const currentIndex = projects.findIndex(p => p.id === activeProjectId);
        
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          // Go to previous project
          e.preventDefault();
          const prevProject = projects[currentIndex - 1];
          if (prevProject) {
            handleProjectSelect(prevProject.id);
          }
        } else if (e.key === 'ArrowRight' && currentIndex < projects.length - 1) {
          // Go to next project
          e.preventDefault();
          const nextProject = projects[currentIndex + 1];
          if (nextProject) {
            handleProjectSelect(nextProject.id);
          }
        } else if (e.key === '+' || e.key === '=') {
          // Create new project (both '+' and '=' work since '+' is often '=' with shift)
          e.preventDefault();
          e.stopPropagation();
          handleNewProject();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [projects, activeProjectId, handleProjectSelect, handleNewProject]);

  // Handle zoom to points from electrical dashboard
  const handleZoomToPoints = useCallback((points: { x: number; y: number }[]) => {
    if (gridCanvasRef.current?.zoomToPoints) {
      gridCanvasRef.current.zoomToPoints(points);
      setShowElectricalDashboard(false);
    }
  }, []);

  // Get current power points for dashboard
  const currentPowerPoints = useMemo(() => {
    return activeProject?.canvasData?.powerPoints || [];
  }, [activeProject?.canvasData?.powerPoints]);

  // Safety check: ensure we have at least one project
  if (!projects || projects.length === 0) {
    console.error('[LayoutMakerPage] No projects available');
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
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#ffffff' }}>
      {/* Layer 0: Infinite Grid Background (always visible, behind everything) */}
      <InfiniteGridBackground />
      
      {/* Layer 1: Canvas (back layer - can zoom/pan) */}
      <GridCanvas 
        ref={gridCanvasRef}
        activeTool={activeTool} 
        onToolChange={setActiveTool}
        projectId={activeProjectId}
        projectData={deepCopyCanvasData(activeProject.canvasData)}
        onDataChange={handleCanvasDataChange}
        brushSize={brushSize}
        brushColor={brushColor}
      />
      
      {/* Quick floating button to select Power Point tool (guaranteed visible) */}
      <button
        onClick={() => {
          // Try programmatic addition first (center of current view), fallback to selecting tool
          const ref = gridCanvasRef.current as any;
          const vb = activeProject?.canvasData?.viewBox;
          const cx = vb ? (vb.x + vb.width / 2) : 0;
          const cy = vb ? (vb.y + vb.height / 2) : 0;
          if (ref && typeof ref.addPowerPoint === 'function') {
            ref.addPowerPoint(cx, cy);
            // Also open electrical drawer by selecting the tool state briefly
            setActiveTool('power-point');
            return;
          }
          setActiveTool('power-point');
        }}
        id="floating-add-power-point"
        style={{
          position: 'fixed',
          top: 96,
          left: 24,
          zIndex: 20000,
          padding: '10px 12px',
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
          color: 'white',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
        }}
      >
        ⚡ Place power point
      </button>
      
      {/* Layer 2: UI Elements (front layer - fixed screen position) */}
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
          saveStatus={saveStatus}
          projectCount={projects.length}
        />
        
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
        <ProjectTabs
          projects={projects}
          activeProjectId={activeProjectId}
          onProjectSelect={handleProjectSelect}
          onNewProject={handleNewProject}
          onDeleteProject={handleDeleteProject}
          onRenameProject={handleRenameProject}
          newlyCreatedProjectId={newlyCreatedProjectId}
        />
      </div>
      {!isLoading && <AssistantChat />}
      
      {/* Associate with Project Modal */}
      <AssociateProjectModal
        isOpen={showAssociateModal}
        onClose={handleCloseAssociateModal}
        layoutIds={recentlySavedLayoutIds}
        onAssociated={handleLayoutsAssociated}
      />
      
      {/* Electrical Dashboard */}
      {showElectricalDashboard && (
        <ElectricalDashboard
          electricalProjectId={electricalProjectId}
          powerPoints={currentPowerPoints}
          onZoomToPoints={handleZoomToPoints}
          onClose={() => setShowElectricalDashboard(false)}
        />
      )}
      
      {/* Electrical Dashboard Button (floating) */}
      {!showElectricalDashboard && currentPowerPoints.length > 0 && (
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
      
      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            zIndex: 20000,
            pointerEvents: 'auto',
          }}
        >
          <img src="/loadinglogo.png" alt="Loading" style={{ width: '160px', height: 'auto', objectFit: 'contain' }} />
        </div>
      )}
      
      {/* Debug overlay - shows component state (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            zIndex: 30000,
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
        >
          <div>Loading: {isLoading ? 'YES' : 'NO'}</div>
          <div>Projects: {projects?.length || 0}</div>
          <div>Active: {activeProjectId}</div>
        </div>
      )}
    </div>
  );
};

export default LayoutMakerPage;

