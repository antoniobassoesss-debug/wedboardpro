import React, { useState, useEffect } from 'react';
import type { Supplier, SupplierCategory, CustomVendorCategory } from '../../../api/suppliersApi';
import { listSuppliers, addEventSupplier, listCustomVendorCategories } from '../../../api/suppliersApi';
import { VENDOR_CATEGORIES } from './types';

interface AddVendorModalProps {
  eventId: string;
  preSelectedCategory: string | null;
  onClose: () => void;
  onAdded: () => void;
}

interface VendorCategory {
  id: string;
  label: string;
}

const AddVendorModal: React.FC<AddVendorModalProps> = ({
  eventId,
  preSelectedCategory,
  onClose,
  onAdded,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomVendorCategory[]>([]);
  const [allCategories, setAllCategories] = useState<VendorCategory[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(
    preSelectedCategory || 'all'
  );
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomCategories();
  }, []);

  useEffect(() => {
    // Merge preset and custom categories
    const preset = VENDOR_CATEGORIES.map(c => ({ id: c.id, label: c.label }));
    const custom = customCategories.map(c => ({ id: c.category_id, label: c.label }));
    setAllCategories([...preset, ...custom]);
  }, [customCategories]);

  const categoryLabel = allCategories.find(c => c.id === preSelectedCategory)?.label;

  useEffect(() => {
    loadSuppliers();
  }, [search, categoryFilter]);

  const loadCustomCategories = async () => {
    const { data } = await listCustomVendorCategories();
    if (data) {
      setCustomCategories(data);
    }
  };

  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await listSuppliers({
      search: search || undefined,
      category: categoryFilter === 'all' ? undefined : (categoryFilter as SupplierCategory),
    });
    if (data) {
      setSuppliers(data);
    } else if (error) {
      setError(error);
    }
    setLoading(false);
  };

  const handleAdd = async (supplier: Supplier) => {
    setAdding(supplier.id);
    setError(null);

    const { error } = await addEventSupplier(eventId, {
      supplier_id: supplier.id,
      category: supplier.category,
      status: 'potential',
    });

    if (error) {
      setError(error);
      setAdding(null);
    } else {
      onAdded();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content add-vendor-modal">
        <div className="modal-header">
          <h2>
            {categoryLabel ? `Add Vendor to ${categoryLabel}` : 'Add Vendor'}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-filters">
          <input
            type="text"
            className="search-input"
            placeholder="Search vendors by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {allCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="supplier-list">
          {loading ? (
            <div className="loading-message">Loading suppliers...</div>
          ) : suppliers.length === 0 ? (
            <div className="empty-message">
              No suppliers found. Try adjusting your search or filters.
            </div>
          ) : (
            suppliers.map((supplier) => (
              <div key={supplier.id} className="supplier-item">
                <div className="supplier-info">
                  <div className="supplier-header">
                    <h4>{supplier.name}</h4>
                    {supplier.is_favorite && <span className="favorite-badge">★</span>}
                  </div>

                  {supplier.company_name && (
                    <div className="supplier-detail">{supplier.company_name}</div>
                  )}

                  <div className="supplier-meta">
                    <span className="category-badge">{supplier.category}</span>
                    {supplier.location && <span className="location">{supplier.location}</span>}
                    {supplier.rating_internal && (
                      <span className="rating">★ {supplier.rating_internal}/5</span>
                    )}
                  </div>

                  {supplier.email && <div className="supplier-contact">{supplier.email}</div>}
                </div>

                <button
                  className="primary-btn"
                  onClick={() => handleAdd(supplier)}
                  disabled={adding === supplier.id}
                >
                  {adding === supplier.id ? 'Adding...' : '+ Add to Project'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AddVendorModal;
