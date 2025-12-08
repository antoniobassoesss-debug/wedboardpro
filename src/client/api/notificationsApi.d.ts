export interface Notification {
    id: string;
    user_id: string;
    type: 'task_assigned' | 'task_reassigned' | 'task_updated' | 'task_completed' | 'team_invitation' | 'other';
    title: string;
    message: string;
    related_entity_type: string | null;
    related_entity_id: string | null;
    is_read: boolean;
    created_at: string;
}
export declare function listNotifications(options?: {
    unread?: boolean;
    limit?: number;
}): Promise<{
    data: Notification[] | null;
    error: string | null;
}>;
export declare function markNotificationRead(id: string): Promise<{
    data: Notification | null;
    error: string | null;
}>;
export declare function markAllNotificationsRead(): Promise<{
    error: string | null;
}>;
export declare function getUnreadCount(): Promise<{
    count: number;
    error: string | null;
}>;
//# sourceMappingURL=notificationsApi.d.ts.map