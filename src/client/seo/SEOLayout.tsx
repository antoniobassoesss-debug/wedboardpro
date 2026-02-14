import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Kanban,
  FileText,
  PenTool,
  ChevronLeft,
  Search,
  TrendingUp,
} from 'lucide-react';

interface SEOLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { id: '/team/seo', label: 'Command Center', icon: BarChart3 },
  { id: '/team/seo/topics', label: 'Topic Pipeline', icon: Kanban },
  { id: '/team/seo/production', label: 'Content Production', icon: PenTool },
];

const SEOLayout: React.FC<SEOLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('team_token');
    if (!token) navigate('/team-login');
  }, [navigate]);

  const isActive = (path: string) => {
    if (path === '/team/seo') return location.pathname === '/team/seo';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-[#fafafa]">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
          <button
            onClick={() => navigate('/team')}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {!collapsed && <span>Team</span>}
          </button>
        </div>

        <div className="px-3 pt-4 pb-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">SEO Intelligence</h2>
                <p className="text-[10px] text-gray-400">WedBoardPro</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive(id)
                  ? 'bg-gray-900 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="px-4 py-3 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100 transition-colors"
        >
          {collapsed ? '→' : '← Collapse'}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};

export default SEOLayout;
