import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Link } from 'react-router-dom';
import HeaderBar from './HeaderBar';
const Dashboard = () => {
    return (_jsxs(_Fragment, { children: [_jsx(HeaderBar, { showDashboardButton: false, showLogo: false }), _jsx("div", { style: {
                    minHeight: '100vh',
                    width: '100vw',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #edf2fb 100%)',
                    padding: '32px',
                }, children: _jsxs("div", { style: { width: '100%', maxWidth: '520px', textAlign: 'center' }, children: [_jsx("div", { style: { maxWidth: '520px', margin: '0 auto 24px auto', fontSize: '16px', color: '#475569', lineHeight: 1.6 }, children: "Welcome back! Open the Layout Maker to start designing your next event space." }), _jsxs("div", { style: {
                                background: '#ffffff',
                                borderRadius: '32px',
                                padding: '48px',
                                boxShadow: '0 30px 80px rgba(10, 20, 30, 0.15)',
                                border: '1px solid rgba(15, 23, 42, 0.08)',
                            }, children: [_jsx("h1", { style: {
                                        margin: 0,
                                        fontSize: '36px',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                                    }, children: "Dashboard" }), _jsx(Link, { to: "/layout-maker", style: { textDecoration: 'none', display: 'block', width: '100%', marginTop: '24px' }, children: _jsx("button", { type: "button", style: {
                                            padding: '16px 32px',
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            borderRadius: '18px',
                                            border: 'none',
                                            background: '#111111',
                                            color: '#ffffff',
                                            cursor: 'pointer',
                                            width: '100%',
                                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                        }, onMouseDown: (e) => {
                                            e.currentTarget.style.transform = 'scale(0.98)';
                                        }, onMouseUp: (e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }, children: "Open Layout Maker" }) })] })] }) })] }));
};
export default Dashboard;
//# sourceMappingURL=Dashboard.js.map