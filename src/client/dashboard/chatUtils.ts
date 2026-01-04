/**
 * Chat Utility Functions
 * Message grouping logic for Instagram-style chat interface
 */

type Message = {
  id: string;
  team_id: string;
  user_id: string;
  recipient_id: string | null;
  content: string;
  created_at: string;
  profile?: {
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type MessageGroup = {
  user_id: string;
  messages: Array<Message & { isFirstInGroup: boolean; isLastInGroup: boolean }>;
  timestamp: string;
};

export type GroupedByDate = {
  date: string;
  timestamp: string; // Keep original timestamp for date formatting
  groups: MessageGroup[];
};

/**
 * Groups consecutive messages from the same sender within a time window.
 * Instagram groups messages within 1 minute from the same sender.
 *
 * @param messages - Array of messages sorted by created_at ascending
 * @returns Array of message groups
 */
export function groupMessagesBySender(messages: Message[]): MessageGroup[] {
  if (messages.length === 0) return [];

  const groups: MessageGroup[] = [];
  const TIME_WINDOW_MS = 60000; // 1 minute

  let currentGroup: MessageGroup | null = null;

  messages.forEach((msg, index) => {
    const msgTime = new Date(msg.created_at).getTime();

    // Start a new group if:
    // 1. No current group exists
    // 2. Different sender
    // 3. Time gap exceeds window
    const shouldStartNewGroup =
      !currentGroup ||
      currentGroup.user_id !== msg.user_id ||
      (msgTime - new Date(currentGroup.timestamp).getTime() > TIME_WINDOW_MS);

    if (shouldStartNewGroup) {
      // Mark last message of previous group
      if (currentGroup && currentGroup.messages.length > 0) {
        currentGroup.messages[currentGroup.messages.length - 1].isLastInGroup = true;
      }

      // Start new group
      currentGroup = {
        user_id: msg.user_id,
        messages: [{ ...msg, isFirstInGroup: true, isLastInGroup: false }],
        timestamp: msg.created_at,
      };
      groups.push(currentGroup);
    } else {
      // Add to existing group
      currentGroup.messages.push({ ...msg, isFirstInGroup: false, isLastInGroup: false });
      currentGroup.timestamp = msg.created_at; // Update group timestamp
    }
  });

  // Mark last message of final group
  if (currentGroup && currentGroup.messages.length > 0) {
    currentGroup.messages[currentGroup.messages.length - 1].isLastInGroup = true;
  }

  return groups;
}

/**
 * Groups message groups by date for date separators.
 *
 * @param groups - Array of message groups
 * @returns Array grouped by date
 */
export function groupByDate(groups: MessageGroup[]): GroupedByDate[] {
  const dateGroups: GroupedByDate[] = [];
  const dateMap = new Map<string, { timestamp: string; groups: MessageGroup[] }>();

  groups.forEach((group) => {
    const date = new Date(group.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!dateMap.has(date)) {
      dateMap.set(date, { timestamp: group.timestamp, groups: [] });
    }
    dateMap.get(date)!.groups.push(group);
  });

  dateMap.forEach(({ timestamp, groups: groupsForDate }, date) => {
    dateGroups.push({ date, timestamp, groups: groupsForDate });
  });

  return dateGroups;
}

/**
 * Formats time in Instagram style (HH:MM AM/PM)
 */
export function formatInstagramTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Gets user initials for avatar
 */
export function getInitials(name: string): string {
  return (name || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Gets display name from profile cache
 */
export function getDisplayName(
  userId: string,
  profile: { full_name?: string | null; email?: string | null } | null
): string {
  return profile?.full_name || profile?.email || 'Unknown';
}
