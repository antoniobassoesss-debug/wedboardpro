import React, { useState } from 'react';
import type { EventSupplier } from '../../../api/suppliersApi';
import VendorCard from './VendorCard';

interface CategoryAccordionProps {
  categoryId: string;
  categoryLabel: string;
  vendors: EventSupplier[];
  onAddVendor: (categoryId: string) => void;
  onSelectVendor: (vendor: EventSupplier) => void;
}

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  categoryId,
  categoryLabel,
  vendors,
  onAddVendor,
  onSelectVendor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const vendorCount = vendors.length;
  const hasNoVendors = vendorCount === 0;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid #e5e5e5',
        background: '#ffffff',
        marginBottom: 12,
      }}
    >
      <button
        onClick={toggleExpanded}
        style={{
          width: '100%',
          padding: 14,
          background: 'transparent',
          border: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
          borderRadius: 16,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f9fafb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
            {categoryLabel}
          </span>
          <span style={{ fontSize: 12, color: hasNoVendors ? '#ef4444' : '#6b7280' }}>
            ({vendorCount})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddVendor(categoryId);
            }}
            style={{
              fontSize: 11,
              borderRadius: 999,
              border: '1px solid #d1d5db',
              padding: '4px 10px',
              background: '#f9fafb',
              cursor: 'pointer',
              color: '#374151',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f9fafb';
            }}
          >
            + Add
          </button>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            style={{
              transition: 'transform 200ms ease',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div style={{ padding: '0 14px 14px 14px' }}>
          {hasNoVendors ? (
            <div
              style={{
                textAlign: 'center',
                padding: '20px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                No vendors added yet
              </p>
              <button
                onClick={() => onAddVendor(categoryId)}
                style={{
                  borderRadius: 999,
                  border: '1px solid #d1d5db',
                  padding: '6px 14px',
                  background: '#ffffff',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: '#374151',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                + Add Vendor
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {vendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onClick={() => onSelectVendor(vendor)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryAccordion;
