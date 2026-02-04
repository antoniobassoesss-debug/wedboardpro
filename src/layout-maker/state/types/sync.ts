export interface SyncStatus {
  lastSyncedAt: string | null;
  pendingChanges: number;
  syncState: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}

export interface ChangeRecord {
  id: string;
  layoutId: string;
  elementId?: string;
  changeType: 'create' | 'update' | 'delete';
  payload: unknown;
  timestamp: string;
  synced: boolean;
}
