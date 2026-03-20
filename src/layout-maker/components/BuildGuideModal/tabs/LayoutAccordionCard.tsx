/**
 * Layout Accordion Card Component
 *
 * Displays a single layout with all its configuration options.
 */

import React, { useCallback } from 'react';
import type { LayoutConfig, PageSize } from '../../../types/buildGuide';
import { ELEMENT_CATEGORIES } from '../../../types/buildGuide';

interface LayoutAccordionCardProps {
  layout: LayoutConfig;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChange: (updates: Partial<LayoutConfig>) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string; description: string }[] = [
  { value: 'full', label: 'Full Page', description: 'Fills the entire page' },
  { value: 'half', label: 'Half Page', description: 'Two layouts per page' },
  { value: 'thumbnail', label: 'Thumbnail', description: 'Compact, 4 per page' },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  tables: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  seating: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="6" />
      <line x1="12" y1="6" x2="12" y2="18" />
    </svg>
  ),
  ceremony: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="4" width="8" height="2" rx="0.5" />
      <rect x="2" y="8" width="8" height="2" rx="0.5" />
      <rect x="14" y="4" width="8" height="2" rx="0.5" />
      <rect x="14" y="8" width="8" height="2" rx="0.5" />
    </svg>
  ),
  entertainment: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  ),
  service: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 8h16M8 8v12" />
    </svg>
  ),
  decor: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 2v1M12 22v-1M2 12h1M22 12h-1M4.93 4.93l.7.7M18.36 4.22l-.7.7M4.93 19.07l.7-.7M18.36 19.78l-.7-.7" />
    </svg>
  ),
  lighting: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M9 18h6M10 22h4M12 2v1M4.22 4.22l.7.7M18.36 4.22l-.7.7" />
    </svg>
  ),
  custom: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

export const LayoutAccordionCard: React.FC<LayoutAccordionCardProps> = ({
  layout,
  isExpanded,
  onToggleExpand,
  onChange,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}) => {
  const toggleVisibility = useCallback((category: string) => {
    const newVisibility = layout.elementVisibility.map((ev) =>
      ev.category === category ? { ...ev, visible: !ev.visible } : ev
    );
    onChange({ elementVisibility: newVisibility });
  }, [layout.elementVisibility, onChange]);

  const toggleNote = useCallback((noteId: string) => {
    const newNotes = layout.notes.map((note) =>
      note.id === noteId ? { ...note, included: !note.included } : note
    );
    onChange({ notes: newNotes });
  }, [layout.notes, onChange]);

  const toggleTask = useCallback((taskId: string) => {
    const newTasks = layout.tasks.map((task) =>
      task.id === taskId ? { ...task, included: !task.included } : task
    );
    onChange({ tasks: newTasks });
  }, [layout.tasks, onChange]);

  return (
    <div
      className={`bg-[#16213e] rounded-xl border transition-all ${
        layout.included
          ? 'border-gray-600'
          : 'border-gray-700 opacity-50'
      }`}
    >
      {/* Card Header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Include Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange({ included: !layout.included });
          }}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            layout.included ? 'bg-teal-500' : 'bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              layout.included ? 'left-6' : 'left-1'
            }`}
          />
        </button>

        {/* Thumbnail placeholder */}
        <div className="w-16 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1} />
            <path d="M3 9h18M9 21V9" strokeWidth={1} />
          </svg>
        </div>

        {/* Layout Info */}
        <div className="flex-1">
          <div className="font-medium text-white">{layout.layoutName}</div>
          <div className="text-sm text-gray-400">{layout.spaceName}</div>
        </div>

        {/* Page Size Badge */}
        {layout.included && (
          <div className="text-xs text-gray-400 px-2 py-1 bg-gray-700 rounded">
            {PAGE_SIZE_OPTIONS.find((o) => o.value === layout.pageSize)?.label}
          </div>
        )}

        {/* Expand Chevron */}
        {layout.included && (
          <button className="p-1">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* Move Buttons */}
        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            className={`p-1 rounded ${canMoveUp ? 'text-gray-400 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className={`p-1 rounded ${canMoveDown ? 'text-gray-400 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && layout.included && (
        <div className="px-4 pb-4 border-t border-gray-700 space-y-6 pt-4">
          {/* Section A: Page Size */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Page Size</h4>
            <div className="flex gap-3">
              {PAGE_SIZE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onChange({ pageSize: option.value })}
                  className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                    layout.pageSize === option.value
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium text-white text-sm">{option.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section B: Element Visibility */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Element Visibility</h4>
            <div className="flex flex-wrap gap-2">
              {ELEMENT_CATEGORIES.map((cat) => {
                const visibility = layout.elementVisibility.find((ev) => ev.category === cat.key);
                const isVisible = visibility?.visible ?? true;
                
                return (
                  <button
                    key={cat.key}
                    onClick={() => toggleVisibility(cat.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      isVisible
                        ? 'border-gray-500 bg-gray-700/50 text-white'
                        : 'border-gray-700 bg-gray-800/50 text-gray-500 line-through'
                    }`}
                    title={`${cat.label} will be ${isVisible ? 'shown' : 'hidden'} from this layout's PDF render`}
                  >
                    {CATEGORY_ICONS[cat.key]}
                    <span className="text-sm">{cat.label}</span>
                    {isVisible 
                      ? <EyeIcon className="w-4 h-4 text-teal-400" />
                      : <EyeOffIcon className="w-4 h-4 text-gray-500" />
                    }
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section C: What to Include */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">What to Include</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.includeLegend}
                  onChange={(e) => onChange({ includeLegend: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-500 text-teal-500 focus:ring-teal-500 bg-gray-700"
                />
                <span className="text-sm text-gray-300">Element legend (counts)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.includeDimensions}
                  onChange={(e) => onChange({ includeDimensions: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-500 text-teal-500 focus:ring-teal-500 bg-gray-700"
                />
                <span className="text-sm text-gray-300">Real-world dimensions</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.includeNotes}
                  onChange={(e) => onChange({ includeNotes: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-500 text-teal-500 focus:ring-teal-500 bg-gray-700"
                />
                <span className="text-sm text-gray-300">Attached layout notes</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.includeTasks}
                  onChange={(e) => onChange({ includeTasks: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-500 text-teal-500 focus:ring-teal-500 bg-gray-700"
                />
                <span className="text-sm text-gray-300">Task checklist for this space</span>
              </label>
            </div>
          </div>

          {/* Section D: Notes Preview */}
          {layout.includeNotes && layout.notes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Notes</h4>
              <div className="space-y-2">
                {layout.notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg"
                  >
                    <button
                      onClick={() => toggleNote(note.id)}
                      className={`p-1 rounded ${note.included ? 'text-teal-400' : 'text-gray-500'}`}
                    >
                      {note.included 
                        ? <EyeIcon className="w-4 h-4" />
                        : <EyeOffIcon className="w-4 h-4" />
                      }
                    </button>
                    <span className={`text-sm ${note.included ? 'text-gray-200' : 'text-gray-500'}`}>
                      {note.content.length > 60 ? note.content.substring(0, 60) + '...' : note.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section E: Tasks Preview */}
          {layout.includeTasks && layout.tasks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Tasks</h4>
              <div className="space-y-2">
                {layout.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`p-1 rounded ${task.included ? 'text-teal-400' : 'text-gray-500'}`}
                    >
                      {task.included 
                        ? <EyeIcon className="w-4 h-4" />
                        : <EyeOffIcon className="w-4 h-4" />
                      }
                    </button>
                    <span className={`text-sm ${task.included ? 'text-gray-200' : 'text-gray-500'}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
