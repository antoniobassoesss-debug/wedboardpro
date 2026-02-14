import React, { useState, useEffect } from 'react';
import type { EventSupplier, CustomVendorCategory } from '../../../api/suppliersApi';
import { listEventSuppliers, listCustomVendorCategories } from '../../../api/suppliersApi';
import { VENDOR_CATEGORIES } from './types';
import CategoryAccordion from './CategoryAccordion';
import AddVendorModal from './AddVendorModal';
import VendorDetailsDrawer from './VendorDetailsDrawer';
import CreateCategoryModal from './CreateCategoryModal';
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
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);

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
            borderRadius: 12,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Suppliers</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{eventSuppliers.length} vendors across {allCategories.length} categories</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="vendors-add-btn"
            onClick={() => setShowCreateCategoryModal(true)}
            style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #e5e5e5' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Create Category
          </button>
          <button
            className="vendors-add-btn"
            onClick={() => handleAddVendor('venue')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Supplier
          </button>
        </div>
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

        {showCreateCategoryModal && (
          <CreateCategoryModal
            onClose={() => setShowCreateCategoryModal(false)}
            onCreated={() => {
              loadCustomCategories();
              setShowCreateCategoryModal(false);
            }}
          />
        )}

        {selectedVendor && (
          <VendorDetailsDrawer
            vendor={selectedVendor}
            onClose={() => setSelectedVendor(null)}
            onUpdate={handleVendorUpdated}
          />
        )}

        {/* Mobile FAB */}
        <button
          onClick={() => handleAddVendor('venue')}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 16,
            background: '#0f172a',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.3)';
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VendorsTab;
