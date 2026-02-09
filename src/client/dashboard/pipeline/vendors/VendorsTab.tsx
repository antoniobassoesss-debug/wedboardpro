import React, { useState, useEffect } from 'react';
import type { EventSupplier, CustomVendorCategory } from '../../../api/suppliersApi';
import { listEventSuppliers, listCustomVendorCategories } from '../../../api/suppliersApi';
import { VENDOR_CATEGORIES } from './types';
import CategoryAccordion from './CategoryAccordion';
import AddVendorModal from './AddVendorModal';
import VendorDetailsDrawer from './VendorDetailsDrawer';
import './vendors.css';

interface VendorsTabProps {
  eventId: string;
}

interface VendorCategory {
  id: string;
  label: string;
}

const VendorsTab: React.FC<VendorsTabProps> = ({ eventId }) => {
  const [eventSuppliers, setEventSuppliers] = useState<EventSupplier[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomVendorCategory[]>([]);
  const [allCategories, setAllCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<EventSupplier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVendors();
    loadCustomCategories();
  }, [eventId]);

  useEffect(() => {
    // Merge preset and custom categories
    const preset = VENDOR_CATEGORIES.map(c => ({ id: c.id, label: c.label }));
    const custom = customCategories.map(c => ({ id: c.category_id, label: c.label }));
    setAllCategories([...preset, ...custom]);
  }, [customCategories]);

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await listEventSuppliers(eventId);
    if (data) {
      setEventSuppliers(data);
    } else if (error) {
      setError(error);
    }
    setLoading(false);
  };

  const loadCustomCategories = async () => {
    const { data } = await listCustomVendorCategories();
    if (data) {
      setCustomCategories(data);
    }
  };

  const handleAddVendor = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setShowAddModal(true);
  };

  const handleVendorAdded = () => {
    loadVendors();
    setShowAddModal(false);
    setSelectedCategory(null);
  };

  const handleVendorUpdated = () => {
    loadVendors();
  };

  const getVendorsByCategory = (categoryId: string): EventSupplier[] => {
    return eventSuppliers.filter(vendor => vendor.category === categoryId);
  };

  if (loading) {
    return <div style={{ fontSize: 13, color: '#6b7280' }}>Loading vendors...</div>;
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#dc2626' }}>Error loading vendors: {error}</div>
        <button
          onClick={loadVendors}
          style={{
            borderRadius: 999,
            border: 'none',
            padding: '8px 16px',
            background: '#020617',
            color: '#f9fafb',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="vendors-tab">
      <div className="vendors-tab-header">
        <h2>Suppliers</h2>
        <button
          className="vendors-add-btn"
          onClick={() => handleAddVendor('venue')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Supplier
        </button>
      </div>

      <div className="vendors-tab-content">
        {allCategories.map((category) => (
          <CategoryAccordion
            key={category.id}
            categoryId={category.id}
            categoryLabel={category.label}
            vendors={getVendorsByCategory(category.id)}
            onAddVendor={handleAddVendor}
            onSelectVendor={setSelectedVendor}
          />
        ))}

        {showAddModal && (
          <AddVendorModal
            eventId={eventId}
            preSelectedCategory={selectedCategory}
            onClose={() => {
              setShowAddModal(false);
              setSelectedCategory(null);
            }}
            onAdded={handleVendorAdded}
          />
        )}

        {selectedVendor && (
          <VendorDetailsDrawer
            vendor={selectedVendor}
            onClose={() => setSelectedVendor(null)}
            onUpdate={handleVendorUpdated}
          />
        )}
      </div>
    </div>
  );
};

export default VendorsTab;
