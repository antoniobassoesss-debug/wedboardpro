import React from 'react';
type EventSharingSectionProps = {
    currentUserId: string;
    visibility: 'private' | 'team' | 'custom';
    sharedUserIds: string[];
    onVisibilityChange: (visibility: 'private' | 'team' | 'custom') => void;
    onSharedUsersChange: (userIds: string[]) => void;
};
export declare const EventSharingSection: React.FC<EventSharingSectionProps>;
export {};
//# sourceMappingURL=EventSharingSection.d.ts.map