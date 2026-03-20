/**
 * Layouts Tab Component
 *
 * Displays all layouts with configuration options.
 */

import React, { useState, useCallback } from 'react';
import type { LayoutConfig } from '../../../types/buildGuide';
import { LayoutAccordionCard } from './LayoutAccordionCard';

interface LayoutsTabProps {
  layouts: LayoutConfig[];
  onChange: (layouts: LayoutConfig[]) => void;
}

export const LayoutsTab: React.FC<LayoutsTabProps> = ({ layouts, onChange }) => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleExpand = useCallback((layoutId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(layoutId)) {
        next.delete(layoutId);
      } else {
        next.add(layoutId);
      }
      return next;
    });
  }, []);

  const toggleAllExpand = useCallback(() => {
    if (allExpanded) {
      setExpandedCards(new Set());
    } else {
      setExpandedCards(new Set(layouts.map((l) => l.layoutId)));
    }
    setAllExpanded(!allExpanded);
  }, [allExpanded, layouts]);

  const toggleAllInclude = useCallback(() => {
    const allIncluded = layouts.every((l) => l.included);
    onChange(layouts.map((l) => ({ ...l, included: !allIncluded })));
  }, [layouts, onChange]);

  const updateLayout = useCallback((layoutId: string, updates: Partial<LayoutConfig>) => {
    onChange(
      layouts.map((l) => (l.layoutId === layoutId ? { ...l, ...updates } : l))
    );
  }, [layouts, onChange]);

  const reorderLayouts = useCallback((fromIndex: number, toIndex: number) => {
    const newLayouts = [...layouts];
    const removed = newLayouts.splice(fromIndex, 1)[0];
    if (!removed) return;
    newLayouts.splice(toIndex, 0, removed);
    onChange(newLayouts);
  }, [layouts, onChange]);

  const includedCount = layouts.filter((l) => l.included).length;

  return (
    <div className="space-y-4">
      {/* Global Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleAllInclude}
            className="text-sm text-teal-400 hover:text-teal-300 font-medium"
          >
            {layouts.every((l) => l.included) ? 'Exclude All' : 'Include All'}
          </button>
          <span className="text-gray-500">|</span>
          <span className="text-sm text-gray-400">
            {includedCount} of {layouts.length} layouts included
          </span>
        </div>
        <button
          onClick={toggleAllExpand}
          className="text-sm text-teal-400 hover:text-teal-300 font-medium"
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Layout Cards */}
      {layouts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No layouts found</div>
          <p className="text-sm text-gray-500">
            Create layouts in the Layout Maker to include them in the Build Guide.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {layouts.map((layout, index) => (
            <LayoutAccordionCard
              key={layout.layoutId}
              layout={layout}
              isExpanded={expandedCards.has(layout.layoutId)}
              onToggleExpand={() => toggleExpand(layout.layoutId)}
              onChange={(updates) => updateLayout(layout.layoutId, updates)}
              canMoveUp={index > 0}
              canMoveDown={index < layouts.length - 1}
              onMoveUp={() => reorderLayouts(index, index - 1)}
              onMoveDown={() => reorderLayouts(index, index + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
