'use client';

import React, { useState } from 'react';
import { Sidebar, PageType } from './Sidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: (currentPage: PageType) => React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageType>('video-replicator');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-auto",
        "transition-all duration-300"
      )}>
        {children(currentPage)}
      </main>
    </div>
  );
};

export default AppLayout;
