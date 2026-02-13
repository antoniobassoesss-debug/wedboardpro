import React, { useState, useRef, useCallback } from 'react';
import { createSupplier, type SupplierCategory } from '../api/suppliersApi';

interface ImportSuppliersModalProps {
  onClose: () => void;
  onImported: () => void;
}

type ImportStep = 'upload' | 'map' | 'preview' | 'importing' | 'complete';

interface MappedRow {
  name: string;
  category: string;
  company_name: string;
  email: string;
  phone: string;
  location: string;
  original: Record<string, string>;
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'flowers', label: 'Flowers' },
  { value: 'decor', label: 'Decor' },
  { value: 'catering', label: 'Catering' },
  { value: 'music', label: 'Music' },
  { value: 'photo', label: 'Photography' },
  { value: 'video', label: 'Video' },
  { value: 'venue', label: 'Venue' },
  { value: 'cake', label: 'Cake' },
  { value: 'transport', label: 'Transport' },
  { value: 'others', label: 'Others' },
];

const CSV_FIELDS = ['name', 'category', 'company_name', 'email', 'phone', 'location'];

const ImportSuppliersModal: React.FC<ImportSuppliersModalProps> = ({ onClose, onImported }) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({ name: '', category: '', company_name: '', email: '', phone: '', location: '' });
  const [mappedData, setMappedData] = useState<MappedRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = useCallback((content: string) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return null;
    const firstLine = lines[0];
    if (!firstLine) return null;
    const newHeaders = (parseCSVLine(firstLine) || []) as string[];
    const newRows = lines.slice(1).map(parseCSVLine);
    return { headers: newHeaders, rows: newRows };
  }, []);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);
      if (parsed) {
        setFile(selectedFile);
        setHeaders(parsed.headers);
        setRows(parsed.rows);
        autoMapHeaders(parsed.headers);
        setStep('map');
      }
    };
    reader.readAsText(selectedFile);
  };

  const autoMapHeaders = (fileHeaders: string[]) => {
    const newMapping: Record<string, string> = { name: '', category: '', company_name: '', email: '', phone: '', location: '' };
    const lowerHeaders = fileHeaders.map((h) => h.toLowerCase().trim());

    const fieldMappings: Record<string, string[]> = {
      name: ['name', 'supplier', 'contact', 'full name', 'fullname', 'vendor'],
      category: ['category', 'type', 'service', 'industry'],
      company_name: ['company', 'business', 'organization', 'company name', 'business name'],
      email: ['email', 'e-mail', 'mail', 'email address'],
      phone: ['phone', 'tel', 'telephone', 'mobile', 'cell', 'phone number'],
      location: ['location', 'city', 'address', 'region', 'country', 'area'],
    };

    Object.entries(fieldMappings).forEach(([field, keywords]) => {
      const match = lowerHeaders.findIndex((h) => keywords.some((k) => h.includes(k)));
      if (match !== -1) {
        newMapping[field as keyof typeof newMapping] = fileHeaders[match] || '';
      }
    });

    setMapping(newMapping);
  };

  const handlePreview = () => {
    const mapped: MappedRow[] = rows.map((row) => {
      const getValue = (field: string): string => {
        const mappedField = mapping[field as keyof typeof mapping] || '';
        const headerIndex = headers.indexOf(mappedField);
        return headerIndex !== -1 ? (row[headerIndex] || '') : '';
      };
      return {
        name: getValue('name'),
        category: getValue('category').toLowerCase() || 'others',
        company_name: getValue('company_name'),
        email: getValue('email'),
        phone: getValue('phone'),
        location: getValue('location'),
        original: Object.fromEntries(headers.map((h, i) => [h, row[i] || ''])),
      };
    }).filter((r) => r.name.trim());

    setMappedData(mapped);
    setStep(mapped.length > 0 ? 'preview' : 'upload');
  };

  const handleImport = async () => {
    setStep('importing');
    const errors: string[] = [];
    let imported = 0;

    for (const row of mappedData) {
      try {
        await createSupplier({
          name: row.name,
          category: row.category as SupplierCategory,
          company_name: (row.company_name || undefined) as string | null,
          email: (row.email || undefined) as string | null,
          phone: (row.phone || undefined) as string | null,
          location: (row.location || undefined) as string | null,
          private: false,
        });
        imported++;
      } catch {
        errors.push(`Failed to import: ${row.name}`);
      }
    }

    setImportedCount(imported);
    setImportErrors(errors);
    setStep('complete');
    onImported();
  };

  const downloadTemplate = () => {
    const csv = 'name,category,company_name,email,phone,location\nJohn Doe,flowers,Floral Studio,john@floral.com,+123456789,New York\nJane Smith,photography,Photo Co,jane@photo.com,+0987654321,Los Angeles';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suppliers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 80,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'importing') onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: step === 'preview' ? 720 : 560,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 80px -12px rgba(15,23,42,0.5)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
              {step === 'upload' && 'Import Suppliers'}
              {step === 'map' && 'Map Columns'}
              {step === 'preview' && 'Preview Import'}
              {step === 'importing' && 'Importing...'}
              {step === 'complete' && 'Import Complete'}
            </h3>
          </div>
          {step !== 'importing' && (
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div style={{ padding: '24px' }}>
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  border: '2px dashed #e2e8f0',
                  borderRadius: 12,
                  padding: '40px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0f172a' }}>
                  Drop your CSV or Excel file here
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                  or click to browse
                </p>
              </div>

              <div
                style={{
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#0f172a' }}>
                    Need a template?
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                    Download our sample CSV file
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  style={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    padding: '8px 14px',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Download Template
                </button>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Map the columns from your file to the supplier fields. We tried to auto-detect matches.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {CSV_FIELDS.map((field) => (
                  <div
                    key={field}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#475569', textTransform: 'capitalize' }}>
                      {field === 'company_name' ? 'Company' : field}
                    </label>
                    <select
                      value={mapping[field as keyof typeof mapping]}
                      onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                      style={{
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        padding: '10px 12px',
                        fontSize: 13,
                        background: '#ffffff',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">— Not mapped —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setHeaders([]);
                    setRows([]);
                    setStep('upload');
                  }}
                  style={{
                    borderRadius: 8,
                    border: 'none',
                    padding: '10px 18px',
                    background: 'transparent',
                    color: '#64748b',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  style={{
                    borderRadius: 8,
                    border: 'none',
                    padding: '10px 20px',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Preview
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderRadius: 10,
                }}
              >
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {mappedData.length} suppliers ready to import
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMappedData([]);
                    setStep('map');
                  }}
                  style={{
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#64748b',
                    fontSize: 13,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Remap columns
                </button>
              </div>
              <div
                style={{
                  maxHeight: 240,
                  overflow: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr>
                      {['Name', 'Category', 'Company', 'Email', 'Phone', 'Location'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '10px 12px',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            textAlign: 'left',
                            fontWeight: 500,
                            color: '#475569',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mappedData.slice(0, 20).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{row.name}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{row.category}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{row.company_name || '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{row.email || '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{row.phone || '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{row.location || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mappedData.length > 20 && (
                  <div style={{ padding: 12, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                    Showing 20 of {mappedData.length} suppliers
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setStep('map')}
                  style={{
                    borderRadius: 8,
                    border: 'none',
                    padding: '10px 18px',
                    background: 'transparent',
                    color: '#64748b',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  style={{
                    borderRadius: 8,
                    border: 'none',
                    padding: '10px 24px',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Import {mappedData.length} Suppliers
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 0' }}>
              <div style={{ width: 48, height: 48, position: 'relative' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: '3px solid #e2e8f0',
                    borderTopColor: '#0f172a',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>Importing suppliers...</p>
            </div>
          )}

          {step === 'complete' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '20px 0' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                  Successfully imported {importedCount} suppliers
                </p>
                {importErrors.length > 0 && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#dc2626' }}>
                    {importErrors.length} failed to import
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  borderRadius: 8,
                  border: 'none',
                  padding: '10px 24px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginTop: 8,
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ImportSuppliersModal;
