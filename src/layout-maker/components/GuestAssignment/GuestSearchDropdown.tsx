/**
 * Guest Search Dropdown Component
 *
 * Dropdown that appears when clicking an empty chair to search and assign guests.
 * Styled to match the rest of the Layout Maker UI.
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Guest, AllergyType } from '../../types/guests';
import type { DietaryType } from '../../types/elements';
import { DIETARY_ICONS, ALLERGY_ICONS } from '../../types/guests';

interface GuestSearchDropdownProps {
  chairId: string;
  chairPosition: { x: number; y: number; width: number; height: number };
  unassignedGuests: Guest[];
  assignedGuests: Guest[];
  currentlyAssignedGuest?: Guest | null;
  isLoading?: boolean;
  onAssign: (guestId: string) => void;
  onUnassign: () => void;
  onClose: () => void;
}

function getInitials(guest: Guest): string {
  const first = guest.firstName.charAt(0).toUpperCase();
  const last = guest.lastName.charAt(0).toUpperCase();
  return `${first}${last}`;
}

function DietaryBadge({ type }: { type: DietaryType | null }): React.ReactElement | null {
  if (!type || type === 'regular') return null;
  const emoji = DIETARY_ICONS[type as keyof typeof DIETARY_ICONS] || '';
  if (!emoji) return null;

  const colors: Record<string, { bg: string; text: string }> = {
    vegetarian: { bg: '#dcfce7', text: '#166534' },
    vegan: { bg: '#d1fae5', text: '#065f46' },
    halal: { bg: '#fef3c7', text: '#92400e' },
    kosher: { bg: '#dbeafe', text: '#1e40af' },
    other: { bg: '#f3f4f6', text: '#374151' },
  };

  const style = colors[type] ?? { bg: '#f3f4f6', text: '#374151' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 500,
        background: style.bg,
        color: style.text,
      }}
    >
      {emoji} {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

function AllergyBadges({ allergies }: { allergies: AllergyType[] }): React.ReactElement | null {
  if (allergies.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {allergies.slice(0, 2).map((allergy, i) => (
        <span
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 6px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: 500,
            background: '#fef2f2',
            color: '#dc2626',
          }}
        >
          {ALLERGY_ICONS[allergy] || '⚠️'} {allergy}
        </span>
      ))}
      {allergies.length > 2 && (
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>+{allergies.length - 2}</span>
      )}
    </div>
  );
}

interface GuestRowProps {
  guest: Guest;
  onClick: () => void;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}

const GuestRow: React.FC<GuestRowProps> = ({ guest, onClick, isHovered, onHover }) => {
  const hasDietary = guest.dietaryType !== 'regular' && guest.dietaryType !== null;
  const hasAllergies = guest.allergies.length > 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onHover(guest.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        background: isHovered ? '#f8fafc' : 'transparent',
        borderLeft: isHovered ? '3px solid #3b82f6' : '3px solid transparent',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#4338ca' }}>
          {getInitials(guest)}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', marginBottom: '2px' }}>
          {guest.firstName} {guest.lastName}
        </div>
        {(hasDietary || hasAllergies) && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {hasDietary && <DietaryBadge type={guest.dietaryType} />}
            {hasAllergies && <AllergyBadges allergies={guest.allergies} />}
          </div>
        )}
      </div>

      {/* Arrow indicator */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isHovered ? '#3b82f6' : '#cbd5e1'}
        strokeWidth="2"
        style={{ flexShrink: 0, transition: 'all 0.15s ease', transform: isHovered ? 'translateX(2px)' : 'none' }}
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
};

type TabType = 'unassigned' | 'assigned';

const GuestSearchDropdown: React.FC<GuestSearchDropdownProps> = ({
  chairId,
  chairPosition,
  unassignedGuests,
  assignedGuests,
  currentlyAssignedGuest,
  isLoading = false,
  onAssign,
  onUnassign,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [hoveredGuestId, setHoveredGuestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('unassigned');
  const [showReassign, setShowReassign] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only focus search if we're in reassign mode or no guest assigned
    if (!currentlyAssignedGuest || showReassign) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [currentlyAssignedGuest, showReassign]);

  const currentGuests = activeTab === 'unassigned' ? unassignedGuests : assignedGuests;

  const filteredGuests = useMemo(() => {
    if (!search.trim()) return currentGuests;
    const searchLower = search.toLowerCase();
    return currentGuests.filter(guest =>
      guest.firstName.toLowerCase().includes(searchLower) ||
      guest.lastName.toLowerCase().includes(searchLower)
    );
  }, [currentGuests, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAssign = (guestId: string) => {
    onAssign(guestId);
    onClose();
  };

  const calculatePosition = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dropdownWidth = 340;
    const dropdownHeight = 420;

    let x = chairPosition.x + chairPosition.width + 12;
    let y = chairPosition.y - 20;

    if (x + dropdownWidth > viewportWidth - 20) {
      x = chairPosition.x - dropdownWidth - 12;
    }
    if (x < 20) x = 20;

    if (y + dropdownHeight > viewportHeight - 20) {
      y = Math.max(20, viewportHeight - dropdownHeight - 20);
    }
    if (y < 20) y = 20;

    return { x, y };
  };

  const position = calculatePosition();

  // Determine if we should show the assigned guest view
  const showAssignedView = currentlyAssignedGuest && !showReassign;

  const dropdownContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dropdownRef}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: showAssignedView ? '280px' : '340px',
          maxHeight: showAssignedView ? 'auto' : '420px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'dropdownFadeIn 0.2s ease',
        }}
      >
        {showAssignedView ? (
          /* Assigned Guest View */
          <>
            <div style={{
              padding: '16px',
              background: 'linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assigned Guest
                </span>
                <button
                  onClick={onClose}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Guest Info Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
                    {getInitials(currentlyAssignedGuest)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
                    {currentlyAssignedGuest.firstName} {currentlyAssignedGuest.lastName}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {currentlyAssignedGuest.dietaryType && currentlyAssignedGuest.dietaryType !== 'regular' && (
                      <DietaryBadge type={currentlyAssignedGuest.dietaryType} />
                    )}
                    {currentlyAssignedGuest.allergies.length > 0 && (
                      <AllergyBadges allergies={currentlyAssignedGuest.allergies} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              padding: '12px 16px 16px',
              display: 'flex',
              gap: '8px',
            }}>
              <button
                onClick={() => setShowReassign(true)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#3b82f6',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Change
              </button>
              <button
                onClick={() => {
                  onUnassign();
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          /* Guest Selection View */
          <>
            {/* Header */}
            <div style={{
              padding: '16px 16px 12px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {showReassign && (
                    <button
                      onClick={() => setShowReassign(false)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#f1f5f9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                  )}
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    {showReassign ? 'Change Guest' : 'Assign Guest'}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div style={{
                display: 'flex',
                gap: '4px',
                padding: '4px',
                background: '#f1f5f9',
                borderRadius: '10px',
                marginBottom: '12px',
              }}>
                <button
                  onClick={() => setActiveTab('unassigned')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: activeTab === 'unassigned' ? '#ffffff' : 'transparent',
                    color: activeTab === 'unassigned' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'unassigned' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Unassigned ({unassignedGuests.length})
                </button>
                <button
                  onClick={() => setActiveTab('assigned')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: activeTab === 'assigned' ? '#ffffff' : 'transparent',
                    color: activeTab === 'assigned' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'assigned' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Assigned ({assignedGuests.length})
                </button>
              </div>

              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    fontSize: '13px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    outline: 'none',
                    background: '#f8fafc',
                    color: '#1e293b',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.background = '#f8fafc';
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Guest list */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
              {isLoading ? (
                <div style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #e2e8f0',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    margin: '0 auto 12px',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <div style={{ fontSize: '13px' }}>Loading guests...</div>
                </div>
              ) : filteredGuests.length === 0 ? (
                <div style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                }}>
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    style={{ margin: '0 auto 12px' }}
                  >
                    {activeTab === 'unassigned' ? (
                      <>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </>
                    ) : (
                      <>
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </>
                    )}
                  </svg>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                    {search
                      ? 'No guests found'
                      : activeTab === 'unassigned'
                        ? 'All guests are assigned'
                        : 'No guests assigned yet'}
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    {!search && activeTab === 'unassigned' && 'Great job! Every guest has a seat.'}
                    {!search && activeTab === 'assigned' && 'Click on unassigned guests to assign them.'}
                  </div>
                </div>
              ) : (
                filteredGuests.map(guest => (
                  <GuestRow
                    key={guest.id}
                    guest={guest}
                    onClick={() => handleAssign(guest.id)}
                    isHovered={hoveredGuestId === guest.id}
                    onHover={setHoveredGuestId}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafbfc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Click a guest to assign • ESC to close
              </span>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(dropdownContent, document.body);
};

export default GuestSearchDropdown;
