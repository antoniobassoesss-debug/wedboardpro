import React from 'react';
import type { EventSupplier } from '../../../api/suppliersApi';
import { STATUS_DISPLAY } from './types';

interface VendorCardProps {
  vendor: EventSupplier;
  onClick: () => void;
}

const VendorCard: React.FC<VendorCardProps> = ({ vendor, onClick }) => {
  const statusInfo = STATUS_DISPLAY[vendor.status];

  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '';
    return `€${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        borderRadius: 10,
        border: '1px solid #e5e5e5',
        background: '#ffffff',
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e5e5';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div>
        <div style={{ fontWeight: 500, color: '#0f172a' }}>
          {vendor.supplier?.name || 'Unknown Vendor'}
        </div>
        {vendor.quoted_price && (
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            Quote: {formatCurrency(vendor.quoted_price)}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 999,
          background: statusInfo.color === 'teal' ? 'rgba(20, 184, 166, 0.1)' :
                     statusInfo.color === 'coral' ? 'rgba(239, 68, 68, 0.1)' :
                     'rgba(100, 116, 139, 0.1)',
          color: statusInfo.color === 'teal' ? '#0f766e' :
                 statusInfo.color === 'coral' ? '#dc2626' :
                 '#475569',
        }}
      >
        {statusInfo.label}
      </div>
    </div>
  );
};

export default VendorCard;
