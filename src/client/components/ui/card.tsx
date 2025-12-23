/**
 * shadcn/ui Card component
 * A styled container card with glass/dark variants
 */
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'dark';
  onClick?: () => void;
  hoverable?: boolean;
  style?: React.CSSProperties;
}

const variantStyles: Record<string, React.CSSProperties> = {
  default: {
    background: 'white',
    border: '1px solid rgba(0,0,0,0.08)',
  },
  glass: {
    background: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  dark: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
  },
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  onClick,
  hoverable = false,
  style = {},
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    borderRadius: '16px',
    boxShadow: isHovered && hoverable
      ? '0 8px 32px rgba(0,0,0,0.15)'
      : '0 4px 16px rgba(0,0,0,0.06)',
    transition: 'all 0.2s ease',
    transform: isHovered && hoverable ? 'translateY(-2px)' : 'none',
    cursor: onClick ? 'pointer' : 'default',
    overflow: 'hidden',
    ...variantStyles[variant],
    ...style,
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '', style = {} }) => (
  <div
    className={className}
    style={{
      padding: '16px 20px 12px',
      ...style,
    }}
  >
    {children}
  </div>
);

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '', style = {} }) => (
  <div
    className={className}
    style={{
      padding: '0 20px 16px',
      ...style,
    }}
  >
    {children}
  </div>
);

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '', style = {} }) => (
  <div
    className={className}
    style={{
      padding: '12px 20px 16px',
      borderTop: '1px solid rgba(0,0,0,0.06)',
      ...style,
    }}
  >
    {children}
  </div>
);

export default Card;

