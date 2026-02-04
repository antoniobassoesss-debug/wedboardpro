import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  parseCSV,
  mapRowToGuest,
  generateCSVTemplate,
  importGuests,
  type GuestCreate,
} from '../../../api/weddingGuestsApi';
import { Download, Upload, ArrowRight, X, AlertCircle, Zap, FileSpreadsheet } from 'lucide-react';

interface ImportGuestsModalProps {
  eventId: string;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

type ImportMode = 'choose' | 'quick' | 'advanced';
type Step = 'mode' | 'upload' | 'mapping' | 'preview' | 'importing';

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
  const [importMode, setImportMode] = useState<ImportMode>('choose');
  const [step, setStep] = useState<Step>('mode');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [parsedGuests, setParsedGuests] = useState<GuestCreate[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [quickImportNames, setQuickImportNames] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Excel file
  const parseExcelFile = (file: File): Promise<{ headers: string[]; rows: string[][] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });

          if (jsonData.length === 0) {
            resolve({ headers: [], rows: [] });
            return;
          }

          // First row is headers
          const headers = (jsonData[0] || []).map(h => String(h || '').trim());
          const rows = jsonData.slice(1).map(row =>
            (row || []).map(cell => String(cell || '').trim())
          ).filter(row => row.some(cell => cell.length > 0)); // Filter empty rows

          resolve({ headers, rows });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle file selection for quick import (names only)
  const handleQuickFileSelect = async (file: File) => {
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      alert('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum 5MB.');
      return;
    }

    setFileName(file.name);

    try {
      let names: string[] = [];

      if (isExcel) {
        const { rows } = await parseExcelFile(file);
        // Take the first column as names (skip header if it looks like a header)
        names = rows.map(row => row[0]).filter(Boolean);

        // Check if first row might be a header
        if (names.length > 0) {
          const firstValue = names[0].toLowerCase();
          if (firstValue === 'name' || firstValue === 'names' || firstValue === 'guest' || firstValue === 'guests' || firstValue === 'guest name') {
            names = names.slice(1);
          }
        }
      } else {
        // CSV
        const text = await file.text();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        names = lines.map(line => {
          // Handle CSV with quotes and commas - just take first column
          const match = line.match(/^"?([^",]*)"?/);
          return match ? match[1].trim() : line.split(',')[0].trim();
        }).filter(Boolean);

        // Check if first row might be a header
        if (names.length > 0) {
          const firstValue = names[0].toLowerCase();
          if (firstValue === 'name' || firstValue === 'names' || firstValue === 'guest' || firstValue === 'guests' || firstValue === 'guest name') {
            names = names.slice(1);
          }
        }
      }

      setQuickImportNames(names);

      // Auto-create guest objects
      const guests: GuestCreate[] = names.map(name => ({
        guest_name: name,
        rsvp_status: 'pending' as const,
        side: 'both' as const,
        guest_group: 'other' as const,
        dietary_restrictions: [],
        plus_one_allowed: false,
        is_child: false,
        needs_accessibility: false,
      }));

      setParsedGuests(guests);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing file:', err);
      alert('Could not parse file. Please check the format.');
    }
  };

  // Handle file selection for advanced import
  const handleFileSelect = async (file: File) => {
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      alert('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum 5MB.');
      return;
    }

    setFileName(file.name);

    try {
      let csvHeaders: string[] = [];
      let csvRows: string[][] = [];

      if (isExcel) {
        const result = await parseExcelFile(file);
        csvHeaders = result.headers;
        csvRows = result.rows;
      } else {
        const text = await file.text();
        const { headers: h, rows: r } = parseCSV(text);
        csvHeaders = h;
        csvRows = r;
      }

      if (csvHeaders.length === 0) {
        alert('Could not parse file. Please check the format.');
        return;
      }

      setHeaders(csvHeaders);
      setRows(csvRows);

      // Auto-detect column mapping
      const autoMapping: Record<string, number> = {};
      csvHeaders.forEach((header, idx) => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '_');

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
    } catch (err) {
      console.error('Error parsing file:', err);
      alert('Could not parse file. Please check the format.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (importMode === 'quick') {
        handleQuickFileSelect(file);
      } else {
        handleFileSelect(file);
      }
    }
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
      Object.keys(next).forEach((key) => {
        if (next[key] === columnIndex && key !== field) {
          delete next[key];
        }
      });
      if (columnIndex >= 0) {
        next[field] = columnIndex;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  // Proceed to preview step (advanced mode)
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
        errors.push({ row: idx + 2, error: 'Missing or invalid guest name' });
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

  // Select import mode
  const selectMode = (mode: ImportMode) => {
    setImportMode(mode);
    setStep('upload');
  };

  const getStepTitle = () => {
    if (step === 'mode') return 'Import Guests';
    if (step === 'upload') return importMode === 'quick' ? 'Quick Import - Names Only' : 'Import from File';
    if (step === 'mapping') return 'Map Columns';
    if (step === 'preview') return 'Preview Import';
    if (step === 'importing') return 'Importing...';
    return 'Import Guests';
  };

  return (
    <div className="guest-modal-backdrop" onClick={onClose}>
      <div className="guest-modal import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="guest-modal-header">
          <h2 className="guest-modal-title">{getStepTitle()}</h2>
          <button className="guest-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="guest-modal-body">
          {/* Step 0: Choose Mode */}
          {step === 'mode' && (
            <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
              <button
                className="import-mode-card"
                onClick={() => selectMode('quick')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  padding: 20,
                  border: '2px solid #e2e8f0',
                  borderRadius: 12,
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Zap size={24} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                    Quick Import (Names Only)
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                    Just have a list of names? Import them instantly. Perfect for Excel or CSV files with just guest names.
                  </div>
                </div>
              </button>

              <button
                className="import-mode-card"
                onClick={() => selectMode('advanced')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  padding: 20,
                  border: '2px solid #e2e8f0',
                  borderRadius: 12,
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileSpreadsheet size={24} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                    Advanced Import (Full Details)
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                    Import names, emails, phone numbers, RSVP status, dietary info and more. Map your columns to our fields.
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 1: Upload (Quick Mode) */}
          {step === 'upload' && importMode === 'quick' && (
            <>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Upload a file with guest names. We'll read the first column and create guests automatically with default settings.
              </p>
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
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleQuickFileSelect(e.target.files[0])}
                />
                <div className="import-dropzone-icon">
                  <Upload size={40} color="#94a3b8" />
                </div>
                <p className="import-dropzone-text">Drag file here or click to browse</p>
                <p className="import-dropzone-hint">Excel (.xlsx, .xls) or CSV, max 5MB</p>
              </div>
            </>
          )}

          {/* Step 1: Upload (Advanced Mode) */}
          {step === 'upload' && importMode === 'advanced' && (
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
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <div className="import-dropzone-icon">
                  <Upload size={40} color="#94a3b8" />
                </div>
                <p className="import-dropzone-text">Drag file here or click to browse</p>
                <p className="import-dropzone-hint">Excel (.xlsx, .xls) or CSV, max 5MB</p>
              </div>

              <button className="import-template-link" onClick={handleDownloadTemplate}>
                <Download size={14} />
                Download CSV template
              </button>
            </>
          )}

          {/* Step 2: Column Mapping (Advanced only) */}
          {step === 'mapping' && importMode === 'advanced' && (
            <>
              <div className="import-file-preview">
                <p className="import-file-name">{fileName}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
                  Found {rows.length} rows with {headers.length} columns
                </p>

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

              {importMode === 'quick' && (
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  All guests will be created with RSVP status "Pending". You can edit details after import.
                </p>
              )}

              <div style={{ overflowX: 'auto', maxHeight: 300 }}>
                <table className="import-preview-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      {importMode === 'advanced' && (
                        <>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Side</th>
                          <th>Group</th>
                        </>
                      )}
                      <th>RSVP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedGuests.slice(0, 15).map((guest, i) => (
                      <tr key={i}>
                        <td>{guest.guest_name}</td>
                        {importMode === 'advanced' && (
                          <>
                            <td>{guest.email || '-'}</td>
                            <td>{guest.phone || '-'}</td>
                            <td>{guest.side || '-'}</td>
                            <td>{guest.guest_group || '-'}</td>
                          </>
                        )}
                        <td>{guest.rsvp_status || 'pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedGuests.length > 15 && (
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                    ... and {parsedGuests.length - 15} more
                  </p>
                )}
              </div>

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
          {step === 'mode' && (
            <button className="guests-btn secondary" onClick={onClose}>
              Cancel
            </button>
          )}

          {step === 'upload' && (
            <>
              <button className="guests-btn secondary" onClick={() => setStep('mode')}>
                Back
              </button>
            </>
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
              <button
                className="guests-btn secondary"
                onClick={() => setStep(importMode === 'quick' ? 'upload' : 'mapping')}
              >
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
