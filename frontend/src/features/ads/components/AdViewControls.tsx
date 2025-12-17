'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ViewToggle } from '@/components/ui/view-toggle';
import { AdSearch } from '@/features/dashboard/components/AdSearch';
import { LayoutGrid, RefreshCw } from 'lucide-react';
import { AdViewSettings } from '../types';

interface AdViewControlsProps {
  viewSettings: AdViewSettings;
  loading: boolean;
  onViewChange: (mode: 'grid' | 'list') => void;
  onGridColumnsChange: (columns: 2 | 3 | 4 | 5) => void;
  onSearch: (query: string) => void;
  onRefresh: () => void;
}

export function AdViewControls({
  viewSettings,
  loading,
  onViewChange,
  onGridColumnsChange,
  onSearch,
  onRefresh
}: AdViewControlsProps) {
  return (
    <div className="flex gap-3">
      <ViewToggle 
        view={viewSettings.viewMode} 
        onViewChange={onViewChange}
        disabled={loading}
      />
      {viewSettings.viewMode === 'grid' && (
        <Select 
          value={String(viewSettings.gridColumns)} 
          onValueChange={(value) => onGridColumnsChange(Number(value) as 2 | 3 | 4 | 5)}
          disabled={loading}
        >
          <SelectTrigger className="w-[140px]">
            <LayoutGrid className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Columns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 Columns</SelectItem>
            <SelectItem value="3">3 Columns</SelectItem>
            <SelectItem value="4">4 Columns</SelectItem>
            <SelectItem value="5">5 Columns</SelectItem>
          </SelectContent>
        </Select>
      )}
      <AdSearch 
        onSearch={onSearch} 
        disabled={loading}
      />
      <Button onClick={onRefresh} disabled={loading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}