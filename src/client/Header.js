import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
const Header = ({ onSaveLayout, onAIPlanner }) => {
    const navigate = useNavigate();
    return (_jsx("div", { style: {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 100px)',
            maxWidth: '1600px',
            height: '56px',
            background: '#ffffff',
            borderRadius: '30px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 50px',
            gap: '24px',
            zIndex: 10001,
            border: '1px solid #e0e0e0',
            pointerEvents: 'auto',
            isolation: 'isolate',
            zoom: 1,
            transformOrigin: 'top center',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            willChange: 'auto',
        }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("button", { onClick: onSaveLayout, style: {
                        width: '150px',
                        padding: '10px 48px',
                        borderRadius: '28px',
                        border: '2px solid #e0e0e0',
                        background: '#ffffff',
                        color: '#666',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                    }, onMouseEnter: (e) => {
                        e.currentTarget.style.background = '#f5f5f5';
                        e.currentTarget.style.borderColor = '#3498db';
                        e.currentTarget.style.color = '#3498db';
                    }, onMouseLeave: (e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.color = '#666';
                    }, children: "Save Layout" }), _jsx("button", { onClick: onAIPlanner, style: {
                        width: '150px',
                        padding: '10px 48px',
                        borderRadius: '28px',
                        border: '2px solid #e0e0e0',
                        background: '#ffffff',
                        color: '#666',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                    }, onMouseEnter: (e) => {
                        e.currentTarget.style.background = '#f5f5f5';
                        e.currentTarget.style.borderColor = '#9b59b6';
                        e.currentTarget.style.color = '#9b59b6';
                    }, onMouseLeave: (e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.color = '#666';
                    }, children: "AI Planner" })] }) }));
};
export default Header;
//# sourceMappingURL=Header.js.map