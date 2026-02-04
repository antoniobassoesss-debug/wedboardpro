/**
 * SyncStatusIndicator Component
 *
 * Displays the current sync status with an icon and text.
 * Shows: pending → syncing → saved or error states.
 */

import React from 'react';
import { useSyncStatusDisplay } from '../../layout-maker/hooks/useAutoSync';

interface SyncStatusIndicatorProps {
  className?: string;
  showText?: boolean;
  compact?: boolean;
}

export function SyncStatusIndicator({
  className = '',
  showText = true,
  compact = false,
}: SyncStatusIndicatorProps) {
  const {
    icon,
    text,
    color,
    spin,
    lastSyncedText,
    hasError,
    isSyncing,
  } = useSyncStatusDisplay();

  return (
    <div
      className={`sync-status-indicator flex items-center gap-1.5 ${className}`}
      title={hasError ? text : lastSyncedText ? `Last saved ${lastSyncedText}` : text}
    >
      <span
        className={`text-sm ${spin ? 'animate-spin' : ''}`}
        style={{ color }}
      >
        {icon}
      </span>
      {showText && !compact && (
        <span
          className="text-xs font-medium"
          style={{ color }}
        >
          {text}
        </span>
      )}
      {showText && compact && isSyncing && (
        <span
          className="text-xs font-medium"
          style={{ color }}
        >
          Saving...
        </span>
      )}
    </div>
  );
}

/**
 * SyncStatusBadge - A minimal badge version for toolbars
 */
export function SyncStatusBadge({ className = '' }: { className?: string }) {
  const { color, spin, status } = useSyncStatusDisplay();

  if (status === 'idle' || status === 'saved') {
    return null; // Don't show when everything is synced
  }

  return (
    <div
      className={`w-2 h-2 rounded-full ${spin ? 'animate-pulse' : ''} ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}
