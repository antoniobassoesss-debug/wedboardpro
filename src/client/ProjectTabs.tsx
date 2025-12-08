import React, { useState, useRef, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
}

interface ProjectTabsProps {
  projects: Project[];
  activeProjectId: string;
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
  onDeleteProject?: (projectId: string) => void;
  onRenameProject?: (projectId: string, newName: string) => void;
  newlyCreatedProjectId?: string | null; // ID of project that should be in edit mode
}

const ProjectTabs: React.FC<ProjectTabsProps> = ({ 
  projects, 
  activeProjectId, 
  onProjectSelect,
  onNewProject,
  onDeleteProject,
  onRenameProject,
  newlyCreatedProjectId
}) => {
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(newlyCreatedProjectId || null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSelectedRef = useRef<boolean>(false);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [contextMenu]);

  // Handle newly created project - set it to edit mode
  useEffect(() => {
    if (newlyCreatedProjectId) {
      const project = projects.find(p => p.id === newlyCreatedProjectId);
      if (project && editingProjectId !== newlyCreatedProjectId) {
        setEditingProjectId(newlyCreatedProjectId);
        setEditValue(project.name);
        hasSelectedRef.current = false; // Reset selection flag for new edit
      }
    }
  }, [newlyCreatedProjectId, projects, editingProjectId]);

  const handleSaveEdit = (projectId: string) => {
    if (onRenameProject && editValue.trim()) {
      onRenameProject(projectId, editValue.trim());
    }
    setEditingProjectId(null);
    setEditValue('');
    hasSelectedRef.current = false;
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, projectId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(projectId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleRightClick = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      projectId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleDelete = (projectId: string) => {
    if (onDeleteProject) {
      onDeleteProject(projectId);
    }
    setContextMenu(null);
  };

  return (
    <>
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        zIndex: 10002,
        pointerEvents: 'auto',
        isolation: 'isolate',
      }}
    >
        {projects.map((project) => {
          const isEditing = editingProjectId === project.id;
          
          if (isEditing) {
            return (
              <input
                key={project.id}
                ref={(el) => {
                  if (el && editingProjectId === project.id) {
                    (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                    // Focus and select only once when first entering edit mode
                    if (!hasSelectedRef.current) {
                      setTimeout(() => {
                        el.focus();
                        el.select();
                        hasSelectedRef.current = true;
                      }, 10);
                    }
                  }
                }}
                type="text"
                value={editValue}
                onChange={(e) => {
                  e.stopPropagation();
                  setEditValue(e.target.value);
                }}
                onBlur={() => handleSaveEdit(project.id)}
                onKeyDown={(e) => handleKeyDown(e, project.id)}
                style={{
                  height: '32px',
                  padding: '0 16px',
                  borderRadius: '16px',
                  border: '2px solid #3498db',
                  background: '#ffffff',
                  color: '#333333',
                  fontSize: '13px',
                  fontWeight: '500',
                  outline: 'none',
                  minWidth: '100px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            );
          }
          
          return (
        <button
          key={project.id}
          onClick={() => onProjectSelect(project.id)}
              onContextMenu={(e) => handleRightClick(e, project.id)}
          style={{
            height: '32px',
            padding: '0 16px',
            borderRadius: '16px',
            border: 'none',
            background: activeProjectId === project.id ? '#c0c0c0' : '#e5e5e5',
            color: activeProjectId === project.id ? '#333333' : '#666666',
            fontSize: '13px',
            fontWeight: activeProjectId === project.id ? '500' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          onMouseEnter={(e) => {
            if (activeProjectId !== project.id) {
              e.currentTarget.style.background = '#d0d0d0';
            }
          }}
          onMouseLeave={(e) => {
            if (activeProjectId !== project.id) {
              e.currentTarget.style.background = '#e5e5e5';
            }
          }}
        >
          {project.name}
        </button>
          );
        })}
      <button
        onClick={onNewProject}
        style={{
          height: '32px',
          width: '32px',
          borderRadius: '16px',
          border: 'none',
          background: '#e5e5e5',
          color: '#666666',
          fontSize: '18px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#d0d0d0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#e5e5e5';
        }}
        title="New Project"
      >
        +
      </button>
    </div>

      {/* Context Menu for Delete */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e0e0e0',
            padding: '4px',
            zIndex: 10003,
            minWidth: '120px',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={() => handleDelete(contextMenu.projectId)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: '#e74c3c',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Delete Project
          </button>
        </div>
      )}
    </>
  );
};

export default ProjectTabs;
