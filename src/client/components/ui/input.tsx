import React from "react";

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...rest }) => {
  return <input className={className ?? "input"} {...rest} />;
};


