import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export const Avatar = ({ children, className, ...rest }) => {
    return (_jsx("div", { className: className ?? "avatar", ...rest, children: children }));
};
export const AvatarImage = (props) => {
    const { alt, ...rest } = props;
    return _jsx("img", { alt: alt, ...rest });
};
export const AvatarFallback = ({ children, className, ...rest }) => {
    return (_jsx("div", { className: className ?? "avatar-fallback", ...rest, children: children }));
};
//# sourceMappingURL=avatar.js.map