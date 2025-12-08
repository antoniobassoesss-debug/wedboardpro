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
export declare const stageStatusOptions: {
    value: StageStatus;
    label: string;
}[];
export declare const mockProjects: Project[];
export declare const createEmptyProject: (name?: string) => Project;
//# sourceMappingURL=projectsData.d.ts.map