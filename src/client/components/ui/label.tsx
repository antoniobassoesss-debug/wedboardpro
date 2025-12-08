import React from "react";

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ children, className, ...rest }) => {
  return (
    <label className={className ?? "label"} {...rest}>
      {children}
    </label>
  );
};


