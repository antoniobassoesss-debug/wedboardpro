/**
 * Phase 0 Verification Test
 *
 * This test verifies that all stores work together correctly.
 */

import './stores/init';
import { useLayoutStore, useSelectionStore, useViewportStore, useHistoryStore, useUIStore } from './stores';
import type { BaseElement } from './types/elements';

console.log('=== Phase 0 Verification Test ===\n');

let allPassed = true;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ ${message}`);
  } else {
    console.error(`✗ ${message}`);
    allPassed = false;
  }
}

function testLayoutStore() {
  console.log('1. Testing Layout Store...');

  const layoutStore = useLayoutStore.getState();

  const layout = layoutStore.createLayout(
    'project-123',
    'event-456',
    'user-789',
    { walls: [], dimensions: { width: 20, height: 20 }, pixelsPerMeter: 100 }
  );

  assert(layout.id.length > 0, 'Layout created with ID');
  assert(layout.elementOrder.length === 0, 'Layout starts with empty elementOrder');

  const elementIdNullable = layoutStore.addElement({
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
    label: 'Table 1',
    notes: '',
    color: null,
  });

  assert(elementIdNullable !== null, 'Element ID generated');
  const elementId = elementIdNullable as string;

  const elements = layoutStore.getElementsByType('table-round');
  assert(elements.length === 1, 'Element added to layout (via getter)');

  const element = layoutStore.getElementById(elementId);
  assert(element !== undefined, 'Can retrieve element by ID');
  assert(element?.label === 'Table 1', 'Element has correct label');

  layoutStore.updateElement(elementId, { label: 'Updated Table 1' });
  const updatedElement = layoutStore.getElementById(elementId);
  assert(updatedElement?.label === 'Updated Table 1', 'Element updated successfully');

  layoutStore.deleteElement(elementId);
  const deletedElement = layoutStore.getElementById(elementId);
  assert(deletedElement === undefined, 'Element deleted successfully');

  console.log('');
}

function testSelectionStore() {
  console.log('2. Testing Selection Store...');

  const selectionStore = useSelectionStore.getState();
  const layoutStore = useLayoutStore.getState();

  const elementIdNullable = layoutStore.addElement({
    type: 'chair',
    x: 5,
    y: 5,
    width: 0.45,
    height: 0.45,
    rotation: 0,
    zIndex: 0,
    groupId: null,
    parentId: null,
    locked: false,
    visible: true,
    label: 'Chair 1',
    notes: '',
    color: null,
  });

  assert(elementIdNullable !== null, 'Chair 1 added');
  const elementId = elementIdNullable as string;

  selectionStore.select(elementId);
  assert(selectionStore.isSelected(elementId), 'Single selection works');
  assert(selectionStore.isSelected(elementId) && !selectionStore.isSelected('other'), 'Only one element selected');

  const elementId2Nullable = layoutStore.addElement({
    type: 'chair',
    x: 6,
    y: 5,
    width: 0.45,
    height: 0.45,
    rotation: 0,
    zIndex: 0,
    groupId: null,
    parentId: null,
    locked: false,
    visible: true,
    label: 'Chair 2',
    notes: '',
    color: null,
  });

  assert(elementId2Nullable !== null, 'Chair 2 added');
  const elementId2 = elementId2Nullable as string;

  selectionStore.addToSelection(elementId2);
  assert(selectionStore.isSelected(elementId2), 'Add to selection works');
  assert(selectionStore.isSelected(elementId) && selectionStore.isSelected(elementId2), 'Two elements selected');

  selectionStore.toggleSelection(elementId);
  assert(!selectionStore.isSelected(elementId) && selectionStore.isSelected(elementId2), 'Toggle selection works');
  assert(!selectionStore.isSelected(elementId) && selectionStore.isSelected(elementId2), 'One element after toggle');

  selectionStore.deselectAll();
  assert(!selectionStore.isSelected(elementId) && !selectionStore.isSelected(elementId2), 'Deselect all works');

  selectionStore.setHovered(elementId);
  assert(selectionStore.hoveredId === elementId, 'Hover state works');

  console.log('');
}

function testViewportStore() {
  console.log('3. Testing Viewport Store...');

  const viewportStore = useViewportStore.getState();

  viewportStore.setSize(800, 600);
  let viewport = viewportStore.viewport;
  assert(viewport.width === 800, 'Viewport width set');
  assert(viewport.height === 600, 'Viewport height set');

  viewportStore.zoomTo(2);
  viewport = viewportStore.viewport;
  assert(viewport.zoom === 2, 'Zoom set to 2');

  viewportStore.zoomIn();
  viewport = viewportStore.viewport;
  assert(viewport.zoom > 2, 'Zoom in works');

  viewportStore.zoomOut();
  viewport = viewportStore.viewport;
  assert(viewport.zoom < 2.4, 'Zoom out works');

  viewportStore.panBy(100, 50);
  viewport = viewportStore.viewport;
  assert(viewport.x !== 0 || viewport.y !== 0, 'Pan works');

  viewportStore.resetView();
  viewport = viewportStore.viewport;
  assert(viewport.zoom === 1, 'Reset zoom works');
  assert(viewport.x === 0, 'Reset x works');
  assert(viewport.y === 0, 'Reset y works');

  const worldPoint = { x: 5, y: 3 };
  const screenPoint = viewportStore.worldToScreen(worldPoint);
  assert(screenPoint.x > 0, 'World to screen conversion works');
  assert(screenPoint.y > 0, 'World to screen conversion works');

  const backToWorld = viewportStore.screenToWorld(screenPoint);
  assert(Math.abs(backToWorld.x - worldPoint.x) < 0.001, 'Screen to world conversion works');
  assert(Math.abs(backToWorld.y - worldPoint.y) < 0.001, 'Screen to world conversion works');

  console.log('');
}

function testHistoryStore() {
  console.log('4. Testing History Store...');

  const historyStore = useHistoryStore.getState();
  const layoutStore = useLayoutStore.getState();

  const initialCount = layoutStore.getElementsByType('chair').length;

  const elementIdNullable = layoutStore.addElement({
    type: 'chair',
    x: 10,
    y: 10,
    width: 0.45,
    height: 0.45,
    rotation: 0,
    zIndex: 0,
    groupId: null,
    parentId: null,
    locked: false,
    visible: true,
    label: 'History Test Chair',
    notes: '',
    color: null,
  });

  assert(elementIdNullable !== null, 'History test chair added');
  const elementId = elementIdNullable as string;

  const afterAddCount = layoutStore.getElementsByType('chair').length;
  assert(afterAddCount === initialCount + 1, 'Element added for history test');

  assert(historyStore.getCanUndo(), 'Can undo after adding element');
  const undoEntry = historyStore.undo();
  assert(undoEntry !== null, 'Undo returned entry');

  const afterUndoCount = layoutStore.getElementsByType('chair').length;
  assert(afterUndoCount === initialCount, 'Undo removed element');

  assert(historyStore.getCanRedo(), 'Can redo after undo');
  const redoEntry = historyStore.redo();
  assert(redoEntry !== null, 'Redo returned entry');

  const afterRedoCount = layoutStore.getElementsByType('chair').length;
  assert(afterRedoCount === initialCount + 1, 'Redo restored element');

  historyStore.clear();
  assert(!historyStore.getCanUndo(), 'Clear removes history');
  assert(!historyStore.getCanRedo(), 'Clear removes future');

  layoutStore.deleteElement(elementId);

  console.log('');
}

function testBatchOperations() {
  console.log('5. Testing Batch Operations...');

  const historyStore = useHistoryStore.getState();
  const layoutStore = useLayoutStore.getState();

  historyStore.startBatch('Add multiple elements');

  const ids: string[] = [];
  for (let i = 0; i < 3; i++) {
    const idNullable = layoutStore.addElement({
      type: 'table-round',
      x: i * 3,
      y: i * 3,
      width: 1.5,
      height: 1.5,
      rotation: 0,
      zIndex: 0,
      groupId: null,
      parentId: null,
      locked: false,
      visible: true,
      label: `Batch Table ${i + 1}`,
      notes: '',
      color: null,
    });
    if (idNullable) ids.push(idNullable);
  }

  historyStore.endBatch();

  assert(historyStore.getCanUndo(), 'Batch operation recorded');
  const undoEntry = historyStore.undo();
  assert(undoEntry !== null, 'Batch undone as single entry');

  const tablesAfterUndo = layoutStore.getElementsByType('table-round');
  assert(tablesAfterUndo.length === 0, 'All batch elements removed');

  console.log('');
}

function testUIStore() {
  console.log('6. Testing UI Store...');

  const uiStore = useUIStore.getState();

  assert(uiStore.sidebarOpen === true, 'Sidebar defaults to open');
  uiStore.setSidebarOpen(false);
  assert(uiStore.sidebarOpen === false, 'Sidebar can be closed');
  uiStore.toggleSidebar();
  assert(uiStore.sidebarOpen === true, 'Sidebar toggle works');

  uiStore.setActiveSidebarTab('properties');
  assert(uiStore.activeSidebarTab === 'properties', 'Sidebar tab can be changed');

  uiStore.setActiveTool('hand');
  assert(uiStore.activeTool === 'hand', 'Tool can be changed');

  uiStore.toggleGrid();
  assert(uiStore.showGrid === false, 'Grid toggle works');

  uiStore.toggleSnap();
  assert(uiStore.snapEnabled === false, 'Snap toggle works');

  console.log('');
}

function runTests() {
  console.log('Running Phase 0 verification tests...\n');

  try {
    testLayoutStore();
    testSelectionStore();
    testViewportStore();
    testHistoryStore();
    testBatchOperations();
    testUIStore();

    console.log('=== Test Results ===');
    if (allPassed) {
      console.log('✓ All tests passed!');
      process.exit(0);
    } else {
      console.log('✗ Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

runTests();
