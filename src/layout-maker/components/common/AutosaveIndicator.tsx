/**
 * AutosaveIndicator Component
 *
 * Shows save status in header (saving, saved, offline).
 */

import React from 'react';

type SaveStatus = 'saving' | 'saved' | 'unsaved' | 'offline' | 'error';

interface AutosaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date;
  className?: string;
}

export const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({
  status,
  lastSaved,
  className = '',
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {status === 'saving' && (
        <>
          <Spinner size="sm" />
          <span className="text-gray-500">Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <CheckIcon className="w-4 h-4 text-green-500" />
          <span className="text-gray-500">
            {lastSaved ? `Saved at ${formatTime(lastSaved)}` : 'Saved'}
          </span>
        </>
      )}

      {status === 'unsaved' && (
        <>
          <DotIcon className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-500">Unsaved changes</span>
        </>
      )}

      {status === 'offline' && (
        <>
          <CloudOffIcon className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-500">Offline - changes will sync</span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertIcon className="w-4 h-4 text-red-500" />
          <span className="text-red-500">Save failed - retrying...</span>
        </>
      )}
    </div>
  );
};

const Spinner: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <svg className={`animate-spin ${sizeClasses[size]}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

const CheckIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const DotIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-3 h-3 ${className}`} fill="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CloudOffIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

export default AutosaveIndicator;
