import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import LayoutMakerPage from './LayoutMakerPage';
import { WeddingDashboard } from './dashboard/index';
import SuppliersPage from './suppliers/SuppliersPage';
// Simple placeholder component for pages under construction
const PlaceholderPage = ({ title }) => (_jsxs("div", { style: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem',
        background: '#f8fafc'
    }, children: [_jsx("h1", { style: { fontSize: '2rem', fontWeight: 600, color: '#0f172a' }, children: title }), _jsx("p", { style: { color: '#64748b' }, children: "This page is coming soon." }), _jsx("a", { href: "/", style: {
                marginTop: '1rem',
                padding: '0.5rem 1.5rem',
                background: '#0f172a',
                color: 'white',
                borderRadius: '9999px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600
            }, children: "Back to Home" })] }));
const App = () => {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/signup", element: _jsx(SignupPage, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(WeddingDashboard, {}) }), _jsx(Route, { path: "/layout-maker", element: _jsx(LayoutMakerPage, {}) }), _jsx(Route, { path: "/suppliers", element: _jsx(SuppliersPage, {}) }), _jsx(Route, { path: "/demo", element: _jsx(PlaceholderPage, { title: "Book a Demo" }) }), _jsx(Route, { path: "/pricing", element: _jsx(PlaceholderPage, { title: "Pricing" }) }), _jsx(Route, { path: "/privacy", element: _jsx(PlaceholderPage, { title: "Privacy Policy" }) }), _jsx(Route, { path: "/terms", element: _jsx(PlaceholderPage, { title: "Terms of Service" }) }), _jsx(Route, { path: "/contact", element: _jsx(PlaceholderPage, { title: "Contact Us" }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
};
export default App;
//# sourceMappingURL=App.js.map