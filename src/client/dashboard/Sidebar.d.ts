import React from 'react';
interface SidebarProps {
    active: string;
    collapsed: boolean;
    onToggle: () => void;
    onSelect: (id: string) => void;
    userName?: string;
    avatarUrl?: string | null;
}
declare const Sidebar: React.FC<SidebarProps>;
export default Sidebar;
//# sourceMappingURL=Sidebar.d.ts.map