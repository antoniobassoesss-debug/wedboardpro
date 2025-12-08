import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { listSuppliers, createSupplier, } from '../api/suppliersApi';
const CATEGORIES = [
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
const SuppliersPage = ({ embedded = false }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newSupplier, setNewSupplier] = useState({
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
        }
        else if (data) {
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
    const handleCreateSupplier = async (e) => {
        e.preventDefault();
        if (!newSupplier.name.trim())
            return;
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
    const containerStyle = embedded
        ? {}
        : {
            minHeight: '100vh',
            background: '#f8fafc',
            padding: '32px 16px',
            fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        };
    const cardStyle = embedded
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
    return (_jsxs("div", { style: containerStyle, children: [_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 16,
                            marginBottom: 16,
                        }, children: [_jsx("div", { children: !embedded && (_jsxs(_Fragment, { children: [_jsx("h2", { style: { margin: 0, fontSize: 20, fontWeight: 600 }, children: "Suppliers directory" }), _jsx("p", { style: { margin: '4px 0 0 0', color: '#6b7280', fontSize: 13 }, children: "Keep all your trusted vendors in one clean directory." })] })) }), _jsx("button", { type: "button", onClick: () => setShowCreate(true), style: {
                                    borderRadius: 999,
                                    border: 'none',
                                    padding: '8px 16px',
                                    background: '#020617',
                                    color: '#f9fafb',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }, children: "+ Add supplier" })] }), _jsxs("div", { style: {
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 12,
                            marginBottom: 16,
                            alignItems: 'center',
                        }, children: [_jsx("input", { type: "text", placeholder: "Search by name, email or location\u2026", value: search, onChange: (e) => setSearch(e.target.value), style: {
                                    flex: 1,
                                    minWidth: 180,
                                    borderRadius: 999,
                                    border: '1px solid rgba(148,163,184,0.6)',
                                    padding: '8px 14px',
                                    fontSize: 13,
                                } }), _jsx("select", { value: category, onChange: (e) => setCategory(e.target.value), style: {
                                    borderRadius: 999,
                                    border: '1px solid rgba(148,163,184,0.6)',
                                    padding: '8px 10px',
                                    fontSize: 13,
                                    background: '#ffffff',
                                }, children: CATEGORIES.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) }), _jsxs("label", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 13,
                                    color: '#4b5563',
                                    cursor: 'pointer',
                                }, children: [_jsx("input", { type: "checkbox", checked: favoritesOnly, onChange: (e) => setFavoritesOnly(e.target.checked) }), "Favorites only"] })] }), _jsxs("div", { style: {
                            borderRadius: 20,
                            border: '1px solid rgba(148,163,184,0.3)',
                            overflow: 'hidden',
                            background: '#ffffff',
                        }, children: [_jsxs("div", { style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(0, 2.2fr) repeat(5, minmax(0, 1.1fr)) 80px',
                                    gap: 0,
                                    padding: '10px 16px',
                                    background: '#f9fafb',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#6b7280',
                                }, children: [_jsx("span", { children: "Name" }), _jsx("span", { children: "Category" }), _jsx("span", { children: "Location" }), _jsx("span", { children: "Email" }), _jsx("span", { children: "Phone" }), _jsx("span", { children: "Rating" }), _jsx("span", { style: { textAlign: 'right' }, children: "Events" })] }), loading && (_jsx("div", { style: { padding: 16, fontSize: 13, color: '#6b7280' }, children: "Loading suppliers\u2026" })), error && !loading && (_jsx("div", { style: { padding: 16, fontSize: 13, color: '#b91c1c' }, children: error })), !loading && !error && filteredSuppliers.length === 0 && (_jsx("div", { style: { padding: 16, fontSize: 13, color: '#6b7280' }, children: "No suppliers yet. Start by adding your favorite florist or venue." })), !loading &&
                                !error &&
                                filteredSuppliers.map((s) => (_jsxs("div", { style: {
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(0, 2.2fr) repeat(5, minmax(0, 1.1fr)) 80px',
                                        gap: 0,
                                        padding: '10px 16px',
                                        borderTop: '1px solid rgba(226,232,240,0.8)',
                                        fontSize: 12,
                                        alignItems: 'center',
                                        background: '#ffffff',
                                        transition: 'background 0.15s ease, transform 0.12s ease',
                                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { style: {
                                                        width: 26,
                                                        height: 26,
                                                        borderRadius: 999,
                                                        background: '#020617',
                                                        color: '#f9fafb',
                                                        fontSize: 11,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }, children: s.name
                                                        .split(' ')
                                                        .map((part) => part[0])
                                                        .slice(0, 2)
                                                        .join('')
                                                        .toUpperCase() }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column' }, children: [_jsx("span", { style: { fontWeight: 500 }, children: s.name }), s.company_name && (_jsx("span", { style: { fontSize: 11, color: '#6b7280' }, children: s.company_name }))] })] }), _jsx("span", { style: { textTransform: 'capitalize' }, children: s.category }), _jsx("span", { children: s.location ?? '—' }), _jsx("span", { children: s.email ?? '—' }), _jsx("span", { children: s.phone ?? '—' }), _jsx("span", { children: s.rating_internal
                                                ? '★'.repeat(s.rating_internal).padEnd(5, '☆')
                                                : '—' }), _jsx("span", { style: { textAlign: 'right', color: '#64748b', fontSize: 11 }, children: s.linked_events_count ?? 0 })] }, s.id)))] })] }), showCreate && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15,23,42,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 80,
                }, children: _jsxs("div", { style: {
                        width: '100%',
                        maxWidth: 460,
                        background: '#ffffff',
                        borderRadius: 24,
                        padding: 20,
                        boxShadow: '0 30px 80px rgba(15,23,42,0.4)',
                    }, children: [_jsxs("div", { style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 12,
                            }, children: [_jsx("h3", { style: { margin: 0, fontSize: 18 }, children: "Add supplier" }), _jsx("button", { type: "button", onClick: () => setShowCreate(false), style: {
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        fontSize: 18,
                                    }, children: "\u00D7" })] }), _jsxs("form", { onSubmit: handleCreateSupplier, style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsxs("label", { style: { fontSize: 12 }, children: ["Name", _jsx("input", { type: "text", value: newSupplier.name, onChange: (e) => setNewSupplier((prev) => ({ ...prev, name: e.target.value })), required: true, style: {
                                                marginTop: 4,
                                                width: '100%',
                                                borderRadius: 10,
                                                border: '1px solid rgba(148,163,184,0.7)',
                                                padding: '8px 10px',
                                                fontSize: 13,
                                            } })] }), _jsxs("label", { style: { fontSize: 12 }, children: ["Category", _jsx("select", { value: newSupplier.category, onChange: (e) => setNewSupplier((prev) => ({
                                                ...prev,
                                                category: e.target.value,
                                            })), style: {
                                                marginTop: 4,
                                                width: '100%',
                                                borderRadius: 10,
                                                border: '1px solid rgba(148,163,184,0.7)',
                                                padding: '8px 10px',
                                                fontSize: 13,
                                                background: '#ffffff',
                                            }, children: CATEGORIES.filter((c) => c.value !== 'all').map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) })] }), _jsxs("label", { style: { fontSize: 12 }, children: ["Company (optional)", _jsx("input", { type: "text", value: newSupplier.company_name, onChange: (e) => setNewSupplier((prev) => ({
                                                ...prev,
                                                company_name: e.target.value,
                                            })), style: {
                                                marginTop: 4,
                                                width: '100%',
                                                borderRadius: 10,
                                                border: '1px solid rgba(148,163,184,0.7)',
                                                padding: '8px 10px',
                                                fontSize: 13,
                                            } })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("label", { style: { fontSize: 12, flex: 1 }, children: ["Email", _jsx("input", { type: "email", value: newSupplier.email, onChange: (e) => setNewSupplier((prev) => ({ ...prev, email: e.target.value })), style: {
                                                        marginTop: 4,
                                                        width: '100%',
                                                        borderRadius: 10,
                                                        border: '1px solid rgba(148,163,184,0.7)',
                                                        padding: '8px 10px',
                                                        fontSize: 13,
                                                    } })] }), _jsxs("label", { style: { fontSize: 12, flex: 1 }, children: ["Phone", _jsx("input", { type: "tel", value: newSupplier.phone, onChange: (e) => setNewSupplier((prev) => ({ ...prev, phone: e.target.value })), style: {
                                                        marginTop: 4,
                                                        width: '100%',
                                                        borderRadius: 10,
                                                        border: '1px solid rgba(148,163,184,0.7)',
                                                        padding: '8px 10px',
                                                        fontSize: 13,
                                                    } })] })] }), _jsxs("label", { style: { fontSize: 12 }, children: ["Location", _jsx("input", { type: "text", value: newSupplier.location, onChange: (e) => setNewSupplier((prev) => ({ ...prev, location: e.target.value })), style: {
                                                marginTop: 4,
                                                width: '100%',
                                                borderRadius: 10,
                                                border: '1px solid rgba(148,163,184,0.7)',
                                                padding: '8px 10px',
                                                fontSize: 13,
                                            } })] }), _jsxs("div", { style: {
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        gap: 8,
                                        marginTop: 12,
                                    }, children: [_jsx("button", { type: "button", onClick: () => setShowCreate(false), style: {
                                                borderRadius: 999,
                                                border: '1px solid rgba(148,163,184,0.7)',
                                                padding: '8px 14px',
                                                background: '#ffffff',
                                                fontSize: 13,
                                                cursor: 'pointer',
                                            }, children: "Cancel" }), _jsx("button", { type: "submit", disabled: creating, style: {
                                                borderRadius: 999,
                                                border: 'none',
                                                padding: '8px 18px',
                                                background: '#020617',
                                                color: '#f9fafb',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                opacity: creating ? 0.7 : 1,
                                            }, children: creating ? 'Saving…' : 'Save supplier' })] })] })] }) }))] }));
};
export default SuppliersPage;
//# sourceMappingURL=SuppliersPage.js.map