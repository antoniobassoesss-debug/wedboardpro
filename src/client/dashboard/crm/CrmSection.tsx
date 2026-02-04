import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  getOrCreateDefaultPipeline,
  listStages,
  listDeals,
  createDeal,
  updateDealStage,
  getDealDetails,
  createActivity,
  updateNextAction,
  markDealAsLost,
  markDealAsWon,
  getCrmMetrics,
  formatCoupleNames,
  formatDealValue,
  formatWeddingDate,
  formatRelativeTime,
  isOverdue,
  CRM_VIEW_PRESETS,
  type CrmPipeline,
  type CrmStage,
  type CrmDealCard,
  type CrmDealDetails,
  type CrmActivity,
  type CrmMetrics,
  type CreateDealInput,
  type DealPriority,
  type ActivityType,
  type ListDealsFilters,
  type CrmViewPreset,
} from '../../api/crmApi';
import './crm.css';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

const PlusIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

// =====================
// New Deal Modal
// =====================
interface NewDealModalProps {
  isOpen: boolean;
  stages: CrmStage[];
  pipelineId: string;
  onClose: () => void;
  onSubmit: (input: CreateDealInput) => Promise<void>;
}

const NewDealModal: React.FC<NewDealModalProps> = ({ isOpen, stages, pipelineId, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [stageId, setStageId] = useState('');
  const [primaryFirstName, setPrimaryFirstName] = useState('');
  const [primaryLastName, setPrimaryLastName] = useState('');
  const [partnerFirstName, setPartnerFirstName] = useState('');
  const [partnerLastName, setPartnerLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [valueCents, setValueCents] = useState('');
  const [priority, setPriority] = useState<DealPriority>('medium');
  const [nextAction, setNextAction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && stages.length > 0 && !stageId) setStageId(stages[0].id);
  }, [isOpen, stages, stageId]);

  useEffect(() => {
    if (!isOpen) {
      setTitle(''); setStageId(''); setPrimaryFirstName(''); setPrimaryLastName('');
      setPartnerFirstName(''); setPartnerLastName(''); setEmail(''); setPhone('');
      setWeddingDate(''); setValueCents(''); setPriority('medium'); setNextAction('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !stageId) return;
    setSubmitting(true);
    try {
      await onSubmit({
        pipelineId, stageId, title: title.trim(),
        primaryFirstName: primaryFirstName.trim() || undefined,
        primaryLastName: primaryLastName.trim() || undefined,
        partnerFirstName: partnerFirstName.trim() || undefined,
        partnerLastName: partnerLastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        weddingDate: weddingDate || null,
        valueCents: valueCents ? Math.round(parseFloat(valueCents) * 100) : null,
        priority, nextAction: nextAction.trim() || null,
      });
      onClose();
    } finally { setSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-header">
          <h3>New Deal</h3>
          <button type="button" className="crm-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="crm-modal-body">
          <div className="crm-form-group">
            <label>Deal Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Smith Wedding" required />
          </div>
          <div className="crm-form-row">
            <div className="crm-form-group">
              <label>Stage *</label>
              <select value={stageId} onChange={(e) => setStageId(e.target.value)} required>
                {stages.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="crm-form-group">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as DealPriority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="crm-form-divider">Couple Details</div>
          <div className="crm-form-row">
            <div className="crm-form-group">
              <label>First Name</label>
              <input type="text" value={primaryFirstName} onChange={(e) => setPrimaryFirstName(e.target.value)} placeholder="Sofia" />
            </div>
            <div className="crm-form-group">
              <label>Last Name</label>
              <input type="text" value={primaryLastName} onChange={(e) => setPrimaryLastName(e.target.value)} placeholder="Rossi" />
            </div>
          </div>
          <div className="crm-form-row">
            <div className="crm-form-group">
              <label>Partner First Name</label>
              <input type="text" value={partnerFirstName} onChange={(e) => setPartnerFirstName(e.target.value)} placeholder="Marco" />
            </div>
            <div className="crm-form-group">
              <label>Partner Last Name</label>
              <input type="text" value={partnerLastName} onChange={(e) => setPartnerLastName(e.target.value)} placeholder="Bianchi" />
            </div>
          </div>
          <div className="crm-form-row">
            <div className="crm-form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="couple@email.com" />
            </div>
            <div className="crm-form-group">
              <label>Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 333 1234567" />
            </div>
          </div>
          <div className="crm-form-divider">Deal Details</div>
          <div className="crm-form-row">
            <div className="crm-form-group">
              <label>Wedding Date</label>
              <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
            </div>
            <div className="crm-form-group">
              <label>Value (€)</label>
              <input type="number" value={valueCents} onChange={(e) => setValueCents(e.target.value)} placeholder="8500" min="0" step="100" />
            </div>
          </div>
          <div className="crm-form-group">
            <label>Next Action</label>
            <input type="text" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="e.g. Schedule discovery call" />
          </div>
          <div className="crm-modal-footer">
            <button type="button" className="crm-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="crm-btn-primary" disabled={submitting || !title.trim()}>{submitting ? 'Creating…' : 'Create Deal'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================
// Context Menu
// =====================
interface ContextMenuProps { x: number; y: number; onClose: () => void; onLogActivity: () => void; onMarkLost: () => void; onMarkWon: () => void; }

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onLogActivity, onMarkLost, onMarkWon }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleEsc);
    return () => { window.removeEventListener('click', handleClick); window.removeEventListener('keydown', handleEsc); };
  }, [onClose]);

  return (
    <div className="crm-context-menu" style={{ top: y, left: x }} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onLogActivity}>Log activity</button>
      <button type="button" onClick={onMarkWon}>Mark as won</button>
      <button type="button" className="destructive" onClick={onMarkLost}>Mark as lost</button>
    </div>
  );
};

// =====================
// Deal Card
// =====================
interface DealCardProps {
  deal: CrmDealCard; stage: CrmStage | undefined; isDragging?: boolean;
  onDragStart: (e: React.DragEvent, dealId: string) => void; onDragEnd: (e: React.DragEvent) => void;
  onClick: (dealId: string) => void; onContextMenu: (e: React.MouseEvent, dealId: string) => void;
}

const DealCard: React.FC<DealCardProps> = ({ deal, stage, isDragging, onDragStart, onDragEnd, onClick, onContextMenu }) => {
  const priorityClass = `priority-${deal.priority}`;
  const overdue = isOverdue(deal.next_action_due_at);

  return (
    <div
      className={`crm-deal-card ${priorityClass} ${isDragging ? 'dragging' : ''} ${overdue ? 'overdue' : ''}`}
      draggable onDragStart={(e) => onDragStart(e, deal.id)} onDragEnd={onDragEnd}
      onClick={() => onClick(deal.id)} onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, deal.id); }}
    >
      <div className="crm-deal-card-header">
        <span className="crm-deal-couple">{deal.coupleNames}</span>
        <span className={`crm-deal-priority ${priorityClass}`}>{deal.priority}</span>
      </div>
      <div className="crm-deal-title">{deal.title}</div>
      <div className="crm-deal-meta">
        <span className="crm-deal-date">{formatWeddingDate(deal.wedding_date)}</span>
        <span className="crm-deal-value">{formatDealValue(deal.value_cents, deal.currency)}</span>
      </div>
      {deal.next_action && (
        <div className={`crm-deal-next-action ${overdue ? 'overdue' : ''}`}>
          <span className="crm-deal-next-label">Next:</span> {deal.next_action}
          {deal.next_action_due_at && (
            <span className="crm-deal-due-date">
              {overdue ? ' (Overdue)' : ` by ${new Date(deal.next_action_due_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// =====================
// Stage Column
// =====================
interface StageColumnProps {
  stage: CrmStage; deals: CrmDealCard[]; dragOverStageId: string | null; draggingDealId: string | null;
  onDragStart: (e: React.DragEvent, dealId: string) => void; onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void; onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onCardClick: (dealId: string) => void; onCardContextMenu: (e: React.MouseEvent, dealId: string) => void;
  isLoading?: boolean;
}

// =====================
// Focused Stage View (single-stage list)
// =====================
interface FocusedStageRowProps {
  deal: CrmDealCard;
  stage: CrmStage;
  nextStage: CrmStage | null;
  onClick: () => void;
  onMoveToNextStage: () => void;
  onMarkLost: () => void;
  onScheduleFollowUp: () => void;
}

const FocusedStageRow: React.FC<FocusedStageRowProps> = ({
  deal, stage, nextStage, onClick, onMoveToNextStage, onMarkLost, onScheduleFollowUp,
}) => {
  const overdue = isOverdue(deal.next_action_due_at);
  const priorityClass = `priority-${deal.priority}`;

  return (
    <div className={`crm-focused-row ${priorityClass} ${overdue ? 'overdue' : ''}`} onClick={onClick}>
      <div className="crm-focused-row-main">
        <div className="crm-focused-row-couple">
          <span className="crm-focused-couple-name">{deal.coupleNames}</span>
          <span className={`crm-focused-priority ${priorityClass}`}>{deal.priority}</span>
        </div>
        <div className="crm-focused-row-title">{deal.title}</div>
      </div>

      <div className="crm-focused-row-details">
        <div className="crm-focused-detail">
          <span className="crm-focused-label">Wedding</span>
          <span className="crm-focused-value">{formatWeddingDate(deal.wedding_date)}</span>
        </div>
        <div className="crm-focused-detail">
          <span className="crm-focused-label">Value</span>
          <span className="crm-focused-value">{formatDealValue(deal.value_cents, deal.currency)}</span>
        </div>
        <div className="crm-focused-detail">
          <span className="crm-focused-label">Next Action</span>
          <span className={`crm-focused-value ${overdue ? 'overdue' : ''}`}>
            {deal.next_action || '—'}
            {deal.next_action_due_at && (
              <span className="crm-focused-due">
                {overdue ? ' (Overdue)' : ` by ${new Date(deal.next_action_due_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
              </span>
            )}
          </span>
        </div>
        <div className="crm-focused-detail">
          <span className="crm-focused-label">Contact</span>
          <span className="crm-focused-value">
            {deal.contact?.email || deal.contact?.phone || '—'}
          </span>
        </div>
      </div>

      <div className="crm-focused-row-actions" onClick={(e) => e.stopPropagation()}>
        {nextStage && (
          <button type="button" className="crm-focused-action-btn primary" onClick={onMoveToNextStage} title={`Move to ${nextStage.name}`}>
            → {nextStage.name}
          </button>
        )}
        <button type="button" className="crm-focused-action-btn" onClick={onScheduleFollowUp} title="Schedule follow-up">
          📅
        </button>
        <button type="button" className="crm-focused-action-btn" onClick={onClick} title="Open details">
          📋
        </button>
        <button type="button" className="crm-focused-action-btn destructive" onClick={onMarkLost} title="Mark as lost">
          ✕
        </button>
      </div>
    </div>
  );
};

interface FocusedStageViewProps {
  stage: CrmStage;
  deals: CrmDealCard[];
  stages: CrmStage[];
  isLoading: boolean;
  onCardClick: (dealId: string) => void;
  onMoveToNextStage: (dealId: string, nextStageId: string) => void;
  onMarkLost: (dealId: string) => void;
  onScheduleFollowUp: (dealId: string) => void;
  onResetToAllStages: () => void;
  sortBy: 'value' | 'wedding_date' | 'created_at';
  onSortChange: (sort: 'value' | 'wedding_date' | 'created_at') => void;
}

const FocusedStageView: React.FC<FocusedStageViewProps> = ({
  stage, deals, stages, isLoading, onCardClick, onMoveToNextStage, onMarkLost, onScheduleFollowUp, onResetToAllStages, sortBy, onSortChange,
}) => {
  const stageIndex = stages.findIndex((s) => s.id === stage.id);
  const nextStage = stageIndex >= 0 && stageIndex < stages.length - 1 ? stages[stageIndex + 1] : null;

  const totalValue = deals.reduce((sum, d) => sum + (d.value_cents || 0), 0);

  // Sort deals
  const sortedDeals = useMemo(() => {
    const sorted = [...deals];
    if (sortBy === 'value') sorted.sort((a, b) => (b.value_cents || 0) - (a.value_cents || 0));
    else if (sortBy === 'wedding_date') sorted.sort((a, b) => {
      if (!a.wedding_date) return 1;
      if (!b.wedding_date) return -1;
      return new Date(a.wedding_date).getTime() - new Date(b.wedding_date).getTime();
    });
    else if (sortBy === 'created_at') sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted;
  }, [deals, sortBy]);

  return (
    <div className="crm-focused-container">
      {/* Focused Header */}
      <div className="crm-focused-header">
        <div className="crm-focused-header-left">
          <div className="crm-focused-stage-badge" style={{ backgroundColor: stage.color || '#94a3b8' }}>
            {stage.name}
          </div>
          <h2 className="crm-focused-title">Focused View</h2>
        </div>
        <div className="crm-focused-header-right">
          <button type="button" className="crm-focused-back-btn" onClick={onResetToAllStages}>
            ← Back to all stages
          </button>
        </div>
      </div>

      {/* Focused Metrics */}
      <div className="crm-focused-metrics">
        <div className="crm-focused-metric">
          <span className="crm-focused-metric-value">{deals.length}</span>
          <span className="crm-focused-metric-label">deals in {stage.name.toLowerCase()}</span>
        </div>
        <div className="crm-focused-metric">
          <span className="crm-focused-metric-value">{formatDealValue(totalValue)}</span>
          <span className="crm-focused-metric-label">total value</span>
        </div>
      </div>

      {/* Hint */}
      <div className="crm-focused-hint">
        You are viewing only deals in the "{stage.name}" stage. Switch back to All stages to see the full pipeline.
      </div>

      {/* Sort Controls */}
      <div className="crm-focused-controls">
        <span className="crm-focused-sort-label">Sort by:</span>
        <button type="button" className={`crm-focused-sort-btn ${sortBy === 'value' ? 'active' : ''}`} onClick={() => onSortChange('value')}>Value</button>
        <button type="button" className={`crm-focused-sort-btn ${sortBy === 'wedding_date' ? 'active' : ''}`} onClick={() => onSortChange('wedding_date')}>Wedding date</button>
        <button type="button" className={`crm-focused-sort-btn ${sortBy === 'created_at' ? 'active' : ''}`} onClick={() => onSortChange('created_at')}>Created</button>
      </div>

      {/* List */}
      <div className="crm-focused-list">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (<div key={i} className="crm-focused-row-skeleton" />))}
          </>
        ) : sortedDeals.length === 0 ? (
          <div className="crm-focused-empty">
            <p>No deals in this stage yet.</p>
          </div>
        ) : (
          sortedDeals.map((deal) => (
            <FocusedStageRow
              key={deal.id}
              deal={deal}
              stage={stage}
              nextStage={nextStage}
              onClick={() => onCardClick(deal.id)}
              onMoveToNextStage={() => nextStage && onMoveToNextStage(deal.id, nextStage.id)}
              onMarkLost={() => onMarkLost(deal.id)}
              onScheduleFollowUp={() => onScheduleFollowUp(deal.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const StageColumn: React.FC<StageColumnProps> = ({
  stage, deals, dragOverStageId, draggingDealId, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onCardClick, onCardContextMenu, isLoading,
}) => {
  const totalValue = deals.reduce((sum, d) => sum + (d.value_cents || 0), 0);
  const isDragOver = dragOverStageId === stage.id;

  return (
    <div className={`crm-stage-column ${isDragOver ? 'drag-over' : ''}`} onDragOver={(e) => onDragOver(e, stage.id)} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, stage.id)}>
      <div className="crm-stage-header" style={{ borderTopColor: stage.color || '#94a3b8' }}>
        <div className="crm-stage-name">{stage.name}</div>
        <div className="crm-stage-stats">
          <span className="crm-stage-count">{deals.length}</span>
          <span className="crm-stage-total">{formatDealValue(totalValue)}</span>
        </div>
      </div>
      <div className="crm-stage-body">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (<div key={i} className="crm-deal-card-skeleton" />))}
          </>
        ) : deals.length === 0 ? (
          <div className="crm-stage-empty">No deals yet</div>
        ) : (
          deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} stage={stage} isDragging={draggingDealId === deal.id}
              onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onCardClick} onContextMenu={onCardContextMenu} />
          ))
        )}
      </div>
    </div>
  );
};

// =====================
// Metrics Row
// =====================
interface MetricsRowProps { metrics: CrmMetrics | null; stages: CrmStage[]; isLoading: boolean; }

const MetricsRow: React.FC<MetricsRowProps> = ({ metrics, stages, isLoading }) => {
  if (isLoading || !metrics) {
    return (
      <div className="crm-metrics-row">
        <div className="crm-metric-card skeleton"><div className="crm-skeleton-text" /></div>
        <div className="crm-metric-card skeleton"><div className="crm-skeleton-text" /></div>
        <div className="crm-metric-card skeleton"><div className="crm-skeleton-text" /></div>
      </div>
    );
  }

  return (
    <div className="crm-metrics-row">
      <div className="crm-metric-card">
        <div className="crm-metric-value">{metrics.totalDeals}</div>
        <div className="crm-metric-label">Active Deals</div>
      </div>
      <div className="crm-metric-card">
        <div className="crm-metric-value">{formatDealValue(metrics.totalValueCents)}</div>
        <div className="crm-metric-label">Pipeline Value</div>
      </div>
      <div className="crm-metric-card wide">
        <div className="crm-metric-label">By Stage</div>
        <div className="crm-metric-stages">
          {metrics.byStage.map((s) => (
            <div key={s.stageId} className="crm-metric-stage-pill" style={{ backgroundColor: s.stageColor || '#94a3b8' }}>
              {s.stageName} <span className="crm-metric-stage-count">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =====================
// Filter Popover
// =====================
interface FilterPopoverProps {
  isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string;
}

const FilterPopover: React.FC<FilterPopoverProps> = ({ isOpen, onClose, children, title }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="crm-filter-popover" ref={ref}>
      <div className="crm-filter-popover-header">{title}</div>
      <div className="crm-filter-popover-body">{children}</div>
    </div>
  );
};

// =====================
// Deal Drawer (simplified - same as before)
// =====================
type DrawerTab = 'overview' | 'activities' | 'tasks' | 'files';

interface DealDrawerProps { dealId: string | null; onClose: () => void; onDealUpdated: () => void; stages: CrmStage[]; }

const DealDrawer: React.FC<DealDrawerProps> = ({ dealId, onClose, onDealUpdated, stages }) => {
  const [deal, setDeal] = useState<CrmDealDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [newActivityType, setNewActivityType] = useState<ActivityType>('note');
  const [newActivitySummary, setNewActivitySummary] = useState('');
  const [submittingActivity, setSubmittingActivity] = useState(false);
  const [editingNextAction, setEditingNextAction] = useState(false);
  const [nextActionText, setNextActionText] = useState('');
  const [nextActionDue, setNextActionDue] = useState('');

  useEffect(() => {
    if (!dealId) { setDeal(null); return; }
    const loadDeal = async () => {
      setLoading(true); setError(null);
      const { data, error: err } = await getDealDetails(dealId);
      if (err) setError(err);
      else if (data) { setDeal(data); setNextActionText(data.next_action || ''); setNextActionDue(data.next_action_due_at || ''); }
      setLoading(false);
    };
    loadDeal();
    setActiveTab('overview');
  }, [dealId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (dealId) { window.addEventListener('keydown', handleEsc); document.body.style.overflow = 'hidden'; }
    return () => { window.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [dealId, onClose]);

  const handleAddActivity = async () => {
    if (!deal || !newActivitySummary.trim()) return;
    setSubmittingActivity(true);
    const { data, error: err } = await createActivity({ dealId: deal.id, type: newActivityType, summary: newActivitySummary.trim() });
    if (err) alert(`Failed to add activity: ${err}`);
    else if (data) { setDeal((prev) => prev ? { ...prev, activities: [data, ...prev.activities] } : prev); setNewActivitySummary(''); }
    setSubmittingActivity(false);
  };

  const handleSaveNextAction = async () => {
    if (!deal) return;
    const { error: err } = await updateNextAction(deal.id, nextActionText || null, nextActionDue || null);
    if (err) alert(`Failed to update: ${err}`);
    else { setDeal((prev) => prev ? { ...prev, next_action: nextActionText, next_action_due_at: nextActionDue } : prev); setEditingNextAction(false); onDealUpdated(); }
  };

  const handleMarkLost = async () => { if (!deal) return; const reason = prompt('Reason for losing this deal (optional):'); const { error: err } = await markDealAsLost(deal.id, reason || undefined); if (err) alert(`Failed: ${err}`); else { onDealUpdated(); onClose(); } };
  const handleMarkWon = async () => { if (!deal) return; const { error: err } = await markDealAsWon(deal.id); if (err) alert(`Failed: ${err}`); else { onDealUpdated(); onClose(); } };
  const handleChangeStage = async (newStageId: string) => { if (!deal || newStageId === deal.stage_id) return; const { error: err } = await updateDealStage(deal.id, newStageId); if (err) alert(`Failed: ${err}`); else { setDeal((prev) => prev ? { ...prev, stage_id: newStageId, stage: stages.find((s) => s.id === newStageId) || null } : prev); onDealUpdated(); } };

  if (!dealId) return null;
  const currentStage = deal?.stage || stages.find((s) => s.id === deal?.stage_id);

  return (
    <div className="crm-drawer-backdrop" onClick={onClose}>
      <div className="crm-drawer" onClick={(e) => e.stopPropagation()}>
        {loading ? (<div className="crm-drawer-loading"><div className="crm-loading-spinner" /><span>Loading deal…</span></div>)
          : error ? (<div className="crm-drawer-error"><p>{error}</p><button type="button" onClick={onClose}>Close</button></div>)
          : deal ? (
          <>
            <div className="crm-drawer-header">
              <div className="crm-drawer-header-content">
                <h2 className="crm-drawer-title">{deal.title}</h2>
                <div className="crm-drawer-header-meta">
                  <span className="crm-drawer-couple">{deal.coupleNames}</span>
                  {currentStage && <span className="crm-drawer-stage-pill" style={{ backgroundColor: currentStage.color || '#94a3b8' }}>{currentStage.name}</span>}
                  <span className="crm-drawer-value">{formatDealValue(deal.value_cents, deal.currency)}</span>
                </div>
              </div>
              <button type="button" className="crm-drawer-close" onClick={onClose}>✕</button>
            </div>
            <div className="crm-drawer-tabs">
              <button type="button" className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
              <button type="button" className={activeTab === 'activities' ? 'active' : ''} onClick={() => setActiveTab('activities')}>Activities</button>
              <button type="button" className={activeTab === 'tasks' ? 'active' : ''} onClick={() => setActiveTab('tasks')}>Tasks</button>
              <button type="button" className={activeTab === 'files' ? 'active' : ''} onClick={() => setActiveTab('files')}>Files</button>
            </div>
            <div className="crm-drawer-body">
              {activeTab === 'overview' && (
                <div className="crm-drawer-overview">
                  <div className="crm-drawer-section">
                    <div className="crm-drawer-section-title">Contact</div>
                    {deal.contact ? (
                      <div className="crm-drawer-contact">
                        <div className="crm-drawer-contact-names">{deal.coupleNames}</div>
                        {deal.contact.email && <a href={`mailto:${deal.contact.email}`} className="crm-drawer-contact-email">{deal.contact.email}</a>}
                        {deal.contact.phone && <a href={`tel:${deal.contact.phone}`} className="crm-drawer-contact-phone">{deal.contact.phone}</a>}
                      </div>
                    ) : <p className="crm-drawer-empty-text">No contact linked</p>}
                  </div>
                  <div className="crm-drawer-section">
                    <div className="crm-drawer-section-title">Deal Details</div>
                    <div className="crm-drawer-info-grid">
                      <div className="crm-drawer-info-item"><span className="crm-drawer-label">Wedding Date</span><span className="crm-drawer-value-text">{formatWeddingDate(deal.wedding_date)}</span></div>
                      <div className="crm-drawer-info-item"><span className="crm-drawer-label">Value</span><span className="crm-drawer-value-text">{formatDealValue(deal.value_cents, deal.currency)}</span></div>
                      <div className="crm-drawer-info-item"><span className="crm-drawer-label">Priority</span><span className={`crm-drawer-priority priority-${deal.priority}`}>{deal.priority}</span></div>
                      <div className="crm-drawer-info-item"><span className="crm-drawer-label">Stage</span><select value={deal.stage_id} onChange={(e) => handleChangeStage(e.target.value)} className="crm-drawer-stage-select">{stages.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div>
                    </div>
                  </div>
                  <div className="crm-drawer-section">
                    <div className="crm-drawer-section-title">Next Step {!editingNextAction && <button type="button" className="crm-drawer-edit-btn" onClick={() => setEditingNextAction(true)}>Edit</button>}</div>
                    {editingNextAction ? (
                      <div className="crm-drawer-next-action-form">
                        <input type="text" value={nextActionText} onChange={(e) => setNextActionText(e.target.value)} placeholder="What's the next step?" />
                        <input type="date" value={nextActionDue} onChange={(e) => setNextActionDue(e.target.value)} />
                        <div className="crm-drawer-next-action-buttons"><button type="button" className="crm-btn-secondary" onClick={() => setEditingNextAction(false)}>Cancel</button><button type="button" className="crm-btn-primary" onClick={handleSaveNextAction}>Save</button></div>
                      </div>
                    ) : (
                      <div className={`crm-drawer-next-action-display ${isOverdue(deal.next_action_due_at) ? 'overdue' : ''}`}>
                        {deal.next_action || 'No next step set'}
                        {deal.next_action_due_at && <span className="crm-drawer-next-due">Due: {new Date(deal.next_action_due_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      </div>
                    )}
                  </div>
                  <div className="crm-drawer-section">
                    <div className="crm-drawer-section-title">Recent Activity</div>
                    {deal.activities.length === 0 ? <p className="crm-drawer-empty-text">No activities yet</p> : (
                      <div className="crm-drawer-activity-list">
                        {deal.activities.slice(0, 5).map((act) => (<div key={act.id} className="crm-drawer-activity-item"><span className="crm-drawer-activity-type">{act.type}</span><span className="crm-drawer-activity-summary">{act.summary}</span><span className="crm-drawer-activity-time">{formatRelativeTime(act.happened_at)}</span></div>))}
                        {deal.activities.length > 5 && <button type="button" className="crm-drawer-view-all" onClick={() => setActiveTab('activities')}>View all {deal.activities.length} activities</button>}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'activities' && (
                <div className="crm-drawer-activities">
                  <div className="crm-drawer-add-activity">
                    <select value={newActivityType} onChange={(e) => setNewActivityType(e.target.value as ActivityType)}><option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option></select>
                    <textarea value={newActivitySummary} onChange={(e) => setNewActivitySummary(e.target.value)} placeholder="Add a note, log a call…" rows={3} />
                    <button type="button" className="crm-btn-primary" onClick={handleAddActivity} disabled={submittingActivity || !newActivitySummary.trim()}>{submittingActivity ? 'Adding…' : 'Add'}</button>
                  </div>
                  {deal.activities.length === 0 ? <p className="crm-drawer-empty-text">No activities logged yet</p> : (
                    <div className="crm-drawer-activity-feed">{deal.activities.map((act) => (<div key={act.id} className="crm-drawer-activity-card"><div className="crm-drawer-activity-card-header"><span className={`crm-drawer-activity-type-badge type-${act.type}`}>{act.type}</span><span className="crm-drawer-activity-timestamp">{formatRelativeTime(act.happened_at)}</span></div><p className="crm-drawer-activity-text">{act.summary}</p></div>))}</div>
                  )}
                </div>
              )}
              {activeTab === 'tasks' && (<div className="crm-drawer-tasks">{deal.tasks.length === 0 ? <p className="crm-drawer-empty-text">No tasks linked to this deal</p> : (<div className="crm-drawer-task-list">{deal.tasks.map((task) => (<div key={task.id} className={`crm-drawer-task-item ${task.status === 'done' ? 'done' : ''}`}><input type="checkbox" checked={task.status === 'done'} readOnly /><span className="crm-drawer-task-title">{task.title}</span>{task.due_date && <span className="crm-drawer-task-due">{new Date(task.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>}</div>))}</div>)}</div>)}
              {activeTab === 'files' && (<div className="crm-drawer-files">{deal.files.length === 0 ? <p className="crm-drawer-empty-text">No files attached to this deal</p> : (<div className="crm-drawer-file-list">{deal.files.map((file) => (<div key={file.id} className="crm-drawer-file-item"><span className="crm-drawer-file-icon">📄</span><span className="crm-drawer-file-name">{file.file_name}</span><span className="crm-drawer-file-size">{file.size_bytes ? `${Math.round(file.size_bytes / 1024)} KB` : ''}</span></div>))}</div>)}</div>)}
            </div>
            <div className="crm-drawer-footer"><button type="button" className="crm-btn-secondary" onClick={handleMarkWon}>Mark as Won</button><button type="button" className="crm-btn-destructive" onClick={handleMarkLost}>Mark as Lost</button></div>
          </>
        ) : null}
      </div>
    </div>
  );
};

// =====================
// Main CRM Section
// =====================
export default function CrmSection() {
  const isMobile = useIsMobile();
  const [pipeline, setPipeline] = useState<CrmPipeline | null>(null);
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [deals, setDeals] = useState<CrmDealCard[]>([]);
  const [metrics, setMetrics] = useState<CrmMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStageIds, setFilterStageIds] = useState<string[]>([]);
  const [filterOwnerId, setFilterOwnerId] = useState<string>('');
  const [filterMinValue, setFilterMinValue] = useState<string>('');
  const [filterMaxValue, setFilterMaxValue] = useState<string>('');
  const [filterWeddingFrom, setFilterWeddingFrom] = useState<string>('');
  const [filterWeddingTo, setFilterWeddingTo] = useState<string>('');
  const [activeView, setActiveView] = useState<CrmViewPreset>('all');

  // Filter popovers
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [valuePopoverOpen, setValuePopoverOpen] = useState(false);

  // Drag state
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; dealId: string } | null>(null);

  // Focused view sort
  const [focusedSortBy, setFocusedSortBy] = useState<'value' | 'wedding_date' | 'created_at'>('value');

  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  // Build filters object
  const filters = useMemo<ListDealsFilters>(() => ({
    searchQuery: debouncedSearch || undefined,
    stageIds: filterStageIds.length > 0 ? filterStageIds : undefined,
    ownerId: filterOwnerId || undefined,
    minValue: filterMinValue ? parseFloat(filterMinValue) * 100 : undefined,
    maxValue: filterMaxValue ? parseFloat(filterMaxValue) * 100 : undefined,
    weddingDateFrom: filterWeddingFrom || undefined,
    weddingDateTo: filterWeddingTo || undefined,
  }), [debouncedSearch, filterStageIds, filterOwnerId, filterMinValue, filterMaxValue, filterWeddingFrom, filterWeddingTo]);

  const hasActiveFilters = debouncedSearch || filterStageIds.length > 0 || filterOwnerId || filterMinValue || filterMaxValue || filterWeddingFrom || filterWeddingTo;

  const loadData = useCallback(async (filtersToUse: ListDealsFilters = {}) => {
    setLoading(true); setMetricsLoading(true); setError(null);

    const { data: pipelineData, error: pipelineErr } = await getOrCreateDefaultPipeline();
    if (pipelineErr || !pipelineData) { setError(pipelineErr || 'Failed to load pipeline'); setLoading(false); setMetricsLoading(false); return; }
    setPipeline(pipelineData);

    const { data: stagesData, error: stagesErr } = await listStages(pipelineData.id);
    if (stagesErr) { setError(stagesErr); setLoading(false); setMetricsLoading(false); return; }
    setStages(stagesData || []);

    // Load deals and metrics in parallel
    const [dealsRes, metricsRes] = await Promise.all([
      listDeals(pipelineData.id, filtersToUse),
      getCrmMetrics(pipelineData.id, filtersToUse),
    ]);

    if (dealsRes.error) setError(dealsRes.error);
    else setDeals(dealsRes.data || []);

    if (metricsRes.data) setMetrics(metricsRes.data);

    setLoading(false);
    setMetricsLoading(false);
  }, []);

  // Initial load
  useEffect(() => { loadData(); }, [loadData]);

  // Reload when filters change
  useEffect(() => {
    if (pipeline) {
      setLoading(true); setMetricsLoading(true);
      Promise.all([
        listDeals(pipeline.id, filters),
        getCrmMetrics(pipeline.id, filters),
      ]).then(([dealsRes, metricsRes]) => {
        if (!dealsRes.error) setDeals(dealsRes.data || []);
        if (metricsRes.data) setMetrics(metricsRes.data);
        setLoading(false); setMetricsLoading(false);
      });
    }
  }, [pipeline, filters]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, CrmDealCard[]> = {};
    stages.forEach((s) => { map[s.id] = []; });
    deals.forEach((deal) => { if (map[deal.stage_id]) map[deal.stage_id].push(deal); });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return map;
  }, [stages, deals]);

  const handleCreateDeal = async (input: CreateDealInput) => {
    const { data, error: err } = await createDeal(input);
    if (err) { alert(`Failed to create deal: ${err}`); return; }
    if (data) setDeals((prev) => [...prev, data]);
  };

  const handleResetFilters = () => {
    setSearchQuery(''); setFilterStageIds([]); setFilterOwnerId('');
    setFilterMinValue(''); setFilterMaxValue(''); setFilterWeddingFrom(''); setFilterWeddingTo('');
    setActiveView('all');
  };

  const handleViewChange = (viewId: CrmViewPreset) => {
    setActiveView(viewId);
    const preset = CRM_VIEW_PRESETS.find((v) => v.id === viewId);
    if (!preset) return;
    // Reset all filters first
    setSearchQuery(''); setFilterStageIds([]); setFilterOwnerId('');
    setFilterMinValue(''); setFilterMaxValue(''); setFilterWeddingFrom(''); setFilterWeddingTo('');
    // Apply preset filters
    if (preset.filters.minValue) setFilterMinValue(String(preset.filters.minValue / 100));
    if (preset.filters.weddingDateFrom) setFilterWeddingFrom(preset.filters.weddingDateFrom);
    if (preset.filters.weddingDateTo) setFilterWeddingTo(preset.filters.weddingDateTo);
    // 'my_deals' would need current user ID - could be set here if available
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => { setDraggingDealId(dealId); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dealId); };
  const handleDragEnd = () => { setDraggingDealId(null); setDragOverStageId(null); };
  const handleDragOver = (e: React.DragEvent, stageId: string) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStageId(stageId); };
  const handleDragLeave = () => { setDragOverStageId(null); };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain');
    setDragOverStageId(null); setDraggingDealId(null);
    if (!dealId) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === stageId) return;
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: stageId } : d)));
    const { error: err } = await updateDealStage(dealId, stageId);
    if (err) { setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: deal.stage_id } : d))); alert(`Failed to update deal: ${err}`); }
  };

  const handleCardClick = (dealId: string) => { setSelectedDealId(dealId); };
  const handleCardContextMenu = (e: React.MouseEvent, dealId: string) => { setContextMenu({ x: e.clientX, y: e.clientY, dealId }); };
  const handleContextLogActivity = () => { if (contextMenu) setSelectedDealId(contextMenu.dealId); setContextMenu(null); };
  const handleContextMarkLost = async () => { if (!contextMenu) return; const reason = prompt('Reason for losing this deal (optional):'); await markDealAsLost(contextMenu.dealId, reason || undefined); loadData(filters); setContextMenu(null); };
  const handleContextMarkWon = async () => { if (!contextMenu) return; await markDealAsWon(contextMenu.dealId); loadData(filters); setContextMenu(null); };

  // Focused view handlers
  const handleFocusedMoveToNextStage = async (dealId: string, nextStageId: string) => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: nextStageId } : d)));
    const { error: err } = await updateDealStage(dealId, nextStageId);
    if (err) { loadData(filters); alert(`Failed to update deal: ${err}`); }
  };

  const handleFocusedMarkLost = async (dealId: string) => {
    const reason = prompt('Reason for losing this deal (optional):');
    await markDealAsLost(dealId, reason || undefined);
    loadData(filters);
  };

  const handleFocusedScheduleFollowUp = (dealId: string) => {
    setSelectedDealId(dealId);
  };

  // Determine if we're in focused mode (single stage selected)
  const isFocusedMode = filterStageIds.length === 1;
  const focusedStage = isFocusedMode ? stages.find((s) => s.id === filterStageIds[0]) : null;
  const focusedDeals = focusedStage ? dealsByStage[focusedStage.id] || [] : [];

  const isEmpty = deals.length === 0 && !loading && !error && !hasActiveFilters;

  return (
    <div className="crm-container">
      {/* Header */}
      <div className="crm-header">
        <div className="crm-header-right">
          <select 
            className="crm-view-select" 
            value={activeView} 
            onChange={(e) => handleViewChange(e.target.value as CrmViewPreset)}
            style={{
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              padding: '9px 36px 9px 16px',
              fontSize: 14,
              fontWeight: 500,
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 150ms ease',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '16px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#0f172a';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {CRM_VIEW_PRESETS.map((v) => (<option key={v.id} value={v.id}>{v.label}</option>))}
          </select>
          <button type="button" className="crm-new-deal-btn" onClick={() => setIsNewDealOpen(true)}>+ New deal</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="crm-toolbar">
        <input type="text" className="crm-search" placeholder="Search by couple, email, or location…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        
        <select 
          className="crm-filter-select" 
          value={filterStageIds.length === 1 ? filterStageIds[0] : ''} 
          onChange={(e) => setFilterStageIds(e.target.value ? [e.target.value] : [])}
          style={{
            borderRadius: 999,
            border: '1px solid #e5e7eb',
            padding: '9px 36px 9px 16px',
            fontSize: 14,
            fontWeight: 500,
            background: '#ffffff',
            color: '#0f172a',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 150ms ease',
            appearance: 'none',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            backgroundSize: '16px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#0f172a';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.08)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <option value="">All stages</option>
          {stages.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>

        <div className="crm-filter-wrapper">
          <button type="button" className={`crm-filter-btn ${filterWeddingFrom || filterWeddingTo ? 'active' : ''}`} onClick={() => setDatePopoverOpen(!datePopoverOpen)}>
            Date range {(filterWeddingFrom || filterWeddingTo) && '•'}
          </button>
          <FilterPopover isOpen={datePopoverOpen} onClose={() => setDatePopoverOpen(false)} title="Date Range">
            <div className="crm-filter-date-fields">
              <label>From<input type="date" value={filterWeddingFrom} onChange={(e) => setFilterWeddingFrom(e.target.value)} /></label>
              <label>To<input type="date" value={filterWeddingTo} onChange={(e) => setFilterWeddingTo(e.target.value)} /></label>
            </div>
          </FilterPopover>
        </div>

        <div className="crm-filter-wrapper">
          <button type="button" className={`crm-filter-btn ${filterMinValue || filterMaxValue ? 'active' : ''}`} onClick={() => setValuePopoverOpen(!valuePopoverOpen)}>
            Value {(filterMinValue || filterMaxValue) && '•'}
          </button>
          <FilterPopover isOpen={valuePopoverOpen} onClose={() => setValuePopoverOpen(false)} title="Value Range">
            <div className="crm-filter-value-fields">
              <label>Min (€)<input type="number" value={filterMinValue} onChange={(e) => setFilterMinValue(e.target.value)} placeholder="0" min="0" /></label>
              <label>Max (€)<input type="number" value={filterMaxValue} onChange={(e) => setFilterMaxValue(e.target.value)} placeholder="Any" min="0" /></label>
            </div>
          </FilterPopover>
        </div>

        {hasActiveFilters && (
          <button type="button" className="crm-reset-filters" onClick={handleResetFilters}>Reset filters</button>
        )}

        <span className="crm-deal-count">{deals.length} deals</span>
      </div>

      {/* Metrics Row (hidden in focused mode - focused view has its own metrics) */}
      {!isFocusedMode && <MetricsRow metrics={metrics} stages={stages} isLoading={metricsLoading} />}

      {/* Error */}
      {error && (<div className="crm-error"><p>{error}</p><button type="button" onClick={() => loadData(filters)}>Try again</button></div>)}

      {/* Empty State */}
      {isEmpty && (
        <div className="crm-empty-state">
          <div className="crm-empty-illustration">💍</div>
          <h2 className="crm-empty-title">No deals yet</h2>
          <p className="crm-empty-description">Start building your wedding pipeline. Create your first lead or deal to get started.</p>
          <button type="button" className="crm-empty-cta" onClick={() => setIsNewDealOpen(true)}>Create your first deal</button>
        </div>
      )}

      {/* No Results (with filters) */}
      {!isEmpty && deals.length === 0 && !loading && !error && hasActiveFilters && !isFocusedMode && (
        <div className="crm-no-results">
          <p>No deals match your current filters.</p>
          <button type="button" className="crm-reset-filters" onClick={handleResetFilters}>Reset filters</button>
        </div>
      )}

      {/* Focused Stage View (single stage selected) */}
      {isFocusedMode && focusedStage && !error && (
        <FocusedStageView
          stage={focusedStage}
          deals={focusedDeals}
          stages={stages}
          isLoading={loading}
          onCardClick={handleCardClick}
          onMoveToNextStage={handleFocusedMoveToNextStage}
          onMarkLost={handleFocusedMarkLost}
          onScheduleFollowUp={handleFocusedScheduleFollowUp}
          onResetToAllStages={handleResetFilters}
          sortBy={focusedSortBy}
          onSortChange={setFocusedSortBy}
        />
      )}

      {/* Kanban Board (all stages or no stage filter) */}
      {!isFocusedMode && !error && (isEmpty ? null : (
        <div className="crm-board">
          {stages.map((stage) => (
            <StageColumn key={stage.id} stage={stage} deals={dealsByStage[stage.id] || []} dragOverStageId={dragOverStageId} draggingDealId={draggingDealId}
              onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onCardClick={handleCardClick} onCardContextMenu={handleCardContextMenu} isLoading={loading} />
          ))}
        </div>
      ))}

      <NewDealModal isOpen={isNewDealOpen} stages={stages} pipelineId={pipeline?.id || ''} onClose={() => setIsNewDealOpen(false)} onSubmit={handleCreateDeal} />
      <DealDrawer dealId={selectedDealId} onClose={() => setSelectedDealId(null)} onDealUpdated={() => loadData(filters)} stages={stages} />
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} onLogActivity={handleContextLogActivity} onMarkLost={handleContextMarkLost} onMarkWon={handleContextMarkWon} />}
      {isMobile && !selectedDealId && (
        <button type="button" className="crm-fab" onClick={() => setIsNewDealOpen(true)} aria-label="Add new deal">
          <PlusIcon />
        </button>
      )}
    </div>
  );
}
