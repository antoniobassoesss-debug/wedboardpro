import React from 'react';
import type { Stage, StageStatus } from './projectsData';
import { stageStatusOptions } from './projectsData';

interface StageItemProps {
  stage: Stage;
  onStatusChange: (status: StageStatus) => void;
  onNotesChange: (notes: string) => void;
  onAssign: () => void;
}

const statusLabels: Record<StageStatus, { label: string; className: string }> = {
  not_started: { label: 'Not started', className: 'stage-status neutral' },
  in_progress: { label: 'In progress', className: 'stage-status info' },
  completed: { label: 'Completed', className: 'stage-status success' },
  urgent: { label: 'Urgent', className: 'stage-status danger' },
  blocked: { label: 'Blocked', className: 'stage-status warning' },
};

const StageItem: React.FC<StageItemProps> = ({ stage, onStatusChange, onNotesChange, onAssign }) => {
  const meta = statusLabels[stage.status];

  return (
    <div className={`stage-item ${stage.status === 'completed' ? 'completed' : ''}`}>
      <div className="stage-item__header">
        <div>
          <div className="stage-item__title">
            {stage.status === 'completed' ? <span className="stage-check">✓</span> : null}
            <strong>{stage.name}</strong>
          </div>
          <span className={meta.className}>{meta.label}</span>
        </div>
        <div className="stage-item__actions">
          <select
            value={stage.status}
            onChange={(event) => onStatusChange(event.target.value as StageStatus)}
          >
            {stageStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" className="stage-assign-btn" onClick={onAssign}>
            {stage.assignee ? `Assigned to ${stage.assignee}` : 'Assign'}
          </button>
        </div>
      </div>
      <div className="stage-item__notes">
        <label>
          <span>Notes</span>
          <textarea
            value={stage.notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Add notes, blockers, or context…"
            rows={3}
          />
        </label>
      </div>
    </div>
  );
};

export default StageItem;


