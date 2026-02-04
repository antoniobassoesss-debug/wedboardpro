/**
 * Message Component
 * Individual message bubble with Instagram styling
 */
import React, { useState } from 'react';
import { formatInstagramTime } from './chatUtils';
import { MediaMessage } from '../components/MediaMessage';

interface MessageProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    media_type?: 'image' | 'video' | 'document' | 'audio';
    media_url?: string;
    media_filename?: string;
    media_size?: number;
    media_width?: number;
    media_height?: number;
    media_duration?: number;
    thumbnail_url?: string;
  };
  isOwnMessage: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showSenderName: boolean;
  isLastOwnMessage?: boolean; // Only the very last message sent by user
}

const Message: React.FC<MessageProps> = ({
  message,
  isOwnMessage,
  isFirstInGroup,
  isLastInGroup,
  showSenderName,
  isLastOwnMessage = false,
}) => {
  const [showTime, setShowTime] = useState(false);

  // Determine border radius based on position in group (Instagram style)
  // Border-radius order: top-left, top-right, bottom-right, bottom-left
  // Small radius (4px) on corners that connect to adjacent messages
  // Full radius (18px) on outer corners for aesthetic flow
  const getBorderRadius = () => {
    if (isOwnMessage) {
      // Sent messages (right-aligned)
      if (isFirstInGroup && isLastInGroup) {
        // Single message - all corners fully rounded
        return '18px';
      } else if (isFirstInGroup) {
        // First in group - small radius on bottom-right (connects to next)
        return '18px 18px 4px 18px';
      } else if (isLastInGroup) {
        // Last in group - small radius on top-right (connects to previous)
        return '18px 4px 18px 18px';
      } else {
        // Middle of group - small radius on both right corners (connects both ways)
        return '18px 4px 4px 18px';
      }
    } else {
      // Received messages (left-aligned)
      if (isFirstInGroup && isLastInGroup) {
        // Single message - all corners fully rounded
        return '18px';
      } else if (isFirstInGroup) {
        // First in group - small radius on bottom-left (connects to next)
        return '18px 18px 18px 4px';
      } else if (isLastInGroup) {
        // Last in group - small radius on top-left (connects to previous)
        return '4px 18px 18px 18px';
      } else {
        // Middle of group - small radius on both left corners (connects both ways)
        return '4px 18px 18px 4px';
      }
    }
  };

  return (
    <div className="instagram-message-wrapper">
      <div
        className={`instagram-bubble ${isOwnMessage ? 'me' : 'them'}`}
        style={{ borderRadius: getBorderRadius() }}
        onClick={() => setShowTime(!showTime)}
        onMouseEnter={() => setShowTime(true)}
        onMouseLeave={() => setShowTime(false)}
      >
        {/* Media content */}
        {message.media_type && message.media_url && (
          <MediaMessage
            type={message.media_type}
            url={message.media_url}
            filename={message.media_filename}
            fileSize={message.media_size}
            width={message.media_width}
            height={message.media_height}
            duration={message.media_duration}
            thumbnailUrl={message.thumbnail_url}
            onImageClick={() => {
              // Future: Open lightbox gallery
            }}
          />
        )}

        {/* Text content */}
        {message.content && (
          <div className="instagram-bubble-content">{message.content}</div>
        )}
      </div>

      {/* Timestamp shown on hover */}
      {showTime && (
        <div className={`instagram-timestamp ${isOwnMessage ? 'me' : 'them'}`}>
          {formatInstagramTime(message.created_at)}
        </div>
      )}

      {/* Status indicator for sent messages (only on very last sent message) */}
      {isOwnMessage && isLastOwnMessage && (
        <div className="instagram-status-indicator">
          {/* Double checkmark for "seen/read" */}
          <svg width="14" height="10" viewBox="0 0 16 12" fill="none">
            <path
              d="M5.5 8.5L2 5L0.5 6.5L5.5 11.5L15.5 1.5L14 0L5.5 8.5Z"
              fill="currentColor"
              opacity="0.6"
            />
            <path
              d="M10.5 8.5L7 5L5.5 6.5L10.5 11.5L20.5 1.5L19 0L10.5 8.5Z"
              fill="currentColor"
              opacity="0.6"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default Message;
