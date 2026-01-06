import React from 'react';
import { formatFileSize, formatDuration, getFileIcon } from '../utils/mediaUpload';
import './MediaMessage.css';

interface MediaMessageProps {
  type: 'image' | 'video' | 'document' | 'audio';
  url: string;
  filename?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
  onImageClick?: () => void;
}

export function MediaMessage(props: MediaMessageProps) {
  const { type, url, filename, fileSize, width, height, duration, thumbnailUrl, onImageClick } = props;

  if (type === 'image') {
    return (
      <div className="media-message media-message-image" onClick={onImageClick}>
        <img
          src={url}
          alt={filename || 'Image'}
          loading="lazy"
          style={{ maxWidth: '100%', borderRadius: '12px', cursor: 'pointer' }}
        />
        {fileSize && (
          <div className="media-message-size">{formatFileSize(fileSize)}</div>
        )}
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="media-message media-message-video">
        <video
          src={url}
          poster={thumbnailUrl}
          controls
          style={{ maxWidth: '100%', borderRadius: '12px' }}
        />
        {duration && (
          <div className="media-message-duration">{formatDuration(duration)}</div>
        )}
      </div>
    );
  }

  if (type === 'document') {
    return (
      <a
        href={url}
        download={filename}
        className="media-message media-message-document"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="media-message-doc-icon">{getFileIcon(filename || '')}</div>
        <div className="media-message-doc-info">
          <div className="media-message-doc-name">{filename || 'Document'}</div>
          {fileSize && <div className="media-message-doc-size">{formatFileSize(fileSize)}</div>}
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </a>
    );
  }

  if (type === 'audio') {
    return (
      <div className="media-message media-message-audio">
        <audio src={url} controls style={{ width: '100%' }} />
        {duration && <div className="media-message-duration">{formatDuration(duration)}</div>}
      </div>
    );
  }

  return null;
}
