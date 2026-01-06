/**
 * MessageGroup Component
 * Renders a group of consecutive messages from the same sender (Instagram style)
 */
import React from 'react';
import type { MessageGroup as MessageGroupType } from './chatUtils';
import Message from './Message';

interface MessageGroupProps {
  group: MessageGroupType;
  isOwnMessage: boolean;
  profileCache: Record<string, { full_name?: string | null; email?: string | null; avatar_url?: string | null }>;
  authedDisplayName: string;
  isLastOwnMessageGroup?: boolean; // True if this group contains the last message sent by user
  isDirectMessage?: boolean; // True if this is a 1-on-1 conversation (hide sender names)
}

const MessageGroup: React.FC<MessageGroupProps> = ({
  group,
  isOwnMessage,
  profileCache,
  authedDisplayName,
  isLastOwnMessageGroup = false,
  isDirectMessage = false,
}) => {
  const cachedProfile = profileCache[group.user_id];
  const displayName = cachedProfile?.full_name || cachedProfile?.email || 'Unknown';
  const avatarUrl = cachedProfile?.avatar_url || null;

  return (
    <div className={`instagram-message-group ${isOwnMessage ? 'me' : 'them'}`}>
      {/* Profile picture only on first message, positioned at bottom of group */}
      {!isOwnMessage && (
        <div className="instagram-group-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} />
          ) : (
            <div className="instagram-avatar-initials">
              {(displayName || 'U')
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Messages container */}
      <div className="instagram-messages-container">
        {/* Sender name only on first message in group chats (hide in direct messages) */}
        {!isOwnMessage && !isDirectMessage && group.messages[0].isFirstInGroup && (
          <div className="instagram-sender-name">{displayName}</div>
        )}

        {/* All messages in group */}
        {group.messages.map((msg, index) => {
          // Only the last message of the last group should show checkmark
          const isLastMessage = isLastOwnMessageGroup && index === group.messages.length - 1;
          return (
            <Message
              key={msg.id}
              message={msg}
              isOwnMessage={isOwnMessage}
              isFirstInGroup={msg.isFirstInGroup}
              isLastInGroup={msg.isLastInGroup}
              showSenderName={false} // Already shown above group
              isLastOwnMessage={isLastMessage}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MessageGroup;
