/**
 * Preview & Export Tab Component
 *
 * Shows a preview of all pages and the generate button.
 */

import React from 'react';
import type { BuildGuideConfig, LayoutConfig } from '../../../types/buildGuide';

interface PreviewTabProps {
  config: BuildGuideConfig;
  layouts: LayoutConfig[];
  onGenerate: () => void;
  isGenerating: boolean;
  generationProgress: string;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({
  config,
  layouts,
  onGenerate,
  isGenerating,
  generationProgress,
}) => {
  const includedLayouts = config.layoutConfigs.filter((lc) => lc.included);
  const includedTimelineRows = config.timelineRows.filter((r) => r.included);
  const includedContacts = config.contacts.filter((c) => c.included);

  const pages: { title: string; type: string; subtitle?: string }[] = [];

  if (config.documentSettings.cover.includeCover) {
    pages.push({ title: 'Cover Page', type: 'cover' });
  }

  includedLayouts.forEach((layout) => {
    const sizeLabel = layout.pageSize === 'full' ? 'Full' : layout.pageSize === 'half' ? 'Half' : 'Thumbnail';
    pages.push({
      title: layout.layoutName,
      type: 'layout',
      subtitle: `${sizeLabel} Page - ${layout.spaceName}`,
    });
  });

  if (includedTimelineRows.length > 0) {
    pages.push({
      title: 'Supplier Run Sheet',
      type: 'timeline',
      subtitle: `${includedTimelineRows.length} suppliers`,
    });
  }

  if (includedContacts.length > 0) {
    pages.push({
      title: 'Emergency Contacts',
      type: 'contacts',
      subtitle: `${includedContacts.length} contacts`,
    });
  }

  const totalPages = pages.length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#16213e] rounded-xl border border-gray-600 p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalPages}</div>
          <div className="text-sm text-gray-400">Total Pages</div>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-600 p-4 text-center">
          <div className="text-2xl font-bold text-teal-400">{includedLayouts.length}</div>
          <div className="text-sm text-gray-400">Layouts</div>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-600 p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{includedTimelineRows.length}</div>
          <div className="text-sm text-gray-400">Suppliers</div>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-600 p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{includedContacts.length}</div>
          <div className="text-sm text-gray-400">Contacts</div>
        </div>
      </div>

      {/* Last Generated */}
      {config.lastGeneratedAt && (
        <div className="text-sm text-gray-400">
          Last generated: {new Date(config.lastGeneratedAt).toLocaleString()} — {config.versionLabel}
        </div>
      )}

      {/* Page Map */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Page Map</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pages.map((page, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-teal-500 transition-colors cursor-pointer"
            >
              <div className="text-xs text-gray-500 mb-1">Page {index + 1}</div>
              <div className="font-medium text-white text-sm">{page.title}</div>
              {page.subtitle && (
                <div className="text-xs text-gray-400 mt-1">{page.subtitle}</div>
              )}
              <div className="mt-2">
                {page.type === 'cover' && (
                  <div className="w-full h-16 bg-gradient-to-br from-teal-900 to-purple-900 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                {page.type === 'layout' && (
                  <div className="w-full h-16 bg-gray-700 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                )}
                {page.type === 'timeline' && (
                  <div className="w-full h-16 bg-gray-700 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                )}
                {page.type === 'contacts' && (
                  <div className="w-full h-16 bg-gray-700 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {pages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No pages to generate. Include layouts or add timeline/contacts to get started.
          </div>
        )}
      </div>

      {/* Version Control */}
      <div className="bg-[#16213e] rounded-xl border border-gray-600 p-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Version Label</label>
            <input
              type="text"
              value={config.versionLabel}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
              readOnly
            />
          </div>
          <div className="text-sm text-gray-400">
            Auto-generated on export
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating || pages.length === 0}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-3 ${
          isGenerating || pages.length === 0
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-teal-500 hover:bg-teal-600 text-white'
        }`}
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {generationProgress || 'Generating...'}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Generate PDF
          </>
        )}
      </button>

      {pages.length === 0 && (
        <p className="text-center text-sm text-gray-500">
          Add layouts, timeline entries, or contacts to generate a PDF
        </p>
      )}
    </div>
  );
};
