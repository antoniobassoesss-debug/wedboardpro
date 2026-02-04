export type ElementType = 
  | 'table-round'
  | 'table-rectangular'
  | 'table-custom'
  | 'chair'
  | 'decoration'
  | 'text-label'
  | 'zone'
  | 'wall'
  | 'door'
  | 'electrical-outlet'
  | 'electrical-cable';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: ElementMetadata;
}

export interface ElementMetadata {
  name?: string;
  notes?: string;
  color?: string;
  customData?: Record<string, unknown>;
}

export interface TableElement extends BaseElement {
  type: 'table-round' | 'table-rectangular' | 'table-custom';
  capacity: number;
  tableNumber?: string;
  seats: Seat[];
}

export interface Seat {
  id: string;
  localX: number;
  localY: number;
  angle: number;
  guestId?: string;
  guestName?: string;
}

export interface ElectricalElement extends BaseElement {
  type: 'electrical-outlet' | 'electrical-cable';
  powerRating?: number;
  connectedTo?: string[];
}

export type LayoutElement = TableElement | ElectricalElement | BaseElement;
