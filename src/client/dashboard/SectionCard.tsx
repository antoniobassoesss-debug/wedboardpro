import React from 'react';

interface SectionCardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, description, children }) => (
  <div className="wp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ flexShrink: 0 }}>
      <h2>{title}</h2>
      {description && <p style={{ color: '#475467' }}>{description}</p>}
    </div>
    <div style={{ flex: 'none', width: '100%' }}>
      {children}
    </div>
  </div>
);

export default SectionCard;




