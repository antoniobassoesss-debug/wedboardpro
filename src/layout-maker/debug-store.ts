/**
 * Simple Store Debug Test
 */

import './stores/init';
import { useLayoutStore } from './stores';

console.log('=== Simple Store Debug ===\n');

const store = useLayoutStore.getState();
console.log('Initial layout:', store.layout);

const layout = store.createLayout(
  'p1',
  'e1',
  'u1',
  { walls: [], dimensions: { width: 20, height: 20 }, pixelsPerMeter: 100 }
);
console.log('Returned layout:', layout);

console.log('Layout in store after create:', store.layout);

const id = store.addElement({
  type: 'table-round',
  x: 5,
  y: 5,
  width: 1.5,
  height: 1.5,
  rotation: 0,
  zIndex: 0,
  groupId: null,
  parentId: null,
  locked: false,
  visible: true,
  label: 'Test Table',
  notes: '',
  color: null,
});
console.log('Added element ID:', id);
if (!id) {
  console.error('Failed to add element');
  process.exit(1);
}
console.log('Layout in store after addElement:', store.layout);
console.log('Element by ID:', store.getElementById(id));
console.log('Elements by type:', store.getElementsByType('table-round'));
