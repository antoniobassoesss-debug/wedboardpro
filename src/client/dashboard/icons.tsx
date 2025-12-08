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
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <rect x="7" y="8" width="5" height="8" rx="1" />
    <rect x="14" y="8" width="4" height="8" rx="1" />
  </svg>
);

export const QuotesIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M7 9h5M7 13h3M7 17h10" />
    <rect x="4" y="5" width="16" height="14" rx="2" />
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
    <path d="M17 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const SuppliersIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M4 7h16v4H4z" />
    <path d="M6 11v6h3v-6" />
    <path d="M15 11v6h3v-6" />
    <path d="M9 7V5a3 3 0 0 1 6 0v2" />
  </svg>
);

export const ChatIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

