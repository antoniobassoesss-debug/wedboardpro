import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export const Dialog = ({ open, onOpenChange, children, }) => {
    if (!open)
        return null;
    return _jsx("div", { className: "dialog-root", children: children });
};
export const DialogContent = ({ children, className, ...rest }) => {
    return (_jsx("div", { role: "dialog", className: className ?? "", ...rest, children: children }));
};
export const DialogHeader = ({ children, ...rest }) => (_jsx("div", { ...rest, children: children }));
export const DialogTitle = ({ children, ...rest }) => (_jsx("h2", { ...rest, children: children }));
export const DialogDescription = ({ children, ...rest }) => (_jsx("p", { ...rest, children: children }));
//# sourceMappingURL=dialog.js.map