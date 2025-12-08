import React from "react";

export const Dialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; children?: React.ReactNode }> = ({
  open,
  onOpenChange,
  children,
}) => {
  if (!open) return null;
  return <div className="dialog-root">{children}</div>;
};

export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...rest }) => {
  return (
    <div role="dialog" className={className ?? ""} {...rest}>
      {children}
    </div>
  );
};

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...rest }) => (
  <div {...rest}>{children}</div>
);

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, ...rest }) => (
  <h2 {...rest}>{children}</h2>
);

export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, ...rest }) => (
  <p {...rest}>{children}</p>
);


