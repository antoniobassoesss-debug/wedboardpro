import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState, useEffect } from 'react';
import SectionCard from './SectionCard';
import { useNavigate } from 'react-router-dom';
import TodoPage from '../todo/TodoPage';
import Calendar from '../components/Calendar';
import EventProjectPage from './pipeline/EventProjectPage';
import { listEvents, createEvent } from '../api/eventsPipelineApi';
import SuppliersPage from '../suppliers/SuppliersPage';
const EmptyState = ({ message }) => (_jsx("div", { style: {
        width: '100%',
        border: '1px dashed rgba(0,0,0,0.15)',
        borderRadius: 24,
        padding: 40,
        textAlign: 'center',
        color: '#7b7b7b',
        fontSize: 16,
    }, children: message }));
export const WorkSection = () => {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const loadEvents = async () => {
        setLoading(true);
        setError(null);
        const { data, error: err } = await listEvents();
        if (err) {
            setError(err);
        }
        else if (data) {
            setEvents(data);
            if (!selectedEventId && data.length > 0) {
                setSelectedEventId(data[0].id);
            }
        }
        setLoading(false);
    };
    useEffect(() => {
        loadEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const handleCreateEvent = async () => {
        const today = new Date();
        const isoDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10);
        const { data, error: err } = await createEvent({
            title: `New Wedding – ${today.toLocaleDateString()}`,
            wedding_date: isoDate,
        });
        if (err) {
            // eslint-disable-next-line no-alert
            alert(`Failed to create event: ${err}`);
            return;
        }
        if (data) {
            setEvents((prev) => [...prev, data.event]);
            setSelectedEventId(data.event.id);
        }
    };
    const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
    return (_jsx(SectionCard, { title: "Project Pipeline", description: "Each wedding gets its own workspace from first brief to post\u2011event wrap\u2011up.", children: _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 16 }, children: [_jsxs("div", { style: {
                        borderRadius: 16,
                        border: '1px solid #e5e5e5',
                        padding: 12,
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        height: '100%',
                    }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600 }, children: "Events" }), _jsx("button", { type: "button", onClick: handleCreateEvent, style: {
                                        borderRadius: 999,
                                        padding: '6px 10px',
                                        border: 'none',
                                        background: '#0f172a',
                                        color: '#ffffff',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }, children: "+ New event" })] }), loading && events.length === 0 && (_jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "Loading events\u2026" })), error && (_jsx("div", { style: { fontSize: 12, color: '#b91c1c' }, children: error })), events.length === 0 && !loading && !error && (_jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "No events yet. Create your first wedding project to get started." })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }, children: events.map((ev) => (_jsxs("button", { type: "button", onClick: () => setSelectedEventId(ev.id), style: {
                                    textAlign: 'left',
                                    borderRadius: 10,
                                    border: '1px solid',
                                    borderColor: selectedEventId === ev.id ? '#0f172a' : '#e5e5e5',
                                    background: selectedEventId === ev.id ? '#0f172a' : '#ffffff',
                                    color: selectedEventId === ev.id ? '#ffffff' : '#111827',
                                    padding: 8,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                }, children: [_jsx("div", { style: { fontWeight: 500 }, children: ev.title }), _jsxs("div", { style: { fontSize: 11, color: selectedEventId === ev.id ? '#e5e7eb' : '#6b7280' }, children: [ev.wedding_date ? new Date(ev.wedding_date).toLocaleDateString() : 'No date', " \u00B7", ' ', ev.status.replace('_', ' ')] })] }, ev.id))) })] }), _jsx("div", { children: selectedEvent ? (_jsx(EventProjectPage, { eventId: selectedEvent.id })) : (_jsx("div", { style: { padding: 24, color: '#6b7280', fontSize: 14 }, children: "Select or create an event on the left to open its project workspace." })) })] }) }));
};
export const CalendarSection = () => {
    const [accountId, setAccountId] = useState(null);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        try {
            const raw = window.localStorage.getItem('wedboarpro_session');
            if (!raw)
                return;
            const parsed = JSON.parse(raw);
            const uid = parsed?.user?.id ?? null;
            if (uid)
                setAccountId(uid);
        }
        catch {
            // ignore
        }
    }, []);
    return (_jsx(SectionCard, { title: "Calendar", description: "Keep track of events, fittings, and deadlines.", children: accountId ? (_jsx(Calendar, { accountId: accountId })) : (_jsx("p", { style: { marginTop: 0, marginBottom: 0, color: '#7b7b7b' }, children: "Log in to load your calendar events." })) }));
};
export const LayoutsSection = () => {
    const navigate = useNavigate();
    const layouts = [];
    return (_jsxs(SectionCard, { title: "Layout Library", description: "Manage venue floor plans and seating charts.", children: [_jsxs("div", { className: "wp-section-header", children: [_jsx("div", {}), _jsx("button", { type: "button", className: "wp-pill primary", onClick: () => navigate('/layout-maker'), children: "New Layout" })] }), _jsx("div", { className: "wp-section-grid", children: layouts.length === 0 ? (_jsx(EmptyState, { message: "No layouts saved yet. Create a layout to see it listed here." })) : (layouts.map((layout) => (_jsxs("div", { className: "wp-layout-card", children: [_jsx("strong", { children: layout.venue }), _jsxs("p", { style: { margin: '4px 0', color: '#7b7b7b' }, children: [layout.capacity, " guests"] }), _jsx("span", { className: `wp-badge ${layout.status === 'Approved' ? 'positive' : layout.status === 'In Review' ? 'warning' : 'neutral'}`, children: layout.status })] }, layout.venue)))) })] }));
};
export const QuotesSection = () => {
    const quotes = [];
    return (_jsx(SectionCard, { title: "Quotes & Proposals", description: "Track outgoing proposals and client approvals.", children: _jsx("div", { className: "wp-section-grid", children: quotes.length === 0 ? (_jsx(EmptyState, { message: "No quotes yet. Generate a proposal to begin tracking approvals." })) : (quotes.map((quote) => (_jsxs("div", { className: "wp-quote-card", children: [_jsxs("div", { children: [_jsx("strong", { children: quote.client }), _jsx("p", { style: { margin: 0, color: '#7b7b7b' }, children: quote.date })] }), _jsx("div", { style: { fontSize: 24, fontWeight: 700 }, children: quote.amount }), _jsx("span", { className: `wp-badge ${quote.status === 'Accepted' ? 'positive' : 'neutral'}`, children: quote.status }), _jsxs("div", { style: { display: 'flex', gap: 10 }, children: [_jsx("button", { type: "button", className: "wp-pill primary", children: "View details" }), _jsx("button", { type: "button", className: "wp-pill", children: "Send reminder" })] })] }, quote.client)))) }) }));
};
export const TodoSection = () => {
    return (_jsx(SectionCard, { title: "To-Do List", description: "Quick tasks and reminders.", children: _jsx(TodoPage, {}) }));
};
export const SuppliersSection = () => {
    return (_jsx(SectionCard, { title: "Suppliers", description: "Keep all your trusted vendors in one directory, and see how often you use them.", children: _jsx(SuppliersPage, { embedded: true }) }));
};
//# sourceMappingURL=sections.js.map