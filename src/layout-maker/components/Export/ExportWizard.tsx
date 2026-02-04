/**
 * Export Wizard Component
 *
 * Modal for configuring and executing exports with:
 * - Quick presets (Client, Catering, Setup, Full)
 * - Custom options (layout elements, guest info, branding)
 * - Format and page settings
 * - Live preview
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLayoutStore } from '../../stores';
import {
  EXPORT_PRESETS,
  DEFAULT_EXPORT_OPTIONS,
  type ExportConfig,
  type ExportOptions,
  type ExportFormat,
  type PageSize,
  type PageOrientation,
  type ExportPreset,
} from './exportTypes';
import { ExportPreview } from './ExportPreview';
import { exportLayout, generateExportFilename } from '../../utils/export';

interface ExportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
}

const ICON_PATHS = {
  user: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  utensils: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  wrench: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  list: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  ),
};

const PresetButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, label, description, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-start p-3 rounded-lg border text-left transition-colors ${
      active
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
    }`}
    style={{ minWidth: '100%' }}
  >
    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0 text-gray-600">
      {icon}
    </div>
    <div>
      <div className="font-medium text-sm text-gray-900">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  </button>
);

const Checkbox: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, disabled }) => (
  <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
    />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

const RadioOption: React.FC<{
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
}> = ({ value, checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="radio"
      checked={checked}
      onChange={() => onChange(value)}
      className="w-4 h-4 border-gray-300 text-blue-500 focus:ring-blue-500"
    />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

export const ExportWizard: React.FC<ExportWizardProps> = ({
  isOpen,
  onClose,
  onExport,
}) => {
  const layoutStore = useLayoutStore();

  const [preset, setPreset] = useState<ExportPreset | null>(null);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<PageOrientation>('landscape');
  const [options, setOptions] = useState<ExportOptions>({ ...DEFAULT_EXPORT_OPTIONS });
  const [footerText, setFooterText] = useState('WedBoardPro Layout');
  const [isExporting, setIsExporting] = useState(false);

  const applyPreset = useCallback((presetId: ExportPreset) => {
    const presetDef = EXPORT_PRESETS.find(p => p.id === presetId);
    if (presetDef) {
      setPreset(presetId);
      setOptions(prev => ({ ...prev, ...presetDef.options }));
      setFormat(presetDef.format);
      setPageSize(presetDef.pageSize);
      setOrientation(presetDef.orientation);
    }
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    const config: ExportConfig = {
      format,
      page: {
        size: pageSize,
        orientation,
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      options: {
        ...options,
        ...(options.includeFooter ? { footerText } : {}),
      },
      scale: 1,
      quality: 90,
    };

    try {
      const layout = layoutStore.layout;
      if (!layout) {
        throw new Error('No layout selected');
      }

      const result = await exportLayout(layout, config);
      const filename = generateExportFilename(layout.name || 'layout', format);

      if (format === 'svg') {
        const svgContent = result as string;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const blob = result as Blob;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }

    setIsExporting(false);
    onClose();
  }, [format, pageSize, orientation, options, footerText, layoutStore, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: '1000px', height: '700px', maxWidth: '95vw', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export Layout</h2>
            <p className="text-sm text-gray-500">Configure and download your layout</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: Options */}
          <div className="w-80 border-r overflow-y-auto p-4 flex-shrink-0">
            {/* Quick presets */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Presets</h3>
              <div className="space-y-2">
                {EXPORT_PRESETS.map(presetDef => (
                  <PresetButton
                    key={presetDef.id}
                    icon={ICON_PATHS[presetDef.id as keyof typeof ICON_PATHS] || ICON_PATHS.list}
                    label={presetDef.name}
                    description={presetDef.description}
                    active={preset === presetDef.id}
                    onClick={() => applyPreset(presetDef.id)}
                  />
                ))}
              </div>
            </div>

            <hr className="my-4 border-gray-200" />

            {/* Custom options */}
            <div className="space-y-6">
              {/* Layout Elements */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Layout Elements</h4>
                <div className="space-y-2">
                  <Checkbox
                    checked={options.tableNumbers}
                    onChange={(checked) => setOptions(prev => ({ ...prev, tableNumbers: checked }))}
                    label="Table numbers"
                  />
                  <Checkbox
                    checked={options.tableShapes}
                    onChange={(checked) => setOptions(prev => ({ ...prev, tableShapes: checked }))}
                    label="Table shapes"
                  />
                  <Checkbox
                    checked={options.dimensions}
                    onChange={(checked) => setOptions(prev => ({ ...prev, dimensions: checked }))}
                    label="Element dimensions"
                  />
                  <Checkbox
                    checked={options.grid}
                    onChange={(checked) => setOptions(prev => ({ ...prev, grid: checked }))}
                    label="Grid"
                  />
                </div>
              </div>

              {/* Guest Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Guest Information</h4>
                <div className="space-y-2">
                  <Checkbox
                    checked={options.guestNames}
                    onChange={(checked) => setOptions(prev => ({ ...prev, guestNames: checked }))}
                    label="Guest names on seats"
                  />
                  <Checkbox
                    checked={options.dietaryIcons}
                    onChange={(checked) => setOptions(prev => ({ ...prev, dietaryIcons: checked }))}
                    label="Dietary icons"
                  />
                  <Checkbox
                    checked={options.mealSummary}
                    onChange={(checked) => setOptions(prev => ({ ...prev, mealSummary: checked }))}
                    label="Meal summary per table"
                  />
                </div>
              </div>

              {/* Technical Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Technical Details</h4>
                <div className="space-y-2">
                  <Checkbox
                    checked={options.measurements}
                    onChange={(checked) => setOptions(prev => ({ ...prev, measurements: checked }))}
                    label="Measurements"
                  />
                  <Checkbox
                    checked={options.notes}
                    onChange={(checked) => setOptions(prev => ({ ...prev, notes: checked }))}
                    label="Setup notes"
                  />
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Format */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Format</h4>
                <div className="space-y-2">
                  <RadioOption value="pdf" checked={format === 'pdf'} onChange={(v) => setFormat(v as ExportFormat)} label="PDF (print-ready)" />
                  <RadioOption value="png" checked={format === 'png'} onChange={(v) => setFormat(v as ExportFormat)} label="PNG (high resolution)" />
                  <RadioOption value="svg" checked={format === 'svg'} onChange={(v) => setFormat(v as ExportFormat)} label="SVG (vector, editable)" />
                </div>
              </div>

              {/* Size */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Page Size</h4>
                <div className="space-y-2 mb-3">
                  <RadioOption value="a4" checked={pageSize === 'a4'} onChange={(v) => setPageSize(v as PageSize)} label="A4" />
                  <RadioOption value="a3" checked={pageSize === 'a3'} onChange={(v) => setPageSize(v as PageSize)} label="A3 (larger layouts)" />
                  <RadioOption value="letter" checked={pageSize === 'letter'} onChange={(v) => setPageSize(v as PageSize)} label="Letter" />
                  <RadioOption value="custom" checked={pageSize === 'custom'} onChange={(v) => setPageSize(v as PageSize)} label="Custom" />
                </div>
                <div className="space-y-2">
                  <RadioOption value="portrait" checked={orientation === 'portrait'} onChange={(v) => setOrientation(v as PageOrientation)} label="Portrait" />
                  <RadioOption value="landscape" checked={orientation === 'landscape'} onChange={(v) => setOrientation(v as PageOrientation)} label="Landscape" />
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Branding */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Branding</h4>
                <div className="space-y-3">
                  <Checkbox
                    checked={options.includeLogo}
                    onChange={(checked) => setOptions(prev => ({ ...prev, includeLogo: checked }))}
                    label="Include company logo"
                  />
                  <Checkbox
                    checked={options.includeFooter}
                    onChange={(checked) => setOptions(prev => ({ ...prev, includeFooter: checked }))}
                    label="Include footer text"
                  />
                  {options.includeFooter && (
                    <input
                      type="text"
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      placeholder="Footer text..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Preview */}
          <div className="flex-1 p-4 bg-gray-100 flex flex-col overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex-shrink-0">Preview</h3>
            <div className="flex-1 flex items-center justify-center bg-gray-200 rounded-lg overflow-auto p-4">
              <ExportPreview
                options={options}
                format={format}
                pageSize={pageSize}
                orientation={orientation}
                footerText={options.includeFooter ? footerText : 'WedBoardPro Layout'}
                className="shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
              onClick={() => {
                localStorage.setItem('export-preset-custom', JSON.stringify({
                  options,
                  format,
                  pageSize,
                  orientation,
                }));
              }}
            >
              Save as Preset
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`px-6 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2 ${
                isExporting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default ExportWizard;
