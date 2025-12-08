export type StageStatus = 'not_started' | 'in_progress' | 'completed' | 'urgent' | 'blocked';

export interface Stage {
  id: string;
  name: string;
  status: StageStatus;
  notes: string;
  assignee?: string;
}

export interface Project {
  id: string;
  name: string;
  stages: Stage[];
  createdAt: string;
  updatedAt: string;
}

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

export const stageStatusOptions: { value: StageStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'blocked', label: 'Blocked' },
];

const buildStages = (overrides?: Partial<Record<string, StageStatus>>): Stage[] =>
  defaultStageNames.map((name, index) => {
    const normalizedId = name.toLowerCase().replace(/\s+/g, '-');
    const statusOverride = overrides?.[normalizedId];
    return {
      id: `${normalizedId}-${index}`,
      name,
      status: statusOverride ?? 'not_started',
      notes: '',
    };
  });

export const mockProjects: Project[] = [];

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export const createEmptyProject = (name?: string): Project => {
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

