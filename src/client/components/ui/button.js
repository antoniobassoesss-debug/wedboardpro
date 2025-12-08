import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export const Button = ({ children, className, ...rest }) => {
    return (_jsx("button", { ...rest, className: className ?? "button", children: children }));
};
//# sourceMappingURL=button.js.map