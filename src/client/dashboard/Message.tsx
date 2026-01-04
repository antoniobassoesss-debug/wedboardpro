/**
 * Message Component
 * Individual message bubble with Instagram styling
 */
import React, { useState } from 'react';
import { formatInstagramTime } from './chatUtils';

interface MessageProps {
  message: {
    id: string;
    content: string;
    created_at: string;
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

  // Determine border radius based on position in group
  // Border-radius order: top-left, top-right, bottom-right, bottom-left
  // Pointy corner (4px) always points outward toward the edge of the chat
  const getBorderRadius = () => {
    if (isOwnMessage) {
      // Sent messages (right side) - pointy corner on bottom-right
      if (isFirstInGroup && isLastInGroup) {
        // Single message - pointy on bottom-right only
        return '18px 18px 4px 18px';
      } else if (isFirstInGroup) {
        // First in group - rounded on bottom-right (connects to next)
        return '18px 18px 18px 4px';
      } else if (isLastInGroup) {
        // Last in group - pointy on bottom-right (outer edge)
        return '18px 18px 4px 18px';
      } else {
        // Middle of group - rounded on both right corners
        return '18px 18px 18px 4px';
      }
    } else {
      // Received messages (left side) - pointy corner on bottom-left
      if (isFirstInGroup && isLastInGroup) {
        // Single message - pointy on bottom-left only
        return '18px 18px 18px 4px';
      } else if (isFirstInGroup) {
        // First in group - rounded on bottom-left (connects to next)
        return '18px 4px 18px 18px';
      } else if (isLastInGroup) {
        // Last in group - pointy on bottom-left (outer edge)
        return '18px 4px 18px 4px';
      } else {
        // Middle of group - rounded on both left corners
        return '18px 4px 18px 18px';
      }
    }
  };

  return (
    <div className="instagram-message-wrapper">
      <div
        className={`instagram-bubble ${isOwnMessage ? 'me' : 'them'}`}
        style={{ borderRadius: getBorderRadius() }}
        onMouseEnter={() => setShowTime(true)}
        onMouseLeave={() => setShowTime(false)}
      >
        <div className="instagram-bubble-content">{message.content}</div>
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
