import React from 'react';

interface HomeSectionProps {
  onNavigate: (section: string) => void;
}

const stats = [
  { label: 'Active Projects', value: null },
  { label: 'Weekly Events', value: null },
  { label: 'Pending Quotes', value: null },
  { label: 'Tasks Due', value: null },
];

const previewCards = [
  {
    title: 'Upcoming Events',
    description: 'Add events to see them here.',
    target: 'calendar',
  },
  {
    title: 'Recent Projects',
    description: 'Newly created projects will appear here.',
    target: 'work',
  },
  {
    title: 'Pending Quotes',
    description: 'Create a quote to track approval status.',
    target: 'quotes',
  },
  {
    title: 'Urgent Tasks',
    description: 'Tasks you create will appear in this list.',
    target: 'todo',
  },
];

const HomeSection: React.FC<HomeSectionProps> = ({ onNavigate }) => (
  <>
    <div className="wp-card">
      <div className="wp-section-header">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h2>Start by adding your own projects, layouts, and events.</h2>
        </div>
        <div className="home-actions">
          <button type="button" className="wp-pill primary" onClick={() => onNavigate('layouts')}>
            Create Layout
          </button>
          <button type="button" className="wp-pill">
            Share Brief
          </button>
        </div>
      </div>
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value ?? '—'}</strong>
            <p style={{ margin: 0, color: '#9a9a9a', fontSize: 12 }}>Populate data to see metrics.</p>
          </div>
        ))}
      </div>
    </div>
    <div className="wp-grid">
      {previewCards.map((card) => (
        <div key={card.title} className="wp-preview-card">
          <div>
            <h3>{card.title}</h3>
            <p style={{ color: '#7b7b7b', margin: 0 }}>{card.description}</p>
          </div>
          <button type="button" className="wp-pill" onClick={() => onNavigate(card.target)}>
            View All
          </button>
        </div>
      ))}
    </div>
  </>
);

export default HomeSection;


