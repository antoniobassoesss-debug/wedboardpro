/**
 * Floor Plan Import Wizard
 *
 * Multi-step wizard for importing floor plans:
 * Step 1: Upload file (drag & drop or browse)
 * Step 2: Calibrate scale (click two points, enter distance)
 * Step 3: Position & adjust (drag, resize, rotate, opacity)
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UploadStep } from './UploadStep';
import { ScaleCalibration } from './ScaleCalibration';
import { PositionAdjust } from './PositionAdjust';
import type { FloorPlanBackground } from '../../types/layout';
import { v4 as uuidv4 } from 'uuid';

interface Point {
  x: number;
  y: number;
}

interface WizardData {
  file: File | null;
  previewUrl: string | null;
  pixelsPerMeter: number;
  calibrationPoints: { point1: Point; point2: Point; distance: number } | null;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
  } | null;
}

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (floorPlan: FloorPlanBackground) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

type Step = 1 | 2 | 3;

interface StepIndicatorProps {
  number: Step;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  number,
  label,
  isActive,
  isCompleted,
}) => {
  return (
    <div className="flex items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isCompleted
            ? 'bg-green-500 text-white'
            : isActive
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {isCompleted ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          number
        )}
      </div>
      <span
        className={`ml-2 text-sm font-medium ${
          isActive ? 'text-gray-900' : isCompleted ? 'text-green-600' : 'text-gray-500'
        }`}
      >
        {label}
      </span>
    </div>
  );
};

const StepConnector: React.FC = () => {
  return (
    <div className="w-12 h-0.5 bg-gray-200 mx-2" />
  );
};

export const ImportWizard: React.FC<ImportWizardProps> = ({
  isOpen,
  onClose,
  onImport,
  canvasWidth = 800,
  canvasHeight = 600,
}) => {
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [wizardData, setWizardData] = useState<WizardData>({
    file: null,
    previewUrl: null,
    pixelsPerMeter: 100,
    calibrationPoints: null,
    position: null,
  });

  const handleClose = useCallback(() => {
    // Clean up preview URL
    if (wizardData.previewUrl) {
      URL.revokeObjectURL(wizardData.previewUrl);
    }
    setWizardData({
      file: null,
      previewUrl: null,
      pixelsPerMeter: 100,
      calibrationPoints: null,
      position: null,
    });
    setStep(1);
    setError(null);
    onClose();
  }, [wizardData, onClose]);

  const handleFileSelected = useCallback((file: File) => {
    setWizardData(prev => ({
      ...prev,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
  }, []);

  const handleContinueToCalibration = useCallback(() => {
    setStep(2);
  }, []);

  const handleCalibrate = useCallback((
    pixelsPerMeter: number,
    point1: Point,
    point2: Point,
    distance: number
  ) => {
    setWizardData(prev => ({
      ...prev,
      pixelsPerMeter,
      calibrationPoints: { point1, point2, distance },
    }));
    setStep(3);
  }, []);

  const handlePositionComplete = useCallback((positionData: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
  }) => {
    setWizardData(prev => ({
      ...prev,
      position: positionData,
    }));

    // Create the floor plan
    const floorPlan: FloorPlanBackground = {
      id: uuidv4(),
      imageUrl: wizardData.previewUrl || '',
      originalFilename: wizardData.file?.name || 'floor-plan',
      x: positionData.x / wizardData.pixelsPerMeter,
      y: positionData.y / wizardData.pixelsPerMeter,
      width: positionData.width,
      height: positionData.height,
      rotation: positionData.rotation,
      pixelsPerMeter: wizardData.pixelsPerMeter,
      opacity: positionData.opacity / 100,
      locked: false,
      visible: true,
      calibrationPoints: {
        point1: wizardData.calibrationPoints!.point1,
        point2: wizardData.calibrationPoints!.point2,
        distanceMeters: wizardData.calibrationPoints!.distance,
      },
    };

    onImport(floorPlan);
    handleClose();
  }, [wizardData, onImport, handleClose]);

  const handleBack = useCallback(() => {
    if (step === 2 && wizardData.previewUrl) {
      setStep(1);
    } else if (step === 3 && wizardData.calibrationPoints) {
      setStep(2);
    }
  }, [step, wizardData]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl overflow-hidden"
        style={{ width: '800px', maxHeight: '90vh' }}
      >
        {/* Header with steps */}
        <div className="flex items-center px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 mr-8">
            Import Floor Plan
          </h2>

          <div className="flex items-center flex-1">
            <StepIndicator
              number={1}
              label="Upload"
              isActive={step === 1}
              isCompleted={step > 1}
            />
            <StepConnector />
            <StepIndicator
              number={2}
              label="Set Scale"
              isActive={step === 2}
              isCompleted={step > 2}
            />
            <StepConnector />
            <StepIndicator
              number={3}
              label="Position"
              isActive={step === 3}
              isCompleted={false}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {step === 1 && !wizardData.previewUrl && (
            <UploadStep
              onFileSelected={handleFileSelected}
              onError={setError}
            />
          )}

          {step === 1 && wizardData.previewUrl && (
            <UploadStep
              onFileSelected={handleFileSelected}
              onError={setError}
              onContinue={handleContinueToCalibration}
            />
          )}

          {step === 2 && wizardData.previewUrl && (
            <ScaleCalibration
              imageUrl={wizardData.previewUrl}
              onCalibrate={handleCalibrate}
              onBack={handleBack}
            />
          )}

          {step === 3 && wizardData.previewUrl && wizardData.calibrationPoints && (
            <PositionAdjust
              imageUrl={wizardData.previewUrl}
              pixelsPerMeter={wizardData.pixelsPerMeter}
              onComplete={handlePositionComplete}
              onBack={handleBack}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            {step === 1 && (
              <span>Upload a floor plan image to get started</span>
            )}
            {step === 2 && (
              <span>Calibrate the scale by measuring a known distance</span>
            )}
            {step === 3 && (
              <span>Position and adjust the floor plan on your canvas</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default ImportWizard;
