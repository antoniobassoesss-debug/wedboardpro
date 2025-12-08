import React from "react";

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; className?: string }
> = ({ children, className, ...rest }) => {
  return (
    <button {...rest} className={className ?? "button"}>
      {children}
    </button>
  );
};


