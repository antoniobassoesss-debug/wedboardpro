/**
 * Timeline Tab Component
 *
 * Supplier Run Sheet configuration.
 */

import React, { useCallback } from 'react';
import type { TimelineRow } from '../../../types/buildGuide';

interface TimelineTabProps {
  rows: TimelineRow[];
  spaceNames: string[];
  onChange: (rows: TimelineRow[]) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const TimelineTab: React.FC<TimelineTabProps> = ({ rows, spaceNames, onChange }) => {
  const addRow = useCallback(() => {
    const newRow: TimelineRow = {
      id: generateId(),
      companyName: '',
      role: '',
      arrivalTime: '09:00',
      departureTime: '17:00',
      location: spaceNames[0] || '',
      contactPerson: '',
      phone: '',
      notes: '',
      included: true,
    };
    onChange([...rows, newRow]);
  }, [rows, spaceNames, onChange]);

  const updateRow = useCallback((id: string, updates: Partial<TimelineRow>) => {
    onChange(
      rows.map((row) => (row.id === id ? { ...row, ...updates } : row))
    );
  }, [rows, onChange]);

  const deleteRow = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      onChange(rows.filter((row) => row.id !== id));
    }
  }, [rows, onChange]);

  const sortedRows = [...rows].sort((a, b) => 
    a.arrivalTime.localeCompare(b.arrivalTime)
  );

  const includedCount = rows.filter((r) => r.included).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">
            {includedCount} of {rows.length} suppliers included
          </p>
        </div>
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </button>
      </div>

      {/* Timeline Visual Bar */}
      {rows.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Day Overview</h4>
          <div className="relative h-8 bg-gray-700 rounded overflow-hidden">
            {sortedRows.filter(r => r.included).map((row, index) => {
              const aParts = row.arrivalTime.split(':');
              const dParts = row.departureTime.split(':');
              const startHour = parseInt(aParts[0] ?? '0') + parseInt(aParts[1] ?? '0') / 60;
              const endHour = parseInt(dParts[0] ?? '0') + parseInt(dParts[1] ?? '0') / 60;
              const left = ((startHour - 6) / 18) * 100;
              const width = ((endHour - startHour) / 18) * 100;
              
              return (
                <div
                  key={row.id}
                  className="absolute h-4 top-2 rounded"
                  style={{
                    left: `${Math.max(0, left)}%`,
                    width: `${Math.min(100 - left, width)}%`,
                    backgroundColor: ['#14b8a6', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4'][index % 5],
                  }}
                  title={`${row.companyName}: ${row.arrivalTime} - ${row.departureTime}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>6:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      )}

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No suppliers added yet</div>
          <p className="text-sm text-gray-500">
            Click "Add Supplier" to create your timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRows.map((row) => (
            <div
              key={row.id}
              className={`bg-[#16213e] rounded-xl border p-4 ${
                row.included ? 'border-gray-600' : 'border-gray-700 opacity-50'
              }`}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {/* Company Name */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Company</label>
                  <input
                    type="text"
                    value={row.companyName}
                    onChange={(e) => updateRow(row.id, { companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="Supplier name"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Role</label>
                  <input
                    type="text"
                    value={row.role}
                    onChange={(e) => updateRow(row.id, { role: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="e.g. Florist, AV Crew"
                  />
                </div>

                {/* Arrival Time */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Arrival</label>
                  <input
                    type="time"
                    value={row.arrivalTime}
                    onChange={(e) => updateRow(row.id, { arrivalTime: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Departure Time */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Departure</label>
                  <input
                    type="time"
                    value={row.departureTime}
                    onChange={(e) => updateRow(row.id, { departureTime: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {/* Location */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Location</label>
                  <select
                    value={row.location}
                    onChange={(e) => updateRow(row.id, { location: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Select space</option>
                    {spaceNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Contact</label>
                  <input
                    type="text"
                    value={row.contactPerson}
                    onChange={(e) => updateRow(row.id, { contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="Contact name"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={row.phone}
                    onChange={(e) => updateRow(row.id, { phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                {/* Include Toggle */}
                <div className="flex items-center justify-end gap-4">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => updateRow(row.id, { included: !row.included })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      row.included ? 'bg-teal-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        row.included ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea
                  value={row.notes}
                  onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500 resize-none"
                  rows={2}
                  placeholder="e.g. Needs freight elevator, call 30 min before"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
