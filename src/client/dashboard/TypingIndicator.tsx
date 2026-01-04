/**
 * TypingIndicator Component
 * Shows animated dots when someone is typing
 */
import React from 'react';

interface TypingIndicatorProps {
  userName?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => {
  return (
    <div className="instagram-typing-indicator">
      <div className="instagram-typing-avatar">
        {userName
          ? userName
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          : '...'}
      </div>
      <div className="instagram-typing-bubble">
        <div className="instagram-typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
