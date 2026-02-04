/**
 * TabBar Component
 *
 * Horizontal tab bar for tablet interfaces.
 */

import React, { useCallback } from 'react';

interface TabBarProps {
  tabs: string[];
  activeTab: string;
  onSelect: (tab: string) => void;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onSelect,
  className = '',
}) => {
  const handleSelect = useCallback((tab: string) => {
    onSelect(tab);
  }, [onSelect]);

  return (
    <div
      className={`flex items-center gap-1 px-2 py-2 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] overflow-x-auto ${className}`}
      style={{ touchAction: 'pan-x' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => handleSelect(tab)}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === tab
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default TabBar;
