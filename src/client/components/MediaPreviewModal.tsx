import React, { useState, useEffect } from 'react';
import type { MediaFile } from '../utils/mediaUpload';
import { generatePreview, formatFileSize, getFileIcon } from '../utils/mediaUpload';
import './MediaPreviewModal.css';

interface MediaPreviewModalProps {
  isOpen: boolean;
  files: MediaFile[];
  onSend: (files: MediaFile[]) => void;
  onCancel: () => void;
}

export function MediaPreviewModal({ isOpen, files, onSend, onCancel }: MediaPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [caption, setCaption] = useState('');

  const currentFile = files[currentIndex];

  // Generate previews for images/videos
  useEffect(() => {
    if (!isOpen || files.length === 0) return;

    files.forEach(async (mediaFile, index) => {
      if (mediaFile.type === 'image' || mediaFile.type === 'video') {
        try {
          const preview = await generatePreview(mediaFile.file);
          setPreviews(prev => ({ ...prev, [index]: preview }));
        } catch (err) {
          console.error('Preview generation failed:', err);
        }
      }
    });
  }, [isOpen, files]);

  if (!isOpen || !currentFile) return null;

  return (
    <div className="media-preview-modal">
      <div className="media-preview-backdrop" onClick={onCancel} />

      <div className="media-preview-container">
        {/* Header */}
        <div className="media-preview-header">
          <button className="media-preview-close" onClick={onCancel}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <span className="media-preview-counter">
            {currentIndex + 1} / {files.length}
          </span>
        </div>

        {/* Preview Area */}
        <div className="media-preview-content">
          {currentFile.type === 'image' && previews[currentIndex] && (
            <img src={previews[currentIndex]} alt={currentFile.file.name} />
          )}

          {currentFile.type === 'video' && previews[currentIndex] && (
            <video src={previews[currentIndex]} controls />
          )}

          {currentFile.type === 'document' && (
            <div className="media-preview-document">
              <div className="media-preview-doc-icon">{getFileIcon(currentFile.file.name)}</div>
              <div className="media-preview-doc-name">{currentFile.file.name}</div>
              <div className="media-preview-doc-size">{formatFileSize(currentFile.file.size)}</div>
            </div>
          )}

          {currentFile.type === 'audio' && (
            <div className="media-preview-audio">
              <div className="media-preview-audio-icon">🎵</div>
              <div className="media-preview-audio-name">{currentFile.file.name}</div>
              <div className="media-preview-audio-size">{formatFileSize(currentFile.file.size)}</div>
            </div>
          )}
        </div>

        {/* Navigation (if multiple files) */}
        {files.length > 1 && (
          <>
            <button
              className="media-preview-nav media-preview-nav-prev"
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              ‹
            </button>
            <button
              className="media-preview-nav media-preview-nav-next"
              onClick={() => setCurrentIndex(i => Math.min(files.length - 1, i + 1))}
              disabled={currentIndex === files.length - 1}
            >
              ›
            </button>
          </>
        )}

        {/* Caption Input */}
        <div className="media-preview-footer">
          <input
            type="text"
            className="media-preview-caption"
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            className="media-preview-send"
            onClick={() => {
              files.forEach(f => f.caption = caption);
              onSend(files);
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
