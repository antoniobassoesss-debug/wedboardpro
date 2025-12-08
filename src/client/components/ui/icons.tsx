import React from "react";

export const CreditCard: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" ry="2" stroke="currentColor" fill="none" />
    <rect x="3" y="9" width="6" height="2" fill="currentColor" />
  </svg>
);

export const Users: React.FC = () => <span style={{ fontWeight: 700 }}>👥</span>;
export const Bell: React.FC = () => <span>🔔</span>;
export const HardDrive: React.FC = () => <span>💾</span>;
export const Shield: React.FC = () => <span>🛡️</span>;
export const Edit2: React.FC = () => <span>✎</span>;


