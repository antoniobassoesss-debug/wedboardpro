import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
const SignupPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const text = await res.text();
            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            }
            catch (e) {
                // invalid json — keep data empty and continue to error handling below
                console.warn('Signup: response not JSON', text);
            }
            if (!res.ok) {
                const message = data?.error || text || `Signup failed (status ${res.status})`;
                throw new Error(message);
            }
            navigate('/login');
        }
        catch (err) {
            setError(err?.message || 'Unexpected error');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { style: {
            minHeight: '100vh',
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            fontFamily: 'Geist, Inter, system-ui, sans-serif',
        }, children: _jsxs("div", { style: {
                width: '100%',
                maxWidth: 420,
                background: '#ffffff',
                borderRadius: 32,
                border: '1px solid rgba(0,0,0,0.08)',
                padding: 40,
                boxShadow: '0 30px 60px rgba(0,0,0,0.05)',
            }, children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: 32 }, children: [_jsx("img", { src: "/logo/iconlogo.png", alt: "WedBoarPro", style: { width: 60, height: 60, objectFit: 'contain' } }), _jsx("h1", { style: { margin: '16px 0 8px 0' }, children: "Create your WedBoarPro account" }), _jsx("p", { style: { margin: 0, color: '#6b6b6b' }, children: "Set up access for your planning studio." })] }), _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 8, fontWeight: 600 }, children: ["Email", _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, style: {
                                        borderRadius: 999,
                                        border: '1px solid rgba(0,0,0,0.2)',
                                        padding: '12px 18px',
                                    } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 8, fontWeight: 600 }, children: ["Password", _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, style: {
                                        borderRadius: 999,
                                        border: '1px solid rgba(0,0,0,0.2)',
                                        padding: '12px 18px',
                                    } })] }), error && (_jsx("div", { style: { color: '#b91c1c', fontSize: 14, textAlign: 'center' }, children: error })), _jsx("button", { type: "submit", disabled: loading, style: {
                                borderRadius: 999,
                                padding: '12px 18px',
                                border: 'none',
                                background: '#0c0c0c',
                                color: '#ffffff',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }, children: loading ? 'Creating account...' : 'Sign Up' })] }), _jsxs("p", { style: { marginTop: 24, textAlign: 'center', fontSize: 14, color: '#6b6b6b' }, children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", style: { color: '#0c0c0c', fontWeight: 600 }, children: "Log in" })] })] }) }));
};
export default SignupPage;
//# sourceMappingURL=SignupPage.js.map