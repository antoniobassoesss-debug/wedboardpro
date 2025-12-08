import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import HomeSection from './HomeSection';
import { CalendarSection, LayoutsSection, QuotesSection, TodoSection, WorkSection, SuppliersSection, } from './sections';
import TeamsSection from './TeamsSection';
import ChatSection from './ChatTab';
const DashboardContent = ({ active, onNavigate }) => {
    switch (active) {
        case 'home':
            return _jsx(HomeSection, { onNavigate: onNavigate });
        case 'work':
            return _jsx(WorkSection, {});
        case 'calendar':
            return _jsx(CalendarSection, {});
        case 'layouts':
            return _jsx(LayoutsSection, {});
        case 'quotes':
            return _jsx(QuotesSection, {});
        case 'todo':
            return _jsx(TodoSection, {});
        case 'suppliers':
            return _jsx(SuppliersSection, {});
        case 'chat':
            return _jsx(ChatSection, {});
        case 'teams':
            return _jsx(TeamsSection, {});
        default:
            return _jsx(HomeSection, { onNavigate: onNavigate });
    }
};
export default DashboardContent;
//# sourceMappingURL=DashboardContent.js.map