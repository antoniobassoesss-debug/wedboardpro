import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  ArrowRight,
  ChevronDown,
  Filter,
} from 'lucide-react';
import SEOLayout from './SEOLayout';

interface Topic {
  id: string;
  keyword_primary: string;
  keyword_variations: string[];
  search_volume: number;
  keyword_difficulty: number;
  priority_score: number;
  estimated_monthly_traffic: number;
  category: string;
  status: string;
  content_gaps: {
    trendDirection?: string;
    peopleAlsoAsk?: string[];
    relatedSearches?: string[];
  };
  created_at: string;
}

const COLUMNS = [
  { id: 'discovered', label: 'Discovered', color: 'bg-gray-100 text-gray-700' },
  { id: 'validated', label: 'Validated', color: 'bg-blue-100 text-blue-700' },
  { id: 'brief_created', label: 'Brief Ready', color: 'bg-violet-100 text-violet-700' },
  { id: 'in_production', label: 'In Production', color: 'bg-amber-100 text-amber-700' },
  { id: 'review', label: 'Review', color: 'bg-orange-100 text-orange-700' },
  { id: 'published', label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
];

function getDifficultyColor(kd: number): string {
  if (kd <= 30) return 'text-emerald-600 bg-emerald-50';
  if (kd <= 50) return 'text-amber-600 bg-amber-50';
  if (kd <= 70) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}

function getPriorityColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  if (score >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

// Topic card (sortable)
interface TopicCardProps {
  topic: Topic;
  onClick: () => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function TopicCard({ topic, onClick, isSelected, onSelect }: TopicCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
    data: { status: topic.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-all ${
        isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(topic.id);
            }}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 flex-shrink-0"
          />
          <p
            className="text-xs font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            {topic.keyword_primary}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {topic.content_gaps?.trendDirection === 'rising' ? (
            <TrendingUp className="w-3 h-3 text-emerald-500" />
          ) : topic.content_gaps?.trendDirection === 'declining' ? (
            <TrendingDown className="w-3 h-3 text-red-500" />
          ) : (
            <Minus className="w-3 h-3 text-gray-300" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
          {(topic.search_volume || 0).toLocaleString()} vol
        </span>
        <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded ${getDifficultyColor(topic.keyword_difficulty || 0)}`}>
          KD {topic.keyword_difficulty || 0}
        </span>
        <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
          ~{(topic.estimated_monthly_traffic || 0).toLocaleString()} traffic
        </span>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-400">{topic.category || 'General'}</span>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(topic.priority_score || 0)}`} />
          <span className="text-[10px] font-medium text-gray-500">{topic.priority_score || 0}</span>
        </div>
      </div>
    </div>
  );
}

// Overlay card for drag
function TopicCardOverlay({ topic }: { topic: Topic }) {
  return (
    <div className="bg-white rounded-lg border border-blue-300 p-3 shadow-xl w-[260px]">
      <p className="text-xs font-medium text-gray-900 truncate">{topic.keyword_primary}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
          {(topic.search_volume || 0).toLocaleString()} vol
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
          P{topic.priority_score || 0}
        </span>
      </div>
    </div>
  );
}

// Droppable column
function KanbanColumn({
  column,
  topics,
  selectedIds,
  onCardClick,
  onSelectCard,
}: {
  column: (typeof COLUMNS)[number];
  topics: Topic[];
  selectedIds: Set<string>;
  onCardClick: (topic: Topic) => void;
  onSelectCard: (id: string) => void;
}) {
  return (
    <div className="flex-1 min-w-[260px] max-w-[300px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${column.color}`}>
            {column.label}
          </span>
          <span className="text-xs text-gray-400">{topics.length}</span>
        </div>
      </div>
      <SortableContext items={topics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          className="space-y-2 min-h-[200px] p-1 rounded-lg"
          data-column-id={column.id}
        >
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onClick={() => onCardClick(topic)}
              isSelected={selectedIds.has(topic.id)}
              onSelect={onSelectCard}
            />
          ))}
          {topics.length === 0 && (
            <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-[10px] text-gray-300">Drop topics here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Detail panel
function TopicDetailPanel({
  topic,
  onClose,
  onNavigateToBrief,
}: {
  topic: Topic;
  onClose: () => void;
  onNavigateToBrief: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white border-l border-gray-200 shadow-xl z-50 overflow-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Topic Details</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-lg font-semibold text-gray-900">{topic.keyword_primary}</p>
          <p className="text-xs text-gray-400 mt-1">Status: {topic.status}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase">Search Volume</p>
            <p className="text-lg font-semibold text-gray-900">{(topic.search_volume || 0).toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase">Difficulty</p>
            <p className="text-lg font-semibold text-gray-900">{topic.keyword_difficulty || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase">Priority</p>
            <p className="text-lg font-semibold text-gray-900">{topic.priority_score || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase">Est. Traffic</p>
            <p className="text-lg font-semibold text-gray-900">{(topic.estimated_monthly_traffic || 0).toLocaleString()}</p>
          </div>
        </div>

        {topic.keyword_variations && topic.keyword_variations.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Keyword Variations</p>
            <div className="flex flex-wrap gap-1.5">
              {topic.keyword_variations.map((v, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{v}</span>
              ))}
            </div>
          </div>
        )}

        {topic.content_gaps?.peopleAlsoAsk && topic.content_gaps.peopleAlsoAsk.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">People Also Ask</p>
            <div className="space-y-1.5">
              {topic.content_gaps.peopleAlsoAsk.map((q, i) => (
                <p key={i} className="text-xs text-gray-600 pl-3 border-l-2 border-blue-200">{q}</p>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 space-y-2">
          {(topic.status === 'discovered' || topic.status === 'validated') && (
            <button
              onClick={onNavigateToBrief}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Generate Brief
            </button>
          )}
          {topic.status === 'brief_created' && (
            <button
              onClick={onNavigateToBrief}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              View Brief
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const TopicPipeline: React.FC = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailTopic, setDetailTopic] = useState<Topic | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const token = sessionStorage.getItem('team_token');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const fetchTopics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/seo/topics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTopics(data.topics || []);
      }
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  const updateTopicStatus = async (topicId: string, newStatus: string) => {
    try {
      await fetch(`/api/v1/seo/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'validated' ? { validated_at: new Date().toISOString() } : {}),
        }),
      });
      setTopics((prev) =>
        prev.map((t) => (t.id === topicId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update topic:', err);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Find which column the item was dropped over
    const overElement = document.elementFromPoint(
      (event.activatorEvent as PointerEvent)?.clientX || 0,
      (event.activatorEvent as PointerEvent)?.clientY || 0
    );
    const columnEl = overElement?.closest('[data-column-id]');
    const newStatus = columnEl?.getAttribute('data-column-id');

    if (!newStatus) {
      // Try to infer from the over item's status
      const overTopic = topics.find((t) => t.id === String(over.id));
      if (overTopic) {
        updateTopicStatus(String(active.id), overTopic.status);
      }
      return;
    }

    const activeTopic = topics.find((t) => t.id === String(active.id));
    if (activeTopic && activeTopic.status !== newStatus) {
      updateTopicStatus(String(active.id), newStatus);
    }
  };

  const handleSelectCard = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: 'validate' | 'reject' | 'delete') => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);

    if (action === 'delete') {
      for (const id of ids) {
        await fetch(`/api/v1/seo/topics/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setTopics((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    } else {
      const newStatus = action === 'validate' ? 'validated' : 'discovered';
      await fetch('/api/v1/seo/topics/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ids,
          updates: {
            status: newStatus,
            ...(action === 'validate' ? { validated_at: new Date().toISOString() } : {}),
          },
        }),
      });
      setTopics((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, status: newStatus } : t)));
    }
    setSelectedIds(new Set());
  };

  const categories = ['all', ...new Set(topics.map((t) => t.category || 'General'))];
  const filteredTopics = filterCategory === 'all' ? topics : topics.filter((t) => (t.category || 'General') === filterCategory);
  const activeTopic = activeId ? topics.find((t) => t.id === activeId) : null;

  if (loading) {
    return (
      <SEOLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-200" />
            <div className="w-48 h-4 rounded bg-gray-200" />
          </div>
        </div>
      </SEOLayout>
    );
  }

  return (
    <SEOLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Topic Pipeline</h1>
              <p className="text-xs text-gray-500 mt-0.5">{topics.length} topics in pipeline</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Category filter */}
              <div className="relative">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="appearance-none text-xs border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Bulk actions */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                  <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
                  <button
                    onClick={() => handleBulkAction('validate')}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                  >
                    Validate
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject')}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 min-w-max h-full">
              {COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  topics={filteredTopics.filter((t) => t.status === column.id)}
                  selectedIds={selectedIds}
                  onCardClick={setDetailTopic}
                  onSelectCard={handleSelectCard}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTopic ? <TopicCardOverlay topic={activeTopic} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Detail panel */}
      {detailTopic && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setDetailTopic(null)}
          />
          <TopicDetailPanel
            topic={detailTopic}
            onClose={() => setDetailTopic(null)}
            onNavigateToBrief={() => navigate(`/team/seo/topics/${detailTopic.id}/brief`)}
          />
        </>
      )}
    </SEOLayout>
  );
};

export default TopicPipeline;
