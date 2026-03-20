/**
 * Build Guide Modal Component
 *
 * Full-screen modal for configuring the Event Build Guide PDF export.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { listEventSuppliers, listSuppliers } from '../../../client/api/suppliersApi';
import type { BuildGuideConfig, LayoutConfig, TimelineRow, Contact } from '../../types/buildGuide';
import { ELEMENT_CATEGORIES as ELEMENT_CATS } from '../../types/buildGuide';
import { usePDFGeneration } from './hooks/usePDFGeneration';

interface BuildGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  layouts: LayoutConfig[];
  spaceNames: string[];
}

type TabKey = 'layouts' | 'timeline' | 'contacts' | 'document' | 'preview';

const TABS = [
  { key: 'layouts', label: 'Layouts', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { key: 'timeline', label: 'Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'contacts', label: 'Contacts', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { key: 'document', label: 'Document Setup', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'preview', label: 'Preview & Export', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
];

const ELEMENT_CATEGORIES = ELEMENT_CATS;

export const BuildGuideModal: React.FC<BuildGuideModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventName,
  layouts,
  spaceNames,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('layouts');
  const [layoutConfigs, setLayoutConfigs] = useState<LayoutConfig[]>(layouts);
  const [expandedLayoutId, setExpandedLayoutId] = useState<string | null>(null);
  const [versionLabel, setVersionLabel] = useState('v1');

  // Suppliers state
  const [availableSuppliers, setAvailableSuppliers] = useState<any[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [timelineRows, setTimelineRows] = useState<TimelineRow[]>([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  const {
    isCapturing, captureProgress, generatePreview, previewReady,
    isGenerating, generationProgress, generatePDF,
    pageMap, lastGeneratedAt,
  } = usePDFGeneration();

  React.useEffect(() => {
    setLayoutConfigs(layouts);
  }, [layouts]);

  // Fetch suppliers when timeline tab is opened
  useEffect(() => {
    if (activeTab === 'timeline') {
      setSuppliersLoading(true);
      
      // First try to get event-specific suppliers, then fall back to all suppliers
      const fetchSuppliers = async () => {
        try {
          if (eventId) {
            const eventResult = await listEventSuppliers(eventId);
            if (eventResult.data && eventResult.data.length > 0) {
              setAvailableSuppliers(eventResult.data);
              setSuppliersLoading(false);
              return;
            }
          }
          
          // Fall back to all suppliers in the planner's directory
          const allSuppliersResult = await listSuppliers();
          if (allSuppliersResult.data) {
            // Transform suppliers to match the expected format
            const transformed = allSuppliersResult.data.map((s: any) => ({
              id: `supplier-${s.id}`,
              supplier: s,
              category: s.category,
              status: 'selected',
            }));
            setAvailableSuppliers(transformed);
          }
        } catch (err) {
          console.error('Error fetching suppliers:', err);
        } finally {
          setSuppliersLoading(false);
        }
      };
      
      fetchSuppliers();
    }
  }, [activeTab, eventId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  const addSupplierToTimeline = useCallback((supplier: any) => {
    // Handle both event suppliers and directory suppliers
    const supplierData = supplier.supplier || supplier;
    const supplierDisplayName = supplierData.name || supplierData.company_name || 'Unknown';
    const newRow: TimelineRow = {
      id: `timeline-${Date.now()}`,
      companyName: supplierDisplayName,
      supplierId: supplier.id,
      supplierName: supplierDisplayName,
      category: supplier.category || supplierData.category || 'Other',
      role: supplierData.category || 'Vendor',
      arrivalTime: '09:00',
      departureTime: '18:00',
      location: supplierData.location || '',
      contactPerson: supplierData.company_name || '',
      phone: supplierData.phone || '',
      email: supplierData.email || '',
      notes: '',
      included: true,
    };
    setTimelineRows(prev => [...prev, newRow]);
    setShowAddSupplier(false);
  }, []);

  const removeTimelineRow = useCallback((id: string) => {
    setTimelineRows(prev => prev.filter(row => row.id !== id));
  }, []);

  const updateTimelineRow = useCallback((id: string, updates: Partial<TimelineRow>) => {
    setTimelineRows(prev => prev.map(row => 
      row.id === id ? { ...row, ...updates } : row
    ));
  }, []);

  const toggleTimelineRowIncluded = useCallback((id: string) => {
    setTimelineRows(prev => prev.map(row =>
      row.id === id ? { ...row, included: !row.included } : row
    ));
  }, []);

  const includedSuppliersCount = useMemo(() => timelineRows.filter(r => r.included).length, [timelineRows]);

  const toggleLayoutIncluded = useCallback((layoutId: string) => {
    setLayoutConfigs(prev => prev.map(layout => 
      layout.layoutId === layoutId 
        ? { ...layout, included: !layout.included }
        : layout
    ));
  }, []);

  const toggleCategoryVisibility = useCallback((layoutId: string, category: string) => {
    setLayoutConfigs(prev => prev.map(layout => {
      if (layout.layoutId !== layoutId) return layout;
      const visibility = layout.elementVisibility || ELEMENT_CATEGORIES.map(c => ({ category: c.key, visible: true }));
      return {
        ...layout,
        elementVisibility: visibility.map(c => 
          c.category === category ? { ...c, visible: !c.visible } : c
        )
      };
    }));
  }, []);

  const includedCount = useMemo(() => layoutConfigs.filter(l => l.included).length, [layoutConfigs]);
  const totalElements = useMemo(() =>
    layoutConfigs.reduce((sum, l) => sum + (l.shapes?.length || 0), 0),
  [layoutConfigs]);

  const handleGeneratePDF = useCallback(async () => {
    const config: BuildGuideConfig = {
      eventId,
      layoutConfigs: layoutConfigs.map(l => ({
        ...l,
        includeLegend: l.includeLegend ?? true,
        includeDimensions: l.includeDimensions ?? true,
        includeNotes: l.includeNotes ?? true,
        includeTasks: l.includeTasks ?? true,
        notes: l.notes ?? [],
        tasks: l.tasks ?? [],
        elementVisibility: l.elementVisibility?.length
          ? l.elementVisibility
          : ELEMENT_CATEGORIES.map(c => ({ category: c.key, visible: true })),
      })),
      timelineRows: timelineRows.map(r => ({
        id: r.id,
        companyName: r.supplierName || r.companyName || '',
        role: r.role,
        arrivalTime: r.arrivalTime,
        departureTime: r.departureTime,
        location: r.location,
        contactPerson: r.contactPerson,
        phone: r.phone,
        notes: r.notes,
        included: r.included,
        ...(r.supplierName !== undefined && { supplierName: r.supplierName }),
        ...(r.email !== undefined && { email: r.email }),
      })) as TimelineRow[],
      contacts: [] as Contact[],
      documentSettings: {
        cover: {
          includeCover: true,
          eventName,
          eventDate: '',
          venueName: '',
          plannerCompanyName: '',
        },
        formatting: {
          paperSize: 'a4' as const,
          orientation: 'portrait' as const,
          colorMode: 'color' as const,
        },
        headerFooter: {
          showLogoInHeader: false,
          footerText: '',
          showPageNumbers: true,
          showWatermark: false,
        },
      },
      versionLabel,
    };
    await generatePDF(config, eventName);
  }, [layoutConfigs, timelineRows, eventId, eventName, versionLabel, generatePDF]);

  const buildConfig = useCallback((): BuildGuideConfig => ({
    eventId,
    layoutConfigs: layoutConfigs.map(l => ({
      ...l,
      includeLegend: l.includeLegend ?? true,
      includeDimensions: l.includeDimensions ?? true,
      includeNotes: l.includeNotes ?? true,
      includeTasks: l.includeTasks ?? true,
      notes: l.notes ?? [],
      tasks: l.tasks ?? [],
      elementVisibility: l.elementVisibility?.length
        ? l.elementVisibility
        : ELEMENT_CATEGORIES.map(c => ({ category: c.key, visible: true })),
    })),
    timelineRows: timelineRows.map(r => ({
      id: r.id,
      companyName: r.supplierName || r.companyName || '',
      role: r.role,
      arrivalTime: r.arrivalTime,
      departureTime: r.departureTime,
      location: r.location,
      contactPerson: r.contactPerson,
      phone: r.phone,
      notes: r.notes,
      included: r.included,
      ...(r.supplierName !== undefined && { supplierName: r.supplierName }),
      ...(r.email !== undefined && { email: r.email }),
    })) as TimelineRow[],
    contacts: [] as Contact[],
    documentSettings: {
      cover: {
        includeCover: true,
        eventName,
        eventDate: '',
        venueName: '',
        plannerCompanyName: '',
      },
      formatting: {
        paperSize: 'a4' as const,
        orientation: 'portrait' as const,
        colorMode: 'color' as const,
      },
      headerFooter: {
        showLogoInHeader: false,
        footerText: '',
        showPageNumbers: true,
        showWatermark: false,
      },
    },
    versionLabel,
  }), [layoutConfigs, timelineRows, eventId, eventName, versionLabel]);

  const handleGeneratePreview = useCallback(async () => {
    await generatePreview(buildConfig());
  }, [generatePreview, buildConfig]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 'min(1440px, 96vw)',
          height: '92vh',
          maxWidth: '96vw',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Build Guide</h2>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>{eventName}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{
            width: '240px',
            borderRight: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === tab.key ? '#ffffff' : 'transparent',
                  color: activeTab === tab.key ? '#0f172a' : '#4b5563',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: activeTab === tab.key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  marginBottom: '4px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activeTab === tab.key ? '#0f172a' : '#9ca3af'} strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: activeTab === 'preview' ? 'hidden' : 'auto',
            padding: activeTab === 'preview' ? '20px 24px' : '24px',
            display: activeTab === 'preview' ? 'flex' : 'block',
            flexDirection: activeTab === 'preview' ? 'column' : undefined,
            minHeight: 0,
          }}>
            {activeTab === 'layouts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Layout Pages</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>Configure which layouts to include and what to show</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>{includedCount} / {layoutConfigs.length} included</span>
                    <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>{totalElements} elements</span>
                  </div>
                </div>

                {layoutConfigs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {layoutConfigs.map((layout: LayoutConfig, index: number) => {
                      const isExpanded = expandedLayoutId === layout.layoutId;
                      return (
                        <div key={layout.layoutId || index} style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: layout.included ? '1px solid #e5e7eb' : '1px solid #e5e7eb',
                          opacity: layout.included ? 1 : 0.6,
                          overflow: 'hidden',
                        }}>
                          {/* Main Row */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '16px',
                          }}>
                            {/* Preview */}
                            <div style={{
                              width: '160px',
                              height: '114px',
                              backgroundColor: '#f3f4f6',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              border: '1px solid #e5e7eb',
                              flexShrink: 0,
                            }}>
                              {layout.shapes && layout.shapes.length > 0 ? (
                                <svg
                                  width="156"
                                  height="110"
                                  viewBox={`${layout.viewBox?.x || 0} ${layout.viewBox?.y || 0} ${layout.viewBox?.width || 800} ${layout.viewBox?.height || 600}`}
                                  style={{ width: '100%', height: '100%' }}
                                >
                                  {layout.shapes.slice(0, 30).map((shape: any, si: number) => {
                                    if (shape.type === 'rectangle') {
                                      return (
                                        <rect
                                          key={si}
                                          x={shape.x || 0}
                                          y={shape.y || 0}
                                          width={shape.width || 50}
                                          height={shape.height || 50}
                                          fill={shape.fill || '#d1d5db'}
                                          stroke={shape.stroke || '#6b7280'}
                                          strokeWidth="1"
                                          rx="4"
                                        />
                                      );
                                    }
                                    if (shape.type === 'circle') {
                                      return (
                                        <circle
                                          key={si}
                                          cx={shape.x || 0}
                                          cy={shape.y || 0}
                                          r={Math.min((shape.width || 50) / 2, 30)}
                                          fill={shape.fill || '#d1d5db'}
                                          stroke={shape.stroke || '#6b7280'}
                                          strokeWidth="1"
                                        />
                                      );
                                    }
                                    return null;
                                  })}
                                </svg>
                              ) : (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2" />
                                  <path d="M3 9h18M9 21V9" />
                                </svg>
                              )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 600, color: '#111827', fontSize: '15px' }}>{layout.layoutName || `Layout ${index + 1}`}</p>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{layout.spaceName}</p>
                              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>{layout.shapes?.length || 0} elements</p>
                            </div>

                            {/* Include Toggle */}
                            <button
                              onClick={() => toggleLayoutIncluded(layout.layoutId)}
                              style={{
                                width: '48px',
                                height: '28px',
                                borderRadius: '14px',
                                border: 'none',
                                backgroundColor: layout.included ? '#22c55e' : '#e5e7eb',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'background-color 0.2s',
                                flexShrink: 0,
                              }}
                            >
                              <div style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                position: 'absolute',
                                top: '3px',
                                left: layout.included ? '23px' : '3px',
                                transition: 'left 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }} />
                            </button>

                            {/* Expand/Collapse */}
                            <button
                              onClick={() => setExpandedLayoutId(isExpanded ? null : layout.layoutId)}
                              style={{
                                padding: '8px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <svg 
                                width="20" 
                                height="20" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="#6b7280" 
                                strokeWidth="2"
                                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                              >
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </button>
                          </div>

                          {/* Expanded Section - Element Visibility */}
                          {isExpanded && (
                            <div style={{
                              padding: '16px',
                              backgroundColor: '#f9fafb',
                              borderTop: '1px solid #e5e7eb',
                            }}>
                              <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                                Show/hide element categories
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {ELEMENT_CATEGORIES.map((cat) => {
                                  const isVisible = layout.elementVisibility?.find(c => c.category === cat.key)?.visible ?? true;
                                  return (
                                    <button
                                      key={cat.key}
                                      onClick={() => toggleCategoryVisibility(layout.layoutId, cat.key)}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid',
                                        borderColor: isVisible ? '#22c55e' : '#d1d5db',
                                        backgroundColor: isVisible ? '#ecfdf5' : '#ffffff',
                                        color: isVisible ? '#16a34a' : '#6b7280',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.15s',
                                      }}
                                    >
                                      <div style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '3px',
                                        border: '1.5px solid',
                                        borderColor: isVisible ? '#22c55e' : '#d1d5db',
                                        backgroundColor: isVisible ? '#22c55e' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}>
                                        {isVisible && (
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                                            <path d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </div>
                                      {cat.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '64px 24px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '2px dashed #e5e7eb',
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p style={{ margin: 0, fontWeight: 500, color: '#111827' }}>No layouts found</p>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>Create layouts in the Layout Maker to include them.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Supplier Timeline</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>Manage suppliers for the event day</p>
                  </div>
                  <button
                    onClick={() => setShowAddSupplier(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                    Add Supplier
                  </button>
                </div>

                {/* Timeline Summary */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: '18px', fontWeight: 600, color: '#16a34a' }}>{includedSuppliersCount}</span>
                    <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '6px' }}>suppliers in timeline</span>
                  </div>
                </div>

                {/* Add Supplier Modal */}
                {showAddSupplier && (
                  <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 60,
                  }}
                  onClick={() => setShowAddSupplier(false)}
                  >
                    <div 
                      style={{
                        width: '500px',
                        maxHeight: '80vh',
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        overflow: 'hidden',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Select Suppliers</h3>
                        <button onClick={() => setShowAddSupplier(false)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div style={{ padding: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
                        {suppliersLoading ? (
                          <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>Loading suppliers...</div>
                        ) : availableSuppliers.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '32px' }}>
                            <p style={{ margin: 0, color: '#6b7280' }}>No vendors found for this event.</p>
                            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#9ca3af' }}>Add vendors to your event first.</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {availableSuppliers.map((supplier: any) => {
                              const isAlreadyAdded = timelineRows.some(r => r.supplierId === supplier.id);
                              return (
                                <button
                                  key={supplier.id}
                                  onClick={() => !isAlreadyAdded && addSupplierToTimeline(supplier)}
                                  disabled={isAlreadyAdded}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    backgroundColor: isAlreadyAdded ? '#f3f4f6' : '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    cursor: isAlreadyAdded ? 'default' : 'pointer',
                                    textAlign: 'left',
                                    opacity: isAlreadyAdded ? 0.6 : 1,
                                  }}
                                >
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    backgroundColor: '#eff6ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.5">
                                      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontWeight: 500, color: '#111827', fontSize: '14px' }}>
                                      {supplier.supplier?.name || supplier.name || supplier.company_name || 'Unknown'}
                                    </p>
                                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                                      {supplier.supplier?.category || supplier.category || supplier.supplier?.company_name || 'Vendor'}
                                    </p>
                                  </div>
                                  {isAlreadyAdded ? (
                                    <span style={{ fontSize: '12px', color: '#16a34a', backgroundColor: '#dcfce7', padding: '4px 8px', borderRadius: '4px' }}>Added</span>
                                  ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
                                      <path d="M12 4v16m8-8H4" />
                                    </svg>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline Rows */}
                {timelineRows.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {timelineRows.map((row) => (
                      <div key={row.id} style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden',
                        opacity: row.included ? 1 : 0.6,
                      }}>
                        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            onClick={() => toggleTimelineRowIncluded(row.id)}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: row.included ? '8px' : '50%',
                              border: row.included ? 'none' : '1px solid #d1d5db',
                              backgroundColor: row.included ? '#22c55e' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {row.included && (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 500, color: '#111827', fontSize: '14px' }}>{row.supplierName}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>{row.category}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="time"
                              value={row.arrivalTime}
                              onChange={(e) => updateTimelineRow(row.id, { arrivalTime: e.target.value })}
                              style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                            />
                            <span style={{ color: '#9ca3af', fontSize: '13px' }}>to</span>
                            <input
                              type="time"
                              value={row.departureTime}
                              onChange={(e) => updateTimelineRow(row.id, { departureTime: e.target.value })}
                              style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                            />
                          </div>
                          <button
                            onClick={() => removeTimelineRow(row.id)}
                            style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '2px dashed #e5e7eb',
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p style={{ margin: 0, fontWeight: 500, color: '#111827' }}>No suppliers in timeline</p>
                    <p style={{ margin: '4px 0 16px', fontSize: '14px', color: '#6b7280' }}>Click "Add Supplier" to add vendors to your timeline.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contacts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Emergency Contacts</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>Contact cards to include in the PDF</p>
                </div>
                <div style={{
                  textAlign: 'center',
                  padding: '64px 24px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  border: '2px dashed #e5e7eb',
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p style={{ margin: 0, fontWeight: 500, color: '#111827' }}>No contacts added</p>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>Add contacts manually or from vendors.</p>
                </div>
              </div>
            )}

            {activeTab === 'document' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Document Setup</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>Configure your PDF output settings</p>
                </div>

                <div style={{
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Cover Page
                  </h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: '#0f172a' }} />
                    <span style={{ fontSize: '14px', color: '#374151' }}>Include cover page</span>
                  </label>
                </div>

                <div style={{
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                      <path d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Paper Settings
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Paper Size</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ flex: 1, padding: '10px 16px', backgroundColor: '#0f172a', color: '#ffffff', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>A4</button>
                        <button style={{ flex: 1, padding: '10px 16px', backgroundColor: '#ffffff', color: '#374151', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>US Letter</button>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Orientation</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ flex: 1, padding: '10px 16px', backgroundColor: '#0f172a', color: '#ffffff', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Portrait</button>
                        <button style={{ flex: 1, padding: '10px 16px', backgroundColor: '#ffffff', color: '#374151', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Landscape</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                      <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Header & Footer
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: '#0f172a' }} />
                      <span style={{ fontSize: '14px', color: '#374151' }}>Show page numbers</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: '#0f172a' }} />
                      <span style={{ fontSize: '14px', color: '#374151' }}>Show WedBoardPro watermark</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>

                {/* Header row: version label + last generated */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>Preview & Export</h3>
                  <div style={{ flex: 1 }} />
                  <label style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', whiteSpace: 'nowrap' }}>Version</label>
                  <input
                    type="text"
                    value={versionLabel}
                    onChange={e => setVersionLabel(e.target.value)}
                    style={{
                      padding: '5px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#111827',
                      width: '72px',
                      outline: 'none',
                    }}
                    placeholder="v1"
                  />
                  {lastGeneratedAt && (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      Last export: {new Date(lastGeneratedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {(isCapturing || isGenerating) && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#f8faff', border: '1px solid #c7d4f0',
                    borderRadius: '8px',
                  }}>
                    <svg style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/>
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: '13px', color: '#0f172a' }}>
                      {isCapturing ? captureProgress : generationProgress}
                    </span>
                  </div>
                )}

                {/* Document viewer */}
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                }}>
                  {/* Toolbar */}
                  <div style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Document Preview</span>
                    {pageMap.length > 0 && (
                      <span style={{
                        fontSize: '11px', color: '#6b7280',
                        backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '999px',
                      }}>{pageMap.length} page{pageMap.length !== 1 ? 's' : ''}</span>
                    )}
                    {previewReady && (
                      <span style={{
                        fontSize: '11px', color: '#15803d',
                        backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '999px', marginLeft: 'auto',
                      }}>
                        ✓ Preview ready
                      </span>
                    )}
                  </div>

                  {/* Scrollable vertical page stack */}
                  <div style={{
                    overflowY: 'auto',
                    flex: 1,
                    backgroundColor: '#e8eaed',
                    padding: pageMap.length === 0 ? '0' : '32px 0 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px',
                  }}>
                    {pageMap.length === 0 ? (
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        gap: '12px',
                        padding: '60px 24px',
                      }}>
                        <div style={{
                          width: '72px', height: '72px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>No preview yet</p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', textAlign: 'center', maxWidth: '280px' }}>
                          Click "Generate Preview" below to render all pages exactly as they'll appear in the PDF.
                        </p>
                      </div>
                    ) : (
                      pageMap.map((page, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                        }}>
                          {/* Page label */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#6b7280',
                              backgroundColor: '#d1d5db',
                              padding: '3px 10px',
                              borderRadius: '999px',
                            }}>
                              {idx + 1}
                            </span>
                            <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>
                              {page.title}
                            </span>
                          </div>

                          {/* Page itself — white paper with shadow */}
                          <div style={{ position: 'relative' }}>
                            <img
                              src={page.fullImg || page.thumb}
                              alt={page.title}
                              style={{
                                width: '520px',
                                height: 'auto',
                                aspectRatio: '1 / 1.414',
                                objectFit: 'cover',
                                display: 'block',
                                borderRadius: '3px',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)',
                              }}
                            />
                            {/* Missing capture badge */}
                            {page.fullImg === undefined && idx > 0 && !['Run Sheet', 'Contacts', 'Cover'].includes(page.title) && (
                              <div style={{
                                position: 'absolute',
                                bottom: '12px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: 'rgba(220,38,38,0.9)',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '4px 12px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                              }}>
                                Capture unavailable
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* Generate Preview */}
                  <button
                    onClick={handleGeneratePreview}
                    disabled={isCapturing || isGenerating || (includedCount === 0 && timelineRows.filter(r => r.included).length === 0)}
                    style={{
                      flex: 1,
                      padding: '11px',
                      backgroundColor: isCapturing ? '#e5e7eb' : '#f8faff',
                      color: isCapturing ? '#9ca3af' : '#0f172a',
                      borderRadius: '10px',
                      border: '1px solid ' + (isCapturing ? '#d1d5db' : '#cbd5e1'),
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isCapturing ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isCapturing ? (
                      <>
                        <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                        </svg>
                        {captureProgress || 'Capturing…'}
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        Generate Preview
                      </>
                    )}
                  </button>

                  {/* Generate PDF — only enabled after preview */}
                  <button
                    onClick={handleGeneratePDF}
                    disabled={isGenerating || isCapturing || !previewReady}
                    title={!previewReady ? 'Generate a preview first' : 'Download PDF'}
                    style={{
                      flex: 1,
                      padding: '11px',
                      backgroundColor: isGenerating
                        ? '#e5e7eb'
                        : !previewReady
                          ? '#f3f4f6'
                          : '#111827',
                      color: isGenerating || !previewReady ? '#9ca3af' : '#ffffff',
                      borderRadius: '10px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isGenerating ? 'wait' : !previewReady ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                        </svg>
                        {generationProgress || 'Building PDF…'}
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                        Generate PDF
                      </>
                    )}
                  </button>

                  {/* Share Link — disabled, coming soon */}
                  <button
                    disabled
                    title="Coming soon"
                    style={{
                      padding: '11px 16px',
                      backgroundColor: '#f3f4f6',
                      color: '#9ca3af',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                    Share
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
            {lastGeneratedAt
              ? `Last exported: ${new Date(lastGeneratedAt).toLocaleDateString()}`
              : 'Not yet exported'}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              color: '#4b5563',
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default BuildGuideModal;
