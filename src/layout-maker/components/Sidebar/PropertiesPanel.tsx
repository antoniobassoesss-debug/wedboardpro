/**
 * Properties Panel Component
 *
 * Side panel for editing selected element properties:
 * - Header with element type + lock toggle
 * - Dimensions (width/height with unit toggle)
 * - Seating (for tables: count + arrangement)
 * - Position (X, Y, Rotation)
 * - Actions (Duplicate, Delete)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { TableElement, ChairElement, ElementType, BaseElement, StringLightsElement, BuntingElement } from '../../types/elements';
import { isTableElement, isChairElement, isZoneElement, isServiceElement, isDecorationElement, isStringLightsElement, isBuntingElement } from '../../types/elements';
import { ELEMENT_DEFAULTS, DIETARY_COLORS } from '../../constants';
import { generateChairPositions } from '../../utils/chairGeneration';

interface PropertiesPanelProps {
  selectedElement: BaseElement | null;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleLock: (id: string) => void;
  onClose: () => void;
}

const ARRANGEMENT_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'u-shape', label: 'U-Shape' },
  { value: 'l-shape', label: 'L-Shape' },
  { value: 'custom', label: 'Custom' },
];

const UNIT_OPTIONS = [
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' },
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  onUpdate,
  onDuplicate,
  onDelete,
  onToggleLock,
  onClose,
}) => {
  const [unit, setUnit] = useState<'cm' | 'm'>('cm');
  const [localValues, setLocalValues] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    capacity: 0,
    tableNumber: '',
    label: '',
    estimatedCapacity: null as number | null,
    notes: '',
  });

  useEffect(() => {
    if (selectedElement) {
      setLocalValues({
        x: selectedElement.x,
        y: selectedElement.y,
        width: selectedElement.width,
        height: selectedElement.height,
        rotation: selectedElement.rotation || 0,
        capacity: isTableElement(selectedElement) ? selectedElement.capacity || 0 : 0,
        tableNumber: isTableElement(selectedElement) ? selectedElement.tableNumber || '' : '',
        label: selectedElement.label || '',
        estimatedCapacity: isZoneElement(selectedElement) ? selectedElement.estimatedCapacity || null : null,
        notes: selectedElement.notes || '',
      });
    }
  }, [selectedElement]);

  if (!selectedElement) {
    return (
      <div style={{
        width: '280px',
        height: '100%',
        background: '#ffffff',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
            <path d="M12 3L12 21M3 12L21 12" strokeLinecap="round" />
          </svg>
          <p style={{ fontSize: '13px' }}>Select an element to edit</p>
        </div>
      </div>
    );
  }

  const isTable = isTableElement(selectedElement);
  const isChair = isChairElement(selectedElement);
  const isZone = isZoneElement(selectedElement);
  const isService = isServiceElement(selectedElement);
  const isDecor = isDecorationElement(selectedElement);
  const isFurniture = isService || isDecor;
  const isStringLights = isStringLightsElement(selectedElement);
  const isBunting = isBuntingElement(selectedElement);
  const isAnchor = isStringLights || isBunting;
  const stringLightsEl = isStringLights ? (selectedElement as StringLightsElement) : null;
  const buntingEl = isBunting ? (selectedElement as BuntingElement) : null;

  const formatDimension = (value: number): string => {
    if (unit === 'm') {
      return (value / 100).toFixed(2);
    }
    return Math.round(value).toString();
  };

  const parseDimension = (value: string): number => {
    const num = parseFloat(value);
    if (unit === 'm') {
      return Math.round(num * 100);
    }
    return Math.round(num);
  };

  const handleValueChange = (field: string, value: string | number | null) => {
    const numValue = typeof value === 'string' ? parseDimension(value) : value;
    setLocalValues((prev) => ({ ...prev, [field]: value }));
    onUpdate(selectedElement.id, { [field]: numValue ?? value });
  };

  const getElementLabel = () => {
    const defaults = ELEMENT_DEFAULTS[selectedElement.type as keyof typeof ELEMENT_DEFAULTS];
    if (isTable) {
      const tableLabels: Record<string, string> = {
        'table-round': 'Round Table',
        'table-rectangular': 'Rectangular Table',
        'table-square': 'Square Table',
        'table-oval': 'Oval Table',
      };
      return tableLabels[selectedElement.type] || defaults?.label || selectedElement.type;
    }
    return defaults?.label || selectedElement.type;
  };

  return (
    <div style={{
      width: '280px',
      height: '100%',
      background: '#ffffff',
      borderLeft: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            {getElementLabel()}
          </span>
          <span style={{
            fontSize: '11px',
            padding: '2px 6px',
            background: '#f1f5f9',
            color: '#64748b',
            borderRadius: '4px',
          }}>
            {selectedElement.id.slice(0, 6)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onToggleLock(selectedElement.id)}
            title={selectedElement.locked ? 'Unlock' : 'Lock'}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: selectedElement.locked ? '#fef3c7' : 'transparent',
              border: '1px solid',
              borderColor: selectedElement.locked ? '#f59e0b' : '#e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              color: selectedElement.locked ? '#f59e0b' : '#64748b',
            }}
          >
            {selectedElement.locked ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            )}
          </button>
          <button
            onClick={onClose}
            title="Close"
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Unit Toggle */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            borderRadius: '6px',
            padding: '3px',
          }}>
            {UNIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setUnit(opt.value as 'cm' | 'm')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: unit === opt.value ? '#ffffff' : 'transparent',
                  color: unit === opt.value ? '#1e293b' : '#64748b',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: unit === opt.value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Position Section */}
        <Section title="Position">
          <InputRow>
            <InputField
              label="X"
              value={formatDimension(localValues.x)}
              onChange={(v) => handleValueChange('x', v)}
              unit={unit}
            />
            <InputField
              label="Y"
              value={formatDimension(localValues.y)}
              onChange={(v) => handleValueChange('y', v)}
              unit={unit}
            />
          </InputRow>
          {!isAnchor && (
            <InputField
              label="Rotation"
              value={Math.round(localValues.rotation)}
              onChange={(v) => handleValueChange('rotation', v)}
              unit="°"
            />
          )}
        </Section>

        {/* Dimensions Section — hidden for anchor elements (resize via canvas handles) */}
        {!isAnchor && (
          <Section title="Dimensions">
            {!isChair && (
              <InputRow>
                <InputField
                  label="Width"
                  value={formatDimension(localValues.width)}
                  onChange={(v) => handleValueChange('width', v)}
                  unit={unit}
                />
                <InputField
                  label="Height"
                  value={formatDimension(localValues.height)}
                  onChange={(v) => handleValueChange('height', v)}
                  unit={unit}
                />
              </InputRow>
            )}
          </Section>
        )}

        {/* String Lights Style Section */}
        {isStringLights && stringLightsEl && (
          <Section title="String Lights">
            {/* Bulb Color */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>
                Bulb Color
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                {([
                  { value: 'warm-white', label: 'Warm', color: '#fbbf24' },
                  { value: 'cool-white', label: 'Cool', color: '#bae6fd' },
                  { value: 'multicolor', label: 'Multi', color: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 33%, #3b82f6 66%, #22c55e 100%)' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onUpdate(selectedElement.id, { bulbColor: opt.value })}
                    style={{
                      padding: '8px 4px',
                      fontSize: '11px',
                      fontWeight: 500,
                      background: stringLightsEl.bulbColor === opt.value ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${stringLightsEl.bulbColor === opt.value ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: stringLightsEl.bulbColor === opt.value ? '#3b82f6' : '#475569',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: opt.color,
                      border: '1px solid rgba(0,0,0,0.1)',
                      display: 'block',
                    }} />
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={
                    stringLightsEl.bulbColor === 'warm-white' ? '#fbbf24'
                    : stringLightsEl.bulbColor === 'cool-white' ? '#bae6fd'
                    : stringLightsEl.bulbColor === 'multicolor' ? '#f59e0b'
                    : stringLightsEl.bulbColor
                  }
                  onChange={(e) => onUpdate(selectedElement.id, { bulbColor: e.target.value })}
                  style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', color: '#475569' }}>Custom color</span>
              </div>
            </div>

            {/* Bulb Size */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>
                Bulb Size
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => onUpdate(selectedElement.id, { bulbSize: size })}
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: stringLightsEl.bulbSize === size ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${stringLightsEl.bulbSize === size ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: stringLightsEl.bulbSize === size ? '#3b82f6' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Spacing */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>
                Spacing
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['dense', 'normal', 'sparse'] as const).map((spacing) => (
                  <button
                    key={spacing}
                    onClick={() => onUpdate(selectedElement.id, { spacing })}
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: stringLightsEl.spacing === spacing ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${stringLightsEl.spacing === spacing ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: stringLightsEl.spacing === spacing ? '#3b82f6' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {spacing.charAt(0).toUpperCase() + spacing.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Wire Color */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>
                Wire Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={stringLightsEl.wireColor}
                  onChange={(e) => onUpdate(selectedElement.id, { wireColor: e.target.value })}
                  style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                  {stringLightsEl.wireColor}
                </span>
              </div>
            </div>
          </Section>
        )}

        {/* Bunting Style Section */}
        {isBunting && buntingEl && (
          <Section title="Bunting / Flags">
            {/* Color Scheme */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>
                Color Scheme
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {([
                  { value: 'arraial-classic', label: 'Arraial', colors: ['#dc2626', '#facc15', '#16a34a'] },
                  { value: 'rainbow', label: 'Rainbow', colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'] },
                  { value: 'solid', label: 'Solid', colors: [buntingEl.customColors?.[0] || '#dc2626'] },
                  { value: 'custom', label: 'Custom', colors: buntingEl.customColors?.slice(0, 4) || ['#dc2626'] },
                ] as const).map((scheme) => (
                  <button
                    key={scheme.value}
                    onClick={() => onUpdate(selectedElement.id, { colorScheme: scheme.value })}
                    style={{
                      padding: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: buntingEl.colorScheme === scheme.value ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${buntingEl.colorScheme === scheme.value ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: buntingEl.colorScheme === scheme.value ? '#3b82f6' : '#475569',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {scheme.colors.map((c, i) => (
                        <span key={i} style={{
                          width: '10px',
                          height: '14px',
                          background: c,
                          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                          display: 'block',
                        }} />
                      ))}
                    </div>
                    {scheme.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Flag Shape */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>
                Flag Shape
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['triangle', 'rectangle'] as const).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => onUpdate(selectedElement.id, { flagShape: shape })}
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: buntingEl.flagShape === shape ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${buntingEl.flagShape === shape ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: buntingEl.flagShape === shape ? '#3b82f6' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {shape.charAt(0).toUpperCase() + shape.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Flag Size */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>
                Flag Size
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => onUpdate(selectedElement.id, { flagSize: size })}
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: buntingEl.flagSize === size ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${buntingEl.flagSize === size ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: buntingEl.flagSize === size ? '#3b82f6' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Spacing */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>
                Spacing
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['dense', 'normal', 'sparse'] as const).map((spacing) => (
                  <button
                    key={spacing}
                    onClick={() => onUpdate(selectedElement.id, { spacing })}
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: buntingEl.spacing === spacing ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${buntingEl.spacing === spacing ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: buntingEl.spacing === spacing ? '#3b82f6' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {spacing.charAt(0).toUpperCase() + spacing.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* String Color */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>
                String Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={buntingEl.stringColor}
                  onChange={(e) => onUpdate(selectedElement.id, { stringColor: e.target.value })}
                  style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                  {buntingEl.stringColor}
                </span>
              </div>
            </div>
          </Section>
        )}

        {/* Label Section */}
        <Section title="Label">
          <InputField
            label="Name"
            value={localValues.label}
            onChange={(v) => {
              setLocalValues((prev) => ({ ...prev, label: v }));
              onUpdate(selectedElement.id, { label: v });
            }}
            placeholder="Element name"
          />
        </Section>

        {/* Seating Section (Tables only) */}
        {isTable && (
          <Section title="Seating">
            <InputField
              label="Seat Count"
              value={localValues.capacity}
              onChange={(v) => handleValueChange('capacity', v)}
            />
            <div style={{ marginTop: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: '#475569',
                marginBottom: '8px',
              }}>
                Arrangement
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
              }}>
                {ARRANGEMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    style={{
                      padding: '8px',
                      fontSize: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#475569',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <InputField
                label="Table Number"
                value={localValues.tableNumber}
                onChange={(v) => {
                  setLocalValues((prev) => ({ ...prev, tableNumber: v }));
                  onUpdate(selectedElement.id, { tableNumber: v });
                }}
                placeholder="e.g., 1, A, VIP"
              />
            </div>
          </Section>
        )}

        {/* Zone Capacity Section */}
        {isZone && (
          <Section title="Zone">
            <InputField
              label="Capacity"
              value={localValues.estimatedCapacity || ''}
              onChange={(v) => handleValueChange('estimatedCapacity', v || null)}
              placeholder="Estimated guests"
            />
          </Section>
        )}

        {/* Notes Section */}
        <Section title="Notes">
          <textarea
            value={localValues.notes}
            onChange={(e) => {
              setLocalValues((prev) => ({ ...prev, notes: e.target.value }));
              onUpdate(selectedElement.id, { notes: e.target.value });
            }}
            placeholder="Add notes..."
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              outline: 'none',
              color: '#1e293b',
              resize: 'vertical',
              minHeight: '60px',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />
        </Section>

        {/* Actions Section */}
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
        }}>
          <button
            onClick={() => onDuplicate(selectedElement.id)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '8px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Duplicate
          </button>
          <button
            onClick={() => onDelete(selectedElement.id)}
            style={{
              width: '100%',
              padding: '10px',
              background: '#ffffff',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <h3 style={{
      fontSize: '11px',
      fontWeight: 600,
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '12px',
    }}>
      {title}
    </h3>
    {children}
  </div>
);

interface InputRowProps {
  children: React.ReactNode;
}

const InputRow: React.FC<InputRowProps> = ({ children }) => (
  <div style={{ display: 'flex', gap: '12px' }}>
    {children}
  </div>
);

interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  unit,
  placeholder,
}) => (
  <div style={{ flex: 1 }}>
    <label style={{
      display: 'block',
      fontSize: '12px',
      fontWeight: 500,
      color: '#475569',
      marginBottom: '6px',
    }}>
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: unit ? '8px 28px 8px 10px' : '8px 10px',
          fontSize: '13px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          outline: 'none',
          color: '#1e293b',
          transition: 'all 0.15s ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#3b82f6';
          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e5e7eb';
          e.target.style.boxShadow = 'none';
        }}
      />
      {unit && (
        <span style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '12px',
          color: '#94a3b8',
          pointerEvents: 'none',
        }}>
          {unit}
        </span>
      )}
    </div>
  </div>
);

export default PropertiesPanel;
