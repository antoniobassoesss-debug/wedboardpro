import React from 'react';

const iconProps = {
  width: 18,
  height: 18,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const HomeIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M3 10.5 12 4l9 6.5v9.5a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
  </svg>
);

export const WorkIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M5 7h14a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2z" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M3 11h18" />
  </svg>
);

export const CalendarIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M8 3v4M16 3v4M4 10h16" />
  </svg>
);

export const LayoutIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 12h16M12 4v16" />
  </svg>
);

export const QuotesIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

export const TodoIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M9 6l-1 1-1-1M9 12l-1 1-1-1M9 18l-1 1-1-1" />
    <path d="M13 6h5M13 12h5M13 18h5" />
  </svg>
);

export const UsersIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

export const SuppliersIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const ChatIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const FilesIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

