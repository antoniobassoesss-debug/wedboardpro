import React from 'react';
import HomeSection from './HomeSection';
import {
  CalendarSection,
  LayoutsSection,
  TodoSection,
  WorkSection,
  SuppliersSection,
} from './sections';
import TeamsSection from './teams/TeamsSection';
import CrmSection from './crm/CrmSection';
import ChatSection from './ChatTab';
import FilesSection from './FilesSection';

interface DashboardContentProps {
  active: string;
  onNavigate: (id: string) => void;
  userName?: string;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ active, onNavigate, userName }) => {
  switch (active) {
    case 'home':
      return <HomeSection onNavigate={onNavigate} userName={userName} />;
    case 'work':
      return <WorkSection />;
    case 'calendar':
      return <CalendarSection />;
    case 'layouts':
      return <LayoutsSection />;
    case 'crm':
      return <CrmSection />;
    case 'todo':
      return <TodoSection />;
    case 'suppliers':
      return <SuppliersSection />;
    case 'files':
      return <FilesSection />;
    case 'chat':
      return <ChatSection />;
    case 'teams':
      return <TeamsSection />;
    default:
      return <HomeSection onNavigate={onNavigate} userName={userName} />;
  }
};

export default DashboardContent;


