/**
 * usePowerPoints - Hook for CRUD operations on power points + drawer state.
 */
import { useState, useCallback } from 'react';
import type { PowerPoint } from '../types/powerPoint';
import { createPowerPoint } from '../types/powerPoint';
import type { ElectricalStandard } from '../types/electrical';

interface UsePowerPointsReturn {
  powerPoints: PowerPoint[];
  setPowerPoints: React.Dispatch<React.SetStateAction<PowerPoint[]>>;
  selectedPointId: string | null;
  selectedPoint: PowerPoint | null;
  isDrawerOpen: boolean;
  openDrawer: (pointId: string) => void;
  closeDrawer: () => void;
  addPowerPoint: (x: number, y: number, standard?: ElectricalStandard) => PowerPoint;
  updatePowerPoint: (updated: PowerPoint) => void;
  deletePowerPoint: (id: string) => void;
  defaultStandard: ElectricalStandard;
  setDefaultStandard: (standard: ElectricalStandard) => void;
}

export const usePowerPoints = (
  initialPoints: PowerPoint[] = []
): UsePowerPointsReturn => {
  const [powerPoints, setPowerPoints] = useState<PowerPoint[]>(initialPoints);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [defaultStandard, setDefaultStandard] = useState<ElectricalStandard>('EU_PT');

  const selectedPoint = powerPoints.find((p) => p.id === selectedPointId) || null;

  const openDrawer = useCallback((pointId: string) => {
    setSelectedPointId(pointId);
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Delay clearing selection to allow animation
    setTimeout(() => setSelectedPointId(null), 300);
  }, []);

  const addPowerPoint = useCallback(
    (x: number, y: number, standard?: ElectricalStandard): PowerPoint => {
      const newPoint = createPowerPoint(x, y, standard || defaultStandard);
      setPowerPoints((prev) => [...prev, newPoint]);
      return newPoint;
    },
    [defaultStandard]
  );

  const updatePowerPoint = useCallback((updated: PowerPoint) => {
    setPowerPoints((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  }, []);

  const deletePowerPoint = useCallback((id: string) => {
    setPowerPoints((prev) => prev.filter((p) => p.id !== id));
    if (selectedPointId === id) {
      closeDrawer();
    }
  }, [selectedPointId, closeDrawer]);

  return {
    powerPoints,
    setPowerPoints,
    selectedPointId,
    selectedPoint,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    addPowerPoint,
    updatePowerPoint,
    deletePowerPoint,
    defaultStandard,
    setDefaultStandard,
  };
};

