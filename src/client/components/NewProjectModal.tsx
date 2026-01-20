import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type NewProjectPayload = {
  title: string;
  eventDate: string;
  clientName: string;
  clientEmail: string;
  estimatedSize: 'micro' | 'standard' | 'large' | '';
  initialStage: 'inquiry' | 'referral' | 'proposal_sent';
  visibility?: 'team' | 'personal'; // 'team' = shared with team, 'personal' = only creator sees it
};

type NewProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  handleCreateProject: (payload: NewProjectPayload) => void;
};

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  handleCreateProject,
}) => {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [estimatedSize, setEstimatedSize] = useState<NewProjectPayload['estimatedSize']>('');
  const [initialStage, setInitialStage] = useState<NewProjectPayload['initialStage']>('inquiry');
  const [visibility, setVisibility] = useState<'team' | 'personal'>('team'); // Default to team event

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      titleInputRef.current.focus();
    }
    // debug mount
    // eslint-disable-next-line no-console
    if (isOpen) console.log('[NewProjectModal] opened');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setEventDate('');
      setClientName('');
      setClientEmail('');
      setEstimatedSize('');
      setInitialStage('inquiry');
      setVisibility('team'); // Reset to default
    }
  }, [isOpen]);

  const isValid =
    title.trim().length > 0 &&
    eventDate.trim().length > 0 &&
    clientName.trim().length > 0 &&
    clientEmail.trim().length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    handleCreateProject({
      title: title.trim(),
      eventDate,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      estimatedSize,
      initialStage,
      visibility,
    });
  };

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      style={{
        display: isOpen ? 'flex' : 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid #e5e5e5',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              id="new-project-title"
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: '#111827',
              }}
            >
              New Wedding Project
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>
              Fill the basic details to get started.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 20,
              color: '#9ca3af',
              padding: 4,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Project Title */}
            <div>
              <label
                htmlFor="project-title"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Project Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="project-title"
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sofia & Miguel's Wedding"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
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

            {/* Event Date & Size */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label
                  htmlFor="event-date"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
                  Event Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="event-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 14,
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
                  htmlFor="estimated-size"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
                  Guest Count
                </label>
                <select
                  id="estimated-size"
                  value={estimatedSize}
                  onChange={(e) =>
                    setEstimatedSize(e.target.value as NewProjectPayload['estimatedSize'])
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 14,
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
                >
                  <option value="">Select…</option>
                  <option value="micro">Micro (&lt; 50)</option>
                  <option value="standard">Standard (50–150)</option>
                  <option value="large">Large (&gt; 150)</option>
                </select>
              </div>
            </div>

            {/* Client Name & Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label
                  htmlFor="client-name"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
                  Client Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Full name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 14,
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
                  htmlFor="client-email"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
                  Client Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="email@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 14,
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

            {/* Initial Stage */}
            <div>
              <label
                htmlFor="initial-stage"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Starting Stage
              </label>
              <select
                id="initial-stage"
                value={initialStage}
                onChange={(e) =>
                  setInitialStage(e.target.value as NewProjectPayload['initialStage'])
                }
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
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
              >
                <option value="inquiry">Inquiry / Lead</option>
                <option value="referral">Referral</option>
                <option value="proposal_sent">Proposal Sent</option>
              </select>
            </div>

            {/* Event Visibility */}
            <div>
              <label
                htmlFor="event-visibility"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Event Visibility
              </label>
              <select
                id="event-visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'team' | 'personal')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
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
              >
                <option value="team">Team Event (visible to all team members)</option>
                <option value="personal">Personal Event (only visible to me)</option>
              </select>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                {visibility === 'team'
                  ? 'All team members will see and can edit this event.'
                  : 'Only you will see this event in your pipeline.'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e5e5',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                border: '1px solid #e5e5e5',
                borderRadius: 999,
                background: '#ffffff',
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                borderRadius: 999,
                background: isValid ? '#0f172a' : '#d1d5db',
                color: '#ffffff',
                cursor: isValid ? 'pointer' : 'not-allowed',
              }}
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render via portal to avoid parent overflow/z-index issues
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
};


