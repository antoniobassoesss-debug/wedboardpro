/**
 * DateSeparator Component
 * Shows date labels between messages from different days
 */
import React from 'react';

interface DateSeparatorProps {
  date: string; // Formatted date string
  timestamp?: string; // Optional ISO timestamp for Today/Yesterday check
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date, timestamp }) => {
  // Format date to show "Today", "Yesterday", or the actual date
  const formatDate = (): string => {
    if (!timestamp) return date;

    const today = new Date();
    const messageDate = new Date(timestamp);

    const isToday =
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear();

    if (isToday) return 'Today';

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isYesterday =
      messageDate.getDate() === yesterday.getDate() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'Yesterday';

    return date;
  };

  return (
    <div className="instagram-date-separator">
      <span>{formatDate()}</span>
    </div>
  );
};

export default DateSeparator;
