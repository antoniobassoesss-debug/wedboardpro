/**
 * Document Setup Tab Component
 *
 * Meta-configuration for the PDF document.
 */

import React from 'react';
import type { DocumentSettings, PaperSize, Orientation, ColorMode } from '../../../types/buildGuide';

interface DocumentSetupTabProps {
  settings: DocumentSettings;
  eventName: string;
  onChange: (settings: DocumentSettings) => void;
}

export const DocumentSetupTab: React.FC<DocumentSetupTabProps> = ({
  settings,
  eventName,
  onChange,
}) => {
  const updateCover = (updates: Partial<DocumentSettings['cover']>) => {
    onChange({ ...settings, cover: { ...settings.cover, ...updates } });
  };

  const updateFormatting = (updates: Partial<DocumentSettings['formatting']>) => {
    onChange({ ...settings, formatting: { ...settings.formatting, ...updates } });
  };

  const updateHeaderFooter = (updates: Partial<DocumentSettings['headerFooter']>) => {
    onChange({ ...settings, headerFooter: { ...settings.headerFooter, ...updates } });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Cover Page Section */}
      <div className="bg-[#16213e] rounded-xl border border-gray-600 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Cover Page</h3>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.cover.includeCover}
              onChange={(e) => updateCover({ includeCover: e.target.checked })}
              className="w-4 h-4 rounded border-gray-500 text-teal-500 focus:ring-teal-500 bg-gray-700"
            />
            <span className="text-sm text-gray-300">Include cover page</span>
          </label>

          {settings.cover.includeCover && (
            <div className="space-y-4 pt-4 border-t border-gray-700">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Event Name</label>
                <input
                  type="text"
                  value={settings.cover.eventName}
                  onChange={(e) => updateCover({ eventName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder={eventName}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Event Date</label>
                <input
                  type="date"
                  value={settings.cover.eventDate}
                  onChange={(e) => updateCover({ eventDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Venue Name</label>
                <input
                  type="text"
                  value={settings.cover.venueName}
                  onChange={(e) => updateCover({ venueName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="Venue name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Planner Company Name</label>
                <input
                  type="text"
                  value={settings.cover.plannerCompanyName}
                  onChange={(e) => updateCover({ plannerCompanyName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="Your company name"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Formatting Section */}
      <div className="bg-[#16213e] rounded-xl border border-gray-600 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Document Formatting</h3>
        
        <div className="space-y-6">
          {/* Paper Size */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Paper Size</label>
            <div className="flex gap-3">
              {[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'US Letter' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateFormatting({ paperSize: option.value as PaperSize })}
                  className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                    settings.formatting.paperSize === option.value
                      ? 'border-teal-500 bg-teal-500/10 text-white'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Orientation</label>
            <div className="flex gap-3">
              {[
                { value: 'portrait', label: 'Portrait' },
                { value: 'landscape', label: 'Landscape' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateFormatting({ orientation: option.value as Orientation })}
                  className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                    settings.formatting.orientation === option.value
                      ? 'border-teal-500 bg-teal-500/10 text-white'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Mode */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Color Mode</label>
            <div className="flex gap-3">
              {[
                { value: 'color', label: 'Full Color' },
                { value: 'grayscale', label: 'Grayscale' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateFormatting({ colorMode: option.value as ColorMode })}
                  className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                    settings.formatting.colorMode === option.value
                      ? 'border-teal-500 bg-teal-500/10 text-white'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Header & Footer Section */}
      <div className="bg-[#16213e] rounded-xl border border-gray-600 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Header & Footer</h3>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.headerFooter.showLogoInHeader}
              onChange={(e) => updateHeaderFooter({ showLogoInHeader: e.target.checked })}
              className="w-4 h-4 rounded border-gray-500 text-teal-500 focus:ring-teal-500 bg-gray-700"
            />
            <span className="text-sm text-gray-300">Show planner logo in header</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.headerFooter.showPageNumbers}
              onChange={(e) => updateHeaderFooter({ showPageNumbers: e.target.checked })}
              className="w-4 h-4 rounded border-gray-500 text-teal-500 focus:ring-teal-500 bg-gray-700"
            />
            <span className="text-sm text-gray-300">Show page numbers</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.headerFooter.showWatermark}
              onChange={(e) => updateHeaderFooter({ showWatermark: e.target.checked })}
              className="w-4 h-4 rounded border-gray-500 text-teal-500 focus:ring-teal-500 bg-gray-700"
            />
            <span className="text-sm text-gray-300">Show WedBoardPro watermark</span>
          </label>

          <div className="pt-4 border-t border-gray-700">
            <label className="block text-sm text-gray-400 mb-1">Footer Text</label>
            <input
              type="text"
              value={settings.headerFooter.footerText}
              onChange={(e) => updateHeaderFooter({ footerText: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
              placeholder="e.g. Confidential — Prepared by Your Company"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
