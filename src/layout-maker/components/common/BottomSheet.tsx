/**
 * BottomSheet Component
 *
 * Draggable bottom sheet for mobile/tablet interfaces.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

export type BottomSheetState = 'collapsed' | 'half' | 'full';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  initialState?: BottomSheetState;
  snapPoints?: number[];
  className?: string;
}

const DEFAULT_SNAP_POINTS = [0.25, 0.5, 0.9];

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  initialState = 'half',
  snapPoints = DEFAULT_SNAP_POINTS,
  className = '',
}) => {
  const [sheetState, setSheetState] = useState<BottomSheetState>(initialState);
  const [translateY, setTranslateY] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number>(0);
  const touchStartTranslateYRef = useRef<number>(0);

  const collapsedPoint = snapPoints[0] ?? 0.25;
  const halfPoint = snapPoints[1] ?? 0.5;
  const fullPoint = snapPoints[2] ?? snapPoints[1] ?? 0.9;

  const getPercentageFromState = useCallback((state: BottomSheetState): number => {
    switch (state) {
      case 'collapsed': return collapsedPoint * 100;
      case 'half': return halfPoint * 100;
      case 'full': return fullPoint * 100;
      default: return 50;
    }
  }, [collapsedPoint, halfPoint, fullPoint]);

  const getStateFromPercentage = useCallback((percentage: number): BottomSheetState => {
    if (percentage >= fullPoint * 100) return 'full';
    if (percentage >= halfPoint * 100) return 'half';
    return 'collapsed';
  }, [halfPoint, fullPoint]);

  useEffect(() => {
    if (isOpen) {
      setTranslateY(getPercentageFromState(initialState));
    } else {
      setTranslateY(100);
    }
  }, [isOpen, initialState, getPercentageFromState]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    
    touchStartRef.current = touch.clientY;
    touchStartTranslateYRef.current = translateY;
    setStartY(touch.clientY);
    setCurrentY(0);
    setIsDragging(true);
  }, [translateY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - touchStartRef.current;
    setCurrentY(deltaY);

    const containerHeight = containerRef.current?.offsetHeight || 1;
    const maxTranslate = 100;
    const minTranslate = getPercentageFromState('full');

    const newTranslate = Math.max(minTranslate, Math.min(maxTranslate, touchStartTranslateYRef.current + (deltaY / containerHeight) * 100));
    setTranslateY(newTranslate);
  }, [isDragging, getPercentageFromState]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    const dragThreshold = 5;
    if (Math.abs(currentY) < dragThreshold) {
      return;
    }

    const currentPercentage = translateY;
    const newState = getStateFromPercentage(currentPercentage);
    setSheetState(newState);
    setTranslateY(getPercentageFromState(newState));

    if (currentY > 50 && newState === 'collapsed') {
      onClose();
    }
  }, [isDragging, currentY, translateY, getStateFromPercentage, getPercentageFromState, onClose]);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        handleTouchMove({ touches: [e] } as unknown as React.TouchEvent);
      };

      const handleMouseUp = () => {
        handleTouchEnd();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      const handleTouchMoveDoc = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        handleTouchMove(e as unknown as React.TouchEvent);
      };

      const handleTouchEndDoc = () => {
        handleTouchEnd();
      };

      document.addEventListener('touchmove', handleTouchMoveDoc, { passive: false });
      document.addEventListener('touchend', handleTouchEndDoc);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMoveDoc);
        document.removeEventListener('touchend', handleTouchEndDoc);
      };
    }
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  if (!isOpen && translateY >= 100) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${className}`}
      style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
    >
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        style={{ opacity: (100 - translateY) / 100 * 0.5 }}
        onClick={onClose}
      />

      <div
        ref={containerRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${translateY}%)`,
          maxHeight: '90vh',
          pointerEvents: 'auto',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col h-full">
          <div className="flex-shrink-0 px-4 py-3 border-b">
            <div
              className="w-12 h-1 mx-auto bg-gray-300 rounded-full cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                const startY = e.clientY;
                const startTranslate = translateY;
                setIsDragging(true);

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const deltaY = moveEvent.clientY - startY;
                  const containerHeight = containerRef.current?.offsetHeight || 1;
                  const newTranslate = Math.max(25, Math.min(100, startTranslate + (deltaY / containerHeight) * 100));
                  setTranslateY(newTranslate);
                };

                const handleMouseUp = () => {
                  setIsDragging(false);
                  const newState = getStateFromPercentage(translateY);
                  setSheetState(newState);
                  setTranslateY(getPercentageFromState(newState));
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </div>

          {title && (
            <div className="flex-shrink-0 px-4 py-2 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomSheet;
