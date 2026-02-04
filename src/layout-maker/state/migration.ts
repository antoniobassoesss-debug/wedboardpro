import type { Layout, BaseElement } from './types';
import { CURRENT_SCHEMA_VERSION } from './types/layout';

interface LegacyLayoutV0 {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  elements: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function migrateV0ToV1(legacy: LegacyLayoutV0): Layout {
  const elements: Record<string, BaseElement> = {};
  
  for (const [id, elementData] of Object.entries(legacy.elements)) {
    const data = elementData as Record<string, unknown>;
    elements[id] = {
      id,
      type: (data.type as BaseElement['type']) || 'decoration',
      x: (data.x as number) || 0,
      y: (data.y as number) || 0,
      width: (data.width as number) || 100,
      height: (data.height as number) || 100,
      rotation: (data.rotation as number) || 0,
      zIndex: (data.zIndex as number) || 0,
      locked: (data.locked as boolean) || false,
      visible: (data.visible as boolean) || true,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
      metadata: {
        name: data.name as string,
        notes: data.notes as string,
        color: data.color as string,
      },
    };
  }
  
  const settings = legacy.settings as Record<string, unknown>;
  
  const result: Layout = {
    id: legacy.id,
    name: legacy.name,
    dimensions: {
      width: legacy.width,
      height: legacy.height,
      unit: 'meters',
    },
    elements,
    elementOrder: Object.keys(elements),
    settings: {
      gridSize: (settings.gridSize as number) || 20,
      snapToGrid: (settings.snapToGrid as boolean) ?? true,
      showGrid: (settings.showGrid as boolean) ?? true,
      backgroundColor: (settings.backgroundColor as string) || '#ffffff',
      defaultTableCapacity: (settings.defaultTableCapacity as number) || 8,
    },
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  if (legacy.description) {
    result.description = legacy.description;
  }

  return result;
}

export function migrateLayout(
  data: unknown,
  fromVersion: number
): Layout | null {
  try {
    switch (fromVersion) {
      case 0:
        return migrateV0ToV1(data as LegacyLayoutV0);
      case CURRENT_SCHEMA_VERSION:
        return data as Layout;
      default:
        console.warn(`Unknown schema version: ${fromVersion}, attempting direct use`);
        if (validateLayoutData(data)) {
          return data as Layout;
        }
        return null;
    }
  } catch (error) {
    console.error('Migration failed:', error);
    return null;
  }
}

function validateLayoutData(data: unknown): data is Layout {
  if (!data || typeof data !== 'object') return false;
  const l = data as Record<string, unknown>;
  return (
    typeof l.id === 'string' &&
    typeof l.name === 'string' &&
    typeof l.schemaVersion === 'number'
  );
}

export function getMigrationPath(fromVersion: number): Array<() => Layout> {
  const migrations: Array<() => Layout> = [];
  
  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    switch (v) {
      case 0:
        migrations.push(() => {
          throw new Error('V0 migration requires legacy data');
        });
        break;
    }
  }
  
  return migrations;
}
