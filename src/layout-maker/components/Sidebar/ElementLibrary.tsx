/**
 * Element Library Sidebar Component (Grid Layout Redesign)
 *
 * Redesigned with:
 * - Grid view for element categories (2-3 columns)
 * - Line-only SVG thumbnails
 * - Click to open config modal, drag for quick add
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { ElementType, CustomElementTemplate } from '../../types/elements';
import { ELEMENT_DEFAULTS } from '../../constants';
import RecentlyUsed from './RecentlyUsed';
import ElementCategory from './ElementCategory';
import CustomElementsList from './CustomElementsList';

interface ElementLibraryProps {
  onSelectElement: (type: ElementType) => void;
  onOpenConfigModal: (type: ElementType) => void;
  onOpenElementMaker: () => void;
  onSelectCustomTemplate: (template: CustomElementTemplate) => void;
  onEditCustomTemplate: (template: CustomElementTemplate) => void;
  onDeleteCustomTemplate: (template: CustomElementTemplate) => void;
  onOpenPlacementModal?: (type: ElementType) => void;
  customTemplates?: CustomElementTemplate[];
  className?: string;
  compact?: boolean;
}

type CategoryKey = 'tables' | 'seating' | 'entertainment' | 'service' | 'decor' | 'custom';

interface CategoryConfig {
  name: string;
  icon: React.ReactNode;
  elements: ElementType[];
}

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  tables: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#1a1a1a" strokeWidth="1.5" />
    </svg>
  ),
  seating: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="6" stroke="#1a1a1a" strokeWidth="1.5" />
      <line x1="12" y1="6" x2="12" y2="18" stroke="#1a1a1a" strokeWidth="1" />
    </svg>
  ),
  entertainment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="#1a1a1a" strokeWidth="1" />
    </svg>
  ),
  service: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
      <path d="M4 8h16M8 8v12M16 8v12" stroke="#1a1a1a" strokeWidth="1" />
    </svg>
  ),
  decor: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 4v16M4 12h16" stroke="#1a1a1a" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" stroke="#1a1a1a" strokeWidth="1.5" />
    </svg>
  ),
  custom: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l2.5 5 5.5 1-4 4 1 5.5-5-2.5-5 2.5 1-5.5-4-4 5.5-1L12 3z" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
};

export const ElementLibrary: React.FC<ElementLibraryProps> = ({
  onSelectElement,
  onOpenConfigModal,
  onOpenElementMaker,
  onSelectCustomTemplate,
  onEditCustomTemplate,
  onDeleteCustomTemplate,
  onOpenPlacementModal,
  customTemplates = [],
  className = '',
  compact = false,
}) => {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryKey>>(
    new Set(['tables'])
  );

  const categories: Record<CategoryKey, CategoryConfig> = useMemo(
    () => ({
      tables: {
        name: 'Tables',
        icon: CATEGORY_ICONS.tables,
        elements: ['table-round', 'table-rectangular', 'table-square', 'table-oval'],
      },
      seating: {
        name: 'Seating',
        icon: CATEGORY_ICONS.seating,
        elements: ['chair', 'bench', 'lounge'],
      },
      entertainment: {
        name: 'Zones',
        icon: CATEGORY_ICONS.entertainment,
        elements: ['dance-floor', 'stage', 'cocktail-area', 'ceremony-area'],
      },
      service: {
        name: 'Service',
        icon: CATEGORY_ICONS.entertainment,
        elements: ['bar', 'buffet', 'cake-table', 'gift-table', 'dj-booth'],
      },
      decor: {
        name: 'Decor',
        icon: CATEGORY_ICONS.decor,
        elements: ['flower-arrangement', 'arch', 'photo-booth'],
      },
      custom: {
        name: 'Custom',
        icon: CATEGORY_ICONS.custom,
        elements: [], // Custom uses templates instead of predefined elements
      },
    }),
    []
  );

  const toggleCategory = useCallback((category: CategoryKey) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (value && expandedCategories.size === 0) {
      setExpandedCategories(new Set(['tables', 'seating', 'entertainment', 'service', 'decor', 'custom']));
    }
    if (!value) {
      setExpandedCategories(new Set(['tables']));
    }
  }, [expandedCategories]);

  const handleSelect = useCallback(
    (type: ElementType) => {
      onSelectElement(type);
    },
    [onSelectElement]
  );

  const handleOpenConfig = useCallback(
    (type: ElementType) => {
      console.log('[ElementLibrary] handleOpenConfig called with type:', type);
      const placementTypes: ElementType[] = ['chair', 'bench', 'lounge'];
      console.log('[ElementLibrary] Is placement type?', placementTypes.includes(type));
      console.log('[ElementLibrary] onOpenPlacementModal exists?', !!onOpenPlacementModal);
      
      if (placementTypes.includes(type) && onOpenPlacementModal) {
        console.log('[ElementLibrary] Calling onOpenPlacementModal');
        onOpenPlacementModal(type);
      } else {
        console.log('[ElementLibrary] Calling onOpenConfigModal');
        onOpenConfigModal(type);
      }
    },
    [onOpenConfigModal, onOpenPlacementModal]
  );

  const filterElements = useCallback(
    (elements: ElementType[]): ElementType[] => {
      if (!search.trim()) return elements;

      const searchLower = search.toLowerCase();

      return elements.filter((type) => {
        const defaults = ELEMENT_DEFAULTS[type as keyof typeof ELEMENT_DEFAULTS];
        if (!defaults) return false;

        const name = defaults.label?.toLowerCase() || type.toLowerCase();
        const matchesName = name.includes(searchLower);
        const matchesType = type.toLowerCase().includes(searchLower);

        return matchesName || matchesType;
      });
    },
    [search]
  );

  const filteredCustomTemplates = useMemo(() => {
    const templates = customTemplates || [];
    if (!search.trim()) return templates;
    const searchLower = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.svgPath.toLowerCase().includes(searchLower)
    );
  }, [customTemplates, search]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;

    const filtered: Record<CategoryKey, CategoryConfig | null> = {
      tables: null,
      seating: null,
      entertainment: null,
      service: null,
      decor: null,
      custom: null,
    };

    for (const [key, config] of Object.entries(categories) as [CategoryKey, CategoryConfig][]) {
      // Skip custom category - it's handled separately with template search
      if (key === 'custom') continue;

      const filteredElements = filterElements(config.elements);
      if (filteredElements.length > 0) {
        filtered[key] = {
          ...config,
          elements: filteredElements,
        };
      }
    }

    return filtered;
  }, [categories, search, filterElements]);

  const recentlyUsedTypes = useMemo(() => {
    if (search.trim()) return [];

    try {
      const stored = localStorage.getItem('layout-maker-recent-elements');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.slice(0, 6).map((item: { type: ElementType }) => item.type);
      }
    } catch {
      // Ignore parse errors
    }

    return [];
  }, [search]);

  if (compact) {
    const templates = customTemplates || [];
    const compactCategories: CategoryKey[] = ['tables', 'seating', 'entertainment', 'service', 'decor', 'custom'];

    return (
      <div className="flex flex-col h-full" style={{ width: '100%' }}>
        <div className="flex items-center gap-2 p-3 border-b overflow-x-auto" style={{ touchAction: 'pan-x' }}>
          {compactCategories.map((key) => {
            const config = categories[key];
            const isActive = expandedCategories.has(key);
            const isCustom = key === 'custom';
            return (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4">{isCustom ? CATEGORY_ICONS.custom : config?.icon}</span>
                  {isCustom ? 'Custom' : config?.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {/* Show regular category elements */}
          {Array.from(expandedCategories).filter(k => k !== 'custom').length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from(expandedCategories).filter(k => k !== 'custom').flatMap((key) => {
                const config = categories[key];
                if (!config) return [];
                return config.elements.map((type) => {
                  const defaults = ELEMENT_DEFAULTS[type as keyof typeof ELEMENT_DEFAULTS];
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        console.log('[ElementLibrary] Button clicked for type:', type);
                        handleOpenConfig(type);
                      }}
                      className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all active:scale-95"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <span className="w-10 h-10 mb-1 flex items-center justify-center">
                        {type === 'table-round' ? (
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="12" stroke="#374151" strokeWidth="1.5" />
                            <circle cx="16" cy="10" r="2" fill="#374151" />
                            <circle cx="21.39" cy="12" r="2" fill="#374151" />
                            <circle cx="22.63" cy="18" r="2" fill="#374151" />
                            <circle cx="16" cy="22" r="2" fill="#374151" />
                            <circle cx="9.37" cy="18" r="2" fill="#374151" />
                            <circle cx="7.37" cy="12" r="2" fill="#374151" />
                          </svg>
                        ) : type === 'table-rectangular' ? (
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <rect x="4" y="10" width="24" height="14" rx="2" stroke="#374151" strokeWidth="1.5" />
                            <circle cx="9" cy="17" r="1.5" fill="#374151" />
                            <circle cx="14" cy="17" r="1.5" fill="#374151" />
                            <circle cx="19" cy="17" r="1.5" fill="#374151" />
                            <circle cx="23" cy="17" r="1.5" fill="#374151" />
                          </svg>
                        ) : type === 'table-oval' ? (
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <ellipse cx="16" cy="16" rx="14" ry="9" stroke="#374151" strokeWidth="1.5" />
                          </svg>
                        ) : type === 'chair' ? (
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="6" stroke="#374151" strokeWidth="1.5" />
                          </svg>
                        ) : type === 'dance-floor' ? (
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <rect x="4" y="4" width="24" height="24" rx="2" stroke="#374151" strokeWidth="1.5" strokeDasharray="4 2" />
                          </svg>
                        ) : type === 'stage' ? (
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <rect x="4" y="8" width="24" height="18" rx="1" stroke="#374151" strokeWidth="1.5" />
                          </svg>
                        ) : (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#374151" strokeWidth="1.5" />
                          </svg>
                        )}
                      </span>
                      <span className="text-xs text-gray-600 truncate w-full text-center">
                        {defaults?.label || type}
                      </span>
                    </button>
                  );
                });
              })}
            </div>
          )}

          {/* Show custom elements when custom category is selected */}
          {expandedCategories.has('custom') && (
            <div className={Array.from(expandedCategories).filter(k => k !== 'custom').length > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}>
              <div style={{
                marginBottom: '8px',
                padding: '0 4px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: '#e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{ color: '#4f46e5', display: 'flex', transform: 'scale(0.75)' }}>
                      {CATEGORY_ICONS.custom}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1e293b',
                  }}>
                    Custom Elements
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: '#e0e7ff',
                    color: '#4f46e5',
                    borderRadius: '6px',
                    fontWeight: 500,
                  }}>
                    {templates.length}
                  </span>
                </div>
              </div>
              <CustomElementsList
                templates={templates}
                onSelect={onSelectCustomTemplate}
                onCreateNew={() => {
                  onOpenElementMaker?.();
                }}
                onEdit={onEditCustomTemplate}
                onDelete={onDeleteCustomTemplate}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94a3b8' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>

          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search elements..."
            style={{
              width: '100%',
              padding: '10px 36px 10px 40px',
              fontSize: '13px',
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              outline: 'none',
              transition: 'all 0.18s ease',
              color: '#1e293b',
            }}
            onFocus={(e) => {
              e.target.style.background = 'white';
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.background = '#f8fafc';
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />

          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#f1f5f9',
                border: 'none',
                padding: '4px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!search && recentlyUsedTypes.length > 0 && (
        <RecentlyUsed elements={recentlyUsedTypes} onSelect={handleSelect} />
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px 16px' }}>
        {(Object.entries(filteredCategories) as [CategoryKey, CategoryConfig | null][]).map(
          ([key, config]) => {
            if (!config) return null;

            return (
              <ElementCategory
                key={key}
                name={config.name}
                icon={config.icon}
                elements={config.elements}
                expanded={expandedCategories.has(key)}
                onToggle={() => toggleCategory(key)}
                onSelect={handleSelect}
                onOpenConfig={handleOpenConfig}
              />
            );
          }
        )}

        {!search && (
          <div style={{ marginBottom: '6px' }}>
            <button
              onClick={() => toggleCategory('custom')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: expandedCategories.has('custom') ? '#f8fafc' : 'transparent',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                if (!expandedCategories.has('custom')) {
                  e.currentTarget.style.background = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (!expandedCategories.has('custom')) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: expandedCategories.has('custom') ? '#e0e7ff' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.18s ease',
              }}>
                <span style={{ color: expandedCategories.has('custom') ? '#4f46e5' : '#64748b', display: 'flex', transform: 'scale(0.85)' }}>
                  {CATEGORY_ICONS.custom}
                </span>
              </div>
              <span style={{
                flex: 1,
                fontSize: '13px',
                fontWeight: 500,
                color: expandedCategories.has('custom') ? '#1e293b' : '#475569',
                textAlign: 'left',
                transition: 'color 0.18s ease',
              }}>Custom</span>
              <span style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: expandedCategories.has('custom') ? '#e0e7ff' : '#f1f5f9',
                color: expandedCategories.has('custom') ? '#4f46e5' : '#64748b',
                borderRadius: '8px',
                fontWeight: 500,
                transition: 'all 0.18s ease',
              }}>
                {(customTemplates || []).length}
              </span>
              <svg
                style={{
                  width: '14px',
                  height: '14px',
                  color: expandedCategories.has('custom') ? '#4f46e5' : '#94a3b8',
                  transition: 'all 0.2s ease',
                  transform: expandedCategories.has('custom') ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {expandedCategories.has('custom') && (
              <div style={{
                padding: '8px 4px 4px',
                overflow: 'hidden',
                animation: 'slideDown 0.2s ease',
              }}>
                <CustomElementsList
                  templates={customTemplates || []}
                  onSelect={onSelectCustomTemplate}
                  onCreateNew={() => {
                    onOpenElementMaker?.();
                  }}
                  onEdit={onEditCustomTemplate}
                  onDelete={onDeleteCustomTemplate}
                />
              </div>
            )}
          </div>
        )}

        {Object.values(filteredCategories).every((c) => c === null) && search && (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span>No elements found for "{search}"</span>
          </div>
        )}
      </div>
    </div>
  );
};

export type { ElementLibraryProps };
export default ElementLibrary;
