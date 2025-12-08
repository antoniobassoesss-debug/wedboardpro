import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import GridCanvas from './GridCanvas';
import HeaderBar from './HeaderBar';
import Toolbar from './Toolbar';
import ProjectTabs from './ProjectTabs';
import InfiniteGridBackground from './InfiniteGridBackground';
import AssistantChat from './AssistantChat';
import type { Wall, Door } from './types/wall.js';

export interface Project {
  id: string;
  name: string;
  canvasData: {
    drawings: any[];
    shapes: any[];
    textElements: any[];
    walls?: Wall[];
    doors?: Door[];
    viewBox: { x: number; y: number; width: number; height: number };
  };
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
  
  // Load projects from localStorage on mount
  const [projects, setProjects] = useState<Project[]>(() => loadProjectsFromStorage());
  
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
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Always show the loading logo briefly on initial mount (covers refresh navigation)
  useEffect(() => {
    const minDisplayMs = 600;
    const t = setTimeout(() => setIsLoading(false), minDisplayMs);
    return () => clearTimeout(t);
  }, []);

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
      viewBox: { x: 0, y: 0, width: 1000, height: 1000 }
    }
  };
  
  // Helper function to create a deep copy of canvas data
  const deepCopyCanvasData = useCallback((data: Project['canvasData']): Project['canvasData'] => {
    return {
      drawings: JSON.parse(JSON.stringify(data.drawings || [])),
      shapes: JSON.parse(JSON.stringify(data.shapes || [])),
      textElements: JSON.parse(JSON.stringify(data.textElements || [])),
      walls: JSON.parse(JSON.stringify(data.walls || [])),
      doors: JSON.parse(JSON.stringify(data.doors || [])),
      viewBox: { ...data.viewBox },
    };
  }, []);

  const handleSaveLayout = () => {
    console.log('Save Layout clicked');
    // TODO: Implement save functionality
  };

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

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
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
        <HeaderBar />
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
    </div>
  );
};

export default LayoutMakerPage;

