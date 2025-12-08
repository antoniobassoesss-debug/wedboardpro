import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
const HeaderBar = ({ showDashboardButton = true, showLogo = true }) => {
    return (_jsxs("div", { style: {
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 48px)',
            maxWidth: '1200px',
            padding: '10px 20px',
            borderRadius: '36px',
            background: '#ffffff',
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            border: '1px solid rgba(224,224,224,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 20050,
            pointerEvents: 'auto',
        }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: showLogo && (_jsx("img", { src: "/logo.png", alt: "Logo", style: {
                        height: '36px',
                        width: 'auto',
                        display: 'block',
                        objectFit: 'contain',
                    } })) }), _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: showDashboardButton && _jsx(HeaderBarButton, {}) })] }));
};
const HeaderBarButton = () => {
    const navigate = useNavigate();
    return (_jsx("button", { onClick: () => navigate('/dashboard'), style: {
            padding: '10px 14px',
            borderRadius: '20px',
            border: 'none',
            background: '#000000',
            color: '#ffffff',
            fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            height: '40px',
        }, children: "Dashboard" }));
};
export default HeaderBar;
//# sourceMappingURL=HeaderBar.js.map