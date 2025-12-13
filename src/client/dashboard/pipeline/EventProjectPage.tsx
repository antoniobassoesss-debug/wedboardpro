import React, { useEffect, useMemo, useState } from 'react';
import type { EventWorkspace, PipelineStage, StageTask, Vendor, EventFile, Client } from '../../api/eventsPipelineApi';
import {
  fetchEventWorkspace,
  updateEvent,
  updateStageTask,
  updateVendor,
  createEventFile,
  createClient,
  updateClient,
} from '../../api/eventsPipelineApi';
import ProjectFilesSection from './files/ProjectFilesSection';

interface EventProjectPageProps {
  eventId: string;
}

type ActiveTab = 'pipeline' | 'tasks' | 'vendors' | 'files' | 'notes' | 'contacts';

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return 'No date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No date';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const countDoneTasksForStage = (stage: PipelineStage, tasks: StageTask[]) => {
  const stageTasks = tasks.filter((t) => t.stage_id === stage.id);
  if (stageTasks.length === 0) return { done: 0, total: 0 };
  const done = stageTasks.filter((t) => t.status === 'done').length;
  return { done, total: stageTasks.length };
};

const EventProjectPage: React.FC<EventProjectPageProps> = ({ eventId }) => {
  const [workspace, setWorkspace] = useState<EventWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pipeline');
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(new Set());
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newFileCategory, setNewFileCategory] = useState<EventFile['category']>('other');
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [clientForm, setClientForm] = useState({
    bride_name: '',
    groom_name: '',
    email: '',
    phone: '',
    address: '',
    communication_notes: '',
  });

  const loadWorkspace = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchEventWorkspace(eventId);
    if (err) {
      setError(err);
    } else if (data) {
      setWorkspace(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Populate client form when workspace loads
  useEffect(() => {
    if (workspace && workspace.client) {
      const c = workspace.client;
      setClientForm({
        bride_name: c.bride_name || '',
        groom_name: c.groom_name || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        communication_notes: c.communication_notes || '',
      });
    } else {
      setClientForm({
        bride_name: '',
        groom_name: '',
        email: '',
        phone: '',
        address: '',
        communication_notes: '',
      });
    }
  }, [workspace]);

  const event = workspace?.event ?? null;

  const overallProgress = useMemo(() => {
    if (!workspace || workspace.stages.length === 0) return 0;
    const sum = workspace.stages.reduce((acc, s) => acc + (s.progress_percent || 0), 0);
    return Math.round(sum / workspace.stages.length);
  }, [workspace]);

  const riskIndicators = useMemo(() => {
    if (!workspace || !event) {
      return {
        overBudget: false,
        overdueStages: 0,
        missingVendors: 0,
        upcomingTasks: [] as StageTask[],
      };
    }

    const planned = event.budget_planned ? Number(event.budget_planned) : NaN;
    const actual = event.budget_actual ? Number(event.budget_actual) : NaN;
    const overBudget = !Number.isNaN(planned) && !Number.isNaN(actual) && actual > planned;

    const today = new Date();
    const sevenDays = new Date();
    sevenDays.setDate(today.getDate() + 7);

    const overdueStages = workspace.stages.filter((stage) => {
      if (!stage.due_date || !stage.is_blocking) return false;
      const d = new Date(stage.due_date);
      return d < today && stage.progress_percent < 100;
    }).length;

    // Very simple heuristic: count categories without any vendor with contract_signed
    const criticalCategories: Array<Vendor['category']> = [
      'catering',
      'photography',
      'music',
      'decor',
      'flowers',
    ];
    const missingVendors = criticalCategories.filter((cat) =>
      !workspace.vendors.some((v) => v.category === cat && v.contract_status === 'contract_signed'),
    ).length;

    const upcomingTasks = workspace.tasks
      .filter((t) => t.due_date && t.status !== 'done')
      .filter((t) => {
        const d = new Date(t.due_date as string);
        return d >= today && d <= sevenDays;
      })
      .sort((a, b) => new Date(a.due_date as string).getTime() - new Date(b.due_date as string).getTime())
      .slice(0, 5);

    return {
      overBudget,
      overdueStages,
      missingVendors,
      upcomingTasks,
    };
  }, [workspace, event]);

  const handleToggleStage = (stageId: string) => {
    setExpandedStageIds((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  const handleToggleTaskStatus = async (task: StageTask) => {
    const nextStatus: StageTask['status'] = task.status === 'done' ? 'todo' : 'done';
    await updateStageTask(task.id, { status: nextStatus });
    await loadWorkspace();
  };

  const renderPipelineTab = () => {
    if (!workspace) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {workspace.stages
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map((stage) => {
            const { done, total } = countDoneTasksForStage(stage, workspace.tasks);
            const isExpanded = expandedStageIds.has(stage.id);
            const stageTasks = workspace.tasks.filter((t) => t.stage_id === stage.id);
            return (
              <div
                key={stage.id}
                style={{
                  borderRadius: 16,
                  border: '1px solid #e5e5e5',
                  padding: 14,
                  background: '#ffffff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleToggleStage(stage.id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{stage.title}</div>
                    {stage.description && (
                      <div style={{ fontSize: 12, color: '#6b7280', maxWidth: 420 }}>{stage.description}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {stage.due_date && (
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Due {formatDate(stage.due_date)}</div>
                    )}
                    <div style={{ minWidth: 120 }}>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 999,
                          background: '#e5e7eb',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${stage.progress_percent}%`,
                            height: '100%',
                            background:
                              stage.progress_percent === 100 ? '#22c55e' : stage.progress_percent > 0 ? '#0ea5e9' : '#e5e7eb',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                        {stage.progress_percent}% · {done}/{total} tasks
                      </div>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
                    {stageTasks.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>No tasks yet for this stage.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {stageTasks.map((task) => (
                          <div
                            key={task.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 13,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={task.status === 'done'}
                              onChange={() => handleToggleTaskStatus(task)}
                            />
                            <span
                              style={{
                                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                color: task.status === 'done' ? '#9ca3af' : '#111827',
                              }}
                            >
                              {task.title}
                            </span>
                            {task.due_date && (
                              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280' }}>
                                Due {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  };

  const renderTasksTab = () => {
    if (!workspace) return null;
    if (workspace.tasks.length === 0) {
      return <div style={{ fontSize: 13, color: '#6b7280' }}>No tasks yet for this event.</div>;
    }
    const tasks = workspace.tasks.slice().sort((a, b) => {
      if (a.due_date && b.due_date) {
        return new Date(a.due_date as string).getTime() - new Date(b.due_date as string).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map((task) => {
          const stage = workspace.stages.find((s) => s.id === task.stage_id);
          return (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                borderRadius: 10,
                border: '1px solid #e5e5e5',
                background: '#ffffff',
                fontSize: 13,
              }}
            >
              <input type="checkbox" checked={task.status === 'done'} onChange={() => handleToggleTaskStatus(task)} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 500,
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    color: task.status === 'done' ? '#9ca3af' : '#111827',
                  }}
                >
                  {task.title}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {stage ? stage.title : 'No stage'} · {task.priority}
                </div>
              </div>
              {task.due_date && (
                <div style={{ fontSize: 11, color: '#6b7280' }}>Due {formatDate(task.due_date)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderVendorsTab = () => {
    if (!workspace) return null;
    if (workspace.vendors.length === 0) {
      return <div style={{ fontSize: 13, color: '#6b7280' }}>No vendors added yet.</div>;
    }
    const byCategory = workspace.vendors.reduce<Record<string, Vendor[]>>((acc, v) => {
      if (!acc[v.category]) acc[v.category] = [];
      acc[v.category].push(v);
      return acc;
    }, {});
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(byCategory).map(([category, list]) => (
          <div key={category}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', marginBottom: 6 }}>
              {category}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 8,
                    borderRadius: 10,
                    border: '1px solid #e5e5e5',
                    background: '#ffffff',
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {v.contact_email || v.contact_phone || 'No contact info'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#6b7280', minWidth: 140 }}>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ marginRight: 4 }}>Contract:</span>
                      <select
                        value={v.contract_status}
                        onChange={async (e) => {
                          await updateVendor(v.id, { contract_status: e.target.value as Vendor['contract_status'] });
                          await loadWorkspace();
                        }}
                        style={{
                          fontSize: 11,
                          borderRadius: 999,
                          border: '1px solid #d1d5db',
                          padding: '2px 6px',
                          background: '#f9fafb',
                        }}
                      >
                        <option value="not_contacted">Not contacted</option>
                        <option value="in_negotiation">In negotiation</option>
                        <option value="contract_signed">Contract signed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      {v.quote_amount && <span>Quote {v.quote_amount}</span>}
                      {v.final_amount && <span>{v.quote_amount ? ' · ' : ''}Final {v.final_amount}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFilesTab = () => {
    if (!event) return null;
    return <ProjectFilesSection projectId={event.id} />;
  };

  const renderNotesTab = () => {
    if (!workspace || !event) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          value={event.notes_internal ?? ''}
          onChange={async (e) => {
            const value = e.target.value;
            setWorkspace((prev) =>
              prev
                ? {
                    ...prev,
                    event: { ...prev.event, notes_internal: value },
                  }
                : prev,
            );
            await updateEvent(event.id, { notes_internal: value });
          }}
          rows={10}
          style={{
            width: '100%',
            borderRadius: 12,
            border: '1px solid #e5e5e5',
            padding: 10,
            fontSize: 13,
            resize: 'vertical',
          }}
          placeholder="Internal planning notes, decisions, and context for this event."
        />
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          Notes are private to your team and never visible to the client.
        </div>
      </div>
    );
  };

  const renderContactsTab = () => {
    if (!workspace || !event) return null;
    const client = workspace.client;

    const handleSaveClient = async () => {
      if (!clientForm.bride_name.trim() || !clientForm.groom_name.trim() || !clientForm.email.trim() || !clientForm.phone.trim()) {
        // eslint-disable-next-line no-alert
        alert('Please fill in all required fields (Bride name, Groom name, Email, Phone)');
        return;
      }

      setIsSavingClient(true);
      try {
        if (client) {
          await updateClient(event.id, {
            bride_name: clientForm.bride_name.trim(),
            groom_name: clientForm.groom_name.trim(),
            email: clientForm.email.trim(),
            phone: clientForm.phone.trim(),
            address: clientForm.address.trim() || null,
            communication_notes: clientForm.communication_notes.trim() || null,
          });
        } else {
          await createClient(event.id, {
            bride_name: clientForm.bride_name.trim(),
            groom_name: clientForm.groom_name.trim(),
            email: clientForm.email.trim(),
            phone: clientForm.phone.trim(),
            address: clientForm.address.trim() || null,
            communication_notes: clientForm.communication_notes.trim() || null,
          });
        }
        await loadWorkspace();
      } catch (err: any) {
        // eslint-disable-next-line no-alert
        alert(`Failed to save client: ${err.message || err}`);
      } finally {
        setIsSavingClient(false);
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e5e5e5',
            padding: 20,
            background: '#ffffff',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>
            Client Contact Information
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Bride & Groom Names */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
                  Bride Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={clientForm.bride_name}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, bride_name: e.target.value }))}
                  placeholder="Bride's full name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 13,
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    background: '#fafafa',
                    color: '#111827',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.border = '1px solid #0f172a';
                    e.target.style.background = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #e5e5e5';
                    e.target.style.background = '#fafafa';
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
                  Groom Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={clientForm.groom_name}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, groom_name: e.target.value }))}
                  placeholder="Groom's full name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 13,
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    background: '#fafafa',
                    color: '#111827',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.border = '1px solid #0f172a';
                    e.target.style.background = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #e5e5e5';
                    e.target.style.background = '#fafafa';
                  }}
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
                  Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="client@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 13,
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    background: '#fafafa',
                    color: '#111827',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.border = '1px solid #0f172a';
                    e.target.style.background = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #e5e5e5';
                    e.target.style.background = '#fafafa';
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
                  Phone <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 13,
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    background: '#fafafa',
                    color: '#111827',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.border = '1px solid #0f172a';
                    e.target.style.background = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #e5e5e5';
                    e.target.style.background = '#fafafa';
                  }}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Address
              </label>
              <input
                type="text"
                value={clientForm.address}
                onChange={(e) => setClientForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Street address, city, state, zip"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 13,
                  border: '1px solid #e5e5e5',
                  borderRadius: 10,
                  background: '#fafafa',
                  color: '#111827',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid #0f172a';
                  e.target.style.background = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid #e5e5e5';
                  e.target.style.background = '#fafafa';
                }}
              />
            </div>

            {/* Communication Notes */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Communication Notes
              </label>
              <textarea
                value={clientForm.communication_notes}
                onChange={(e) => setClientForm((prev) => ({ ...prev, communication_notes: e.target.value }))}
                placeholder="Notes about preferred communication style, best times to contact, etc."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 13,
                  border: '1px solid #e5e5e5',
                  borderRadius: 10,
                  background: '#fafafa',
                  color: '#111827',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid #0f172a';
                  e.target.style.background = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid #e5e5e5';
                  e.target.style.background = '#fafafa';
                }}
              />
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                onClick={handleSaveClient}
                disabled={isSavingClient}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 999,
                  background: isSavingClient ? '#d1d5db' : '#0f172a',
                  color: '#ffffff',
                  cursor: isSavingClient ? 'not-allowed' : 'pointer',
                }}
              >
                {isSavingClient ? 'Saving…' : client ? 'Update Contact' : 'Save Contact'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !workspace) {
    return <div style={{ padding: 24 }}>Loading event workspace…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#b91c1c', fontSize: 14 }}>
        Failed to load event workspace: {error}
      </div>
    );
  }

  if (!workspace || !event) {
    return <div style={{ padding: 24, color: '#6b7280' }}>Select an event to get started.</div>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)',
        gap: 16,
      }}
    >
      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
        <div
          style={{
            borderRadius: 20,
            border: '1px solid #e5e5e5',
            padding: 16,
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Wedding event</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{event.title}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Wedding date: <span style={{ fontWeight: 500 }}>{formatDate(event.wedding_date)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  background:
                    event.status === 'on_track'
                      ? '#ecfdf3'
                      : event.status === 'at_risk'
                      ? '#fef3c7'
                      : event.status === 'delayed'
                      ? '#fee2e2'
                      : '#eff6ff',
                  color:
                    event.status === 'on_track'
                      ? '#166534'
                      : event.status === 'at_risk'
                      ? '#92400e'
                      : event.status === 'delayed'
                      ? '#991b1b'
                      : '#1d4ed8',
                }}
              >
                {event.status.replace('_', ' ')}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Current stage:{' '}
                <span style={{ fontWeight: 500 }}>
                  {event.current_stage || workspace.stages.find((s) => s.order_index === 1)?.title || 'Not set'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ minWidth: 160, alignSelf: 'center' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Overall progress</div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: '#e5e7eb',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${overallProgress}%`,
                  height: '100%',
                  background: overallProgress === 100 ? '#22c55e' : '#0ea5e9',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{overallProgress}% complete</div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            borderBottom: '1px solid #e5e5e5',
          }}
        >
          {[
            { id: 'pipeline', label: 'Pipeline' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'vendors', label: 'Vendors' },
            { id: 'files', label: 'Files' },
            { id: 'notes', label: 'Notes' },
            { id: 'contacts', label: 'Contacts' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '8px 10px',
                borderBottom: activeTab === tab.id ? '2px solid #0f172a' : '2px solid transparent',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? '#0f172a' : '#6b7280',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ paddingTop: 10 }}>
          {activeTab === 'pipeline' && renderPipelineTab()}
          {activeTab === 'tasks' && renderTasksTab()}
          {activeTab === 'vendors' && renderVendorsTab()}
          {activeTab === 'files' && renderFilesTab()}
          {activeTab === 'notes' && renderNotesTab()}
          {activeTab === 'contacts' && renderContactsTab()}
        </div>
      </div>

      {/* Right side: Risk & Status */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            borderRadius: 20,
            border: '1px solid #e5e5e5',
            padding: 14,
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Risk & Status</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Quick snapshot of budget, stages, vendors, and upcoming deadlines.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Budget</span>
              <span
                style={{
                  color: riskIndicators.overBudget ? '#b91c1c' : '#16a34a',
                  fontWeight: 500,
                }}
              >
                {riskIndicators.overBudget ? 'Over planned' : 'On track'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Overdue stages</span>
              <span style={{ fontWeight: 500 }}>{riskIndicators.overdueStages}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Critical vendors missing</span>
              <span style={{ fontWeight: 500 }}>{riskIndicators.missingVendors}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 20,
            border: '1px solid #e5e5e5',
            padding: 14,
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Upcoming deadlines</div>
          {riskIndicators.upcomingTasks.length === 0 ? (
            <div style={{ fontSize: 12, color: '#6b7280' }}>No tasks due in the next 7 days.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {riskIndicators.upcomingTasks.map((task) => {
                const stage = workspace.stages.find((s) => s.id === task.stage_id);
                return (
                  <div
                    key={task.id}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      <div style={{ color: '#6b7280' }}>{stage ? stage.title : 'No stage'}</div>
                    </div>
                    <div style={{ color: '#6b7280' }}>{formatDate(task.due_date)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventProjectPage;


