const defaultStageNames = [
    'Discovery & Vision',
    'Layouts & Space Planning',
    'Quotes & Budget',
    'Vendor Sourcing',
    'Invitations & RSVPs',
    'Logistics & Timeline',
    'Final Month',
    'Wedding Day & Post Event',
];
export const stageStatusOptions = [
    { value: 'not_started', label: 'Not started' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'blocked', label: 'Blocked' },
];
const buildStages = (overrides) => defaultStageNames.map((name, index) => {
    const normalizedId = name.toLowerCase().replace(/\s+/g, '-');
    const statusOverride = overrides?.[normalizedId];
    return {
        id: `${normalizedId}-${index}`,
        name,
        status: statusOverride ?? 'not_started',
        notes: '',
    };
});
export const mockProjects = [];
const makeId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 10);
};
export const createEmptyProject = (name) => {
    const projectName = name?.trim() || `Untitled Project ${new Date().toLocaleDateString()}`;
    const timestamp = new Date().toISOString();
    return {
        id: `project-${makeId()}`,
        name: projectName,
        stages: buildStages(),
        createdAt: timestamp,
        updatedAt: timestamp,
    };
};
//# sourceMappingURL=projectsData.js.map