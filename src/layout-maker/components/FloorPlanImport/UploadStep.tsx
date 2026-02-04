/**
 * Upload Step Component
 *
 * Step 1 of the floor plan import wizard:
 * - Drag and drop file upload
 * - Click to browse
 * - File validation (PDF, PNG, JPG, max 10MB)
 */

import React, { useState, useRef, useCallback } from 'react';
import type { FloorPlanBackground } from '../../types/layout';

interface UploadStepProps {
  onFileSelected: (file: File) => void;
  onError: (error: string) => void;
  onContinue?: () => void;
}

interface UploadedFile {
  file: File;
  previewUrl: string;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  onFileSelected,
  onError,
  onContinue,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      onError('Invalid file type. Please upload PDF, PNG, or JPG.');
      return false;
    }

    if (file.size > maxSize) {
      onError('File is too large. Maximum size is 10MB.');
      return false;
    }

    return true;
  };

  const processFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    clearInterval(progressInterval);
    setUploadProgress(100);

    setUploadedFile({ file, previewUrl });
    onFileSelected(file);

    setIsUploading(false);
  }, [onFileSelected, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    const file = files[0];
    if (files.length > 0 && file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files?.[0];
    if (files && files.length > 0 && file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClickToBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetUpload = useCallback(() => {
    if (uploadedFile?.previewUrl) {
      URL.revokeObjectURL(uploadedFile.previewUrl);
    }
    setUploadedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadedFile]);

  if (uploadedFile) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">File Uploaded</h3>
          <button
            onClick={resetUpload}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Remove
          </button>
        </div>

        <div className="relative rounded-lg overflow-hidden border" style={{ maxHeight: '300px' }}>
          <img
            src={uploadedFile.previewUrl}
            alt="Floor plan preview"
            className="w-full h-full object-contain"
            style={{ maxHeight: '300px' }}
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600 font-medium">Upload complete</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500">{uploadedFile.file.name}</span>
        </div>

        {onContinue && (
          <button
            onClick={onContinue}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Continue →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Upload Floor Plan</h3>
        <p className="text-sm text-gray-500">
          Upload an image or PDF of your venue floor plan
        </p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 mb-4 relative">
              <svg className="animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-2">Uploading...</p>
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop your floor plan here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse files
            </p>

            <button
              onClick={handleClickToBrowse}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              style={{ display: 'inline-block' }}
            >
              Select File
            </button>

            <p className="text-xs text-gray-400 mt-4">
              Supports PDF, PNG, JPG up to 10MB
            </p>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default UploadStep;
