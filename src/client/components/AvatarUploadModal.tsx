import React, { useState, useCallback, useRef } from 'react';
import { AvatarCropEditor } from './AvatarCropEditor';
import { processImage, validateImageFile } from '../utils/imageProcessing';
import { uploadAvatar } from '../api/avatarApi';
import { useToast } from './ui/toast';
import type { Area } from 'react-easy-crop';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (avatarUrl: string) => void;
}

/**
 * Avatar Upload Modal - Complete upload flow with drag-drop and crop
 * Features:
 * - Drag and drop file upload
 * - Click to browse files
 * - Interactive crop/zoom editor
 * - Client-side image processing
 * - Upload progress and error handling
 */
export function AvatarUploadModal({ isOpen, onClose, onSuccess }: AvatarUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  /**
   * Handles file selection (from input or drag-drop)
   */
  const handleFileSelect = useCallback((file: File) => {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Read file as data URL for preview
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  /**
   * Handles the upload process:
   * 1. Process image (crop + compress)
   * 2. Upload to Supabase Storage
   * 3. Update profile in database
   */
  const handleUpload = async () => {
    if (!selectedFile || !cropPixels) return;

    setUploading(true);
    setError(null);

    try {
      // Step 1: Process image (crop and compress)
      const processed = await processImage(selectedFile, {
        x: cropPixels.x,
        y: cropPixels.y,
        width: cropPixels.width,
        height: cropPixels.height,
      });

      // Step 2: Upload to Supabase
      const result = await uploadAvatar(processed);

      if (result.success && result.avatarUrl) {
        showToast('Profile picture updated!', 'success');
        onSuccess(result.avatarUrl);
        handleClose();
      } else {
        setError(result.error || 'Upload failed');
        showToast(result.error || 'Upload failed', 'error');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
      showToast('Failed to upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Resets modal state and closes
   */
  const handleClose = () => {
    setSelectedFile(null);
    setImageSrc(null);
    setCropPixels(null);
    setError(null);
    setDragActive(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: 32,
          maxWidth: 600,
          width: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#0c0c0c' }}>
          Upload Profile Picture
        </h2>
        <p style={{ fontSize: 14, color: '#7c7c7c', marginBottom: 24 }}>
          Upload a photo and adjust the crop area
        </p>

        {/* File Selection or Crop Editor */}
        {!imageSrc ? (
          // Drag-drop zone
          <div
            style={{
              border: dragActive ? '2px solid #0c0c0c' : '2px dashed #e3e3e3',
              borderRadius: 16,
              padding: 48,
              textAlign: 'center',
              background: dragActive ? '#f5f5f5' : '#fafafa',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelect(file);
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#0c0c0c' }}>
              Click to upload or drag and drop
            </p>
            <p style={{ fontSize: 14, color: '#7c7c7c', margin: 0 }}>
              JPG, PNG, WebP or GIF (max 5MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              style={{ display: 'none' }}
              aria-label="Upload image file"
            />
          </div>
        ) : (
          // Crop editor
          <>
            <AvatarCropEditor
              imageSrc={imageSrc}
              onCropComplete={(_, pixels) => setCropPixels(pixels)}
            />
            <button
              onClick={() => {
                setImageSrc(null);
                setSelectedFile(null);
                setCropPixels(null);
              }}
              style={{
                marginTop: 16,
                width: '100%',
                padding: 12,
                borderRadius: 999,
                border: '1px solid #e3e3e3',
                background: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
                color: '#0c0c0c',
              }}
            >
              Choose Different Photo
            </button>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 999,
            background: '#fee2e2',
            color: '#b91c1c',
            fontSize: 13,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={handleClose}
            disabled={uploading}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 999,
              border: '1px solid #e3e3e3',
              background: '#fff',
              fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              color: '#0c0c0c',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!cropPixels || uploading}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 999,
              border: 'none',
              background: !cropPixels || uploading ? '#9ca3af' : '#0c0c0c',
              color: '#fff',
              fontWeight: 600,
              cursor: !cropPixels || uploading ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
