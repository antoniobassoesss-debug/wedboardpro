import React from 'react';
import HomeSection from './HomeSection';
import {
  CalendarSection,
  LayoutsSection,
  QuotesSection,
  TodoSection,
  WorkSection,
  SuppliersSection,
} from './sections';
import TeamsSection from './TeamsSection';
import ChatSection from './ChatTab';

interface DashboardContentProps {
  active: string;
  onNavigate: (id: string) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ active, onNavigate }) => {
  switch (active) {
    case 'home':
      return <HomeSection onNavigate={onNavigate} />;
    case 'work':
      return <WorkSection />;
    case 'calendar':
      return <CalendarSection />;
    case 'layouts':
      return <LayoutsSection />;
    case 'quotes':
      return <QuotesSection />;
    case 'todo':
      return <TodoSection />;
    case 'suppliers':
      return <SuppliersSection />;
    case 'chat':
      return <ChatSection />;
    case 'teams':
      return <TeamsSection />;
    default:
      return <HomeSection onNavigate={onNavigate} />;
  }
};

export default DashboardContent;


