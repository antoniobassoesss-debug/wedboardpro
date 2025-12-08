import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const EVENT_COLORS = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    blue: '#2563eb',
    purple: '#8b5cf6',
};
export const EventColorPicker = ({ value, onChange, showAuto = true }) => {
    const colors = [
        'red',
        'orange',
        'yellow',
        'green',
        'blue',
        'purple',
    ];
    return (_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [colors.map((c) => {
                const selected = value === c;
                return (_jsx("button", { type: "button", onClick: () => onChange(c), style: {
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: selected ? '3px solid #0c0c0c' : '2px solid #e3e3e3',
                        background: EVENT_COLORS[c],
                        cursor: 'pointer',
                        boxShadow: selected ? '0 0 0 2px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s',
                    }, "aria-label": `Color ${c}`, title: c.charAt(0).toUpperCase() + c.slice(1) }, c));
            }), showAuto && (_jsx("button", { type: "button", onClick: () => onChange(null), style: {
                    borderRadius: 999,
                    padding: '8px 12px',
                    border: value === null ? '2px solid #0c0c0c' : '1px solid #e3e3e3',
                    background: value === null ? '#0c0c0c' : '#fff',
                    color: value === null ? '#fff' : '#0c0c0c',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    transition: 'all 0.15s',
                }, children: "Auto" }))] }));
};
//# sourceMappingURL=EventColorPicker.js.map