'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Video, FileText, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PageType = 'video-replicator' | 'script-to-video' | 'settings';

interface NavItem {
  id: PageType;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const navItems: NavItem[] = [
  {
    id: 'video-replicator',
    label: 'Video Replicator',
    icon: Video,
    description: 'Analyze & replicate videos',
    color: 'text-pink-400',
  },
  {
    id: 'script-to-video',
    label: 'Script to Video',
    icon: FileText,
    description: 'Generate creative concepts',
    color: 'text-cyan-400',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Configure preferences',
    color: 'text-slate-400',
  },
];

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  collapsed = false,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-slate-900 border-r border-slate-800 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 p-4 border-b border-slate-800",
        collapsed && "justify-center"
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Video className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">VEO Studio</h1>
            <p className="text-[10px] text-slate-500 truncate">Video Generation Suite</p>
          </div>
        )}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && item.color)} />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{item.description}</div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800">
          <div className="text-[10px] text-slate-500 text-center">
            Powered by Google Gemini & VEO
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
