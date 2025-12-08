import React from 'react';
import type { Project, StageStatus } from './projectsData';
import StageItem from './StageItem';

interface ProjectPipelinePageProps {
  project: Project | null;
  onBack?: () => void;
  onProjectNameChange: (name: string) => void;
  onStageStatusChange: (stageId: string, status: StageStatus) => void;
  onStageNotesChange: (stageId: string, notes: string) => void;
  onAssignStage: (stageId: string) => void;
}

const deriveStatusBadge = (project: Project | null) => {
  if (!project) return { label: 'No project', className: 'badge neutral' };
  if (project.stages.some((stage) => stage.status === 'urgent')) {
    return { label: 'Needs attention', className: 'badge danger' };
  }
  if (project.stages.some((stage) => stage.status === 'blocked')) {
    return { label: 'Blocked', className: 'badge warning' };
  }
  if (project.stages.every((stage) => stage.status === 'completed')) {
    return { label: 'Complete', className: 'badge success' };
  }
  return { label: 'On track', className: 'badge info' };
};

const ProjectPipelinePage: React.FC<ProjectPipelinePageProps> = ({
  project,
  onBack,
  onProjectNameChange,
  onStageStatusChange,
  onStageNotesChange,
  onAssignStage,
}) => {
  if (!project) {
    return (
      <div className="pipeline-detail empty-state">
        <p>Select a project to see its stages.</p>
      </div>
    );
  }

  const completedCount = project.stages.filter((stage) => stage.status === 'completed').length;
  const progressPercent = Math.round((completedCount / project.stages.length) * 100);
  const badge = deriveStatusBadge(project);

  return (
    <div className="pipeline-detail">
      <div className="pipeline-detail__header">
        <div>
          <label className="project-name-input">
            <span>Project name</span>
            <input
              type="text"
              value={project.name}
              onChange={(event) => onProjectNameChange(event.target.value)}
            />
          </label>
          <div className="pipeline-progress">
            <div className="pipeline-progress__meta">
              <strong>
                {completedCount}/{project.stages.length}
              </strong>{' '}
              stages completed
            </div>
            <div className="pipeline-progress__bar">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="pipeline-header-actions">
          {onBack && (
            <button type="button" className="secondary-btn" onClick={onBack}>
              Back to projects
            </button>
          )}
          <span className={badge.className}>{badge.label}</span>
        </div>
      </div>

      <div className="stage-list">
        {project.stages.map((stage) => (
          <StageItem
            key={stage.id}
            stage={stage}
            onStatusChange={(status) => onStageStatusChange(stage.id, status)}
            onNotesChange={(notes) => onStageNotesChange(stage.id, notes)}
            onAssign={() => onAssignStage(stage.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectPipelinePage;


