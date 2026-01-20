import React, { useState, useRef } from 'react';
import {
  parseCSV,
  mapRowToGuest,
  generateCSVTemplate,
  importGuests,
  type GuestCreate,
} from '../../../api/weddingGuestsApi';
import { Download, Upload, ArrowRight, X, AlertCircle } from 'lucide-react';

interface ImportGuestsModalProps {
  eventId: string;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing';

const CSV_FIELD_OPTIONS = [
  { value: '', label: '-- Skip --' },
  { value: 'guest_name', label: 'Guest Name *' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'side', label: 'Side (bride/groom/both)' },
  { value: 'guest_group', label: 'Group (family/friends/coworkers/other)' },
  { value: 'rsvp_status', label: 'RSVP Status (pending/yes/no)' },
  { value: 'dietary_restrictions', label: 'Dietary Restrictions' },
  { value: 'dietary_notes', label: 'Dietary Notes' },
  { value: 'plus_one_allowed', label: 'Plus One Allowed (true/false)' },
  { value: 'plus_one_name', label: 'Plus One Name' },
  { value: 'is_child', label: 'Is Child (true/false)' },
  { value: 'needs_accessibility', label: 'Needs Accessibility (true/false)' },
  { value: 'accessibility_notes', label: 'Accessibility Notes' },
];

const ImportGuestsModal: React.FC<ImportGuestsModalProps> = ({ eventId, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [parsedGuests, setParsedGuests] = useState<GuestCreate[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; error: string }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum 5MB.');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: csvHeaders, rows: csvRows } = parseCSV(text);

      if (csvHeaders.length === 0) {
        alert('Could not parse CSV. Please check the file format.');
        return;
      }

      setHeaders(csvHeaders);
      setRows(csvRows);

      // Auto-detect column mapping
      const autoMapping: Record<string, number> = {};
      csvHeaders.forEach((header, idx) => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '_');

        // Try to match common header patterns
        if (normalized.includes('name') && !normalized.includes('plus')) {
          autoMapping.guest_name = idx;
        } else if (normalized.includes('email')) {
          autoMapping.email = idx;
        } else if (normalized.includes('phone') || normalized.includes('mobile')) {
          autoMapping.phone = idx;
        } else if (normalized.includes('side')) {
          autoMapping.side = idx;
        } else if (normalized.includes('group') || normalized.includes('category')) {
          autoMapping.guest_group = idx;
        } else if (normalized.includes('rsvp') || normalized.includes('status')) {
          autoMapping.rsvp_status = idx;
        } else if (normalized.includes('diet')) {
          autoMapping.dietary_restrictions = idx;
        } else if (normalized.includes('plus_one_name') || normalized === 'plus_one') {
          autoMapping.plus_one_name = idx;
        } else if (normalized.includes('plus_one') || normalized.includes('plusone')) {
          autoMapping.plus_one_allowed = idx;
        } else if (normalized.includes('child') || normalized.includes('kid')) {
          autoMapping.is_child = idx;
        } else if (normalized.includes('accessibility') || normalized.includes('wheelchair')) {
          autoMapping.needs_accessibility = idx;
        }
      });

      setColumnMapping(autoMapping);
      setStep('mapping');
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Update column mapping
  const handleMappingChange = (field: string, columnIndex: number) => {
    setColumnMapping((prev) => {
      const next = { ...prev };
      // Remove previous mapping for this field
      Object.keys(next).forEach((key) => {
        if (next[key] === columnIndex && key !== field) {
          delete next[key];
        }
      });
      // Set new mapping
      if (columnIndex >= 0) {
        next[field] = columnIndex;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  // Proceed to preview step
  const handlePreview = () => {
    if (columnMapping.guest_name === undefined) {
      alert('Please map the Guest Name column (required)');
      return;
    }

    const guests: GuestCreate[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    rows.forEach((row, idx) => {
      const guest = mapRowToGuest(row, headers, columnMapping);
      if (guest) {
        guests.push(guest);
      } else {
        errors.push({ row: idx + 2, error: 'Missing or invalid guest name' }); // +2 for header row and 0-index
      }
    });

    setParsedGuests(guests);
    setValidationErrors(errors);
    setStep('preview');
  };

  // Start import
  const handleImport = async () => {
    if (parsedGuests.length === 0) {
      alert('No valid guests to import');
      return;
    }

    setStep('importing');
    setImportProgress(0);

    const { data, error } = await importGuests(eventId, parsedGuests, (progress) => {
      setImportProgress(progress);
    });

    if (error) {
      alert(`Import failed: ${error}`);
      setStep('preview');
      return;
    }

    if (data) {
      setImportErrors(data.errors);
      if (data.imported > 0) {
        onSuccess(data.imported);
      }
    }
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest-list-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="guest-modal-backdrop" onClick={onClose}>
      <div className="guest-modal import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="guest-modal-header">
          <h2 className="guest-modal-title">
            {step === 'upload' && 'Import Guests from CSV'}
            {step === 'mapping' && 'Map Columns'}
            {step === 'preview' && 'Preview Import'}
            {step === 'importing' && 'Importing...'}
          </h2>
          <button className="guest-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="guest-modal-body">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <>
              <div
                className={`import-dropzone ${isDragging ? 'dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <div className="import-dropzone-icon">
                  <Upload size={40} color="#94a3b8" />
                </div>
                <p className="import-dropzone-text">Drag CSV file here or click to browse</p>
                <p className="import-dropzone-hint">CSV format, max 5MB</p>
              </div>

              <button className="import-template-link" onClick={handleDownloadTemplate}>
                <Download size={14} />
                Download CSV template
              </button>
            </>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <>
              <div className="import-file-preview">
                <p className="import-file-name">{fileName}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
                  Found {rows.length} rows with {headers.length} columns
                </p>

                {/* Preview first 3 rows */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="import-preview-table">
                    <thead>
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="import-column-mapping">
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>Map your columns:</p>
                {CSV_FIELD_OPTIONS.filter((f) => f.value).map((field) => (
                  <div key={field.value} className="import-column-row">
                    <select
                      className="guest-form-select"
                      value={columnMapping[field.value] ?? -1}
                      onChange={(e) => handleMappingChange(field.value, parseInt(e.target.value))}
                    >
                      <option value={-1}>-- Not mapped --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="import-column-arrow">
                      <ArrowRight size={16} />
                    </span>
                    <span className="import-column-csv">{field.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <>
              <div style={{ fontSize: 14, marginBottom: 16 }}>
                <strong>{parsedGuests.length}</strong> guests ready to import
                {validationErrors.length > 0 && (
                  <span style={{ color: '#dc2626', marginLeft: 8 }}>
                    ({validationErrors.length} rows skipped due to errors)
                  </span>
                )}
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', maxHeight: 300 }}>
                <table className="import-preview-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Side</th>
                      <th>Group</th>
                      <th>RSVP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedGuests.slice(0, 10).map((guest, i) => (
                      <tr key={i}>
                        <td>{guest.guest_name}</td>
                        <td>{guest.email || '-'}</td>
                        <td>{guest.phone || '-'}</td>
                        <td>{guest.side || '-'}</td>
                        <td>{guest.guest_group || '-'}</td>
                        <td>{guest.rsvp_status || 'pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedGuests.length > 10 && (
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                    ... and {parsedGuests.length - 10} more
                  </p>
                )}
              </div>

              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div className="import-validation-errors">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <AlertCircle size={14} color="#dc2626" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>Skipped Rows</span>
                  </div>
                  {validationErrors.slice(0, 5).map((err, i) => (
                    <div key={i} className="import-validation-error">
                      <span>Row {err.row}:</span>
                      <span>{err.error}</span>
                    </div>
                  ))}
                  {validationErrors.length > 5 && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      ... and {validationErrors.length - 5} more errors
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="import-progress">
              <div className="import-progress-bar">
                <div className="import-progress-fill" style={{ width: `${importProgress}%` }} />
              </div>
              <p className="import-progress-text">
                {importProgress < 100 ? `Importing... ${importProgress}%` : 'Complete!'}
              </p>

              {importProgress === 100 && importErrors.length > 0 && (
                <div className="import-validation-errors" style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <AlertCircle size={14} color="#dc2626" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>Import Errors</span>
                  </div>
                  {importErrors.slice(0, 5).map((err, i) => (
                    <div key={i} className="import-validation-error">
                      <span>Row {err.row}:</span>
                      <span>{err.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="guest-modal-footer">
          {step === 'upload' && (
            <button className="guests-btn secondary" onClick={onClose}>
              Cancel
            </button>
          )}

          {step === 'mapping' && (
            <>
              <button className="guests-btn secondary" onClick={() => setStep('upload')}>
                Back
              </button>
              <button className="guests-btn primary" onClick={handlePreview}>
                Preview Import
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button className="guests-btn secondary" onClick={() => setStep('mapping')}>
                Back
              </button>
              <button
                className="guests-btn primary"
                onClick={handleImport}
                disabled={parsedGuests.length === 0}
              >
                Import {parsedGuests.length} Guests
              </button>
            </>
          )}

          {step === 'importing' && importProgress === 100 && (
            <button className="guests-btn primary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportGuestsModal;
