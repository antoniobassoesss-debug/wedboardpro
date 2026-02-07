import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  listSuppliers,
  type Supplier,
  type SupplierCategory,
  type ListSuppliersFilters,
  createSupplier,
  listCustomVendorCategories,
  type CustomVendorCategory,
} from '../api/suppliersApi';
import CreateCategoryModal from '../dashboard/pipeline/vendors/CreateCategoryModal';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

const PlusIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const ChevronIcon: React.FC<{ expanded?: boolean; className?: string; style?: React.CSSProperties }> = ({ expanded, className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d={expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
  </svg>
);

const PRESET_CATEGORIES: { value: SupplierCategory | 'all'; label: string }[] = [
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

const getCategoryColor = (category: string): { bg: string; color: string } => {
  const colors: Record<string, { bg: string; color: string }> = {
    flowers: { bg: '#fdf2f8', color: '#db2777' },
    decor: { bg: '#fef3c7', color: '#d97706' },
    catering: { bg: '#fef9c3', color: '#ca8a04' },
    music: { bg: '#e0e7ff', color: '#4f46e5' },
    photo: { bg: '#f0fdf4', color: '#16a34a' },
    video: { bg: '#f0f9ff', color: '#0284c7' },
    venue: { bg: '#fae8ff', color: '#a855f7' },
    cake: { bg: '#fff7ed', color: '#ea580c' },
    transport: { bg: '#f1f5f9', color: '#64748b' },
    others: { bg: '#f5f5f5', color: '#525252' },
  };
  return colors[category.toLowerCase()] || { bg: '#f5f5f5', color: '#525252' };
};

const SupplierCard: React.FC<{ supplier: Supplier; isMobile: boolean }> = ({ supplier, isMobile }) => {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const categoryColor = getCategoryColor(supplier.category);

  useEffect(() => {
    if (!isMobile || !expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, expanded]);

  if (!isMobile) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.2fr) repeat(5, minmax(0, 1.1fr)) 80px',
          gap: 0,
          padding: '10px 16px',
          borderTop: '1px solid rgba(226,232,240,0.8)',
          fontSize: 12,
          alignItems: 'center',
          background: '#ffffff',
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
            {supplier.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 500 }}>{supplier.name}</span>
            {supplier.company_name && <span style={{ fontSize: 11, color: '#6b7280' }}>{supplier.company_name}</span>}
          </div>
        </div>
        <span style={{ textTransform: 'capitalize' }}>{supplier.category}</span>
        <span>{supplier.location ?? '—'}</span>
        <span>{supplier.email ?? '—'}</span>
        <span>{supplier.phone ?? '—'}</span>
        <span>
          {supplier.rating_internal ? '★'.repeat(supplier.rating_internal).padEnd(5, '☆') : '—'}
        </span>
        <span style={{ textAlign: 'right', color: '#64748b', fontSize: 11 }}>
          {supplier.linked_events_count ?? 0}
        </span>
      </div>
    );
  }

  return (
    <div ref={cardRef}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          background: expanded ? '#fff' : '#fafafa',
          border: expanded ? '1px solid #e5e5e5' : '1px solid transparent',
          borderRadius: 16,
          padding: 16,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: '#020617',
              color: '#f9fafb',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {supplier.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {supplier.company_name ? (
              <div style={{ fontSize: 15, fontWeight: 500, color: '#374151' }}>{supplier.company_name}</div>
            ) : (
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0c0c0c' }}>{supplier.name}</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                textTransform: 'capitalize',
                fontSize: 12,
                padding: '4px 10px',
                background: categoryColor.bg,
                color: categoryColor.color,
                borderRadius: 8,
                fontWeight: 500,
              }}
            >
              {supplier.category}
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: expanded ? '#f5f5f5' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <ChevronIcon expanded={expanded} style={{ width: 20, height: 20, color: '#6b7280' }} />
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: 16,
            padding: 16,
            marginBottom: 8,
            animation: 'supplierExpandIn 0.2s ease',
          }}
        >
          <style>{`
            @keyframes supplierExpandIn {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {supplier.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <span style={{ fontSize: 14, color: '#374151' }}>{supplier.location}</span>
              </div>
            )}
            {supplier.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                </div>
                <span style={{ fontSize: 14, color: '#374151' }}>{supplier.email}</span>
              </div>
            )}
            {supplier.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </div>
                <span style={{ fontSize: 14, color: '#374151' }}>{supplier.phone}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <span style={{ fontSize: 14, color: '#374151' }}>
                {supplier.rating_internal ? (
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                    {'★'.repeat(supplier.rating_internal)}
                    <span style={{ color: '#d1d5db', fontWeight: 400 }}>{'★'.repeat(5 - supplier.rating_internal)}</span>
                  </span>
                ) : (
                  'No rating'
                )}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span style={{ fontSize: 14, color: '#374151' }}>
                {supplier.linked_events_count ?? 0} event{supplier.linked_events_count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SuppliersPage: React.FC<SuppliersPageProps> = ({ embedded = false }) => {
  const isMobile = useIsMobile();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomVendorCategory[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>(PRESET_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSupplier, setNewSupplier] = useState<{
    name: string;
    category: string;
    company_name: string;
    email: string;
    phone: string;
    location: string;
    private: boolean;
  }>({
    name: '',
    category: 'flowers',
    company_name: '',
    email: '',
    phone: '',
    location: '',
    private: false,
  });

  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listSuppliers({
      search: search.trim() || undefined,
      category: category === 'all' ? undefined : (category as SupplierCategory),
    } as ListSuppliersFilters);
    if (err) {
      setError(err);
    } else if (data) {
      setSuppliers(data);
    }
    setLoading(false);
  };

  const loadCustomCategories = async () => {
    const { data } = await listCustomVendorCategories();
    if (data) {
      setCustomCategories(data);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadCustomCategories();
  }, []);

  useEffect(() => {
    const custom = customCategories.map(c => ({ value: c.category_id, label: c.label }));
    setCategories([...PRESET_CATEGORIES, ...custom]);
  }, [customCategories]);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadSuppliers();
    }, 250);
    return () => clearTimeout(handle);
  }, [search, category]);

  const filteredSuppliers = useMemo(() => suppliers, [suppliers]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) return;
    setCreating(true);
    const { data, error: err } = await createSupplier({
      name: newSupplier.name.trim(),
      category: newSupplier.category as SupplierCategory,
      company_name: newSupplier.company_name || null,
      email: newSupplier.email || null,
      phone: newSupplier.phone || null,
      location: newSupplier.location || null,
      notes: null,
      private: newSupplier.private,
    });
    setCreating(false);
    if (err) {
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
        private: false,
      });
    }
  };

  const containerStyle: React.CSSProperties = embedded
    ? {}
    : {
        minHeight: '100vh',
        background: '#f8fafc',
        padding: '32px 16px',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
        </div>

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
            placeholder="Search suppliers…"
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
            onChange={(e) => setCategory(e.target.value)}
            style={{
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              padding: '9px 36px 9px 16px',
              fontSize: 14,
              fontWeight: 500,
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '16px',
            }}
          >
            {categories.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCreateCategory(true)}
            style={{
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              padding: '8px 16px',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Create category
          </button>
        </div>

        <div
          style={{
            borderRadius: isMobile ? 16 : 20,
            border: '1px solid rgba(148,163,184,0.3)',
            overflow: 'hidden',
            background: '#ffffff',
          }}
        >
          {!isMobile && (
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
          )}

          {loading && (
            <div style={{ padding: 16, fontSize: 13, color: '#6b7280' }}>Loading suppliers…</div>
          )}
          {error && !loading && (
            <div style={{ padding: 16, fontSize: 13, color: '#b91c1c' }}>{error}</div>
          )}
          {!loading && !error && filteredSuppliers.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: '#6b7280' }}>
              No suppliers found.
            </div>
          )}

          {!loading &&
            !error &&
            filteredSuppliers.map((s) => (
              <SupplierCard key={s.id} supplier={s} isMobile={isMobile} />
            ))}
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              position: 'fixed',
              bottom: 24,
              left: 20,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#0c0c0c',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
              zIndex: 100,
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>

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
                  onChange={(e) => setNewSupplier((prev) => ({ ...prev, name: e.target.value }))}
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
                  onChange={(e) => setNewSupplier((prev) => ({ ...prev, category: e.target.value }))}
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
                  {categories.filter((c) => c.value !== 'all').map((opt) => (
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
                  onChange={(e) => setNewSupplier((prev) => ({ ...prev, company_name: e.target.value }))}
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
                    onChange={(e) => setNewSupplier((prev) => ({ ...prev, email: e.target.value }))}
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
                    onChange={(e) => setNewSupplier((prev) => ({ ...prev, phone: e.target.value }))}
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
                  onChange={(e) => setNewSupplier((prev) => ({ ...prev, location: e.target.value }))}
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

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={newSupplier.private}
                  onChange={(e) => setNewSupplier((prev) => ({ ...prev, private: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ color: '#6b7280' }}>Do not share with team</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
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

      {showCreateCategory && (
        <CreateCategoryModal onClose={() => setShowCreateCategory(false)} onCreated={loadCustomCategories} />
      )}
    </div>
  );
};

export default SuppliersPage;


