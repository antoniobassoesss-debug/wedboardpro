import React, { useState, useEffect } from 'react';

interface Note {
  id: string;
  content: string;
  color: string;
  width: number;
  height: number;
}

interface NotesPanelProps {
  notes: Note[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  onRemoveNote: (noteId: string) => void;
  syncToWorkflow?: boolean;
}

const colorMap: Record<string, string> = {
  yellow: '#fef08a',
  pink: '#fbcfe8',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  purple: '#ddd6fe',
};

const borderColorMap: Record<string, string> = {
  yellow: '#eab308',
  pink: '#ec4899',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
};

// Sync note changes back to workflow notes in localStorage
const syncToWorkflowNotes = (noteId: string, updates: Partial<Note>) => {
  try {
    const stored = localStorage.getItem('workflow-notes-cards');
    if (!stored) return;
    
    const workflowNotes = JSON.parse(stored);
    const noteIndex = workflowNotes.findIndex((n: any) => n.id === noteId);
    if (noteIndex === -1) return;
    
    workflowNotes[noteIndex] = { ...workflowNotes[noteIndex], ...updates };
    localStorage.setItem('workflow-notes-cards', JSON.stringify(workflowNotes));
  } catch (e) {
    console.error('[NotesPanel] Failed to sync to workflow:', e);
  }
};

export const NotesPanel: React.FC<NotesPanelProps> = ({
  notes,
  onUpdateNote,
  onRemoveNote,
  syncToWorkflow = true,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const handleDoubleClick = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSave = (noteId: string) => {
    if (editContent.trim()) {
      onUpdateNote(noteId, { content: editContent.trim() });
      // Also sync to workflow notes
      if (syncToWorkflow) {
        syncToWorkflowNotes(noteId, { content: editContent.trim() });
      }
    }
    setEditingId(null);
    setEditContent('');
  };

  const handleRemove = (noteId: string) => {
    onRemoveNote(noteId);
    // Note: We don't delete from workflow, just remove from this project
  };

  const handleKeyDown = (e: React.KeyboardEvent, noteId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave(noteId);
    }
    if (e.key === 'Escape') {
      setEditingId(null);
      setEditContent('');
    }
  };

  if (notes.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 220,
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        zIndex: 50,
        overflowY: 'auto',
        pointerEvents: 'none',
      }}
    >
      {notes.map((note) => (
        <div
          key={note.id}
          onMouseEnter={() => setIsHovered(note.id)}
          onMouseLeave={() => setIsHovered(null)}
          style={{
            background: colorMap[note.color] || colorMap.yellow,
            border: `2px solid ${borderColorMap[note.color] || borderColorMap.yellow}`,
            borderRadius: 8,
            padding: 10,
            minHeight: 60,
            maxHeight: 150,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'auto',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          }}
        >
          {editingId === note.id ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={() => handleSave(note.id)}
              onKeyDown={(e) => handleKeyDown(e, note.id)}
              autoFocus
              style={{
                width: '100%',
                height: '100%',
                minHeight: 40,
                border: 'none',
                background: 'transparent',
                resize: 'none',
                outline: 'none',
                fontSize: 12,
                fontFamily: "'Geist', 'Inter', sans-serif",
                color: '#1f2937',
              }}
            />
          ) : (
            <div
              onDoubleClick={() => handleDoubleClick(note)}
              style={{
                fontSize: 12,
                fontFamily: "'Geist', 'Inter', sans-serif",
                color: '#1f2937',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.4,
              }}
            >
              {note.content || 'Double-click to add note...'}
            </div>
          )}
          
          {isHovered && editingId !== note.id && (
            <button
              onClick={() => {
                if (window.confirm('Remove this note from the project?')) {
                  handleRemove(note.id);
                }
              }}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#4b5563',
              }}
              title="Remove note"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotesPanel;
