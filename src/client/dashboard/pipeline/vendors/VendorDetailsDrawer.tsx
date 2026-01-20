import React, { useState } from 'react';
import type { EventSupplier, EventSupplierStatus } from '../../../api/suppliersApi';
import { updateEventSupplier } from '../../../api/suppliersApi';
import { STATUS_DISPLAY } from './types';

interface VendorDetailsDrawerProps {
  vendor: EventSupplier;
  onClose: () => void;
  onUpdate: () => void;
}

const ALL_STATUSES: EventSupplierStatus[] = [
  'potential',
  'contacted',
  'quote_requested',
  'quote_received',
  'negotiating',
  'confirmed',
  'paid_completed',
  'declined_lost',
];

const VendorDetailsDrawer: React.FC<VendorDetailsDrawerProps> = ({ vendor, onClose, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [formData, setFormData] = useState({
    status: vendor.status,
    quoted_price: vendor.quoted_price || '',
    budget_allocated: vendor.budget_allocated || 0,
    deposit_amount: vendor.deposit_amount || 0,
    deposit_paid_date: vendor.deposit_paid_date || '',
    final_payment_amount: vendor.final_payment_amount || 0,
    final_payment_paid_date: vendor.final_payment_paid_date || '',
    contract_signed_date: vendor.contract_signed_date || '',
    decision_deadline: vendor.decision_deadline || '',
    service_delivery_date: vendor.service_delivery_date || '',
    notes: vendor.notes || '',
  });

  const currentStatusInfo = STATUS_DISPLAY[formData.status];

  const handleStatusChange = async (newStatus: EventSupplierStatus) => {
    setFormData({ ...formData, status: newStatus });
    setShowStatusDropdown(false);

    // Auto-save status change
    setSaving(true);
    setError(null);
    const { error } = await updateEventSupplier(vendor.id, { status: newStatus });

    if (error) {
      setError(error);
      setSaving(false);
    } else {
      onUpdate();
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const updates: any = {};
    if (formData.quoted_price !== vendor.quoted_price) updates.quoted_price = formData.quoted_price;
    if (formData.budget_allocated !== vendor.budget_allocated) updates.budget_allocated = formData.budget_allocated;
    if (formData.deposit_amount !== vendor.deposit_amount) updates.deposit_amount = formData.deposit_amount;
    if (formData.deposit_paid_date !== vendor.deposit_paid_date)
      updates.deposit_paid_date = formData.deposit_paid_date || null;
    if (formData.final_payment_amount !== vendor.final_payment_amount)
      updates.final_payment_amount = formData.final_payment_amount;
    if (formData.final_payment_paid_date !== vendor.final_payment_paid_date)
      updates.final_payment_paid_date = formData.final_payment_paid_date || null;
    if (formData.contract_signed_date !== vendor.contract_signed_date)
      updates.contract_signed_date = formData.contract_signed_date || null;
    if (formData.decision_deadline !== vendor.decision_deadline)
      updates.decision_deadline = formData.decision_deadline || null;
    if (formData.service_delivery_date !== vendor.service_delivery_date)
      updates.service_delivery_date = formData.service_delivery_date || null;
    if (formData.notes !== vendor.notes) updates.notes = formData.notes;

    const { error } = await updateEventSupplier(vendor.id, updates);

    if (error) {
      setError(error);
      setSaving(false);
    } else {
      onUpdate();
      setEditing(false);
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      status: vendor.status,
      quoted_price: vendor.quoted_price || '',
      budget_allocated: vendor.budget_allocated || 0,
      deposit_amount: vendor.deposit_amount || 0,
      deposit_paid_date: vendor.deposit_paid_date || '',
      final_payment_amount: vendor.final_payment_amount || 0,
      final_payment_paid_date: vendor.final_payment_paid_date || '',
      contract_signed_date: vendor.contract_signed_date || '',
      decision_deadline: vendor.decision_deadline || '',
      service_delivery_date: vendor.service_delivery_date || '',
      notes: vendor.notes || '',
    });
    setEditing(false);
    setError(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'Not set';
    return `€${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content vendor-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{vendor.supplier?.name || 'Vendor Details'}</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-body">
          {/* Supplier Info Section */}
          <section className="drawer-section">
            <h3>Supplier Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Category</span>
                <span className="info-value">{vendor.category}</span>
              </div>
              {vendor.supplier?.company_name && (
                <div className="info-item">
                  <span className="info-label">Company</span>
                  <span className="info-value">{vendor.supplier.company_name}</span>
                </div>
              )}
              {vendor.supplier?.email && (
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">
                    <a href={`mailto:${vendor.supplier.email}`}>{vendor.supplier.email}</a>
                  </span>
                </div>
              )}
              {vendor.supplier?.phone && (
                <div className="info-item">
                  <span className="info-label">Phone</span>
                  <span className="info-value">
                    <a href={`tel:${vendor.supplier.phone}`}>{vendor.supplier.phone}</a>
                  </span>
                </div>
              )}
              {vendor.supplier?.website && (
                <div className="info-item">
                  <span className="info-label">Website</span>
                  <span className="info-value">
                    <a href={vendor.supplier.website} target="_blank" rel="noopener noreferrer">
                      {vendor.supplier.website}
                    </a>
                  </span>
                </div>
              )}
              {vendor.supplier?.location && (
                <div className="info-item">
                  <span className="info-label">Location</span>
                  <span className="info-value">{vendor.supplier.location}</span>
                </div>
              )}
            </div>
          </section>

          {/* Status Management Section */}
          <section className="drawer-section">
            <h3>Status</h3>
            <div className="status-selector-container">
              <label className="status-selector-label">Current Status</label>
              <div className="status-selector-wrapper">
                <button
                  className={`status-selector-current ${currentStatusInfo.color}`}
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={saving}
                >
                  <span className="status-selector-text">{currentStatusInfo.label}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`status-chevron ${showStatusDropdown ? 'rotated' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showStatusDropdown && (
                  <div className="status-dropdown">
                    {ALL_STATUSES.map((status) => {
                      const statusInfo = STATUS_DISPLAY[status];
                      const isActive = status === formData.status;
                      return (
                        <button
                          key={status}
                          className={`status-option ${statusInfo.color} ${isActive ? 'active' : ''}`}
                          onClick={() => handleStatusChange(status)}
                        >
                          {statusInfo.label}
                          {isActive && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Financial Section */}
          <section className="drawer-section">
            <h3>Financial Tracking</h3>
            {editing ? (
              <div className="form-fields">
                <div className="form-field">
                  <label>Budget Allocated (€)</label>
                  <input
                    type="number"
                    value={formData.budget_allocated}
                    onChange={(e) =>
                      setFormData({ ...formData, budget_allocated: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="form-field">
                  <label>Quoted Price (€)</label>
                  <input
                    type="text"
                    value={formData.quoted_price}
                    onChange={(e) => setFormData({ ...formData, quoted_price: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Deposit Amount (€)</label>
                  <input
                    type="number"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-field">
                  <label>Deposit Paid Date</label>
                  <input
                    type="date"
                    value={formData.deposit_paid_date}
                    onChange={(e) => setFormData({ ...formData, deposit_paid_date: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Final Payment Amount (€)</label>
                  <input
                    type="number"
                    value={formData.final_payment_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, final_payment_amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="form-field">
                  <label>Final Payment Paid Date</label>
                  <input
                    type="date"
                    value={formData.final_payment_paid_date}
                    onChange={(e) => setFormData({ ...formData, final_payment_paid_date: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Budget Allocated</span>
                  <span className="info-value">
                    {vendor.budget_allocated ? formatCurrency(vendor.budget_allocated) : 'Not set'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Quoted Price</span>
                  <span className="info-value">
                    {vendor.quoted_price ? formatCurrency(vendor.quoted_price) : 'Not set'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Deposit Amount</span>
                  <span className="info-value">
                    {vendor.deposit_amount ? formatCurrency(vendor.deposit_amount) : 'Not set'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Deposit Paid</span>
                  <span className="info-value">{formatDate(vendor.deposit_paid_date)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Final Payment Amount</span>
                  <span className="info-value">
                    {vendor.final_payment_amount ? formatCurrency(vendor.final_payment_amount) : 'Not set'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Final Payment Paid</span>
                  <span className="info-value">{formatDate(vendor.final_payment_paid_date)}</span>
                </div>
              </div>
            )}
          </section>

          {/* Timeline Section */}
          <section className="drawer-section">
            <h3>Important Dates</h3>
            {editing ? (
              <div className="form-fields">
                <div className="form-field">
                  <label>Contract Signed Date</label>
                  <input
                    type="date"
                    value={formData.contract_signed_date}
                    onChange={(e) => setFormData({ ...formData, contract_signed_date: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Decision Deadline</label>
                  <input
                    type="date"
                    value={formData.decision_deadline}
                    onChange={(e) => setFormData({ ...formData, decision_deadline: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Service Delivery Date</label>
                  <input
                    type="date"
                    value={formData.service_delivery_date}
                    onChange={(e) => setFormData({ ...formData, service_delivery_date: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Contract Signed</span>
                  <span className="info-value">{formatDate(vendor.contract_signed_date)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Decision Deadline</span>
                  <span className="info-value">{formatDate(vendor.decision_deadline)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Service Date</span>
                  <span className="info-value">{formatDate(vendor.service_delivery_date)}</span>
                </div>
              </div>
            )}
          </section>

          {/* Notes Section */}
          <section className="drawer-section">
            <h3>Notes</h3>
            {editing ? (
              <div className="form-field">
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add notes about this vendor..."
                  rows={5}
                />
              </div>
            ) : (
              <p className="notes-text">{vendor.notes || 'No notes'}</p>
            )}
          </section>
        </div>

        <div className="modal-footer">
          {editing ? (
            <>
              <button className="secondary-btn" onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
              <button className="primary-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button className="primary-btn" onClick={() => setEditing(true)}>
              Edit Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorDetailsDrawer;
