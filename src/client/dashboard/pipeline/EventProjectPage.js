import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { fetchEventWorkspace, updateEvent, updateStageTask, updateVendor, createEventFile, } from '../../api/eventsPipelineApi';
const formatDate = (iso) => {
    if (!iso)
        return 'No date';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return 'No date';
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};
const countDoneTasksForStage = (stage, tasks) => {
    const stageTasks = tasks.filter((t) => t.stage_id === stage.id);
    if (stageTasks.length === 0)
        return { done: 0, total: 0 };
    const done = stageTasks.filter((t) => t.status === 'done').length;
    return { done, total: stageTasks.length };
};
const EventProjectPage = ({ eventId }) => {
    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pipeline');
    const [expandedStageIds, setExpandedStageIds] = useState(new Set());
    const [isCreatingFile, setIsCreatingFile] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [newFileUrl, setNewFileUrl] = useState('');
    const [newFileCategory, setNewFileCategory] = useState('other');
    const loadWorkspace = async () => {
        setLoading(true);
        setError(null);
        const { data, error: err } = await fetchEventWorkspace(eventId);
        if (err) {
            setError(err);
        }
        else if (data) {
            setWorkspace(data);
        }
        setLoading(false);
    };
    useEffect(() => {
        loadWorkspace();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);
    const event = workspace?.event ?? null;
    const overallProgress = useMemo(() => {
        if (!workspace || workspace.stages.length === 0)
            return 0;
        const sum = workspace.stages.reduce((acc, s) => acc + (s.progress_percent || 0), 0);
        return Math.round(sum / workspace.stages.length);
    }, [workspace]);
    const riskIndicators = useMemo(() => {
        if (!workspace || !event) {
            return {
                overBudget: false,
                overdueStages: 0,
                missingVendors: 0,
                upcomingTasks: [],
            };
        }
        const planned = event.budget_planned ? Number(event.budget_planned) : NaN;
        const actual = event.budget_actual ? Number(event.budget_actual) : NaN;
        const overBudget = !Number.isNaN(planned) && !Number.isNaN(actual) && actual > planned;
        const today = new Date();
        const sevenDays = new Date();
        sevenDays.setDate(today.getDate() + 7);
        const overdueStages = workspace.stages.filter((stage) => {
            if (!stage.due_date || !stage.is_blocking)
                return false;
            const d = new Date(stage.due_date);
            return d < today && stage.progress_percent < 100;
        }).length;
        // Very simple heuristic: count categories without any vendor with contract_signed
        const criticalCategories = [
            'catering',
            'photography',
            'music',
            'decor',
            'flowers',
        ];
        const missingVendors = criticalCategories.filter((cat) => !workspace.vendors.some((v) => v.category === cat && v.contract_status === 'contract_signed')).length;
        const upcomingTasks = workspace.tasks
            .filter((t) => t.due_date && t.status !== 'done')
            .filter((t) => {
            const d = new Date(t.due_date);
            return d >= today && d <= sevenDays;
        })
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .slice(0, 5);
        return {
            overBudget,
            overdueStages,
            missingVendors,
            upcomingTasks,
        };
    }, [workspace, event]);
    const handleToggleStage = (stageId) => {
        setExpandedStageIds((prev) => {
            const next = new Set(prev);
            if (next.has(stageId))
                next.delete(stageId);
            else
                next.add(stageId);
            return next;
        });
    };
    const handleToggleTaskStatus = async (task) => {
        const nextStatus = task.status === 'done' ? 'todo' : 'done';
        await updateStageTask(task.id, { status: nextStatus });
        await loadWorkspace();
    };
    const renderPipelineTab = () => {
        if (!workspace)
            return null;
        return (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: workspace.stages
                .slice()
                .sort((a, b) => a.order_index - b.order_index)
                .map((stage) => {
                const { done, total } = countDoneTasksForStage(stage, workspace.tasks);
                const isExpanded = expandedStageIds.has(stage.id);
                const stageTasks = workspace.tasks.filter((t) => t.stage_id === stage.id);
                return (_jsxs("div", { style: {
                        borderRadius: 16,
                        border: '1px solid #e5e5e5',
                        padding: 14,
                        background: '#ffffff',
                    }, children: [_jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                cursor: 'pointer',
                            }, onClick: () => handleToggleStage(stage.id), children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: '#0f172a' }, children: stage.title }), stage.description && (_jsx("div", { style: { fontSize: 12, color: '#6b7280', maxWidth: 420 }, children: stage.description }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [stage.due_date && (_jsxs("div", { style: { fontSize: 12, color: '#6b7280' }, children: ["Due ", formatDate(stage.due_date)] })), _jsxs("div", { style: { minWidth: 120 }, children: [_jsx("div", { style: {
                                                        height: 6,
                                                        borderRadius: 999,
                                                        background: '#e5e7eb',
                                                        overflow: 'hidden',
                                                    }, children: _jsx("div", { style: {
                                                            width: `${stage.progress_percent}%`,
                                                            height: '100%',
                                                            background: stage.progress_percent === 100 ? '#22c55e' : stage.progress_percent > 0 ? '#0ea5e9' : '#e5e7eb',
                                                        } }) }), _jsxs("div", { style: { fontSize: 11, color: '#6b7280', marginTop: 4 }, children: [stage.progress_percent, "% \u00B7 ", done, "/", total, " tasks"] })] })] })] }), isExpanded && (_jsx("div", { style: { marginTop: 10, borderTop: '1px solid #f3f4f6', paddingTop: 10 }, children: stageTasks.length === 0 ? (_jsx("div", { style: { fontSize: 12, color: '#9ca3af' }, children: "No tasks yet for this stage." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: stageTasks.map((task) => (_jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: 13,
                                    }, children: [_jsx("input", { type: "checkbox", checked: task.status === 'done', onChange: () => handleToggleTaskStatus(task) }), _jsx("span", { style: {
                                                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                                color: task.status === 'done' ? '#9ca3af' : '#111827',
                                            }, children: task.title }), task.due_date && (_jsxs("span", { style: { marginLeft: 'auto', fontSize: 11, color: '#6b7280' }, children: ["Due ", formatDate(task.due_date)] }))] }, task.id))) })) }))] }, stage.id));
            }) }));
    };
    const renderTasksTab = () => {
        if (!workspace)
            return null;
        if (workspace.tasks.length === 0) {
            return _jsx("div", { style: { fontSize: 13, color: '#6b7280' }, children: "No tasks yet for this event." });
        }
        const tasks = workspace.tasks.slice().sort((a, b) => {
            if (a.due_date && b.due_date) {
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            }
            if (a.due_date)
                return -1;
            if (b.due_date)
                return 1;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        return (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: tasks.map((task) => {
                const stage = workspace.stages.find((s) => s.id === task.stage_id);
                return (_jsxs("div", { style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 8,
                        borderRadius: 10,
                        border: '1px solid #e5e5e5',
                        background: '#ffffff',
                        fontSize: 13,
                    }, children: [_jsx("input", { type: "checkbox", checked: task.status === 'done', onChange: () => handleToggleTaskStatus(task) }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: {
                                        fontWeight: 500,
                                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                        color: task.status === 'done' ? '#9ca3af' : '#111827',
                                    }, children: task.title }), _jsxs("div", { style: { fontSize: 11, color: '#6b7280' }, children: [stage ? stage.title : 'No stage', " \u00B7 ", task.priority] })] }), task.due_date && (_jsxs("div", { style: { fontSize: 11, color: '#6b7280' }, children: ["Due ", formatDate(task.due_date)] }))] }, task.id));
            }) }));
    };
    const renderVendorsTab = () => {
        if (!workspace)
            return null;
        if (workspace.vendors.length === 0) {
            return _jsx("div", { style: { fontSize: 13, color: '#6b7280' }, children: "No vendors added yet." });
        }
        const byCategory = workspace.vendors.reduce((acc, v) => {
            if (!acc[v.category])
                acc[v.category] = [];
            acc[v.category].push(v);
            return acc;
        }, {});
        return (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: Object.entries(byCategory).map(([category, list]) => (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, fontWeight: 600, textTransform: 'capitalize', marginBottom: 6 }, children: category }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: list.map((v) => (_jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 8,
                                borderRadius: 10,
                                border: '1px solid #e5e5e5',
                                background: '#ffffff',
                                fontSize: 13,
                            }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 500 }, children: v.name }), _jsx("div", { style: { fontSize: 11, color: '#6b7280' }, children: v.contact_email || v.contact_phone || 'No contact info' })] }), _jsxs("div", { style: { textAlign: 'right', fontSize: 11, color: '#6b7280', minWidth: 140 }, children: [_jsxs("div", { style: { marginBottom: 4 }, children: [_jsx("span", { style: { marginRight: 4 }, children: "Contract:" }), _jsxs("select", { value: v.contract_status, onChange: async (e) => {
                                                        await updateVendor(v.id, { contract_status: e.target.value });
                                                        await loadWorkspace();
                                                    }, style: {
                                                        fontSize: 11,
                                                        borderRadius: 999,
                                                        border: '1px solid #d1d5db',
                                                        padding: '2px 6px',
                                                        background: '#f9fafb',
                                                    }, children: [_jsx("option", { value: "not_contacted", children: "Not contacted" }), _jsx("option", { value: "in_negotiation", children: "In negotiation" }), _jsx("option", { value: "contract_signed", children: "Contract signed" }), _jsx("option", { value: "cancelled", children: "Cancelled" })] })] }), _jsxs("div", { children: [v.quote_amount && _jsxs("span", { children: ["Quote ", v.quote_amount] }), v.final_amount && _jsxs("span", { children: [v.quote_amount ? ' · ' : '', "Final ", v.final_amount] })] })] })] }, v.id))) })] }, category))) }));
    };
    const renderFilesTab = () => {
        if (!workspace)
            return null;
        return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { style: {
                        borderRadius: 12,
                        border: '1px solid #e5e5e5',
                        padding: 10,
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                    }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600 }, children: "Add file link" }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx("input", { type: "text", placeholder: "File name", value: newFileName, onChange: (e) => setNewFileName(e.target.value), style: {
                                        flex: 1,
                                        minWidth: 140,
                                        borderRadius: 8,
                                        border: '1px solid #d1d5db',
                                        padding: '6px 8px',
                                        fontSize: 12,
                                    } }), _jsx("input", { type: "text", placeholder: "https://file-url", value: newFileUrl, onChange: (e) => setNewFileUrl(e.target.value), style: {
                                        flex: 2,
                                        minWidth: 180,
                                        borderRadius: 8,
                                        border: '1px solid #d1d5db',
                                        padding: '6px 8px',
                                        fontSize: 12,
                                    } }), _jsxs("select", { value: newFileCategory, onChange: (e) => setNewFileCategory(e.target.value), style: {
                                        borderRadius: 8,
                                        border: '1px solid #d1d5db',
                                        padding: '6px 8px',
                                        fontSize: 12,
                                    }, children: [_jsx("option", { value: "contract", children: "Contract" }), _jsx("option", { value: "layout", children: "Layout" }), _jsx("option", { value: "menu", children: "Menu" }), _jsx("option", { value: "photo", children: "Photo" }), _jsx("option", { value: "other", children: "Other" })] }), _jsx("button", { type: "button", disabled: isCreatingFile || !newFileName.trim() || !newFileUrl.trim(), onClick: async () => {
                                        if (!event)
                                            return;
                                        setIsCreatingFile(true);
                                        await createEventFile(event.id, {
                                            file_name: newFileName.trim(),
                                            file_url: newFileUrl.trim(),
                                            category: newFileCategory,
                                        });
                                        setNewFileName('');
                                        setNewFileUrl('');
                                        setNewFileCategory('other');
                                        setIsCreatingFile(false);
                                        await loadWorkspace();
                                    }, style: {
                                        borderRadius: 999,
                                        padding: '6px 10px',
                                        border: 'none',
                                        background: '#0f172a',
                                        color: '#ffffff',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        minWidth: 90,
                                    }, children: isCreatingFile ? 'Saving…' : 'Add file' })] })] }), workspace.files.length === 0 ? (_jsx("div", { style: { fontSize: 13, color: '#6b7280' }, children: "No files uploaded yet." })) : (_jsx("div", { style: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 12,
                    }, children: workspace.files.map((file) => (_jsxs("a", { href: file.file_url, target: "_blank", rel: "noreferrer", style: {
                            borderRadius: 12,
                            border: '1px solid #e5e5e5',
                            padding: 10,
                            background: '#ffffff',
                            fontSize: 13,
                            textDecoration: 'none',
                            color: '#111827',
                        }, children: [_jsx("div", { style: { fontWeight: 500 }, children: file.file_name }), _jsxs("div", { style: { fontSize: 11, color: '#6b7280', marginTop: 4 }, children: ["Category: ", file.category] }), _jsxs("div", { style: { fontSize: 11, color: '#9ca3af', marginTop: 2 }, children: ["Uploaded ", formatDate(file.uploaded_at)] })] }, file.id))) }))] }));
    };
    const renderNotesTab = () => {
        if (!workspace || !event)
            return null;
        return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("textarea", { value: event.notes_internal ?? '', onChange: async (e) => {
                        const value = e.target.value;
                        setWorkspace((prev) => prev
                            ? {
                                ...prev,
                                event: { ...prev.event, notes_internal: value },
                            }
                            : prev);
                        await updateEvent(event.id, { notes_internal: value });
                    }, rows: 10, style: {
                        width: '100%',
                        borderRadius: 12,
                        border: '1px solid #e5e5e5',
                        padding: 10,
                        fontSize: 13,
                        resize: 'vertical',
                    }, placeholder: "Internal planning notes, decisions, and context for this event." }), _jsx("div", { style: { fontSize: 11, color: '#9ca3af' }, children: "Notes are private to your team and never visible to the client." })] }));
    };
    if (loading && !workspace) {
        return _jsx("div", { style: { padding: 24 }, children: "Loading event workspace\u2026" });
    }
    if (error) {
        return (_jsxs("div", { style: { padding: 24, color: '#b91c1c', fontSize: 14 }, children: ["Failed to load event workspace: ", error] }));
    }
    if (!workspace || !event) {
        return _jsx("div", { style: { padding: 24, color: '#6b7280' }, children: "Select an event to get started." });
    }
    return (_jsxs("div", { style: {
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)',
            gap: 16,
        }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 14 }, children: [_jsxs("div", { style: {
                            borderRadius: 20,
                            border: '1px solid #e5e5e5',
                            padding: 16,
                            background: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 16,
                        }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("div", { style: { fontSize: 13, color: '#6b7280' }, children: "Wedding event" }), _jsx("div", { style: { fontSize: 18, fontWeight: 700 }, children: event.title }), _jsxs("div", { style: { fontSize: 13, color: '#6b7280' }, children: ["Wedding date: ", _jsx("span", { style: { fontWeight: 500 }, children: formatDate(event.wedding_date) })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }, children: [_jsx("div", { style: {
                                                    padding: '4px 10px',
                                                    borderRadius: 999,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    background: event.status === 'on_track'
                                                        ? '#ecfdf3'
                                                        : event.status === 'at_risk'
                                                            ? '#fef3c7'
                                                            : event.status === 'delayed'
                                                                ? '#fee2e2'
                                                                : '#eff6ff',
                                                    color: event.status === 'on_track'
                                                        ? '#166534'
                                                        : event.status === 'at_risk'
                                                            ? '#92400e'
                                                            : event.status === 'delayed'
                                                                ? '#991b1b'
                                                                : '#1d4ed8',
                                                }, children: event.status.replace('_', ' ') }), _jsxs("div", { style: { fontSize: 12, color: '#6b7280' }, children: ["Current stage:", ' ', _jsx("span", { style: { fontWeight: 500 }, children: event.current_stage || workspace.stages.find((s) => s.order_index === 1)?.title || 'Not set' })] })] })] }), _jsxs("div", { style: { minWidth: 160, alignSelf: 'center' }, children: [_jsx("div", { style: { fontSize: 12, color: '#6b7280', marginBottom: 4 }, children: "Overall progress" }), _jsx("div", { style: {
                                            height: 8,
                                            borderRadius: 999,
                                            background: '#e5e7eb',
                                            overflow: 'hidden',
                                        }, children: _jsx("div", { style: {
                                                width: `${overallProgress}%`,
                                                height: '100%',
                                                background: overallProgress === 100 ? '#22c55e' : '#0ea5e9',
                                            } }) }), _jsxs("div", { style: { fontSize: 12, color: '#6b7280', marginTop: 4 }, children: [overallProgress, "% complete"] })] })] }), _jsx("div", { style: {
                            display: 'flex',
                            gap: 8,
                            borderBottom: '1px solid #e5e5e5',
                        }, children: [
                            { id: 'pipeline', label: 'Pipeline' },
                            { id: 'tasks', label: 'Tasks' },
                            { id: 'vendors', label: 'Vendors' },
                            { id: 'files', label: 'Files' },
                            { id: 'notes', label: 'Notes' },
                        ].map((tab) => (_jsx("button", { type: "button", onClick: () => setActiveTab(tab.id), style: {
                                border: 'none',
                                background: 'transparent',
                                padding: '8px 10px',
                                borderBottom: activeTab === tab.id ? '2px solid #0f172a' : '2px solid transparent',
                                fontSize: 13,
                                fontWeight: activeTab === tab.id ? 600 : 400,
                                color: activeTab === tab.id ? '#0f172a' : '#6b7280',
                                cursor: 'pointer',
                            }, children: tab.label }, tab.id))) }), _jsxs("div", { style: { paddingTop: 10 }, children: [activeTab === 'pipeline' && renderPipelineTab(), activeTab === 'tasks' && renderTasksTab(), activeTab === 'vendors' && renderVendorsTab(), activeTab === 'files' && renderFilesTab(), activeTab === 'notes' && renderNotesTab()] })] }), _jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                }, children: [_jsxs("div", { style: {
                            borderRadius: 20,
                            border: '1px solid #e5e5e5',
                            padding: 14,
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: '#0f172a' }, children: "Risk & Status" }), _jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "Quick snapshot of budget, stages, vendors, and upcoming deadlines." }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13 }, children: [_jsx("span", { children: "Budget" }), _jsx("span", { style: {
                                                    color: riskIndicators.overBudget ? '#b91c1c' : '#16a34a',
                                                    fontWeight: 500,
                                                }, children: riskIndicators.overBudget ? 'Over planned' : 'On track' })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13 }, children: [_jsx("span", { children: "Overdue stages" }), _jsx("span", { style: { fontWeight: 500 }, children: riskIndicators.overdueStages })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13 }, children: [_jsx("span", { children: "Critical vendors missing" }), _jsx("span", { style: { fontWeight: 500 }, children: riskIndicators.missingVendors })] })] })] }), _jsxs("div", { style: {
                            borderRadius: 20,
                            border: '1px solid #e5e5e5',
                            padding: 14,
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: '#0f172a' }, children: "Upcoming deadlines" }), riskIndicators.upcomingTasks.length === 0 ? (_jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "No tasks due in the next 7 days." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: riskIndicators.upcomingTasks.map((task) => {
                                    const stage = workspace.stages.find((s) => s.id === task.stage_id);
                                    return (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 500 }, children: task.title }), _jsx("div", { style: { color: '#6b7280' }, children: stage ? stage.title : 'No stage' })] }), _jsx("div", { style: { color: '#6b7280' }, children: formatDate(task.due_date) })] }, task.id));
                                }) }))] })] })] }));
};
export default EventProjectPage;
//# sourceMappingURL=EventProjectPage.js.map