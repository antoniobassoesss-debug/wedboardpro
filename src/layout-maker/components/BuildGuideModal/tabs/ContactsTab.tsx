/**
 * Contacts Tab Component
 *
 * Contact cards for emergency reference.
 */

import React, { useCallback } from 'react';
import type { Contact } from '../../../types/buildGuide';

interface ContactsTabProps {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const ContactsTab: React.FC<ContactsTabProps> = ({ contacts, onChange }) => {
  const addContact = useCallback(() => {
    const newContact: Contact = {
      id: generateId(),
      name: '',
      role: '',
      phone: '',
      email: '',
      notes: '',
      included: true,
      isFromVendor: false,
    };
    onChange([...contacts, newContact]);
  }, [contacts, onChange]);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    onChange(
      contacts.map((contact) => (contact.id === id ? { ...contact, ...updates } : contact))
    );
  }, [contacts, onChange]);

  const deleteContact = useCallback((id: string) => {
    onChange(contacts.filter((contact) => contact.id !== id));
  }, [contacts, onChange]);

  const includedCount = contacts.filter((c) => c.included).length;
  const vendorCount = contacts.filter((c) => c.isFromVendor).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">
            {includedCount} of {contacts.length} contacts included
          </p>
          {vendorCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {vendorCount} from vendors (CRM)
            </p>
          )}
        </div>
        <button
          onClick={addContact}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </button>
      </div>

      {/* Contacts Grid */}
      {contacts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No contacts added</div>
          <p className="text-sm text-gray-500">
            Add contacts manually or they will be pre-populated from your vendors.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`bg-[#16213e] rounded-xl border p-4 ${
                contact.included ? 'border-gray-600' : 'border-gray-700 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-lg font-medium text-white">
                      {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-white">{contact.name || 'Unnamed'}</div>
                    <div className="text-sm text-gray-400">{contact.role || 'No role'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {contact.isFromVendor && (
                    <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                      Vendor
                    </span>
                  )}
                  <button
                    onClick={() => updateContact(contact.id, { included: !contact.included })}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      contact.included ? 'bg-teal-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        contact.included ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => updateContact(contact.id, { phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateContact(contact.id, { email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <textarea
                    value={contact.notes}
                    onChange={(e) => updateContact(contact.id, { notes: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500 resize-none"
                    rows={2}
                    placeholder="e.g. Only available from 8am"
                  />
                </div>
              </div>

              {!contact.isFromVendor && (
                <button
                  onClick={() => deleteContact(contact.id)}
                  className="mt-3 text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Delete contact
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
