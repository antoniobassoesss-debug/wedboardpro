import React, { useEffect, useMemo, useState } from 'react';
import {
  listSuppliers,
  type Supplier,
  type SupplierCategory,
  createSupplier,
} from '../api/suppliersApi';

const CATEGORIES: { value: SupplierCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All categories' },
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

interface SuppliersPageProps {
  embedded?: boolean;
}

const SuppliersPage: React.FC<SuppliersPageProps> = ({ embedded = false }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<SupplierCategory | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSupplier, setNewSupplier] = useState<{
    name: string;
    category: SupplierCategory;
    company_name: string;
    email: string;
    phone: string;
    location: string;
  }>({
    name: '',
    category: 'flowers',
    company_name: '',
    email: '',
    phone: '',
    location: '',
  });

  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listSuppliers({
      search: search.trim() || undefined,
      category,
      favoritesOnly,
    });
    if (err) {
      setError(err);
    } else if (data) {
      setSuppliers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadSuppliers();
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, favoritesOnly]);

  const filteredSuppliers = useMemo(() => suppliers, [suppliers]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) return;
    setCreating(true);
    const { data, error: err } = await createSupplier({
      name: newSupplier.name.trim(),
      category: newSupplier.category,
      company_name: newSupplier.company_name || null,
      email: newSupplier.email || null,
      phone: newSupplier.phone || null,
      location: newSupplier.location || null,
      notes: null,
    });
    setCreating(false);
    if (err) {
      // eslint-disable-next-line no-alert
      alert(`Failed to create supplier: ${err}`);
      return;
    }
    if (data) {
      setSuppliers((prev) => [data, ...prev]);
      setShowCreate(false);
      setNewSupplier({
        name: '',
        category: 'flowers',
        company_name: '',
        email: '',
        phone: '',
        location: '',
      });
    }
  };

  const containerStyle: React.CSSProperties = embedded
    ? {}
    : {
        minHeight: '100vh',
        background: '#f8fafc',
        padding: '32px 16px',
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      };

  const cardStyle: React.CSSProperties = embedded
    ? {}
    : {
        maxWidth: 1120,
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: 24,
        border: '1px solid rgba(148,163,184,0.3)',
        boxShadow: '0 30px 60px rgba(15,23,42,0.08)',
        padding: 24,
      };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            {!embedded && (
              <>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Suppliers directory</h2>
                <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: 13 }}>
                  Keep all your trusted vendors in one clean directory.
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              borderRadius: 999,
              border: 'none',
              padding: '8px 16px',
              background: '#020617',
              color: '#f9fafb',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add supplier
          </button>
        </div>

        {/* Filters row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Search by name, email or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: 180,
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.6)',
              padding: '8px 14px',
              fontSize: 13,
            }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SupplierCategory | 'all')}
            style={{
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.6)',
              padding: '8px 10px',
              fontSize: 13,
              background: '#ffffff',
            }}
          >
            {CATEGORIES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: '#4b5563',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => setFavoritesOnly(e.target.checked)}
            />
            Favorites only
          </label>
        </div>

        {/* Table */}
        <div
          style={{
            borderRadius: 20,
            border: '1px solid rgba(148,163,184,0.3)',
            overflow: 'hidden',
            background: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 2.2fr) repeat(5, minmax(0, 1.1fr)) 80px',
              gap: 0,
              padding: '10px 16px',
              background: '#f9fafb',
              fontSize: 11,
              fontWeight: 600,
              color: '#6b7280',
            }}
          >
            <span>Name</span>
            <span>Category</span>
            <span>Location</span>
            <span>Email</span>
            <span>Phone</span>
            <span>Rating</span>
            <span style={{ textAlign: 'right' }}>Events</span>
          </div>

          {loading && (
            <div style={{ padding: 16, fontSize: 13, color: '#6b7280' }}>Loading suppliers…</div>
          )}
          {error && !loading && (
            <div style={{ padding: 16, fontSize: 13, color: '#b91c1c' }}>{error}</div>
          )}
          {!loading && !error && filteredSuppliers.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: '#6b7280' }}>
              No suppliers yet. Start by adding your favorite florist or venue.
            </div>
          )}

          {!loading &&
            !error &&
            filteredSuppliers.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 2.2fr) repeat(5, minmax(0, 1.1fr)) 80px',
                  gap: 0,
                  padding: '10px 16px',
                  borderTop: '1px solid rgba(226,232,240,0.8)',
                  fontSize: 12,
                  alignItems: 'center',
                  background: '#ffffff',
                  transition: 'background 0.15s ease, transform 0.12s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: '#020617',
                      color: '#f9fafb',
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    {s.company_name && (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{s.company_name}</span>
                    )}
                  </div>
                </div>
                <span style={{ textTransform: 'capitalize' }}>{s.category}</span>
                <span>{s.location ?? '—'}</span>
                <span>{s.email ?? '—'}</span>
                <span>{s.phone ?? '—'}</span>
                <span>
                  {s.rating_internal
                    ? '★'.repeat(s.rating_internal).padEnd(5, '☆')
                    : '—'}
                </span>
                <span style={{ textAlign: 'right', color: '#64748b', fontSize: 11 }}>
                  {s.linked_events_count ?? 0}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Simple create modal */}
      {showCreate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              background: '#ffffff',
              borderRadius: 24,
              padding: 20,
              boxShadow: '0 30px 80px rgba(15,23,42,0.4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18 }}>Add supplier</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 12 }}>
                Name
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) =>
                    setNewSupplier((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  style={{
                    marginTop: 4,
                    width: '100%',
                    borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.7)',
                    padding: '8px 10px',
                    fontSize: 13,
                  }}
                />
              </label>

              <label style={{ fontSize: 12 }}>
                Category
                <select
                  value={newSupplier.category}
                  onChange={(e) =>
                    setNewSupplier((prev) => ({
                      ...prev,
                      category: e.target.value as SupplierCategory,
                    }))
                  }
                  style={{
                    marginTop: 4,
                    width: '100%',
                    borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.7)',
                    padding: '8px 10px',
                    fontSize: 13,
                    background: '#ffffff',
                  }}
                >
                  {CATEGORIES.filter((c) => c.value !== 'all').map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 12 }}>
                Company (optional)
                <input
                  type="text"
                  value={newSupplier.company_name}
                  onChange={(e) =>
                    setNewSupplier((prev) => ({
                      ...prev,
                      company_name: e.target.value,
                    }))
                  }
                  style={{
                    marginTop: 4,
                    width: '100%',
                    borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.7)',
                    padding: '8px 10px',
                    fontSize: 13,
                  }}
                />
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ fontSize: 12, flex: 1 }}>
                  Email
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) =>
                      setNewSupplier((prev) => ({ ...prev, email: e.target.value }))
                    }
                    style={{
                      marginTop: 4,
                      width: '100%',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.7)',
                      padding: '8px 10px',
                      fontSize: 13,
                    }}
                  />
                </label>
                <label style={{ fontSize: 12, flex: 1 }}>
                  Phone
                  <input
                    type="tel"
                    value={newSupplier.phone}
                    onChange={(e) =>
                      setNewSupplier((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    style={{
                      marginTop: 4,
                      width: '100%',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.7)',
                      padding: '8px 10px',
                      fontSize: 13,
                    }}
                  />
                </label>
              </div>

              <label style={{ fontSize: 12 }}>
                Location
                <input
                  type="text"
                  value={newSupplier.location}
                  onChange={(e) =>
                    setNewSupplier((prev) => ({ ...prev, location: e.target.value }))
                  }
                  style={{
                    marginTop: 4,
                    width: '100%',
                    borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.7)',
                    padding: '8px 10px',
                    fontSize: 13,
                  }}
                />
              </label>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(148,163,184,0.7)',
                    padding: '8px 14px',
                    background: '#ffffff',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    borderRadius: 999,
                    border: 'none',
                    padding: '8px 18px',
                    background: '#020617',
                    color: '#f9fafb',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: creating ? 0.7 : 1,
                  }}
                >
                  {creating ? 'Saving…' : 'Save supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;


