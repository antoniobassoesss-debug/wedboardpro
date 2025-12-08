import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const SectionCard = ({ title, description, children }) => (_jsxs("div", { className: "wp-card", style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { style: { flexShrink: 0 }, children: [_jsx("h2", { children: title }), description && _jsx("p", { style: { color: '#475467' }, children: description })] }), _jsx("div", { style: { flex: 'none', width: '100%' }, children: children })] }));
export default SectionCard;
//# sourceMappingURL=SectionCard.js.map