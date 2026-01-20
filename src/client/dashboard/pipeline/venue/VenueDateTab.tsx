import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchWeddingVenue,
  updateWeddingVenue,
  uploadVenueContract,
  deleteVenueContract,
  getContractDownloadUrl,
  formatCurrency,
  parseCurrencyToCents,
  daysUntil,
  formatDateLong,
  buildGoogleMapsUrl,
  type WeddingVenue,
  type VenueType,
  type ContractStatus,
} from '../../../api/weddingVenueApi';
import { browserSupabaseClient } from '../../../browserSupabaseClient';
import { useToast } from '../../../components/ui/toast';
import { MapPin, Phone, Mail, Download, Trash2, ExternalLink, FileText } from 'lucide-react';
import './venue.css';

interface VenueDateTabProps {
  eventId: string;
}

const VENUE_TYPES: { id: VenueType; label: string }[] = [
  { id: 'indoor', label: 'Indoor' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'both', label: 'Both' },
];

const CONTRACT_STATUSES: { id: ContractStatus; label: string }[] = [
  { id: 'not_uploaded', label: 'Not Uploaded' },
  { id: 'pending', label: 'Pending' },
  { id: 'signed', label: 'Signed' },
];

const VenueDateTab: React.FC<VenueDateTabProps> = ({ eventId }) => {
  // State
  const [venue, setVenue] = useState<WeddingVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form inputs for restrictions
  const [restrictionInput, setRestrictionInput] = useState('');

  // Refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { showToast } = useToast();

  // Load venue data
  const loadVenue = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchWeddingVenue(eventId);
    if (err) {
      setError(err);
    } else if (data) {
      setVenue(data);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadVenue();
  }, [loadVenue]);

  // Real-time subscription
  useEffect(() => {
    if (!eventId || !browserSupabaseClient) return;

    const channel = browserSupabaseClient
      .channel(`venue-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_venues',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          loadVenue();
        }
      )
      .subscribe();

    return () => {
      browserSupabaseClient?.removeChannel(channel);
    };
  }, [eventId, loadVenue]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Debounced save function
  const debouncedSave = useCallback(
    (field: keyof WeddingVenue, value: any) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaving(true);
      saveTimeoutRef.current = setTimeout(async () => {
        const { error: err } = await updateWeddingVenue(eventId, { [field]: value });
        if (err) {
          showToast(`Failed to save: ${err}`, 'error');
        }
        setSaving(false);
      }, 1000);
    },
    [eventId, showToast]
  );

  // ========== Form Handlers ==========
  const handleInputChange = (field: keyof WeddingVenue, value: string | number | null) => {
    if (!venue) return;
    setVenue({ ...venue, [field]: value });
    debouncedSave(field, value);
  };

  const handleVenueTypeChange = (type: VenueType) => {
    if (!venue) return;
    const newValue = venue.venue_type === type ? null : type;
    setVenue({ ...venue, venue_type: newValue });
    debouncedSave('venue_type', newValue);
  };

  const handleContractStatusChange = (status: ContractStatus) => {
    if (!venue) return;
    setVenue({ ...venue, contract_status: status });
    debouncedSave('contract_status', status);
  };

  // ========== Contract Upload Handlers ==========
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !venue) return;
    await uploadContract(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && venue) {
      await uploadContract(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const uploadContract = async (file: File) => {
    if (!venue) return;

    setUploading(true);
    setUploadProgress(0);

    const { data: storagePath, error: err } = await uploadVenueContract(
      eventId,
      file,
      (progress) => setUploadProgress(progress)
    );

    if (err) {
      showToast(`Failed to upload contract: ${err}`, 'error');
      setUploading(false);
      return;
    }

    // Update venue with contract path and set status to pending
    setVenue({
      ...venue,
      contract_file_url: storagePath,
      contract_status: 'pending',
    });

    const { error: updateErr } = await updateWeddingVenue(eventId, {
      contract_file_url: storagePath,
      contract_status: 'pending',
    });

    if (updateErr) {
      showToast(`Failed to save contract: ${updateErr}`, 'error');
    } else {
      showToast('Contract uploaded successfully', 'success');
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleDownloadContract = async () => {
    if (!venue?.contract_file_url) return;

    const { data: url, error: err } = await getContractDownloadUrl(venue.contract_file_url);
    if (err || !url) {
      showToast('Failed to get download URL', 'error');
      return;
    }

    window.open(url, '_blank');
  };

  const handleDeleteContract = async () => {
    if (!venue?.contract_file_url) return;

    const { error: err } = await deleteVenueContract(eventId, venue.contract_file_url);
    if (err) {
      showToast(`Failed to delete contract: ${err}`, 'error');
      return;
    }

    setVenue({
      ...venue,
      contract_file_url: null,
      contract_status: 'not_uploaded',
    });

    const { error: updateErr } = await updateWeddingVenue(eventId, {
      contract_file_url: null,
      contract_status: 'not_uploaded',
    });

    if (updateErr) {
      showToast(`Failed to update: ${updateErr}`, 'error');
    } else {
      showToast('Contract deleted', 'success');
    }
  };

  // ========== Restrictions Handlers ==========
  const handleAddRestriction = (restriction: string) => {
    if (!venue || venue.restrictions.length >= 20) return;
    const trimmed = restriction.trim();
    if (!trimmed || venue.restrictions.includes(trimmed)) return;
    const newRestrictions = [...venue.restrictions, trimmed];
    setVenue({ ...venue, restrictions: newRestrictions });
    debouncedSave('restrictions', newRestrictions);
  };

  const handleRemoveRestriction = (index: number) => {
    if (!venue) return;
    const newRestrictions = venue.restrictions.filter((_, i) => i !== index);
    setVenue({ ...venue, restrictions: newRestrictions });
    debouncedSave('restrictions', newRestrictions);
  };

  const handleRestrictionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && restrictionInput.trim()) {
      e.preventDefault();
      handleAddRestriction(restrictionInput);
      setRestrictionInput('');
    }
  };

  // ========== Deposit Status ==========
  const getDepositStatus = (): { label: string; className: string } => {
    if (!venue) return { label: 'Not Scheduled', className: 'not-scheduled' };

    if (venue.deposit_paid_date) {
      return { label: 'Deposit Paid', className: 'paid' };
    }

    if (venue.deposit_due_date) {
      const days = daysUntil(venue.deposit_due_date);
      if (days !== null) {
        if (days < 0) {
          return { label: 'OVERDUE', className: 'overdue' };
        }
        if (days <= 7) {
          return { label: `Due in ${days} day${days === 1 ? '' : 's'}`, className: 'due-soon' };
        }
        return { label: `Due in ${days} days`, className: 'not-scheduled' };
      }
    }

    return { label: 'Not Scheduled', className: 'not-scheduled' };
  };

  // ========== Render ==========
  if (loading) {
    return (
      <div className="venue-tab-loading">
        <div className="venue-saving-spinner" style={{ width: 24, height: 24 }} />
        <span style={{ marginLeft: 12 }}>Loading venue data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="venue-tab-error">
        <p>Failed to load venue data: {error}</p>
        <button
          onClick={loadVenue}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: 'none',
            background: '#0f172a',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!venue) return null;

  const mapsUrl = buildGoogleMapsUrl(venue.venue_latitude, venue.venue_longitude, venue.venue_address);
  const depositStatus = getDepositStatus();

  return (
    <div className="venue-tab">
      {/* Venue Details Section */}
      <div className="venue-section">
        <div className="venue-section-header">
          <h3 className="venue-section-title">Venue Details</h3>
          {saving && (
            <div className="venue-saving-indicator">
              <div className="venue-saving-spinner" />
              <span>Saving...</span>
            </div>
          )}
        </div>

        <div className="venue-details-layout">
          <div className="venue-details-form">
            <div className="venue-form-group full-width">
              <label className="venue-form-label">Venue Name</label>
              <input
                type="text"
                className="venue-form-input"
                value={venue.venue_name || ''}
                onChange={(e) => handleInputChange('venue_name', e.target.value || null)}
                placeholder="e.g., Grand Ballroom Hotel"
              />
            </div>

            <div className="venue-form-group full-width">
              <label className="venue-form-label">Address</label>
              <input
                type="text"
                className="venue-form-input"
                value={venue.venue_address || ''}
                onChange={(e) => handleInputChange('venue_address', e.target.value || null)}
                placeholder="123 Main Street, City"
              />
            </div>

            <div className="venue-form-row">
              <div className="venue-form-group">
                <label className="venue-form-label">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="venue-form-input"
                  value={venue.venue_latitude ?? ''}
                  onChange={(e) =>
                    handleInputChange('venue_latitude', e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="41.8781"
                />
              </div>
              <div className="venue-form-group">
                <label className="venue-form-label">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="venue-form-input"
                  value={venue.venue_longitude ?? ''}
                  onChange={(e) =>
                    handleInputChange('venue_longitude', e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="-87.6298"
                />
              </div>
            </div>

            <div className="venue-form-row">
              <div className="venue-form-group">
                <label className="venue-form-label">Capacity</label>
                <div className="venue-form-input-with-suffix">
                  <input
                    type="number"
                    className="venue-form-input"
                    value={venue.venue_capacity ?? ''}
                    onChange={(e) =>
                      handleInputChange('venue_capacity', e.target.value ? parseInt(e.target.value, 10) : null)
                    }
                    placeholder="150"
                  />
                  <span className="venue-form-suffix">guests</span>
                </div>
              </div>
              <div className="venue-form-group">
                <label className="venue-form-label">Venue Type</label>
                <div className="venue-type-options">
                  {VENUE_TYPES.map(({ id, label }) => (
                    <label key={id} className={`venue-type-option ${venue.venue_type === id ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="venue_type"
                        checked={venue.venue_type === id}
                        onChange={() => handleVenueTypeChange(id)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="venue-map-section">
            <div className="venue-map-icon">
              <MapPin size={40} color="#64748b" />
            </div>
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="venue-map-btn">
                <ExternalLink size={16} />
                Open in Maps
              </a>
            ) : (
              <span className="venue-map-btn disabled">Enter address or coordinates</span>
            )}
          </div>
        </div>
      </div>

      {/* Wedding Date Section */}
      <div className="venue-section">
        <h3 className="venue-section-title">Wedding Date</h3>
        <div className="wedding-date-display">
          <div className="wedding-date-input-wrapper">
            <input
              type="date"
              className="wedding-date-input"
              value={venue.wedding_date || ''}
              onChange={(e) => handleInputChange('wedding_date', e.target.value || null)}
            />
          </div>
          {venue.wedding_date && (
            <>
              <span className="wedding-date-formatted">{formatDateLong(venue.wedding_date)}</span>
              {(() => {
                const days = daysUntil(venue.wedding_date);
                if (days === null) return null;
                if (days > 0) {
                  return <span className="wedding-date-countdown upcoming">{days} days to go</span>;
                } else if (days < 0) {
                  return <span className="wedding-date-countdown past">{Math.abs(days)} days ago</span>;
                } else {
                  return <span className="wedding-date-countdown upcoming">Today!</span>;
                }
              })()}
            </>
          )}
        </div>
      </div>

      {/* Venue Contact Section */}
      <div className="venue-section">
        <h3 className="venue-section-title">Venue Contact</h3>
        <div className="venue-contact-grid">
          <div className="venue-contact-field">
            <label className="venue-form-label">Contact Name</label>
            <input
              type="text"
              className="venue-form-input"
              value={venue.contact_name || ''}
              onChange={(e) => handleInputChange('contact_name', e.target.value || null)}
              placeholder="John Smith"
            />
          </div>
          <div className="venue-contact-field">
            <label className="venue-form-label">Phone</label>
            <div className="venue-contact-input-row">
              <input
                type="tel"
                className="venue-form-input"
                value={venue.contact_phone || ''}
                onChange={(e) => handleInputChange('contact_phone', e.target.value || null)}
                placeholder="+1 555-123-4567"
              />
              {venue.contact_phone ? (
                <a href={`tel:${venue.contact_phone}`} className="venue-contact-btn">
                  <Phone size={18} />
                </a>
              ) : (
                <span className="venue-contact-btn disabled">
                  <Phone size={18} />
                </span>
              )}
            </div>
          </div>
          <div className="venue-contact-field">
            <label className="venue-form-label">Email</label>
            <div className="venue-contact-input-row">
              <input
                type="email"
                className="venue-form-input"
                value={venue.contact_email || ''}
                onChange={(e) => handleInputChange('contact_email', e.target.value || null)}
                placeholder="venue@example.com"
              />
              {venue.contact_email ? (
                <a href={`mailto:${venue.contact_email}`} className="venue-contact-btn">
                  <Mail size={18} />
                </a>
              ) : (
                <span className="venue-contact-btn disabled">
                  <Mail size={18} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Site Visit Notes Section */}
      <div className="venue-section">
        <h3 className="venue-section-title">Site Visit Notes</h3>
        <textarea
          className="venue-notes-textarea"
          value={venue.site_visit_notes || ''}
          onChange={(e) => handleInputChange('site_visit_notes', e.target.value || null)}
          placeholder="Notes from venue walkthrough..."
        />
      </div>

      {/* Contract Section */}
      <div className="venue-section">
        <h3 className="venue-section-title">Contract</h3>

        {uploading ? (
          <div className="contract-uploading">
            <div className="contract-uploading-spinner" />
            <span className="contract-uploading-text">Uploading... {uploadProgress}%</span>
          </div>
        ) : venue.contract_file_url ? (
          <div className="contract-file-card">
            <div className="contract-file-icon">
              <FileText size={24} />
            </div>
            <div className="contract-file-info">
              <p className="contract-file-name">Venue Contract</p>
              <p className="contract-file-meta">PDF Document</p>
            </div>
            <div className="contract-file-actions">
              <button className="contract-file-btn" onClick={handleDownloadContract} title="Download">
                <Download size={18} />
              </button>
              <button className="contract-file-btn delete" onClick={handleDeleteContract} title="Delete">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`contract-upload-zone ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input type="file" accept="application/pdf" onChange={handleFileSelect} />
            <div className="contract-upload-content">
              <div className="contract-upload-icon">
                <FileText size={32} />
              </div>
              <div className="contract-upload-text">Drag PDF here or click to upload</div>
              <div className="contract-upload-hint">PDF only, max 10MB</div>
            </div>
          </div>
        )}

        <div className="contract-status-row">
          <span className="contract-status-label">Status:</span>
          <div className="contract-status-pills">
            {CONTRACT_STATUSES.map(({ id, label }) => (
              <button
                key={id}
                className={`contract-status-pill ${id} ${venue.contract_status === id ? 'active' : ''}`}
                onClick={() => handleContractStatusChange(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deposit Tracker Section */}
      <div className="venue-section">
        <h3 className="venue-section-title">Deposit Tracker</h3>
        <div className="deposit-layout">
          <div className="deposit-field">
            <label className="venue-form-label">Amount</label>
            <div className="deposit-input-wrapper">
              <span className="deposit-currency-prefix">€</span>
              <input
                type="text"
                className="venue-form-input"
                value={venue.deposit_amount ? (venue.deposit_amount / 100).toString() : ''}
                onChange={(e) => {
                  const cents = parseCurrencyToCents(e.target.value);
                  handleInputChange('deposit_amount', cents);
                }}
                placeholder="0"
              />
            </div>
          </div>
          <div className="deposit-field">
            <label className="venue-form-label">Due Date</label>
            <input
              type="date"
              className="venue-form-input"
              value={venue.deposit_due_date || ''}
              onChange={(e) => handleInputChange('deposit_due_date', e.target.value || null)}
            />
          </div>
          <div className="deposit-field">
            <label className="venue-form-label">Paid Date</label>
            <input
              type="date"
              className="venue-form-input"
              value={venue.deposit_paid_date || ''}
              onChange={(e) => handleInputChange('deposit_paid_date', e.target.value || null)}
            />
          </div>
          <div className={`deposit-status-badge ${depositStatus.className}`}>{depositStatus.label}</div>
        </div>
      </div>

      {/* Venue Restrictions Section */}
      <div className="venue-section">
        <h3 className="venue-section-title">Venue Restrictions</h3>
        <p className="venue-section-hint">Add up to 20 restrictions (press Enter or comma to add)</p>
        <div className="restrictions-input-wrapper">
          <input
            type="text"
            className="restrictions-input"
            value={restrictionInput}
            onChange={(e) => setRestrictionInput(e.target.value)}
            onKeyDown={handleRestrictionKeyDown}
            placeholder="e.g., No open flames, 10pm noise curfew..."
            disabled={venue.restrictions.length >= 20}
          />
        </div>
        {venue.restrictions.length > 0 ? (
          <div className="restrictions-list">
            {venue.restrictions.map((restriction, index) => (
              <span key={index} className="restriction-tag">
                {restriction}
                <button onClick={() => handleRemoveRestriction(index)} aria-label={`Remove ${restriction}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="restrictions-empty">No restrictions added yet</p>
        )}
      </div>

      {/* AI Placeholder Section */}
      <div className="venue-section">
        <div className="venue-ai-placeholder">
          <div className="venue-ai-icon">✨</div>
          <h4 className="venue-ai-title">AI Venue Analyzer (Coming Soon)</h4>
          <p className="venue-ai-desc">
            Get venue capacity recommendations and layout suggestions based on your guest list
          </p>
        </div>
      </div>
    </div>
  );
};

export default VenueDateTab;
