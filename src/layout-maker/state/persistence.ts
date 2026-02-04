import type { Layout } from './types';
import { CURRENT_SCHEMA_VERSION } from './types/layout';
import { migrateLayout } from './migration';
import { validateLayout } from './validation';

const STORAGE_KEY = 'wedboardpro_layout';
const AUTOSAVE_DELAY = 1000;

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function saveToLocalStorage(layout: Layout): void {
  try {
    const serialized = JSON.stringify({
      version: CURRENT_SCHEMA_VERSION,
      data: layout,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem(`${STORAGE_KEY}_${layout.id}`, serialized);
  } catch (error) {
    console.error('Failed to save layout:', error);
  }
}

export function loadFromLocalStorage(layoutId: string): Layout | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${layoutId}`);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    
    if (parsed.version < CURRENT_SCHEMA_VERSION) {
      return migrateLayout(parsed.data, parsed.version);
    }
    
    return validateLayout(parsed.data) ? parsed.data : null;
  } catch (error) {
    console.error('Failed to load layout:', error);
    return null;
  }
}

export function debouncedSave(layout: Layout): void {
  localStorage.setItem(`${STORAGE_KEY}_${layout.id}`, JSON.stringify({
    version: CURRENT_SCHEMA_VERSION,
    data: layout,
    savedAt: new Date().toISOString(),
  }));
}

export function listSavedLayouts(): Array<{ id: string; name: string; savedAt: string }> {
  const layouts: Array<{ id: string; name: string; savedAt: string }> = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          layouts.push({
            id: parsed.data.id,
            name: parsed.data.name,
            savedAt: parsed.savedAt,
          });
        }
      } catch {
      }
    }
  }
  
  return layouts.sort((a, b) => 
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function deleteFromLocalStorage(layoutId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY}_${layoutId}`);
  } catch (error) {
    console.error('Failed to delete layout:', error);
  }
}
