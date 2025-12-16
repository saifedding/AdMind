'use client';

import { Save, Loader2 } from 'lucide-react';

interface FloatingActionBarProps {
  selectedAdsCount: number;
  isSaving: boolean;
  onSelectAll: () => void;
  onSaveSelected: () => void;
}

export function FloatingActionBar({
  selectedAdsCount,
  isSaving,
  onSelectAll,
  onSaveSelected
}: FloatingActionBarProps) {
  if (selectedAdsCount === 0) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50">
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-iridium-900 border border-border p-3 sm:p-2 sm:pl-6 sm:pr-2 rounded-xl sm:rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-6 rounded-full bg-primary text-iridium-950 text-xs font-bold font-display">
            {selectedAdsCount}
          </div>
          <span className="text-sm font-bold text-foreground">Ads Selected</span>
        </div>
        <div className="hidden sm:block h-6 w-px bg-border mx-2"></div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={onSelectAll}
            className="flex flex-1 sm:flex-none h-10 items-center justify-center px-4 rounded-full text-sm font-medium text-iridium-300 hover:text-foreground hover:bg-iridium-800 transition-colors border border-border"
          >
            Select All
          </button>
          <button 
            onClick={onSaveSelected}
            disabled={isSaving}
            className="flex flex-1 sm:flex-none h-10 items-center justify-center gap-2 px-5 rounded-full bg-primary text-iridium-950 text-sm font-bold hover:bg-photon-400 transition-colors shadow-lg shadow-primary/20"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">Save Selected</span>
            <span className="sm:hidden">Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}