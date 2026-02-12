import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import './team-crm.css';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  booking_date: string;
  booking_time: string;
  goal: string | null;
  team_size: string | null;
  lead_stage: string;
  estimated_value: number | null;
  source: string | null;
  notes: string | null;
  status: string;
  last_contacted_at: string | null;
  created_at: string;
}

const LEAD_STAGES = [
  { key: 'meeting_scheduled', label: 'Scheduled' },
  { key: 'demo_completed', label: 'Demo Done' },
  { key: 'proposal_sent', label: 'Proposal' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

interface TeamCRMProps {
  onLogout: () => void;
}

const TeamCRM: React.FC<TeamCRMProps> = ({ onLogout }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchLeads = useCallback(async () => {
    const token = sessionStorage.getItem('team_token');
    if (!token) return;

    try {
      const res = await fetch('/api/v1/team/leads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLeadStage = async (leadId: string, stage: string) => {
    const token = sessionStorage.getItem('team_token');
    if (!token) return;

    try {
      await fetch(`/api/v1/team/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lead_stage: stage })
      });
      fetchLeads();
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, lead_stage: stage } : null);
      }
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const getFilteredLeads = () => {
    let filtered = leads;
    
    if (filter !== 'all') {
      filtered = filtered.filter(l => l.lead_stage === filter);
    }
    
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(l => 
        l.name.toLowerCase().includes(s) ||
        l.email.toLowerCase().includes(s) ||
        l.company?.toLowerCase().includes(s)
      );
    }
    
    return filtered;
  };

  const getLeadsByStage = (stage: string) => {
    return getFilteredLeads().filter(l => l.lead_stage === stage);
  };

  const formatValue = (cents: number | null) => {
    if (!cents) return '-';
    return `€${(cents / 100).toLocaleString()}`;
  };

  const totalValue = getFilteredLeads()
    .filter(l => l.lead_stage !== 'lost' && l.lead_stage !== 'won')
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  const wonValue = getFilteredLeads()
    .filter(l => l.lead_stage === 'won')
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  if (loading) {
    return <div className="crm-loading">Loading CRM...</div>;
  }

  return (
    <div className="crm-page">
      <header className="crm-header">
        <div className="crm-header-left">
          <h1>Leads</h1>
          <div className="crm-stats">
            <div className="crm-stat">
              <span className="crm-stat-value">{leads.length}</span>
              <span className="crm-stat-label">Total</span>
            </div>
            <div className="crm-stat">
              <span className="crm-stat-value">{formatValue(totalValue)}</span>
              <span className="crm-stat-label">Pipeline</span>
            </div>
            <div className="crm-stat">
              <span className="crm-stat-value">{formatValue(wonValue)}</span>
              <span className="crm-stat-label">Won</span>
            </div>
          </div>
        </div>
        <div className="crm-header-right">
          <input
            type="text"
            placeholder="Search..."
            className="crm-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select 
            className="crm-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Stages</option>
            {LEAD_STAGES.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <div className="crm-view-toggle">
            <button 
              className={`crm-view-btn ${view === 'pipeline' ? 'active' : ''}`}
              onClick={() => setView('pipeline')}
            >
              Pipeline
            </button>
            <button 
              className={`crm-view-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              List
            </button>
          </div>
        </div>
      </header>

      {view === 'pipeline' ? (
        <div className="crm-pipeline">
          {LEAD_STAGES.map(stage => (
            <div key={stage.key} className="crm-column">
              <div className="crm-column-header">
                <span className="crm-column-title">{stage.label}</span>
                <span className="crm-column-count">{getLeadsByStage(stage.key).length}</span>
              </div>
              <div className="crm-column-content">
                {getLeadsByStage(stage.key).map(lead => (
                  <div 
                    key={lead.id} 
                    className={`crm-card ${selectedLead?.id === lead.id ? 'selected' : ''}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="crm-card-name">{lead.name}</div>
                    {lead.company && (
                      <div className="crm-card-company">{lead.company}</div>
                    )}
                    <div className="crm-card-meta">
                      <span>{lead.goal || 'No goal'}</span>
                      <span>{lead.team_size && `· ${lead.team_size}`}</span>
                    </div>
                    {lead.estimated_value && (
                      <div className="crm-card-value">{formatValue(lead.estimated_value)}</div>
                    )}
                    <div className="crm-card-date">
                      {format(parseISO(lead.created_at), 'MMM d')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="crm-list">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Stage</th>
                <th>Value</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredLeads().map(lead => (
                <tr key={lead.id} onClick={() => setSelectedLead(lead)}>
                  <td>
                    <div className="crm-name-cell">
                      <div className="crm-avatar">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{lead.name}</span>
                    </div>
                  </td>
                  <td>{lead.company || '-'}</td>
                  <td>
                    <span className="crm-stage-badge">
                      {LEAD_STAGES.find(s => s.key === lead.lead_stage)?.label}
                    </span>
                  </td>
                  <td>{formatValue(lead.estimated_value)}</td>
                  <td>{format(parseISO(lead.created_at), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLead && (
        <div className="crm-detail-panel">
          <div className="crm-detail-header">
            <div>
              <h2>{selectedLead.name}</h2>
              {selectedLead.company && <p>{selectedLead.company}</p>}
            </div>
            <button className="crm-close-btn" onClick={() => setSelectedLead(null)}>×</button>
          </div>
          
          <div className="crm-detail-section">
            <label>Email</label>
            <a href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a>
          </div>
          
          {selectedLead.phone && (
            <div className="crm-detail-section">
              <label>Phone</label>
              <a href={`tel:${selectedLead.phone}`}>{selectedLead.phone}</a>
            </div>
          )}

          <div className="crm-detail-section">
            <label>Stage</label>
            <select 
              className="crm-stage-select"
              value={selectedLead.lead_stage}
              onChange={(e) => updateLeadStage(selectedLead.id, e.target.value)}
            >
              {LEAD_STAGES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="crm-detail-section">
            <label>Estimated Value</label>
            <input
              type="number"
              placeholder="Value in cents"
              className="crm-value-input"
              defaultValue={selectedLead.estimated_value || ''}
              onBlur={async (e) => {
                const token = sessionStorage.getItem('team_token');
                if (!token) return;
                await fetch(`/api/v1/team/leads/${selectedLead.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ estimated_value: parseInt(e.target.value) || 0 })
                });
                fetchLeads();
              }}
            />
          </div>

          <div className="crm-detail-section">
            <label>Notes</label>
            <textarea
              className="crm-notes-input"
              placeholder="Add notes..."
              defaultValue={selectedLead.notes || ''}
              onBlur={async (e) => {
                const token = sessionStorage.getItem('team_token');
                if (!token) return;
                await fetch(`/api/v1/team/leads/${selectedLead.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ notes: e.target.value })
                });
                fetchLeads();
              }}
            />
          </div>

          <div className="crm-detail-section">
            <label>Actions</label>
            <div className="crm-actions">
              <button 
                className="crm-action-btn"
                onClick={() => updateLeadStage(selectedLead.id, 'demo_completed')}
              >
                Demo Done
              </button>
              <button 
                className="crm-action-btn"
                onClick={() => updateLeadStage(selectedLead.id, 'proposal_sent')}
              >
                Proposal
              </button>
              <button 
                className="crm-action-btn"
                onClick={() => updateLeadStage(selectedLead.id, 'won')}
              >
                Won
              </button>
              <button 
                className="crm-action-btn"
                onClick={() => updateLeadStage(selectedLead.id, 'lost')}
              >
                Lost
              </button>
            </div>
          </div>

          <div className="crm-detail-meta">
            <div><strong>Created:</strong> {format(parseISO(selectedLead.created_at), 'MMM d, yyyy')}</div>
            <div><strong>Source:</strong> {selectedLead.source || 'Direct'}</div>
            <div><strong>Goal:</strong> {selectedLead.goal || '-'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamCRM;
