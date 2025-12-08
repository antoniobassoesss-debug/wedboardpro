const makeId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 9);
};
export const exampleTasks = [
    {
        id: `task-${makeId()}`,
        title: 'Confirm florist palette',
        isCompleted: false,
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'high',
        isFlagged: true,
        notes: 'Ask about seasonal availability and alternatives.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: `task-${makeId()}`,
        title: 'Update seating chart',
        isCompleted: false,
        dueDate: null,
        priority: 'medium',
        isFlagged: false,
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: `task-${makeId()}`,
        title: 'Send AV requirements to vendor',
        isCompleted: true,
        dueDate: null,
        priority: 'low',
        isFlagged: false,
        notes: 'Attached spec sheet in project attachments.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];
export const createEmptyTask = (title = '') => {
    const now = new Date().toISOString();
    return {
        id: `task-${makeId()}`,
        title: title || 'New task',
        isCompleted: false,
        dueDate: null,
        priority: 'low',
        isFlagged: false,
        notes: '',
        createdAt: now,
        updatedAt: now,
    };
};
//# sourceMappingURL=todoData.js.map